#!/usr/bin/env bash
# Serverda bir martalik xizmat buyruqlari (GitHub Actions "Server task" workflow'i yuboradi).
# SSH paroli kerak emas — Actions'dagi SSH_KEY bilan kiradi.
# Maxfiy qiymatlar (OWNER_PASSWORD, STAFF_PASSWORD) workflow'dan env orqali keladi, logga tushmaydi.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/sulton-erp}"
cd "$APP_DIR/backend"

case "${TASK:-}" in
  staff-seed-dry)
    echo "==> Xodimlar ro'yxati (dry-run — baza o'zgarmaydi)"
    node prisma/staff-seed.js --dry
    ;;
  staff-seed)
    echo "==> Xodimlarni qo'shish"
    STAFF_PASSWORD="${STAFF_PASSWORD:-sulton2026}" node prisma/staff-seed.js
    ;;
  set-owner)
    if [ -z "${OWNER_PASSWORD:-}" ]; then
      echo "Xato: OWNER_PASSWORD secret o'rnatilmagan (Settings → Secrets → Actions)" >&2
      exit 1
    fi
    echo "==> Owner (superadmin) paroli yangilanmoqda"
    OWNER_PHONE="${OWNER_PHONE:-+998990000000}" \
    OWNER_PASSWORD="$OWNER_PASSWORD" \
    OWNER_NAME="${OWNER_NAME:-Bosh administrator}" \
      node prisma/set-owner.js
    ;;
  all-superadmin-dry)
    echo "==> Barchani superadmin qilish (dry-run)"
    node prisma/all-superadmin.js --dry
    ;;
  all-superadmin)
    echo "==> Barchani superadmin qilish"
    node prisma/all-superadmin.js
    ;;
  users)
    echo "==> Foydalanuvchilar (rol bo'yicha)"
    node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.findMany({select:{fullName:true,phone:true,status:true,role:{select:{slug:true}}},orderBy:{createdAt:'asc'}}).then(u=>{console.log('Jami:',u.length);u.forEach(x=>console.log(' ',x.role.slug.padEnd(13),x.phone.padEnd(15),x.status.padEnd(8),x.fullName))}).finally(()=>p.\$disconnect())"
    ;;
  *)
    echo "Noma'lum vazifa: '${TASK:-}'" >&2
    exit 1
    ;;
esac

echo "==> Vazifa tugadi ✅"
