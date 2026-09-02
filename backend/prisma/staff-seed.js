// Xodimlar ro'yxatini "Foydalanuvchilar" oynasiga qo'shadi (jonli bazada, oddiy `node` bilan).
//
//   node prisma/staff-seed.js --dry                 — o'zgartirmasdan ro'yxatni ko'rsatadi
//   STAFF_PASSWORD='KuchliParol' node prisma/staff-seed.js
//
// Qoidalar:
//  - Telefon (login) bo'yicha upsert: mavjud xodimning ismi/roli/fani yangilanadi,
//    PAROLI TEGILMAYDI. Yangi xodimga STAFF_PASSWORD (default: sulton2026) beriladi.
//  - Lavozim uchun rol bo'lmasa — rol avtomatik yaratiladi (ROLES).
//  - Fan o'qituvchilariga rol `teacher` + o'qitadigan fan biriktiriladi (fan bo'lmasa — yaratiladi).
const argon2 = require('argon2');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY = process.argv.includes('--dry');
const PASSWORD = process.env.STAFF_PASSWORD || 'sulton2026';

// Lavozim → rol. Bazada bo'lmagan rollar shu nom/ruxsatlar bilan yaratiladi.
// permissions: null — mavjud rolga tegilmaydi; ['*'] — barcha ruxsatlar.
const ROLES = {
  direktor: { name: 'Direktor', permissions: ['*'] },
  akademik: { name: "Akademik bo'lim rahbari", permissions: null },
  xojalik: {
    name: "Xo'jalik ishlari bo'yicha direktor o'rinbosari",
    permissions: ['finance.view', 'hr.view', 'reports.view', 'notifications.view'],
  },
  psixolog: {
    name: 'Psixolog',
    permissions: ['students.view', 'behavior.view', 'behavior.create', 'behavior.update', 'notifications.view'],
  },
  kassir: {
    name: 'Kassir',
    permissions: ['finance.view', 'finance.create', 'finance.update', 'contracts.view', 'students.view', 'reports.view', 'notifications.view'],
  },
  admin: { name: 'Administrator', permissions: null },
  kutubxonachi: { name: 'Kutubxonachi', permissions: ['students.view', 'notifications.view'] },
  coordinator: { name: 'Koordinator', permissions: null },
  teacher: { name: 'Ustoz', permissions: null },
  hamshira: { name: 'Hamshira', permissions: ['students.view', 'attendance.view', 'notifications.view'] },
  tozalovchi: { name: 'Tozalovchi', permissions: ['notifications.view'] },
};

