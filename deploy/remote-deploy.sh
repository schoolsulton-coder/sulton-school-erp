#!/usr/bin/env bash
# Serverda ishlaydi (GitHub Actions SSH orqali yuboradi).
# Xavfsiz: build MUVAFFAQIYATLI bo'lsagina pm2 restart bo'ladi (buzuq kod prod'ni to'xtatmaydi).
# Maxfiy .env qiymatlari (TELEGRAM_BOT_TOKEN, META_*) workflow'dan env orqali keladi.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/sulton-erp}"
ENV_FILE="$APP_DIR/backend/.env"

# .env dagi bitta kalitni xavfsiz yangilaydi (bo'sh qiymat — tegmaydi)
set_env() {
  local key="$1" val="${2:-}"
  [ -z "$val" ] && return 0
  [ -f "$ENV_FILE" ] || return 0
  grep -v "^${key}=" "$ENV_FILE" > "${ENV_FILE}.tmp" && mv "${ENV_FILE}.tmp" "$ENV_FILE"
  printf '%s=%s\n' "$key" "$val" >> "$ENV_FILE"
}

cd "$APP_DIR"
echo "==> Kod yangilanmoqda"
git fetch --all --quiet
git reset --hard origin/main

echo "==> Maxfiy sozlamalar (.env) yangilanmoqda"
set_env TELEGRAM_BOT_TOKEN "${TELEGRAM_BOT_TOKEN:-}"
set_env META_VERIFY_TOKEN "${META_VERIFY_TOKEN:-}"
set_env META_APP_SECRET "${META_APP_SECRET:-}"
set_env IG_APP_SECRET "${IG_APP_SECRET:-}"
set_env IG_PAGE_TOKEN "${IG_PAGE_TOKEN:-}"
set_env SUPABASE_URL "${SUPABASE_URL:-}"
set_env SUPABASE_SECRET_KEY "${SUPABASE_SECRET_KEY:-}"

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

echo "==> Telegram bot holati"
sleep 6
pm2 logs sulton-backend --lines 40 --nostream 2>/dev/null \
  | grep -iE "bot ulandi|409|Conflict|chirilgan|getMe xatosi" | tail -3 || echo "(telegram log topilmadi)"

echo "==> Deploy tugadi ✅"
