// Owner (superadmin) hisobini yaratish yoki parolini yangilash — jonli bazada.
// ts-node KERAK EMAS, oddiy `node` bilan ishlaydi (prod'da ham).
//
// Ishlatish (VPS'da, /opt/sulton-erp/backend papkasida) — parolni env orqali bering
// (buyruq tarixiga tushmasligi uchun):
//   OWNER_PHONE='+998901234567' OWNER_PASSWORD='KuchliParol123' OWNER_NAME='Ism Familiya' node prisma/set-owner.js
//
// Mavjud telefon topilsa — parol yangilanadi; topilmasa — yangi owner yaratiladi.
// Rol: superadmin (barcha ruxsatlar).

const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const prisma = new PrismaClient();

async function main() {
  const phone = String(process.argv[2] || process.env.OWNER_PHONE || '').trim();
  const password = String(process.argv[3] || process.env.OWNER_PASSWORD || '');
  const fullName = String(process.argv[4] || process.env.OWNER_NAME || 'Owner').trim();

  if (!phone || !password) {
    console.error(
      "Xato: telefon va parol kerak.\n" +
        "Misol: OWNER_PHONE='+998901234567' OWNER_PASSWORD='Parol1234' node prisma/set-owner.js",
    );
    process.exit(1);
  }
  if (!/^\+?\d{9,15}$/.test(phone)) {
    console.error(`Xato: telefon formati noto'g'ri: "${phone}" (masalan +998901234567)`);
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Xato: parol kamida 8 ta belgi bo'lsin.");
    process.exit(1);
  }

  // superadmin roli bor bo'lsin
  const role = await prisma.role.upsert({
    where: { slug: 'superadmin' },
    update: { name: 'Superadmin' },
    create: { slug: 'superadmin', name: 'Superadmin' },
  });

  // superadmin roliga barcha mavjud ruxsatlarni bog'lash (idempotent)
  const perms = await prisma.permission.findMany({ select: { id: true } });
  if (perms.length) {
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }

  const existing = await prisma.user.findUnique({ where: { phone } });
  const hash = await argon2.hash(password);
  await prisma.user.upsert({
    where: { phone },
    update: { password: hash, roleId: role.id, status: 'ACTIVE' },
    create: { fullName, phone, password: hash, roleId: role.id, status: 'ACTIVE' },
  });

  console.log(
    `OK — owner ${existing ? 'yangilandi' : 'yaratildi'}: ${phone} ` +
      `(superadmin, ${perms.length} ruxsat). Endi shu telefon + parol bilan kiring.`,
  );
}

main()
  .catch((e) => {
    console.error('XATO:', e && e.message ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
