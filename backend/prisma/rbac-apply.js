// Jonli bazaga RBAC rollarini qo'llaydi (seed'ni qayta ishga tushirmasdan).
// admin'ning eski "barcha ruxsat"ini ham to'g'ri cheklangan to'plamga reset qiladi.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const GROUPS = {
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
const allSlugs = [];
for (const [g, acts] of Object.entries(GROUPS)) for (const a of acts) allSlugs.push(`${g}.${a}`);
const g2p = (groups) => groups.flatMap((g) => (GROUPS[g] || []).map((a) => `${g}.${a}`));

const SETS = {
  superadmin: allSlugs,
  owner: allSlugs,
  // Administrator: qabul, shartnoma/to'lov, o'quvchi + sinflarni ko'rish
  // Administrator: qabul, shartnoma/to'lov, o'quvchi + o'quv jarayonini KO'RISH
  admin: [
    ...g2p(['crm', 'contracts', 'students']),
    'classes.view',
    'grades.view',
    'attendance.view',
    'homework.view',
    'behavior.view',
  ],
  akademik: g2p(['students', 'classes', 'grades', 'attendance', 'homework', 'behavior']),
  sales: ['crm.view', 'crm.create', 'crm.update', 'students.view'],
  coordinator: [
    'students.view', 'classes.view',
    'grades.view', 'grades.create', 'grades.update',
    'attendance.view', 'attendance.create', 'attendance.update',
    'homework.view', 'homework.create', 'homework.update',
    'behavior.view', 'behavior.create', 'behavior.update',
  ],
  teacher: [
    'students.view', 'classes.view',
    'grades.view', 'grades.create', 'grades.update',
    'attendance.view', 'attendance.create',
    'homework.view', 'homework.create', 'homework.update',
    'behavior.view', 'behavior.create',
  ],
  curator: [
    'students.view', 'classes.view',
    'grades.view',
    'attendance.view', 'attendance.create',
    'homework.view',
    'behavior.view', 'behavior.create',
  ],
};

const ROLE_NAMES = {
  superadmin: 'Superadmin',
  owner: 'Egasi (Owner)',
  admin: 'Administrator',
  akademik: "Akademik bo'lim rahbari",
  sales: 'Sotuv menejeri',
  coordinator: 'Koordinator',
  teacher: 'Ustoz',
  curator: 'Kurator',
};

async function ensureRole(slug, name) {
  return prisma.role.upsert({ where: { slug }, update: { name }, create: { slug, name } });
}
async function setPerms(roleId, slugs) {
  const perms = await prisma.permission.findMany({ where: { slug: { in: slugs } }, select: { id: true } });
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  if (perms.length) {
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId, permissionId: p.id })),
      skipDuplicates: true,
    });
  }
  return perms.length;
}

(async () => {
  const out = [];
  for (const [slug, slugs] of Object.entries(SETS)) {
    const role = await ensureRole(slug, ROLE_NAMES[slug] || slug);
    out.push(`${slug}=${await setPerms(role.id, slugs)}`);
  }
  console.log("Rol ruxsatlari qo'llandi:", out.join(', '));
})()
  .catch((e) => console.error('RBAC xato:', e.message))
  .finally(() => prisma.$disconnect());
