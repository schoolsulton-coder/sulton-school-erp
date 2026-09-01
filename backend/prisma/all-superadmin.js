// Barcha foydalanuvchilarni "superadmin" roliga o'tkazadi (jonli bazada, seed'siz).
//
//   node prisma/all-superadmin.js            — xodimlar (portal akkauntlaridan tashqari)
//   node prisma/all-superadmin.js --all      — istisnosiz hamma (o'quvchi/vasiy ham)
//   node prisma/all-superadmin.js --dry      — o'zgartirmasdan faqat ro'yxatni ko'rsatadi
//   node prisma/all-superadmin.js --restore prisma/backups/roles-<vaqt>.json  — eski rollarni qaytaradi
//
// Diqqat: o'quvchi/vasiy akkauntlari superadmin bo'lsa, ular /portal o'rniga
// admin panelga tushib qoladi — shuning uchun ular default'da chetlab o'tiladi.
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const args = process.argv.slice(2);
const INCLUDE_ALL = args.includes('--all');
const DRY = args.includes('--dry');
const RESTORE = args.includes('--restore') ? args[args.indexOf('--restore') + 1] : null;

const PORTAL_ROLES = ['student', 'guardian'];
const BACKUP_DIR = path.join(__dirname, 'backups');

async function ensureSuperadmin() {
  const role = DRY
    ? await prisma.role.findUnique({ where: { slug: 'superadmin' } })
    : await prisma.role.upsert({
        where: { slug: 'superadmin' },
        update: { name: 'Superadmin' },
        create: { slug: 'superadmin', name: 'Superadmin' },
      });
  if (!role) throw new Error("superadmin roli topilmadi (--dry: avval seed yoki oddiy rejimda ishga tushiring)");
  // superadmin — bazadagi barcha ruxsatlar
  const perms = await prisma.permission.findMany({ select: { id: true } });
  if (!DRY) {
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }
  return { role, permCount: perms.length };
}

async function restore(file) {
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  const byRole = new Map();
  for (const r of rows) {
    if (!byRole.has(r.roleId)) byRole.set(r.roleId, []);
    byRole.get(r.roleId).push(r.id);
  }
  let n = 0;
  for (const [roleId, ids] of byRole) {
    const res = await prisma.user.updateMany({ where: { id: { in: ids } }, data: { roleId } });
    n += res.count;
  }
  console.log(`Qaytarildi: ${n} foydalanuvchi (${path.basename(file)})`);
}

(async () => {
  if (RESTORE) return restore(RESTORE);

  const { role: superadmin, permCount } = await ensureSuperadmin();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      fullName: true,
      phone: true,
      roleId: true,
      role: { select: { slug: true } },
      studentProfile: { select: { id: true } },
      guardianProfile: { select: { id: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const isPortal = (u) => PORTAL_ROLES.includes(u.role.slug) || u.studentProfile || u.guardianProfile;
  const skipped = INCLUDE_ALL ? [] : users.filter(isPortal);
  const targets = users
    .filter((u) => (INCLUDE_ALL ? true : !isPortal(u)))
    .filter((u) => u.roleId !== superadmin.id);

  console.log(`superadmin roli: ${permCount} ruxsat`);
  console.log(`Jami foydalanuvchi: ${users.length}, o'zgaradi: ${targets.length}, chetlab o'tiladi (portal): ${skipped.length}`);
  for (const u of targets) console.log(`  ${u.role.slug.padEnd(12)} → superadmin   ${u.fullName} (${u.phone})`);
  for (const u of skipped) console.log(`  [portal] tegilmadi: ${u.fullName} (${u.phone}) — ${u.role.slug}`);

  if (DRY) return console.log('\n--dry: baza o‘zgartirilmadi.');
  if (!targets.length) return console.log('\nHamma allaqachon superadmin.');

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backup = path.join(BACKUP_DIR, `roles-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(
    backup,
    JSON.stringify(
      targets.map((u) => ({ id: u.id, fullName: u.fullName, phone: u.phone, roleId: u.roleId, roleSlug: u.role.slug })),
      null,
      2,
    ),
  );

  const res = await prisma.user.updateMany({
    where: { id: { in: targets.map((u) => u.id) } },
    data: { roleId: superadmin.id },
  });
  console.log(`\n${res.count} foydalanuvchi superadmin bo‘ldi. Eski rollar: ${path.relative(process.cwd(), backup)}`);
  console.log('Yangi rol kuchga kirishi uchun foydalanuvchi qayta login qilsin (yoki access token yangilansin).');
})()
  .catch((e) => {
    console.error('Xato:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
