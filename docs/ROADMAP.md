# 🗓 Roadmap — Sulton School ERP & LMS (1.5 oy + test)

**Umumiy:** 6 hafta ishlab chiqish + 1–2 hafta test/topshirish + deploy.
Har hafta oxirida — demo va hisobot.

---

## 📅 Bosqichlar jadvali

| Hafta | Bosqich | Asosiy natija |
|-------|---------|---------------|
| **1–2** | Loyihalash + asos | Arxitektura, DB, auth, RBAC tayyor |
| **3–4** | Asosiy ERP | O'quvchi, sinf, CRM, foydalanuvchi |
| **5–6** | Moliya, HR + LMS | Shartnoma, g'azna, HR, oylik, baho, davomat, vazifa |
| **7** | LMS yakuni | Vasiy portali, Telegram bot, integratsiya |
| **8 (+)** | Test & deploy | Bug-fix, test, server deploy, o'quv kursi |

---

## 1–2 HAFTA — Loyihalash va poydevor

**Maqsad:** texnik asos to'liq tayyor bo'lsin.

- [ ] Repo, monorepo struktura (backend + frontend)
- [ ] Docker Compose: Postgres + Redis
- [ ] Prisma sxema + birinchi migratsiya + seed (rollar, ruxsatlar, admin)
- [ ] NestJS skelet: config, PrismaService, global filter/interceptor
- [ ] Auth: login, refresh JWT, parol hashing (argon2)
- [ ] RBAC: `RolesGuard`, `PermissionsGuard`, decoratorlar
- [ ] Next.js skelet: login, dashboard layout, rolga qarab menyu, PWA setup
- [ ] API client (axios + interceptor), react-query setup
- [ ] UI kit: Tailwind + shadcn/ui, asosiy komponentlar

**Demo:** Login → rolga qarab bo'sh dashboard ochiladi.

---

## 3–4 HAFTA — Asosiy ERP

**Maqsad:** o'quvchi va sinf jarayonlari ishlasin.

- [ ] **Foydalanuvchilar & Rollar** — CRUD, rol/ruxsat boshqaruvi, audit
- [ ] **O'quvchi kabineti** — CRUD, vasiy, hujjat yuklash, qabul tarixi
- [ ] **Sinflar va guruhlar** — sinf CRUD, o'quvchi taqsimlash, sig'im nazorati
- [ ] **Dars jadvali** — fan, jadval (hafta kuni × vaqt)
- [ ] **Ustoz/kurator biriktirish**
- [ ] **CRM** — lead funnel (kanban), faollik (qo'ng'iroq/eslatma), konversiya
- [ ] Ro'yxatlar: qidiruv, filtr, pagination

**Demo:** Lead qo'shish → o'quvchiga aylantirish → sinfga biriktirish.

---

## 5–6 HAFTA — Moliya, HR va LMS yadrosi

**Maqsad:** pul va ta'lim modullari ishlasin.

### Moliya
- [ ] **Shartnoma** — shablon, installment jadvali, chegirma, PDF (Puppeteer)
- [ ] **To'lovlar** — qabul, holat, tarix
- [ ] **G'azna** — kassa, kirim/chiqim/o'tkazma/investitsiya, Cash Flow

### HR
- [ ] **HR** — bo'lim/lavozim, xodim profili, hujjat, ishga qabul/bo'shash
- [ ] **Oylik** — stavka, payroll run, bonus/jarima, vedomost PDF

### LMS
- [ ] **Baholash** — ball qo'yish, chorak/yillik, o'rtacha, progress grafigi
- [ ] **Davomat** — kunlik belgilash, holat, oylik hisobot
- [ ] **Vazifa** — yaratish, topshirish (fayl), tekshirish, baholash

**Demo:** Shartnoma PDF, davomat olish, vazifa berish/tekshirish.

---

## 7 HAFTA — LMS yakuni va integratsiya

**Maqsad:** ota-ona va bildirishnomalar ishlasin.

- [ ] **Ahloqiy baholash** — xulq ball, intizom hodisalari
- [ ] **Vasiy portali** — baho/davomat/to'lov/vazifa ko'rish
- [ ] **Telegram bot** — ulanish, bildirishnoma (davomat, baho, to'lov, vazifa)
- [ ] **SMS** — Eskiz.uz integratsiya (davomat/to'lov xabarlari)
- [ ] **Bildirishnoma queue** — BullMQ worker
- [ ] **E-maktab** — eksport/sync (API mavjud bo'lsa) yoki Excel eksport
- [ ] **Hisobotlar** — statistika dashboard (o'quvchi, moliya, davomat)

**Demo:** Davomat → ota-onaga Telegram/SMS avtomatik boradi.

---

## 8 HAFTA (+) — Test, deploy, topshirish

**Maqsad:** ishonchli, ishlaydigan tizim.

- [ ] To'liq QA: rollar, ruxsatlar, edge-case'lar
- [ ] Bug-fix sprint
- [ ] PWA test (o'rnatish, offline, push)
- [ ] Xavfsizlik tekshiruvi (RBAC, rate-limit, validatsiya)
- [ ] Server deploy (Docker + Nginx + SSL)
- [ ] DB backup avtomatlashtirish
- [ ] Admin o'quv kursi (online) + qo'llanma
- [ ] Manba kodi va hujjatlarni topshirish
- [ ] **1 oy o'zgarishlar muhlati** boshlanadi

---

## 🎯 Milestone'lar

| # | Milestone | Hafta |
|---|-----------|:-----:|
| M1 | Auth + RBAC + dashboard | 2 |
| M2 | O'quvchi + sinf + CRM | 4 |
| M3 | Shartnoma + moliya + HR + oylik | 6 |
| M4 | LMS (baho/davomat/vazifa) | 6 |
| M5 | Vasiy portali + Telegram/SMS | 7 |
| M6 | Deploy + topshirish | 8 |

---

## ⚠️ Xavf-xatarlar (risklar)

| Risk | Ta'sir | Yechim |
|------|--------|--------|
| E-maktab API yo'qligi | Integratsiya kechikadi | Excel eksport/import zaxira variant |
| Talablar o'zgarishi | Muddat siljishi | Haftalik demo + yozma kelishuv |
| To'lov tizimi (Click/Payme) | Qo'shimcha vaqt | 2-bosqichga qoldirish |
| Rag'bat/jadval moduli aniq emas | Bloklanish | Zavuch bilan oldindan kelishish |
