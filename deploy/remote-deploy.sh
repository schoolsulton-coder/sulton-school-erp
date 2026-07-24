#!/usr/bin/env bash
# Serverda ishlaydi (GitHub Actions SSH orqali yuboradi).
# Xavfsiz: build MUVAFFAQIYATLI bo'lsagina pm2 restart bo'ladi (buzuq kod prod'ni to'xtatmaydi).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/sulton-erp}"
cd "$APP_DIR"

echo "==> Kod yangilanmoqda"
git fetch --all --quiet
git reset --hard origin/main

echo "==> Backend"
cd "$APP_DIR/backend"
npm ci --no-audit --prefer-offline
npx prisma migrate deploy
npm run build

echo "==> Frontend"
cd "$APP_DIR/frontend"
npm ci --no-audit --prefer-offline
npm run build

echo "==> Qayta ishga tushirish (pm2)"
cd "$APP_DIR"
pm2 restart deploy/ecosystem.config.js --update-env
pm2 save

echo "==> Deploy tugadi ✅"
