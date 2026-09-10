// Mavjud foydalanuvchilarga "Xodim kartasi" ochadi (Maoshlar → Xodimlar oynasida ko'rinishi uchun).
//
//   node prisma/employees-backfill.js --dry   — kimga karta ochilishini ko'rsatadi
//   node prisma/employees-backfill.js         — kartalarni yaratadi
//
// O'quvchi/vasiy (portal) akkauntlariga karta ochilmaydi.
// Kartasi bor xodimlarga tegilmaydi — skript qayta ishga tushirilsa ham dublikat bo'lmaydi.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY = process.argv.includes('--dry');
const PORTAL_ROLES = ['student', 'guardian'];

(async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      fullName: true,
      phone: true,
      role: { select: { slug: true, name: true } },
      employee: { select: { id: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const targets = users.filter(
    (u) => !PORTAL_ROLES.includes(u.role.slug) && !u.employee,
  );
  const skipped = users.length - targets.length;

  console.log(`Foydalanuvchilar: ${users.length} · karta ochiladi: ${targets.length} · tegilmaydi: ${skipped}`);
  for (const u of targets) console.log(`  ${u.phone.padEnd(15)} ${u.role.name.padEnd(28)} ${u.fullName}`);

  if (DRY) {
    console.log('\n--dry: baza o‘zgartirilmadi.');
    return;
  }
  if (!targets.length) {
    console.log('\nHamma xodimda karta bor.');
    return;
  }

  const now = new Date();
  const res = await prisma.employee.createMany({
    data: targets.map((u) => ({ userId: u.id, hireDate: now })),
    skipDuplicates: true,
  });
  console.log(`\nTayyor: ${res.count} ta xodim kartasi ochildi.`);
  console.log("Lavozim, bo'lim va filialni Maoshlar → Xodimlar oynasidan to'ldirasiz.");
})()
  .catch((e) => {
    console.error('Xato:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
