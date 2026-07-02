#!/bin/sh
set -e

echo "⏳ Ma'lumotlar bazasi migratsiyalari qo'llanmoqda..."
i=1
until npx prisma migrate deploy; do
  if [ "$i" -ge 15 ]; then
    echo "❌ DB ga ulanib bo'lmadi (15 urinish)."
    exit 1
  fi
  echo "DB hali tayyor emas, qayta urinish ($i)..."
  i=$((i + 1))
  sleep 3
done

# Asosiy seed — rollar, ruxsatlar, admin (idempotent: har startda xavfsiz).
# Demo/visits seed YO'Q — ular faqat qo'lda (DEPLOY.md ga qarang).
echo "🌱 Asosiy seed (rollar, ruxsatlar, admin)..."
npm run prisma:seed || echo "⚠️ Seed o'tkazib yuborildi — keyin qo'lda ishga tushiring."

echo "🚀 Backend ishga tushmoqda (port 4000)..."
exec node dist/src/main
