# Deploy — Sulton School ERP (kichik VPS, 1 GB RAM, native + PM2)

> Bu — **1 CPU / 1 GB RAM** server uchun **yengil** usul (Docker'siz): PostgreSQL + Node (PM2) + nginx.
> Kattaroq server (2–4 GB) uchun Docker varianti: `../DEPLOY.md`.

**Server:** 81.162.55.28 · **Domen:** erp.sultonschool.uz · Ubuntu 22.04
**Arxitektura:** nginx (SSL) → Next.js (:3005) + NestJS (:4000) → PostgreSQL. Hammasi bitta serverda.

> ⚠️ 1 GB RAM kam — **swap (3 GB) majburiy**, aks holda build OOM bo'ladi.

---

## 0) DNS (birinchi — tarqalishi vaqt oladi)
Domen boshqaruvida A-yozuv: `erp` → `81.162.55.28`.
Tekshirish: `nslookup erp.sultonschool.uz`.

## 1) Kirish + xavfsizlik
```bash
ssh ubuntu@81.162.55.28
sudo -i
passwd ubuntu                     # chatда ko'ringan parolni ALMASHTIRING
apt-get update && apt-get install -y ufw
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable
```

## 2) Swap (3 GB, majburiy)
```bash
fallocate -l 3G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h
```

## 3) Dasturlar
```bash
apt-get install -y curl git nginx postgresql postgresql-contrib
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs && npm i -g pm2
```

## 4) PostgreSQL
```bash
sudo -u postgres psql <<'SQL'
CREATE USER sulton WITH PASSWORD 'BAZA_PAROLINI_ALMASHTIRING';
CREATE DATABASE sulton_school OWNER sulton;
GRANT ALL PRIVILEGES ON DATABASE sulton_school TO sulton;
SQL
```

## 5) Kodni yuklash
```bash
mkdir -p /opt && cd /opt
git clone https://github.com/schoolsulton-coder/sulton-school-erp.git sulton-erp
cd /opt/sulton-erp
```

## 6) Backend
```bash
cd /opt/sulton-erp/backend
cp .env.production.example .env
nano .env     # DATABASE_URL paroli, JWT (openssl rand -hex 32), TELEGRAM_BOT_TOKEN, ADMIN_PASSWORD
npm ci
npx prisma migrate deploy
npm run prisma:seed          # rollar + superadmin (+998990000000)
npm run build
```

## 7) Frontend
```bash
cd /opt/sulton-erp/frontend
cp .env.production.example .env.production
npm ci
npm run build                # RAM eng ko'p shu yerda — swap yordam beradi
```

## 8) PM2
```bash
cd /opt/sulton-erp
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root    # chiqqan buyruqni bajaring
pm2 status
```

## 9) Nginx + SSL
```bash
cp /opt/sulton-erp/deploy/nginx/erp.sultonschool.uz.conf /etc/nginx/sites-available/erp
ln -sf /etc/nginx/sites-available/erp /etc/nginx/sites-enabled/erp
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d erp.sultonschool.uz --redirect -m siz@email.uz --agree-tos --no-eff-email
```

## 10) Tekshirish
Brauzer: **https://erp.sultonschool.uz** → login. Kirish: `+998990000000` / `.env` dagi `ADMIN_PASSWORD`.

---

## Yangilash
```bash
cd /opt/sulton-erp && git pull
cd backend && npm ci && npx prisma migrate deploy && npm run build
cd ../frontend && npm ci && npm run build
cd .. && pm2 restart all
```

## Eslatmalar
- **Telegram bot:** long-polling (webhook shart emas). Bitta token — **faqat bitta** server; lokal backend'ni yoping yoki prod uchun alohida bot oching (aks holda 409).
- **PDF eksport:** Chromium o'rnatilmagan bo'lsa faqat PDF funksiyasi ishlamaydi (qolgani ishlaydi). Kerak bo'lsa: `apt-get install -y chromium-browser`.
- **Loglar:** `pm2 logs sulton-backend` / `pm2 logs sulton-frontend`.
- **Backup (kunlik):** `sudo -u postgres pg_dump sulton_school | gzip > /root/backup_$(date +%F).sql.gz`
