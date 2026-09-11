/**
 * Tashriflar (Qabul) demo seed — Rejadagi/Real tashriflar, yillik taqqoslash, qabul rejasi.
 * Qo'shimcha skript (boshqa ma'lumotga tegmaydi). Bir marta ishlating:
 *   npm run prisma:visits
 *
 * Parollar kodda QOTIRILMAGAN:
 *   npm run prisma:visits                          — yangi operatorlarga tasodifiy parol
 *                                                    (oxirida "telefon → parol" ro'yxati chiqadi)
 *   VISITS_PASSWORD='KuchliParol' npm run prisma:visits
 *                                                  — hammaga bitta parol (env'dan)
 */
import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// Bo'sh bo'lsa — har bir yangi operatorga alohida tasodifiy parol beriladi.
const ENV_PASSWORD = process.env.VISITS_PASSWORD || null;

/** Tasodifiy kuchli parol (12 belgi, URL-xavfsiz) */
const genPassword = () => randomBytes(9).toString('base64url');

const FILIALS = ["Farg'ona", 'Lokomotiv', 'Chilonzor'];
const WHO = ['Ota va farzand', 'Ona', 'Ona va farzand', 'Ota'];
const NAMES = [
  'Azizbek aka', 'Dilnoza opa', 'Maftuna opa', 'Erkin aka', 'Farxod aka',
  'Madina opa', 'Munisa opa', 'Sardor aka', 'Gulnoza opa', 'Bobur aka',
  'Nilufar opa', 'Jasur aka', 'Kamola opa', 'Otabek aka', 'Zarina opa',
];

async function main() {
  console.log('🌱 Tashriflar seed boshlandi...');
  // Yangi yaratilgan operatorlarning loginlari (parollari bilan) — oxirida chiqadi
  const issued: { phone: string; password: string }[] = [];

  const salesRole = await prisma.role.findUnique({ where: { slug: 'sales' } });
  if (!salesRole) throw new Error("'sales' roli yo'q — avval npm run prisma:seed");

  const firstStage = await prisma.leadStage.findFirst({ orderBy: { order: 'asc' } });
  if (!firstStage) throw new Error("Lead bosqichlari yo'q — avval npm run prisma:seed");
  const stages = await prisma.leadStage.findMany({ orderBy: { order: 'asc' } });

  // --- Operatorlar (MAS'UL ustuni) ---
  const operators: { id: string }[] = [];
  for (let i = 1; i <= 3; i++) {
    const phone = `+99899000010${i}`;
    // Mavjud operatorning PAROLIGA TEGILMAYDI
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      operators.push(existing);
      continue;
    }
    const password = ENV_PASSWORD || genPassword();
    const op = await prisma.user.create({
      data: {
        fullName: `${i}-operator`,
        phone,
        password: await argon2.hash(password),
        roleId: salesRole.id,
      },
    });
    issued.push({ phone, password });
    operators.push(op);
  }

  // --- Tashriflar (bugun va keyingi kunlar) ---
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0);
  let created = 0;
  for (let i = 0; i < NAMES.length; i++) {
    const dayOffset = Math.floor(i / 4); // har kunda ~4 ta
    const sched = new Date(base);
    sched.setDate(base.getDate() + dayOffset);
    sched.setHours(9 + (i % 6), (i % 2) * 30, 0, 0);

    const arrived = i % 3 === 0; // har 3-chi keldi
    await prisma.lead.create({
      data: {
        fullName: NAMES[i],
        phone: `+9989${String(1000000 + i * 37).slice(0, 8)}`,
        source: ['Instagram', 'Tavsiya', 'Reklama'][i % 3],
        filial: FILIALS[i % FILIALS.length],
        gradeLevel: i % 5 === 0 ? null : (i % 11) + 1,
        whoComes: WHO[i % WHO.length],
        scheduledAt: sched,
        crmUpdatedAt: new Date(sched.getTime() - 3600_000),
        visitStatus: arrived ? 'ARRIVED' : 'PLANNED',
        visitedAt: arrived ? sched : null,
        stageId: arrived ? stages[Math.min(2, stages.length - 1)].id : firstStage.id,
        managerId: operators[i % operators.length].id,
      },
    });
    created++;
  }

  // --- Yillik taqqoslash uchun tarixiy leadlar (2024, 2025) ---
  for (let y = 2024; y <= 2025; y++) {
    const count = y === 2024 ? 18 : 26;
    for (let i = 0; i < count; i++) {
      const createdAt = new Date(y, i % 12, 5 + (i % 20));
      const converted = i % 3 === 0;
      await prisma.lead.create({
        data: {
          fullName: `${NAMES[i % NAMES.length]} (${y})`,
          phone: `+9989${y}${String(100 + i).padStart(3, '0')}`,
          source: ['Instagram', 'Tavsiya', 'Reklama'][i % 3],
          filial: FILIALS[i % FILIALS.length],
          stageId: firstStage.id,
          managerId: operators[i % operators.length].id,
          createdAt,
          convertedAt: converted ? new Date(y, (i % 12), 20) : null,
        },
      });
    }
  }

  // --- Qabul rejasi (joriy o'quv yili) ---
  const plans = [
    { gradeLevel: 5, plannedCount: 30 },
    { gradeLevel: 6, plannedCount: 28 },
    { gradeLevel: 7, plannedCount: 25 },
  ];
  for (const p of plans) {
    await prisma.admissionPlan.create({
      data: { academicYear: '2025-2026', gradeLevel: p.gradeLevel, plannedCount: p.plannedCount },
    });
  }

  console.log(`✅ Tashriflar seed tugadi: ${created} tashrif, 44 tarixiy lead, 3 reja`);
  if (!issued.length) {
    console.log('   Operatorlar allaqachon mavjud — parollariga tegilmadi.');
  } else if (ENV_PASSWORD) {
    console.log('   Operatorlar: ' + issued.map((i) => i.phone).join(', ') + ' (parol: VISITS_PASSWORD env dan)');
  } else {
    console.log("   Operatorlar (parollar tasodifiy — faqat shu yerda ko'rinadi):");
    for (const i of issued) console.log(`     ${i.phone}  parol: ${i.password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
