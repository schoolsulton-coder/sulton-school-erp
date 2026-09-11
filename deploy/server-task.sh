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
    # Parol KODDA QOTIRILMAYDI: STAFF_PASSWORD secret berilmasa — staff-seed.js
    # har bir xodimga tasodifiy kuchli parol beradi va ro'yxatini chiqaradi.
    STAFF_PASSWORD="${STAFF_PASSWORD:-}" node prisma/staff-seed.js
    ;;
  staff-password)
    echo "==> Ro'yxatdagi barcha xodimlarning parolini yangilash"
    STAFF_PASSWORD="${STAFF_PASSWORD:-}" node prisma/staff-seed.js --set-password
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
  teachers)
    echo "==> Ustoz/kurator/koordinator: biriktirilgan fan, sinflar va dars soni"
    node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const us=await p.user.findMany({where:{role:{slug:{in:['teacher','curator','coordinator']}}},select:{id:true,fullName:true,phone:true,role:{select:{slug:true}},subject:{select:{name:true}},taughtClasses:{select:{class:{select:{name:true}}}}},orderBy:{fullName:'asc'}});console.log('Jami:',us.length);for(const u of us){const sch=await p.schedule.count({where:{teacherId:u.id}});const cls=u.taughtClasses.map(t=>t.class.name).join(', ')||'-';console.log(' ',u.phone.padEnd(15),u.role.slug.padEnd(12),'fan:',(u.subject?u.subject.name:'-').padEnd(18),'sinflar:',cls.padEnd(28),'jadval:',String(sch).padEnd(3),u.fullName)}})().catch(e=>console.error(e.message)).finally(()=>p.\$disconnect())"
    ;;
  employees-sync-dry)
    echo "==> Kimga xodim kartasi ochilishini ko'rish (baza o'zgarmaydi)"
    node prisma/employees-backfill.js --dry
    ;;
  employees-sync)
    echo "==> Foydalanuvchilarga xodim kartasi ochish"
    node prisma/employees-backfill.js
    ;;
  logs)
    echo "==> Backend loglari (oxirgi 150 qator)"
    pm2 logs sulton-backend --lines 150 --nostream 2>/dev/null | tail -170
    ;;
  diag)
    echo "==> Server holati"
    echo "-- pwd: $(pwd)"
    echo "-- node: $(node -v)"
    echo "-- git remotes:"; git -C "$APP_DIR" remote -v || true
    echo "-- git HEAD:"; git -C "$APP_DIR" log --oneline -1 || true
    echo "-- staff-seed.js bormi:"; ls -l prisma/staff-seed.js 2>&1 || true
    echo "-- --set-password qo'llab-quvvatlanadimi:"; grep -c 'set-password' prisma/staff-seed.js 2>/dev/null || echo 0
    echo "-- pm2:"; pm2 list 2>/dev/null | tail -5 || true
    ;;
  users)
    echo "==> Foydalanuvchilar (rol · xodim kartasi holati)"
    node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.findMany({select:{fullName:true,phone:true,status:true,role:{select:{slug:true}},employee:{select:{id:true}}},orderBy:{createdAt:'asc'}}).then(u=>{console.log('Jami:',u.length,'· xodim kartasi bor:',u.filter(x=>x.employee).length);u.forEach(x=>console.log(' ',x.role.slug.padEnd(13),x.phone.padEnd(15),x.status.padEnd(8),(x.employee?'karta+':'karta-').padEnd(7),x.fullName))}).finally(()=>p.\$disconnect())"
    ;;
  *)
    echo "Noma'lum vazifa: '${TASK:-}'" >&2
    exit 1
    ;;
esac

echo "==> Vazifa tugadi ✅"
