# 📋 Texnik Topshiriq (TZ) — Sulton School ERP & LMS

**Versiya:** 1.0
**Sana:** 2026
**Loyiha:** Xususiy maktab uchun ERP & LMS platformasi
**Muddat:** 1.5 oy ishlab chiqish + 0.5 oy test/topshirish

---

## 1. Loyiha maqsadi

Maktabning barcha jarayonlarini — qabul (CRM), o'quvchilar, sinflar, moliya,
shartnoma, HR, oylik hisob-kitob hamda ta'lim jarayoni (baho, davomat, vazifa) —
bitta web platformada birlashtirish. Platforma rol asosida ishlaydi va
o'qituvchi, o'quvchi, ota-ona uchun alohida kabinetlarni taqdim etadi.

### Asosiy ko'rsatkichlar
- **16+** funksional modul
- **7** foydalanuvchi turi (5 xodim roli + o'quvchi + ota-ona)
- **∞** o'quvchi soni limiti yo'q
- Web + **PWA** (telefonga o'rnatiladigan)

---

## 2. Foydalanuvchilar va rollar (RBAC)

| # | Rol | Slug | Asosiy vakolatlari |
|---|-----|------|--------------------|
| 1 | **Administrator** | `admin` | Barcha modullarga to'liq kirish, sozlamalar, foydalanuvchi boshqaruvi |
| 2 | **Sotuv menejeri** | `sales` | CRM (lead'lar, funnel, qo'ng'iroqlar, konversiya) |
| 3 | **Koordinator** | `coordinator` | Sinflar, guruhlar, dars jadvali, o'quvchi taqsimlash |
| 4 | **Ustoz** | `teacher` | O'z darslari: baho, davomat, vazifa, ahloqiy baho |
| 5 | **Kurator** | `curator` | Faqat biriktirilgan sinf(lar) bo'yicha to'liq nazorat |
| 6 | **O'quvchi** | `student` | Shaxsiy kabinet: baho, vazifa, davomat, jadval |
| 7 | **Vasiy (ota-ona)** | `guardian` | Farzand ma'lumotlari + Telegram bot bildirishnomalari |

> Har bir amal (`students.create`, `finance.view`, `grades.edit` ...) `Permission`
> sifatida saqlanadi va rolga biriktiriladi (`RolePermission`). Bu kelajakda
> yangi rol/vakolat qo'shishni osonlashtiradi.

### Ruxsatlar matritsasi (qisqacha)

| Modul / Amal              | admin | sales | coord | teacher | curator | student | guardian |
|---------------------------|:-----:|:-----:|:-----:|:-------:|:-------:|:-------:|:--------:|
| O'quvchilarni ko'rish     |  ✅   |  ◐    |  ✅   |   ◐     |   ◐     |   self  |  child   |
| O'quvchi qo'shish/tahrir  |  ✅   |  ❌   |  ✅   |   ❌    |   ❌    |   ❌    |   ❌     |
| CRM (lead)                |  ✅   |  ✅   |  ❌   |   ❌    |   ❌    |   ❌    |   ❌     |
| Sinflar va jadval         |  ✅   |  ❌   |  ✅   |   👁    |   ◐     |   👁    |   👁     |
| Shartnoma                 |  ✅   |  👁   |  👁   |   ❌    |   ❌    |   👁    |   👁     |
| G'azna & Moliya           |  ✅   |  ❌   |  ❌   |   ❌    |   ❌    |   ❌    |   ❌     |
| HR & Oylik                |  ✅   |  ❌   |  ❌   |   ❌    |   ❌    |   ❌    |   ❌     |
| Baho qo'yish              |  ✅   |  ❌   |  ❌   |   ✅    |   ◐     |   👁    |   👁     |
| Davomat                   |  ✅   |  ❌   |  ❌   |   ✅    |   ✅    |   👁    |   👁     |
| Vazifa                    |  ✅   |  ❌   |  ❌   |   ✅    |   ◐     |   ◐     |   👁     |
| Foydalanuvchi/rollar      |  ✅   |  ❌   |  ❌   |   ❌    |   ❌    |   ❌    |   ❌     |

`✅` to'liq · `◐` cheklangan/biriktirilganlar · `👁` faqat ko'rish · `self/child` o'ziniki/farzandi · `❌` yo'q

---

## 3. ERP modullari

### 3.1. O'quvchi Kabineti
- Shaxsiy ma'lumotlar va rasm
- Vasiy (ota-ona) ma'lumotlari (bir nechta vasiy bo'lishi mumkin)
- Sinf va guruhga biriktirish
- O'qishga qabul tarixi
- Hujjatlar va fayllar (metrika, ariza, surat)

### 3.2. CRM — Qabul Oynasi
- Yangi murojaat (lead) ro'yxati
- Lead bosqichlari (funnel): Yangi → Bog'lanildi → Sinov darsi → Shartnoma → Yopildi
- Menejer biriktirish
- Qo'ng'iroq va eslatmalar (faollik tarixi)
- Konversiya statistikasi (lead → o'quvchi)

### 3.3. Sinflar va Guruhlar
- Sinf yaratish va sozlash (nom, sinf darajasi, o'quv yili, sig'im, xona)
- O'quvchilarni taqsimlash
- Ustoz va kurator biriktirish
- Dars jadvali
- Sig'im nazorati (sig'imdan oshmaslik)

### 3.4. Shartnoma Tizimi
- Avtomatik shartnoma shabloni (o'quvchi ma'lumotlari bilan to'ldiriladi)
- Oyma-oy hisob-kitob jadvali (installments)
- Chegirma va imtiyoz qo'llash (foiz yoki fiks)
- To'lov tarixi va holati (kutilmoqda / qisman / to'langan / muddati o'tgan)
- PDF yuklab olish / chop etish

### 3.5. G'azna & Moliya
- Kirim va chiqim boshqaruvi
- Xarajatlar ro'yxati (kategoriyalar bo'yicha)
- Investitsiya hisobi
- Ichki o'tkazmalar (kassalar orasida)
- Pul oqimi (Cash Flow) hisoboti

### 3.6. Foydalanuvchilar & Rollar
- Rol va vakolat boshqaruvi
- Foydalanuvchi yaratish, bloklash, parol tiklash
- Audit jurnali (kim, qachon, nima qildi)

### 3.7. HR Bo'limi
- Ishga qabul qilish jarayoni
- Mehnat shartnomasi (shablon)
- Ishdan bo'shash va ariza
- Xodim profili va hujjatlar
- Bo'lim va lavozim strukturasi

### 3.8. Oylik Hisob-Kitob
- Xodim biriktirish & stavka (oylik / soatbay / darsbay)
- Oylik hisob belgilash (payroll run)
- Bonus va jarima
- Oylik to'lov tarixchasi
- Ish haqi vedomosti (PDF)

---

## 4. LMS modullari

### 4.1. Ta'limiy Baholash
- Fan bo'yicha ball qo'yish tizimi (kunlik/chorak/yarim yillik/imtihon)
- Chorak va yarim yillik baholar
- O'rtacha ball avtomatik hisobi
- Ustoz izohi va tavsiyalar
- O'quvchi progress grafigi

### 4.2. E-maktab Integratsiya
- E-maktab tizimi bilan bog'lash (API)
- Ma'lumotlarni avtosinhronlash
- Elektron jurnal eksport
- Davlat hisobotlari formati
- API orqali ma'lumot almashish

> ⚠️ Bu modul E-maktab API hujjatlari/kalitlari mavjudligiga bog'liq. Agar
> rasmiy API bo'lmasa — qo'lda eksport/import (Excel) sifatida amalga oshiriladi.

### 4.3. Vazifa Berish & Tekshirish
- Uy vazifasi yaratish va yuborish
- Fayl, rasm, video topshirish
- Ustoz onlayn tekshiruvi
- Ball va izoh qo'yish
- Muddati o'tgan vazifalar nazorati

### 4.4. Davomat Olish
- Har kunlik davomat belgisi (bor/yo'q/kechikkan/sababli)
- Kechikish va sababli yo'qolish
- Ota-onaga SMS / Telegram bildirishnoma
- Oylik davomat hisoboti
- Sinf bo'yicha statistika

### 4.5. Ahloqiy Baholash
- Xulq-atvor ball tizimi (ijobiy/salbiy)
- Intizom hodisalarini qayd etish
- Ustoz va kurator izohlari
- Ota-onaga hisobot yuborish
- Ijobiy xulq rag'batlantirish

### 4.6. Vasiy Portali
- Baho va davomat ko'rish
- Uy vazifalarini kuzatish
- To'lov holati va tarix
- 🤖 Telegram bot bildirishnomalari (baho, davomat, to'lov, vazifa)

### 4.7. Rag'batlantirish Tizimi *(2-bosqich)*
> Zavuch bilan aniqlanadi — keyinroq to'ldiriladi.

### 4.8. Dars Jadvallari *(kengaytirilgan)*
> Zavuch bilan aniqlanadi — keyinroq to'ldiriladi. Asosiy jadval 3.3 da mavjud.

---

## 5. Funksional bo'lmagan talablar

| Talab | Tavsif |
|-------|--------|
| **Tillar** | O'zbek (lotin) — asosiy. Rus/ingliz — kengaytirish uchun i18n tayyor |
| **Mobil** | To'liq responsive + PWA (offline cache, push, "Home screen") |
| **Xavfsizlik** | JWT, parol hashing (argon2), RBAC, rate-limit, audit log |
| **Ishlash** | 1000+ o'quvchi, sahifa < 1s, pagination + indeks |
| **Zaxira** | Kunlik DB backup (pg_dump → S3) |
| **Loglar** | Markazlashgan log, xatoliklar monitoringi |
| **Brauzer** | Chrome, Edge, Safari (oxirgi 2 versiya) |

---

## 6. Integratsiyalar

- **Telegram Bot** — vasiy va o'quvchi uchun bildirishnoma (Telegraf)
- **SMS** — Eskiz.uz (yoki Play Mobile) orqali davomat/to'lov xabarlari
- **To'lov** *(opsional 2-bosqich)* — Click / Payme (onlayn to'lov)
- **E-maktab** — davlat tizimi bilan ma'lumot almashish (API mavjud bo'lsa)
- **S3/MinIO** — fayl saqlash

---

## 7. Topshirish mezonlari (Acceptance criteria)

- [ ] Barcha 16+ modul ishlaydi va rol bo'yicha cheklangan
- [ ] Shartnoma PDF avtomatik generatsiya qilinadi
- [ ] Davomat → ota-onaga avtomatik bildirishnoma boradi
- [ ] Telegram bot ulanadi va xabar yuboradi
- [ ] PWA o'rnatiladi va push ishlaydi
- [ ] Admin o'quv kursi (online) o'tkaziladi
- [ ] Manba kodi va deploy hujjati topshiriladi
- [ ] Server'ga deploy qilinadi va ishlaydi

---

## 8. Loyihadan tashqari (Out of scope, 1-bosqich)

- Native mobil ilova (Flat/React Native) — alohida bosqich
- Murakkab BI/analitika dashboardlari
- Ko'p filialli (multi-branch) arxitektura — kerak bo'lsa keyin
- Onlayn dars (video-konferensiya) tizimi

> Bu bandlar kelishuvga ko'ra keyingi bosqichlarda qo'shilishi mumkin.
