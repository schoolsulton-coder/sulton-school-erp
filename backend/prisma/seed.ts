import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// 7 rol
const ROLES = [
  { slug: 'superadmin', name: 'Superadmin' },
  { slug: 'admin', name: 'Administrator' },
  { slug: 'akademik', name: "Akademik bo'lim rahbari" },
  { slug: 'sales', name: 'Sotuv menejeri' },
  { slug: 'coordinator', name: 'Koordinator' },
  { slug: 'teacher', name: 'Ustoz' },
  { slug: 'curator', name: 'Kurator' },
  { slug: 'student', name: "O'quvchi" },
  { slug: 'guardian', name: 'Vasiy' },
];

// Ruxsatlar (group.action)
const PERMISSION_GROUPS: Record<string, string[]> = {
  students: ['view', 'create', 'update', 'delete'],
  crm: ['view', 'create', 'update', 'delete'],
  classes: ['view', 'create', 'update', 'delete'],
  contracts: ['view', 'create', 'update', 'delete'],
  finance: ['view', 'create', 'update', 'delete'],
  hr: ['view', 'create', 'update', 'delete'],
  payroll: ['view', 'create', 'update', 'delete'],
  grades: ['view', 'create', 'update', 'delete'],
  attendance: ['view', 'create', 'update', 'delete'],
  homework: ['view', 'create', 'update', 'delete'],
  behavior: ['view', 'create', 'update', 'delete'],
  users: ['view', 'create', 'update', 'delete'],
  reports: ['view'],
  notifications: ['view'],
};

// Rolga biriktiriladigan ruxsat guruhlari (superadmin — barchasi)
const ROLE_PERMISSIONS: Record<string, string[]> = {
  // Administrator: Qabul (CRM), Shartnoma/To'lov (contracts), O'quvchi+Vasiy (students)
  admin: [
    'crm.view', 'crm.create', 'crm.update', 'crm.delete',
    'contracts.view', 'contracts.create', 'contracts.update', 'contracts.delete',
    'students.view', 'students.create', 'students.update', 'students.delete',
  ],
  // Akademik bo'lim rahbari: Ma'lumotlar (students+classes) + O'quv jarayoni
  akademik: [
    'students.view', 'students.create', 'students.update', 'students.delete',
    'classes.view', 'classes.create', 'classes.update', 'classes.delete',
    'grades.view', 'grades.create', 'grades.update', 'grades.delete',
    'attendance.view', 'attendance.create', 'attendance.update', 'attendance.delete',
    'homework.view', 'homework.create', 'homework.update', 'homework.delete',
    'behavior.view', 'behavior.create', 'behavior.update', 'behavior.delete',
  ],
  sales: ['crm.view', 'crm.create', 'crm.update', 'students.view'],
  coordinator: [
    'classes.view',
    'classes.create',
    'classes.update',
    'students.view',
    'students.create',
    'students.update',
  ],
  teacher: [
    'grades.view',
    'grades.create',
    'grades.update',
    'attendance.view',
    'attendance.create',
    'homework.view',
    'homework.create',
    'homework.update',
    'behavior.create',
  ],
  curator: [
    'students.view',
    'grades.view',
    'attendance.view',
    'attendance.create',
    'behavior.view',
    'behavior.create',
  ],
};

async function main() {
  console.log('🌱 Seed boshlandi...');

  // 1) Ruxsatlar
  const allPermissions: string[] = [];
  for (const [group, actions] of Object.entries(PERMISSION_GROUPS)) {
    for (const action of actions) {
      const slug = `${group}.${action}`;
      allPermissions.push(slug);
      await prisma.permission.upsert({
        where: { slug },
        update: {},
        create: { slug, name: slug, group },
      });
    }
  }

  // 2) Rollar
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: { name: role.name },
      create: role,
    });
  }

  // 3) Rol↔Ruxsat
  const permissionRows = await prisma.permission.findMany();
  const permMap = new Map(permissionRows.map((p) => [p.slug, p.id]));

  const superadminRole = await prisma.role.findUnique({ where: { slug: 'superadmin' } });
  // superadmin — barcha ruxsatlar (hamma oyna ko'rinadi)
  for (const slug of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superadminRole!.id,
          permissionId: permMap.get(slug)!,
        },
      },
      update: {},
      create: { roleId: superadminRole!.id, permissionId: permMap.get(slug)! },
    });
  }
  // boshqa rollar
  for (const [roleSlug, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { slug: roleSlug } });
    for (const slug of perms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role!.id,
            permissionId: permMap.get(slug)!,
          },
        },
        update: {},
        create: { roleId: role!.id, permissionId: permMap.get(slug)! },
      });
    }
  }

  // 4) Admin foydalanuvchi
  const adminPhone = process.env.ADMIN_PHONE ?? '+998990000000';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
  await prisma.user.upsert({
    where: { phone: adminPhone },
    update: { roleId: superadminRole!.id },
    create: {
      fullName: 'Bosh administrator',
      phone: adminPhone,
      password: await argon2.hash(adminPassword),
      roleId: superadminRole!.id,
    },
  });

  // 5) Namuna fanlar (idempotent — faqat bo'sh bo'lsa)
  if ((await prisma.subject.count()) === 0) {
    const subjects = ['Matematika', 'Ona tili', 'Ingliz tili', 'Fizika', 'Tarix'];
    for (const name of subjects) {
      await prisma.subject.create({ data: { name } });
    }
  }

  // 6) Qabul bosqichlari (pipeline — idempotent)
  if ((await prisma.leadStage.count()) === 0) {
    const stages = [
      'Yangi',
      'Suhbatga chaqirildi',
      'Shartnoma tuzishga',
      'Shartnoma tuzdi',
      'Shartnoma tuzmadi',
    ];
    for (let i = 0; i < stages.length; i++) {
      await prisma.leadStage.create({ data: { name: stages[i], order: i } });
    }
  }

  // 7) Sozlamalar reference ma'lumotlari (Filial, Psixolog, O'quv yili)
  if ((await prisma.branch.count()) === 0) {
    for (const name of ['Bosh filial']) {
      await prisma.branch.create({ data: { name } });
    }
  }
  if ((await prisma.psychologist.count()) === 0) {
    for (const fullName of ['Damira Babadjanova', 'Manija Abdullayeva', 'Durdona']) {
      await prisma.psychologist.create({ data: { fullName } });
    }
  }
  if ((await prisma.academicYear.count()) === 0) {
    for (const name of ['2026-2027']) {
      await prisma.academicYear.create({ data: { name } });
    }
  }

  console.log(`✅ Seed tugadi. Admin: ${adminPhone} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
