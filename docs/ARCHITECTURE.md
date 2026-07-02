# 🏛 Arxitektura — Sulton School ERP & LMS

## 1. Texnologiya tanlovi — sabablari

### Nega NestJS (backend)?
- **TypeScript** — frontend bilan bir til, type-safety, kam xato
- Modulli arxitektura (har bir ERP/LMS modul = alohida Nest module) — 16+ modulli
  tizim uchun ideal tartib
- Tayyor: Guards (RBAC), Interceptors (audit/log), Pipes (validatsiya), Queue (BullMQ)
- Prisma, Socket.io, Telegraf bilan a'lo integratsiya

### Nega Next.js (frontend)?
- App Router + Server Components — tez yuklash, SEO (landing)
- Bitta kod bazasida 4 ta kabinet (admin, ustoz, o'quvchi, ota-ona)
- **PWA** qo'llab-quvvatlash (installable, offline, push)
- shadcn/ui + Tailwind — tez va chiroyli UI

### Nega PostgreSQL + Prisma?
- Relyatsion ma'lumotlar (o'quvchi↔sinf↔shartnoma↔to'lov) uchun eng to'g'ri
- Tranzaksiya (moliya, oylik) uchun ishonchli
- Prisma — type-safe so'rovlar, migratsiya, seed

---

## 2. Yuqori darajadagi arxitektura

```
                        ┌─────────────────────────────┐
                        │   Brauzer / PWA (mobil)      │
                        │  admin · ustoz · o'quvchi ·  │
                        │         ota-ona              │
                        └──────────────┬──────────────┘
                                       │ HTTPS / WSS
                        ┌──────────────▼──────────────┐
                        │   Next.js 15 (App Router)    │
                        │   SSR/CSR · PWA · UI         │
                        └──────────────┬──────────────┘
                                       │ REST / JSON (Axios)
                        ┌──────────────▼──────────────┐
                        │      NestJS API (4000)       │
                        │  Auth · RBAC Guard · Modules │
                        │  Validation · Audit · Swagger│
                        └───┬────────┬─────────┬───────┘
                            │        │         │
              ┌─────────────▼─┐  ┌───▼────┐ ┌──▼───────────┐
              │ PostgreSQL    │  │ Redis  │ │ Worker (Bull)│
              │ (Prisma ORM)  │  │ cache/ │ │ SMS·Telegram │
              │               │  │ queue  │ │ PDF·E-maktab │
              └───────────────┘  └────────┘ └──────┬───────┘
                                                    │
                          ┌──────────┬──────────────┼─────────────┐
                       ┌──▼──┐   ┌───▼────┐    ┌─────▼────┐  ┌─────▼─────┐
                       │ S3/ │   │Telegram│    │ Eskiz.uz │  │ E-maktab  │
                       │MinIO│   │  Bot   │    │   SMS    │  │   API     │
                       └─────┘   └────────┘    └──────────┘  └───────────┘
```

---

## 3. Backend tuzilishi (NestJS)

```
backend/src/
├── main.ts                 # bootstrap, CORS, Swagger, ValidationPipe
├── app.module.ts           # barcha modullarni yig'adi
├── prisma/                 # PrismaService (global)
├── common/
│   ├── guards/             # JwtAuthGuard, RolesGuard, PermissionsGuard
│   ├── decorators/         # @Roles(), @Permissions(), @CurrentUser()
│   ├── interceptors/       # AuditInterceptor, TransformInterceptor
│   └── filters/            # GlobalExceptionFilter
├── config/                 # env konfiguratsiya
└── modules/
    ├── auth/               # login, refresh, JWT
    ├── users/              # foydalanuvchi + rol + ruxsat
    ├── students/           # o'quvchi kabineti
    ├── guardians/          # vasiylar
    ├── crm/                # lead funnel
    ├── classes/            # sinf, guruh, jadval, fan
    ├── contracts/          # shartnoma + installment + PDF
    ├── finance/            # g'azna, tranzaksiya, cash flow
    ├── hr/                 # bo'lim, lavozim, xodim, hujjat
    ├── payroll/            # oylik hisob-kitob
    ├── grades/             # baholash
    ├── attendance/         # davomat
    ├── homework/           # vazifa + topshirish
    ├── behavior/           # ahloqiy baholash
    ├── notifications/      # bildirishnoma (telegram/sms/push)
    ├── telegram/           # Telegraf bot
    ├── esmaktab/           # integratsiya
    └── reports/            # statistika va hisobotlar
```

**Har bir modul standarti:** `*.module.ts`, `*.controller.ts`, `*.service.ts`,
`dto/`, `entities/` (Prisma tiplari).

### Auth & RBAC oqimi
1. `POST /auth/login` → access (15 min) + refresh (7 kun) JWT
2. Har bir so'rovda `JwtAuthGuard` → token tekshiradi
3. `RolesGuard` / `PermissionsGuard` → `@Permissions('students.create')` ni tekshiradi
4. `@CurrentUser()` decorator → so'rov egasini beradi
5. `AuditInterceptor` → muhim amallarni `audit_logs` ga yozadi

---

## 4. Frontend tuzilishi (Next.js App Router)

```
frontend/
├── app/
│   ├── (auth)/login/             # kirish sahifasi
│   ├── (dashboard)/
│   │   ├── layout.tsx            # sidebar + rolga qarab menyu
│   │   ├── students/
│   │   ├── crm/
│   │   ├── classes/
│   │   ├── contracts/
│   │   ├── finance/
│   │   ├── hr/
│   │   ├── payroll/
│   │   ├── grades/
│   │   ├── attendance/
│   │   └── homework/
│   ├── (portal)/                 # o'quvchi/ota-ona portali
│   ├── layout.tsx                # root + PWA meta
│   └── globals.css
├── components/                   # ui (shadcn), shared
├── lib/                          # api client (axios), auth, utils
├── hooks/                        # react-query hooks
├── store/                        # zustand (auth, ui state)
└── public/
    ├── manifest.json             # PWA
    └── icons/
```

**Data fetching:** TanStack Query (react-query) + Axios. **State:** Zustand
(auth, UI). **Forms:** react-hook-form + zod. **Tables:** TanStack Table.

---

## 5. Asosiy oqimlar (key flows)

**Lead → O'quvchi konversiyasi:** CRM'da lead "Shartnoma" bosqichiga o'tganda →
o'quvchi yaratiladi → shartnoma generatsiya qilinadi → installment jadvali tuziladi.

**Davomat → bildirishnoma:** Ustoz davomat belgilaydi → `ABSENT/LATE` bo'lsa →
BullMQ queue ga job → worker Telegram/SMS yuboradi → `notifications` ga yoziladi.

**Shartnoma PDF:** Shablon (HTML) + o'quvchi ma'lumotlari → Puppeteer → PDF →
S3/MinIO ga saqlanadi → yuklab olinadi.

**Oylik (payroll):** `PayrollRun` yaratiladi → har xodim uchun `PayrollItem`
(base + bonus − penalty) → tasdiqlash → to'lov → vedomost PDF.

---

## 6. Deploy

- **Docker Compose:** `postgres`, `redis`, `backend`, `worker`, `frontend`, `nginx`
- **Nginx:** reverse proxy + SSL (Let's Encrypt) + statik fayllar
- **Backup:** kunlik `pg_dump` cron → S3
- **CI/CD:** GitHub Actions (lint → build → test → deploy) *(opsional)*

```
[Internet] → [Nginx :443] ─┬→ [Next.js :3000]
                           └→ [NestJS :4000] → [Postgres] [Redis]
                                              → [Worker]
```

---

## 7. Xavfsizlik

- Parol: **argon2** hashing
- JWT: qisqa access + rotatsiyali refresh
- Validatsiya: `class-validator` (DTO), `zod` (frontend)
- Rate limiting: `@nestjs/throttler`
- RBAC: har bir endpoint himoyalangan
- Audit log: muhim amallar qayd etiladi
- CORS: faqat ruxsat etilgan domenlar
- Fayl yuklash: tur/hajm cheklovi, antivirus skan *(opsional)*
