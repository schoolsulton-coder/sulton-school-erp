# 🏫 Sulton School — ERP & LMS Platformasi

Zamonaviy xususiy maktab uchun to'liq raqamli boshqaruv ekotizimi.
O'quvchidan tortib moliyagacha — barcha jarayonlar bitta platformada.

---

## 📦 Texnologiya Stack

| Qatlam        | Texnologiya                                           |
|---------------|-------------------------------------------------------|
| **Backend**   | Node.js · NestJS · TypeScript                         |
| **Frontend**  | Next.js 15 (App Router) · React · TypeScript          |
| **UI**        | Tailwind CSS · shadcn/ui · PWA (installable)          |
| **DB**        | PostgreSQL 16 · Prisma ORM                            |
| **Auth**      | JWT (access + refresh) · RBAC (rol asosida)           |
| **Queue**     | BullMQ · Redis                                        |
| **Realtime**  | Socket.io (bildirishnoma, davomat)                    |
| **PDF**       | Puppeteer (shartnoma, vedomost)                       |
| **Bot/SMS**   | Telegraf (Telegram) · Eskiz.uz (SMS)                  |
| **Storage**   | Local / S3-mos (MinIO) — fayllar, hujjatlar           |
| **Deploy**    | Docker Compose · Nginx                                |

> To'liq sabablar va arxitektura: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 🗂 Loyiha Strukturasi

```
sulton-school-erp/
├── backend/          # NestJS API + Prisma + bot/queue
├── frontend/         # Next.js (admin, ustoz, o'quvchi, ota-ona portali, PWA)
├── docs/             # TZ, arxitektura, DB sxema, roadmap
└── docker-compose.yml
```

---

## 📚 Hujjatlar

- 📋 [Texnik Topshiriq (TZ)](docs/TZ.md) — barcha modullar, rollar, funksional talablar
- 🏛 [Arxitektura](docs/ARCHITECTURE.md) — tizim dizayni, texnologiya tanlovi sabablari
- 🗃 [Ma'lumotlar Bazasi](docs/DATABASE.md) — ERD, jadvallar, bog'lanishlar
- 🗓 [Roadmap (1.5 oy)](docs/ROADMAP.md) — haftalik ish rejasi va milestone'lar

---

## 🚀 Ishga tushirish (development)

```bash
# 1. Infratuzilma (Postgres + Redis)
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev      # DB sxemasini yaratish
npx prisma db seed          # boshlang'ich rollar/ruxsatlar
npm run start:dev           # http://localhost:4000

# 3. Frontend
cd ../frontend
cp .env.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

---

## 👥 Foydalanuvchi rollari

| Rol               | Slug          | Kirish doirasi                        |
|-------------------|---------------|---------------------------------------|
| Administrator     | `admin`       | To'liq kirish                         |
| Sotuv menejeri    | `sales`       | CRM — qabul oynasi                    |
| Koordinator       | `coordinator` | Sinflar, guruhlar, jadval             |
| Ustoz             | `teacher`     | Darslar, baholar, vazifa, davomat     |
| Kurator           | `curator`     | Biriktirilgan sinflar                 |
| O'quvchi          | `student`     | O'z kabineti (baho, vazifa, davomat)  |
| Vasiy (ota-ona)   | `guardian`    | Farzandi ma'lumotlari + Telegram bot  |

---

## 📞 Aloqa

- **Telefon:** +998 99 605 59 00
- **Telegram:** [@nurillohs](https://t.me/nurillohs)
- **Email:** nurilloxshamsutdinov@gmail.com

© 2026 Sulton School ERP & LMS — Barcha huquqlar himoyalangan.
