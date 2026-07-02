# 🚀 Deploy — Sulton School ERP & LMS (VPS + Docker)

To'liq tizimni bitta serverda Docker bilan ishga tushirish. Stack:
**Nginx (80/443) → Frontend (Next.js) + Backend (NestJS) → Postgres · Redis · MinIO**

---

## 0. Talablar
- VPS: Ubuntu 22.04+ (kamida 2 vCPU / 2–4 GB RAM tavsiya — puppeteer/PDF uchun).
- Domen (ixtiyoriy, lekin SSL uchun kerak): A-record → server IP.
- Server'da Docker + Docker Compose.

---

## 1. Serverda Docker o'rnatish
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # qayta login qiling
docker --version && docker compose version
```

## 2. Loyihani serverga olish
```bash
git clone <repo-url> sulton-school-erp   # yoki scp bilan ko'chiring
cd sulton-school-erp
```

## 3. Sozlamalar (`.env`)
```bash
cp .env.prod.example .env
nano .env     # CHANGE_ME larni to'ldiring (DB paroli, JWT, admin paroli, domen)
```
Kuchli sekret yaratish: `openssl rand -hex 32`

Nginx konfigini nusxalang (bu fayl `.gitignore` da — serverда tahrirlaysiz, `git pull` tegmaydi):
```bash
cp deploy/nginx/default.conf.example deploy/nginx/default.conf
nano deploy/nginx/default.conf   # server_name _; -> domeningiz (ixtiyoriy)
```

## 4. Ishga tushirish
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
- Backend konteyneri startda avtomatik: **`prisma migrate deploy`** (jadvallar) +
  **asosiy seed** (7 rol, ruxsatlar, admin — `.env` dagi `ADMIN_PHONE`/`ADMIN_PASSWORD`).
  Seed idempotent — har qayta ishga tushishda xavfsiz, dublikat yaratmaydi.
- Holatni ko'rish: `docker compose -f docker-compose.prod.yml ps`
- Loglar: `docker compose -f docker-compose.prod.yml logs -f backend`

✅ Startdan so'ng `http://<server-ip>/` ochiladi va **admin** bilan kira olasiz —
qo'shimcha qadam shart emas.

## 5. (Ixtiyoriy) Demo ma'lumotlar
Sinov uchun namuna o'quvchi/baho/davomat/tashriflar:
```bash
docker compose -f docker-compose.prod.yml exec backend npm run prisma:demo
docker compose -f docker-compose.prod.yml exec backend npm run prisma:visits
```

---

## 6. SSL (HTTPS) — Let's Encrypt
Domen DNS A-record server IP ga yo'naltirilgan bo'lishi kerak. So'ng:

```bash
# 1) Sertifikat olish (certbot webroot orqali — nginx ishlab turibdi)
docker run --rm \
  -v $(pwd)/deploy/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/deploy/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d erp.maktab.uz --email siz@mail.uz --agree-tos --no-eff-email
```

So'ng `deploy/nginx/default.conf` ga HTTPS blokini qo'shing (domeningizni yozing):
```nginx
server {
    listen 443 ssl;
    http2 on;
    server_name erp.maktab.uz;
    client_max_body_size 25m;

    ssl_certificate     /etc/letsencrypt/live/erp.maktab.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/erp.maktab.uz/privkey.pem;

    location /api/ {
        proxy_pass http://sulton_backend/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
    location / {
        proxy_pass http://sulton_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
# HTTP -> HTTPS yo'naltirish (mavjud :80 server blokiga qo'shing):
#   location / { return 301 https://$host$request_uri; }
#   (lekin /.well-known/acme-challenge/ ni qoldiring)
```
Nginx'ni qayta yuklang:
```bash
docker compose -f docker-compose.prod.yml restart nginx
```
Sertifikatni yangilash (cron, 90 kunda bir): yuqoridagi `certbot ... renew` buyrug'ini oyiga qo'ying + `restart nginx`.

---

## 7. Zaxira (backup)
Kunlik DB backup (cron):
```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U postgres sulton_school | gzip > backup_$(date +%F).sql.gz
```
Tiklash:
```bash
gunzip -c backup_2026-06-29.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d sulton_school
```

## 8. Yangilash (yangi versiya)
```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
# migratsiyalar startda avtomatik qo'llanadi
```

