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
  admin: g2p(['crm', 'contracts', 'students']),
  akademik: g2p(['students', 'classes', 'grades', 'attendance', 'homework', 'behavior']),
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
  const superadmin = await ensureRole('superadmin', 'Superadmin');
  const admin = await ensureRole('admin', 'Administrator');
  const akademik = await ensureRole('akademik', "Akademik bo'lim rahbari");

  const c1 = await setPerms(superadmin.id, SETS.superadmin);
  const c2 = await setPerms(admin.id, SETS.admin);
  const c3 = await setPerms(akademik.id, SETS.akademik);

  const owner = await prisma.user.updateMany({
    where: { phone: '+998990000000' },
    data: { roleId: superadmin.id },
  });

  console.log(`superadmin=${c1} ruxsat, admin=${c2}, akademik=${c3}, owner→superadmin=${owner.count}`);
})()
  .catch((e) => console.error('RBAC xato:', e.message))
  .finally(() => prisma.$disconnect());