// Rasmdagi ro'yxat: ism | lavozim (jadvaldagidek) | telefon | rol | fan (ustozlar uchun)
const STAFF = [
  { fullName: 'Tursunboiyev Bakirjon Muxammadjhon', position: 'Direktor', phone: '90-398-3399', role: 'direktor' },
  { fullName: 'Nishanova Dilorom Abdiraimovna', position: "O'quv ishlari bo'yicha direktor o'rinbosari", phone: '93-565-2356', role: 'akademik' },
  { fullName: 'Qodirqulov Abdulaziz', position: "Xo'jalik ishlari bo'yicha direktor o'rinbosari", phone: '93-582-4747', role: 'xojalik' },
  { fullName: "Raxmatullayeva Gulzoda G'ulomjonovna", position: 'Psixolog', phone: '93-666-1985', role: 'psixolog' },
  { fullName: 'Toshmatova Shoxista Abdukasimovna', position: 'Kassir', phone: '90-128-0111', role: 'kassir' },
  { fullName: 'Kidiraliyeva Madina Otabek qizi', position: 'Administrator', phone: '97-057-0097', role: 'admin' },
  { fullName: 'Abdumannobova Omina Umidovna', position: 'Administrator', phone: '94-674-8012', role: 'admin' },
  { fullName: 'Madraimova Dilzoda Raxmonali qizi', position: 'Kutubxonachi', phone: '90-943-1106', role: 'kutubxonachi' },
  { fullName: 'Karayev Soatali', position: 'Koordinator', phone: '93-161-30-33', role: 'coordinator' },
  { fullName: 'Xilov Biloliddin', position: 'Koordinator', phone: '93-770-7177', role: 'coordinator' },
  { fullName: 'Raxmatova Diyora Sunatalla qizi', position: 'Koordinator', phone: '93-888-93-03', role: 'coordinator' },
  { fullName: 'Xamiyeva Sharifa Xusniddin qizi', position: 'Koordinator', phone: '93-806-77-76', role: 'coordinator' },
  { fullName: 'Usmanova Liliya', position: 'Koordinator', phone: '120-37-73', role: 'coordinator' },
  { fullName: 'Xusanova Nafisa', position: "Boshlang'ich", phone: '94-404-8682', role: 'teacher', subject: "Boshlang'ich sinf" },
  { fullName: 'Ikromaliyeva Maftuna Tolib qizi', position: "Boshlang'ich", phone: '94-212-2399', role: 'teacher', subject: "Boshlang'ich sinf" },
  { fullName: 'Baskakova Yekaterina Sergeyevna', position: "Boshlang'ich", phone: '94-405-51-07', role: 'teacher', subject: "Boshlang'ich sinf" },
  { fullName: 'Tillayeva Nilufar Baxtiyor qizi', position: 'Ingliz tili', phone: '99-514-5596', role: 'teacher', subject: 'Ingliz tili' },
  { fullName: 'Giyosova Dilnora Abdulatif qizi', position: 'Ingliz tili', phone: '93-668-3229', role: 'teacher', subject: 'Ingliz tili' },
  { fullName: 'Xudoyberdiyeva Zilola', position: 'Ingliz tili', phone: '91-797-01-07', role: 'teacher', subject: 'Ingliz tili' },
  { fullName: 'Xakimova Sitora', position: 'Kimyo-biologiya', phone: '99-867-4964', role: 'teacher', subject: 'Kimyo-biologiya' },
  { fullName: 'Akbarova Niginabonu', position: "Tarix fani o'qituvchisi", phone: '94-294-0517', role: 'teacher', subject: 'Tarix' },
  { fullName: 'Saydaliyev Ilhom', position: 'IT', phone: '93-600-6199', role: 'teacher', subject: 'Informatika (IT)' },
  { fullName: 'Xalikulova Sayyora', position: 'Fizika-matematika', phone: '99-619-2612', role: 'teacher', subject: 'Fizika-matematika' },
  { fullName: "Mirjonov Oqiljon Komiljon o'g'li", position: 'Matematika', phone: '93-999-2304', role: 'teacher', subject: 'Matematika' },
  { fullName: 'Qosimov Alyor', position: 'Geografiya', phone: '93-379-5919', role: 'teacher', subject: 'Geografiya' },
  { fullName: 'Uralova Farida Raximberdiyevna', position: "Mohir qo'llar", phone: '93-163-62-29', role: 'teacher', subject: "Mohir qo'llar" },
  { fullName: "Yo'ldashmatova Jasmina Bahodirovna", position: "Rus tili fan o'qituvchisi", phone: '94-529-59-50', role: 'teacher', subject: 'Rus tili' },
  { fullName: 'Axmedova Madinabonu', position: 'Ona tili', phone: '77-492-1025', role: 'teacher', subject: 'Ona tili' },
  { fullName: "Madaipov Axror Abduraim o'g'li", position: 'Tarbiya va Arab tili', phone: '94-321-22-12', role: 'teacher', subject: 'Tarbiya va Arab tili' },
  { fullName: 'Yusupova Zulayxo', position: 'Hamshira', phone: '77-452-49-09', role: 'hamshira' },
  { fullName: 'Umirov Olimjon', position: 'Kamondan otish', phone: '94-621-67-65', role: 'teacher', subject: 'Kamondan otish' },
  { fullName: 'Daliyev Yodgorbek', position: 'Rahbar (lavozim aniqlanmagan)', phone: '94-046-15-55', role: 'teacher' },
  { fullName: "Norboyev Muhammadlatif Abduraim o'g'li", position: 'Robototexnika', phone: '94-681-62-33', role: 'teacher', subject: 'Robototexnika' },
  { fullName: 'Xiytboyeva Mutabar', position: 'Tozalovchi', phone: '94-604-99-35', role: 'tozalovchi' },
];