## 9. Foydali buyruqlar
```bash
docker compose -f docker-compose.prod.yml ps                 # holat
docker compose -f docker-compose.prod.yml logs -f backend    # backend loglari
docker compose -f docker-compose.prod.yml restart backend    # qayta ishga tushirish
docker compose -f docker-compose.prod.yml down               # to'xtatish (volume saqlanadi)
```

---

## 10. CI/CD — GitHub Actions bilan avto-deploy

Push → CI tekshiruv → Docker image build+push (GHCR) → SSH orqali VPS'da avtomatik yangilanish.
Image'lar **CI'da** quriladi (VPS yengil qoladi), server faqat `pull` qiladi.

### 10.1. Talab: kod GitHub'da bo'lishi kerak
```bash
git init && git add . && git commit -m "init"
git branch -M main
git remote add origin https://github.com/<owner>/sulton-school-erp.git
git push -u origin main
```

### 10.2. GitHub Secrets (Settings → Secrets and variables → Actions)
| Secret | Tavsif |
|--------|--------|
| `SSH_HOST` | VPS IP yoki domen |
| `SSH_USER` | server foydalanuvchi (masalan `deploy` yoki `root`) |
| `SSH_KEY` | SSH **maxfiy** kalit (server `authorized_keys` da public'i) |
| `SSH_PORT` | (ixtiyoriy) default 22 |
| `APP_DIR` | (ixtiyoriy) serverdagi loyiha yo'li, default `~/sulton-school-erp` |
| `GHCR_PAT` | (ixtiyoriy) image'lar **private** bo'lsa: `read:packages` huquqli token |

SSH deploy kaliti yaratish (lokal):
```bash
ssh-keygen -t ed25519 -f deploy_key -N ""
# public'ni serverga:
ssh-copy-id -i deploy_key.pub <user>@<host>     # yoki qo'lda authorized_keys ga
# deploy_key (maxfiy) tarkibini GitHub secret SSH_KEY ga joylang
```

### 10.3. Serverni bir marta tayyorlash
```bash
git clone https://github.com/<owner>/sulton-school-erp.git
cd sulton-school-erp
cp .env.prod.example .env
nano .env      # parollar/JWT (IMAGE_PREFIX ni CI o'zi to'g'rilaydi)
cp deploy/nginx/default.conf.example deploy/nginx/default.conf   # majburiy
# GHCR private bo'lsa birinchi login:
echo <GHCR_PAT> | docker login ghcr.io -u <owner> --password-stdin
docker compose -f docker-compose.deploy.yml up -d   # birinchi ko'tarish
```

### 10.4. Ishlash tartibi (avtomatik)
`main` ga push qilingach:
1. **CI** (`ci.yml`) — backend `tsc` + frontend `build` tekshiradi.
2. **Deploy** (`deploy.yml`) — GHCR ga `sulton-backend`/`sulton-frontend` image (`:latest` + `:sha`) push.
3. **SSH** — serverда `git pull` → `docker compose -f docker-compose.deploy.yml pull` → `up -d` → eski image'lar tozalanadi.
4. Migratsiyalar backend entrypoint'da avtomatik (`prisma migrate deploy` + idempotent seed).

Qo'lda ishga tushirish: Actions → **Deploy** → *Run workflow*.

### 10.5. GHCR paket ko'rinishi
Birinchi push'dan so'ng GitHub → Packages → `sulton-backend`/`sulton-frontend`:
- **Public** qilsangiz — server login'siz pull qiladi (`GHCR_PAT` shart emas).
- **Private** qoldirsangiz — `GHCR_PAT` secret + serverda `docker login` kerak.

---

## Eslatmalar
- **Portlar:** faqat nginx (80/443) tashqariga ochiq. Backend/frontend/DB ichki tarmoqda.
- **PDF:** backend image'ida Chromium o'rnatilgan (puppeteer `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`).
- **Frontend API:** brauzer `/api` ga so'rov yuboradi, nginx uni backendga uzatadi (CORS muammosi yo'q).
- **Telegram/SMS/E-maktab:** `.env` da kalitlar bo'sh bo'lsa, tizim ishlaydi — shunchaki o'sha funksiyalar o'chiq bo'ladi.
- **Redis/MinIO:** hozircha zaxira (kelajakdagi navbat/fayl saqlash uchun) — tizim ularsiz ham ishlaydi.
