/**
 * Hisob va rol xizmat buyruqlari (jonli bazada, oddiy `node` bilan ishlaydi).
 * Maxfiy qiymatlar faqat env orqali keladi — logga parol chiqarilmaydi.
 *
 *   node prisma/account-tools.js admin-create      # ADMIN_PHONE + ADMIN_PASSWORD
 *   node prisma/account-tools.js make-owner        # OWNER_PHONE → "owner" roli
 *   node prisma/account-tools.js coordinators      # COORDINATORS_JSON (+COORDINATOR_PASSWORD)
 *   node prisma/account-tools.js coordinators --dry
 *   node prisma/account-tools.js students-inactive [--dry]
 */
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const prisma = new PrismaClient();

const ENROLLED = ['ACTIVE', 'COMPLETED', 'SUSPENDED', 'TEMP_SUSPENDED'];

/** "+99893-770-71-77" → "+998937707177" */
function normPhone(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('998')) return `+${d}`;
  if (d.length === 9) return `+998${d}`;
  return `+${d}`;
}
/** Logda telefon to'liq ko'rinmasin (repo va Actions logi ochiq) */
const mask = (phone) => (phone.length > 8 ? `${phone.slice(0, 7)}***${phone.slice(-2)}` : '***');

/** Sinf nomini taqqoslash uchun: "6-Ahmad Al-Farg'oniy" → "6ahmadalfargoniy" */
const normClass = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/[‘’'`´]/g, '')
    .replace(/[^a-z0-9а-яё]/gi, '');

async function ensureRole(slug, name) {
  return prisma.role.upsert({ where: { slug }, update: {}, create: { slug, name } });
}

// ===================== admin-create =====================
async function adminCreate() {
  const phone = normPhone(process.env.ADMIN_PHONE);
  const password = String(process.env.ADMIN_PASSWORD || '');
  const fullName = String(process.env.ADMIN_NAME || 'Administrator').trim();
  if (!phone || !password) {
    console.error('Xato: ADMIN_PHONE va ADMIN_PASSWORD secret\'lari kerak.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Xato: parol kamida 8 ta belgi bo'lsin.");
    process.exit(1);
  }
  const role = await ensureRole('admin', 'Administrator');
  const hash = await argon2.hash(password);
  const existing = await prisma.user.findUnique({ where: { phone }, select: { id: true, fullName: true } });
  if (existing) {
    if (process.env.ADMIN_OVERWRITE !== '1') {
      console.error(`Xato: ${mask(phone)} raqami allaqachon band (${existing.fullName}).`);
      console.error("Boshqa raqam tanlang yoki ataylab shu hisobni almashtirmoqchi bo'lsangiz ADMIN_OVERWRITE=1 secret'ini qo'shing.");
      process.exit(1);
    }
    await prisma.user.update({ where: { id: existing.id }, data: { password: hash, roleId: role.id, status: 'ACTIVE' } });
    console.log(`Administrator yangilandi: ${existing.fullName} · ${mask(phone)} (rol: admin, parol almashtirildi)`);
  } else {
    const u = await prisma.user.create({ data: { fullName, phone, password: hash, roleId: role.id } });
    console.log(`Administrator yaratildi: ${u.fullName} · ${mask(phone)} (rol: admin)`);
  }
  const perms = await prisma.rolePermission.count({ where: { roleId: role.id } });
  console.log(`Administrator rolida ${perms} ta ruxsat (qabul, shartnoma/to'lov, o'quvchi, sinflarni ko'rish).`);
}

// ===================== make-owner =====================
async function makeOwner() {
  const phone = normPhone(process.env.OWNER_PHONE || '+998990000000');
  const role = await ensureRole('owner', 'Egasi (Owner)');
  // Owner roliga barcha ruxsatlar
  const perms = await prisma.permission.findMany({ select: { id: true } });
  await prisma.rolePermission.createMany({
    data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
    skipDuplicates: true,
  });
  const user = await prisma.user.findUnique({ where: { phone }, select: { id: true, fullName: true } });
  if (!user) {
    console.error(`Xato: ${mask(phone)} raqamli foydalanuvchi topilmadi.`);
    process.exit(1);
  }
  await prisma.user.update({ where: { id: user.id }, data: { roleId: role.id } });
  console.log(`${user.fullName} · ${mask(phone)} → Owner roli (${perms.length} ta ruxsat).`);
  console.log('Eslatma: yangi rol kuchga kirishi uchun hisobdan chiqib, qayta kiring.');
}

// ===================== coordinators =====================
async function coordinators(dry) {
  const raw = process.env.COORDINATORS_JSON;
  if (!raw) {
    console.error("Xato: COORDINATORS_JSON secret'i kerak. Format: [{\"name\":\"...\",\"phone\":\"+9989...\",\"classes\":[\"6-Ahmad Al-Farg'oniy\"]}]");
    process.exit(1);
  }
  let list;
  try {
    list = JSON.parse(raw);
  } catch (e) {
    console.error('Xato: COORDINATORS_JSON JSON formatida emas:', e.message);
    process.exit(1);
  }
  if (!Array.isArray(list) || !list.length) {
    console.error("Xato: COORDINATORS_JSON bo'sh.");
    process.exit(1);
  }

  const role = await ensureRole('coordinator', 'Koordinator');
  // Hisobi yo'q koordinatorga shu parol bilan hisob ochiladi (berilmasa — ochilmaydi)
  const newPassword = String(process.env.COORDINATOR_PASSWORD || '');
  const allClasses = await prisma.class.findMany({ select: { id: true, name: true } });
  const byName = new Map(allClasses.map((c) => [normClass(c.name), c]));

  let missingClasses = 0;
  console.log(`${dry ? '[DRY-RUN] ' : ''}Koordinatorlar: ${list.length} ta`);
  for (const row of list) {
    const phone = normPhone(row.phone);
    let user = await prisma.user.findUnique({ where: { phone }, select: { id: true, fullName: true, role: { select: { slug: true } } } });
    const label = `${user ? user.fullName : row.name ?? '—'} · ${mask(phone)}`;

    // Sinf nomlarini moslash (dry-run'da ham ko'rinadi)
    const wanted = [];
    const missing = [];
    for (const cn of row.classes ?? []) {
      const cls = byName.get(normClass(cn));
      if (cls) wanted.push(cls);
      else missing.push(cn);
    }
    missingClasses += missing.length;

    if (!user) {
      if (!newPassword) {
        console.log(`  ✗ ${label} — hisob topilmadi. COORDINATOR_PASSWORD secret'i berilsa, hisob avtomat ochiladi.`);
        if (missing.length) console.log(`     ⚠ sinf topilmadi: ${missing.join(', ')}`);
        continue;
      }
      if (dry) {
        console.log(`  + ${label} — yangi hisob ochiladi (rol: coordinator)`);
      } else {
        user = await prisma.user.create({
          data: { fullName: row.name || 'Koordinator', phone, password: await argon2.hash(newPassword), roleId: role.id },
          select: { id: true, fullName: true, role: { select: { slug: true } } },
        });
        console.log(`  + ${label} — yangi hisob ochildi (rol: coordinator, parol: COORDINATOR_PASSWORD)`);
      }
    }

    if (!dry && user) {
      if (user.role.slug !== 'coordinator') {
        await prisma.user.update({ where: { id: user.id }, data: { roleId: role.id } });
      }
      // Faqat ro'yxatdagi sinflar qolsin. Bironta ham sinf topilmasa — tegilmaydi
      // (aks holda noto'g'ri yozilgan nom borini ham o'chirib yuborardi).
      // Kurator biriktiruvi saqlanadi: u alohida majburiyat.
      if (wanted.length) {
        await prisma.classTeacher.deleteMany({
          where: { teacherId: user.id, isCurator: false, classId: { notIn: wanted.map((c) => c.id) } },
        });
        await prisma.classTeacher.createMany({
          data: wanted.map((c) => ({ classId: c.id, teacherId: user.id, isCurator: false })),
          skipDuplicates: true,
        });
      }
    }
    const names = wanted.map((c) => c.name).join(', ') || '—';
    console.log(`  ✓ ${label} · rol: coordinator · sinflar: ${names}`);
    if (missing.length) console.log(`     ⚠ sinf topilmadi: ${missing.join(', ')} — bu sinflar biriktirilmadi`);
  }
  if (missingClasses) {
    console.log(`\nBazadagi sinf nomlari (${allClasses.length} ta): ${allClasses.map((c) => c.name).join(' | ')}`);
    console.log("To'g'ri nomni COORDINATORS_JSON'ga yozib, vazifani qaytadan ishga tushiring.");
  }
  if (dry) console.log('(dry-run — baza o\'zgarmadi)');
}

// ===================== students-inactive =====================
async function studentsInactive(dry) {
  const toInactive = await prisma.student.findMany({
    where: {
      status: 'ACTIVE',
      contracts: { some: {} },
      NOT: { contracts: { some: { status: { in: ENROLLED } } } },
    },
    select: { id: true },
  });
  const toActive = await prisma.student.findMany({
    where: { status: 'INACTIVE', contracts: { some: { status: { in: ENROLLED } } } },
    select: { id: true },
  });
  console.log(`${dry ? '[DRY-RUN] ' : ''}Nofaol qilinadi: ${toInactive.length} · qayta faol: ${toActive.length}`);
  if (!dry) {
    if (toInactive.length) {
      await prisma.student.updateMany({ where: { id: { in: toInactive.map((s) => s.id) } }, data: { status: 'INACTIVE' } });
    }
    if (toActive.length) {
      await prisma.student.updateMany({ where: { id: { in: toActive.map((s) => s.id) } }, data: { status: 'ACTIVE' } });
    }
  }
  const stats = await prisma.student.groupBy({ by: ['status'], _count: { _all: true } });
  console.log('Holatlar:', stats.map((s) => `${s.status}=${s._count._all}`).join(', '));
}

(async () => {
  const cmd = process.argv[2];
  const dry = process.argv.includes('--dry');
  if (cmd === 'admin-create') await adminCreate();
  else if (cmd === 'make-owner') await makeOwner();
  else if (cmd === 'coordinators') await coordinators(dry);
  else if (cmd === 'students-inactive') await studentsInactive(dry);
  else {
    console.error("Noma'lum buyruq. admin-create | make-owner | coordinators | students-inactive");
    process.exit(1);
  }
})()
  .catch((e) => {
    console.error('Xato:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