/** "93-161-30-33" → "+998931613033"; noto'g'ri uzunlik — null */
function normPhone(raw) {
  const d = String(raw).replace(/\D/g, '');
  if (d.length === 9) return `+998${d}`;
  if (d.length === 12 && d.startsWith('998')) return `+${d}`;
  return null;
}

async function ensureRole(slug) {
  const def = ROLES[slug] || { name: slug, permissions: null };
  const existing = await prisma.role.findUnique({
    where: { slug },
    include: { permissions: true },
  });
  if (existing) return { role: existing, created: false };

  const role = await prisma.role.create({ data: { slug, name: def.name } });
  if (def.permissions) {
    const perms = await prisma.permission.findMany({
      where: def.permissions[0] === '*' ? {} : { slug: { in: def.permissions } },
      select: { id: true },
    });
    if (perms.length) {
      await prisma.rolePermission.createMany({
        data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
        skipDuplicates: true,
      });
    }
  }
  return { role, created: true };
}

async function ensureSubject(name) {
  const found = await prisma.subject.findFirst({ where: { name } });
  if (found) return { subject: found, created: false };
  const subject = await prisma.subject.create({ data: { name } });
  return { subject, created: true };
}

(async () => {
  // 1) Tekshiruv — telefonlar
  const bad = [];
  const rows = [];
  const seen = new Set();
  for (const s of STAFF) {
    const phone = normPhone(s.phone);
    if (!phone) {
      bad.push({ ...s, reason: `telefon to'liq emas (${s.phone})` });
      continue;
    }
    if (seen.has(phone)) {
      bad.push({ ...s, reason: `telefon takrorlangan (${phone})` });
      continue;
    }
    seen.add(phone);
    rows.push({ ...s, phone });
  }

  console.log(`Ro'yxat: ${STAFF.length} qator → qo'shiladi: ${rows.length}, o'tkazib yuboriladi: ${bad.length}`);
  for (const b of bad) console.log(`  !! ${b.fullName} — ${b.reason}`);

  if (DRY) {
    for (const r of rows) {
      console.log(`  ${r.phone}  ${r.role.padEnd(13)} ${r.subject ? '[' + r.subject + '] ' : ''}${r.fullName}`);
    }
    console.log('\n--dry: baza o‘zgartirilmadi.');
    return;
  }

  // 2) Rollar
  const roleIds = new Map();
  for (const slug of [...new Set(rows.map((r) => r.role))]) {
    const { role, created } = await ensureRole(slug);
    roleIds.set(slug, role.id);
    if (created) console.log(`  + yangi rol: ${role.name} (${slug})`);
  }

  // 3) Fanlar
  const subjectIds = new Map();
  for (const name of [...new Set(rows.map((r) => r.subject).filter(Boolean))]) {
    const { subject, created } = await ensureSubject(name);
    subjectIds.set(name, subject.id);
    if (created) console.log(`  + yangi fan: ${name}`);
  }

  // 4) Foydalanuvchilar
  const hash = await argon2.hash(PASSWORD);
  let added = 0;
  let updated = 0;
  for (const r of rows) {
    const data = {
      fullName: r.fullName,
      roleId: roleIds.get(r.role),
      subjectId: r.subject ? subjectIds.get(r.subject) : null,
    };
    const existing = await prisma.user.findUnique({ where: { phone: r.phone } });
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data });
      updated++;
      console.log(`  ~ yangilandi: ${r.fullName} (${r.phone}) — parolga tegilmadi`);
    } else {
      await prisma.user.create({ data: { ...data, phone: r.phone, password: hash } });
      added++;
      console.log(`  + qo'shildi:  ${r.fullName} (${r.phone}) — ${r.position}`);
    }
  }

  console.log(`\nTayyor: ${added} ta yangi, ${updated} ta yangilangan.`);
  if (added) console.log(`Yangi xodimlar paroli: "${PASSWORD}" — birinchi kirishdan keyin almashtirilsin.`);
})()
  .catch((e) => {
    console.error('Xato:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
