/**
 * Demo seed — namuna ma'lumotlar (portal, hisobotlar va modullarni ko'rish uchun).
 * Avval asosiy seed ishga tushirilgan bo'lishi kerak (rollar, ruxsatlar):
 *   npm run prisma:seed   →   npm run prisma:demo
 * Toza (yangi) bazada ishlatish tavsiya etiladi.
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
const DEMO_PASS = 'demo1234';

const MALE = ['Ali', 'Sardor', 'Jasur', 'Bekzod', 'Aziz', 'Doniyor', 'Otabek', 'Shahzod'];
const FEMALE = ['Aziza', 'Madina', 'Nilufar', 'Sevara', 'Dilnoza', 'Malika', 'Zarina', 'Gulnoza'];
const LAST = ['Karimov', 'Rahimov', 'Aliyev', 'Yusupov', 'Tursunov', 'Saidov', 'Ergashev', 'Qodirov'];

const phone = (n: number) => `+99890${1234567 + n}`;
const pad = (n: number, w = 4) => String(n).padStart(w, '0');

async function main() {
  console.log('🌱 Demo seed boshlandi...');
  let hash = await argon2.hash(DEMO_PASS);

  // ---- Rollar ----
  const roles = await prisma.role.findMany();
  const roleId = (slug: string) => {
    const r = roles.find((x) => x.slug === slug);
    if (!r) throw new Error(`"${slug}" roli yo'q — avval "npm run prisma:seed" ishga tushiring`);
    return r.id;
  };

  // ---- Fanlar ----
  let subjects = await prisma.subject.findMany();
  if (subjects.length === 0) {
    for (const name of ['Matematika', 'Ona tili', 'Ingliz tili', 'Fizika', 'Tarix']) {
      await prisma.subject.create({ data: { name } });
    }
    subjects = await prisma.subject.findMany();
  }

  // ---- HR: bo'lim + lavozim ----
  const dept = await prisma.department.create({ data: { name: "O'quv bo'limi" } });
  const teacherPos = await prisma.position.create({
    data: { name: "O'qituvchi", departmentId: dept.id },
  });

  // ---- O'qituvchilar (user + employee + stavka) ----
  const teachers: { id: string; userId: string }[] = [];
  for (let i = 0; i < 3; i++) {
    const user = await prisma.user.create({
      data: {
        fullName: `${LAST[i]} ${MALE[i]} (ustoz)`,
        phone: phone(100 + i),
        password: hash,
        roleId: roleId('teacher'),
      },
    });
    const emp = await prisma.employee.create({
      data: {
        userId: user.id,
        departmentId: dept.id,
        positionId: teacherPos.id,
        hireDate: new Date('2024-09-01'),
        salary: { create: { type: 'MONTHLY', baseRate: 4_000_000 + i * 500_000 } },
      },
    });
    teachers.push({ id: emp.id, userId: user.id });
  }

  // ---- Sinflar + kurator + jadval ----
  const classDefs = [
    { name: '5-A', gradeLevel: 5 },
    { name: '6-A', gradeLevel: 6 },
    { name: '7-A', gradeLevel: 7 },
  ];
  const classes: { id: string }[] = [];
  for (let i = 0; i < classDefs.length; i++) {
    const cls = await prisma.class.create({
      data: {
        name: classDefs[i].name,
        gradeLevel: classDefs[i].gradeLevel,
        academicYear: '2025-2026',
        capacity: 30,
        room: `${200 + i}`,
        teachers: {
          create: { teacherId: teachers[i].userId, isCurator: true },
        },
        schedules: {
          create: subjects.slice(0, 4).map((s, j) => ({
            subjectId: s.id,
            teacherId: teachers[i].userId,
            weekday: j + 1,
            startTime: `0${8 + j}:30`,
            endTime: `0${9 + j}:15`,
            room: `${200 + i}`,
          })),
        },
      },
    });
    classes.push(cls);
  }

  // ---- O'quvchilar (+ vasiy, baho, davomat, xulq, shartnoma) ----
  let n = 0;
  let demoStudentId = '';
  let demoParentLogin = '';

  for (let c = 0; c < classes.length; c++) {
    for (let k = 0; k < 5; k++) {
      const isFemale = (n + k) % 2 === 0;
      const first = (isFemale ? FEMALE : MALE)[(n + k) % 8];
      const last = LAST[(n + 3 * k) % 8];

      const student = await prisma.student.create({
        data: {
          firstName: first,
          lastName: last,
          gender: isFemale ? 'FEMALE' : 'MALE',
          birthDate: new Date(2013 - c, (k % 12), 5 + k),
          admissionDate: new Date('2024-09-01'),
          status: 'ACTIVE',
          classId: classes[c].id,
        },
      });

      // Vasiy
      const isDemoFamily = n === 0 && k === 0;
      const guardianPhone = isDemoFamily ? '+998901112233' : phone(200 + n + k);
      const guardian = await prisma.guardian.create({
        data: {
          fullName: `${last} ${MALE[(n + 1) % 8]} (ota)`,
          phone: guardianPhone,
          relation: 'ota',
        },
      });
      await prisma.studentGuardian.create({
        data: { studentId: student.id, guardianId: guardian.id, isPrimary: true },
      });

      // Demo oila — portal loginlari
      if (isDemoFamily) {
        const gUser = await prisma.user.create({
          data: { fullName: guardian.fullName, phone: guardianPhone, password: hash, roleId: roleId('guardian') },
        });
        await prisma.guardian.update({ where: { id: guardian.id }, data: { userId: gUser.id } });
        const sUser = await prisma.user.create({
          data: { fullName: `${last} ${first}`, phone: '+998901112244', password: hash, roleId: roleId('student') },
        });
        await prisma.student.update({ where: { id: student.id }, data: { userId: sUser.id } });
        demoStudentId = student.id;
        demoParentLogin = guardianPhone;
      }

      // Baholar (har fan: 4 kunlik + 1 chorak)
      for (const s of subjects.slice(0, 4)) {
        for (let g = 0; g < 4; g++) {
          await prisma.grade.create({
            data: {
              studentId: student.id,
              subjectId: s.id,
              teacherId: teachers[c].userId,
              value: 65 + ((n + k + g) * 7) % 35,
              type: 'DAILY',
              date: new Date(2025, 8, 5 + g * 3),
            },
          });
        }
        await prisma.grade.create({
          data: {
            studentId: student.id,
            subjectId: s.id,
            value: 70 + ((n + k) * 5) % 25,
            type: 'QUARTER',
            period: '1-chorak',
            date: new Date(2025, 9, 25),
          },
        });
      }

      // Davomat (oxirgi 6 kun)
      for (let d = 0; d < 6; d++) {
        const date = new Date(2025, 8, 15 + d);
        const status =
          (n + k + d) % 9 === 0 ? 'ABSENT' : (n + k + d) % 7 === 0 ? 'LATE' : 'PRESENT';
        await prisma.attendance.create({
          data: { studentId: student.id, classId: classes[c].id, date, status: status as any },
        });
      }

      // Xulq
      await createBehavior(student.id, teachers[c].userId, n + k);

      // Shartnoma (9 oy) + 2 oy to'langan
      const contract = await prisma.contract.create({
        data: {
          number: `SHRT-2025-${pad(n + k + 1)}`,
          studentId: student.id,
          startDate: new Date('2025-09-01'),
          endDate: new Date('2026-05-01'),
          monthlyAmount: 1_200_000,
          status: 'ACTIVE',
          installments: {
            create: Array.from({ length: 9 }, (_, m) => ({
              dueDate: new Date(2025, 8 + m, 5),
              amount: 1_200_000,
              paidAmount: m < 2 ? 1_200_000 : 0,
              status: m < 2 ? ('PAID' as const) : ('PENDING' as const),
            })),
          },
        },
      });
      for (let m = 0; m < 2; m++) {
        await prisma.payment.create({
          data: {
            studentId: student.id,
            contractId: contract.id,
            amount: 1_200_000,
            method: 'naqd',
            paidAt: new Date(2025, 8 + m, 5),
          },
        });
      }
    }
    n += 5;
  }

  // ---- Vazifa + topshiriqlar ----
  for (let c = 0; c < classes.length; c++) {
    const students = await prisma.student.findMany({ where: { classId: classes[c].id } });
    const hw = await prisma.homework.create({
      data: {
        classId: classes[c].id,
        subjectId: subjects[0].id,
        teacherId: teachers[c].userId,
        title: '15-mashq, 3-bet',
        description: 'Misollarni daftarga yeching',
        dueDate: new Date(2025, 8, 20),
        submissions: {
          create: students.map((s, i) => ({
            studentId: s.id,
            status: i % 3 === 0 ? ('CHECKED' as const) : i % 3 === 1 ? ('SUBMITTED' as const) : ('ASSIGNED' as const),
            grade: i % 3 === 0 ? 90 : null,
            submittedAt: i % 3 === 2 ? null : new Date(2025, 8, 19),
          })),
        },
      },
    });
    void hw;
  }

  // ---- Moliya: kassalar + kategoriyalar + tranzaksiyalar ----
  const cash = await prisma.account.create({ data: { name: 'Asosiy kassa', balance: 15_000_000 } });
  const bank = await prisma.account.create({ data: { name: 'Bank hisobi', balance: 40_000_000 } });
  const rentCat = await prisma.financeCategory.create({ data: { name: 'Ijara', type: 'EXPENSE' } });
  const utilCat = await prisma.financeCategory.create({ data: { name: 'Kommunal', type: 'EXPENSE' } });
  await prisma.transaction.createMany({
    data: [
      { type: 'EXPENSE', amount: 8_000_000, accountId: bank.id, categoryId: rentCat.id, description: 'Sentyabr ijarasi', date: new Date(2025, 8, 3) },
      { type: 'EXPENSE', amount: 2_500_000, accountId: cash.id, categoryId: utilCat.id, description: 'Svet/suv', date: new Date(2025, 8, 10) },
      { type: 'INVESTMENT', amount: 20_000_000, accountId: bank.id, description: 'Asoschi qo\'shimcha mablag\'i', date: new Date(2025, 8, 1) },
    ],
  });

  // ---- CRM: lead'lar ----
  const stages = await prisma.leadStage.findMany({ orderBy: { order: 'asc' } });
  if (stages.length) {
    const leadData = [
      { fullName: 'Karimova Dilnoza', phone: phone(900), childAge: 7, source: 'Instagram', stage: 0 },
      { fullName: 'Aliyev Bobur', phone: phone(901), childAge: 10, source: 'Tavsiya', stage: 1 },
      { fullName: 'Yusupova Madina', phone: phone(902), childAge: 6, source: 'Reklama', stage: 2 },
      { fullName: 'Tursunov Aziz', phone: phone(903), childAge: 12, source: 'Instagram', stage: 1 },
    ];
    for (const l of leadData) {
      await prisma.lead.create({
        data: {
          fullName: l.fullName, phone: l.phone, childAge: l.childAge, source: l.source,
          stageId: stages[Math.min(l.stage, stages.length - 1)].id,
          managerId: teachers[0].userId,
        },
      });
    }
  }

  // ---- Oylik hisob (joriy oy) ----
  const now = new Date();
  const period = `${now.getFullYear()}-${pad(now.getMonth() + 1, 2)}`;
  const allEmployees = await prisma.employee.findMany({ include: { salary: true } });
  const run = await prisma.payrollRun.create({ data: { period } });
  for (const emp of allEmployees) {
    const base = emp.salary?.type === 'MONTHLY' ? emp.salary.baseRate : 0;
    await prisma.payrollItem.create({
      data: { payrollRunId: run.id, employeeId: emp.id, base, bonus: 0, penalty: 0, total: base },
    });
  }

  console.log('\n✅ Demo seed tugadi!\n');
  console.log('— Demo kirish ma\'lumotlari (parol: ' + DEMO_PASS + ') —');
  console.log('  👤 Ustoz:       ' + phone(100));
  console.log('  👪 Ota-ona:     ' + demoParentLogin + '   (portal)');
  console.log('  🎓 O\'quvchi:    +998901112244        (portal)');
  console.log('  🛠  Admin:       .env dagi ADMIN_PHONE / ADMIN_PASSWORD');
  console.log('  Demo o\'quvchi id: ' + demoStudentId + '\n');
}

// Xulq yozuvi yordamchisi
async function createBehavior(studentId: string, authorId: string, seed: number) {
  const positive = seed % 2 === 0;
  await prisma.behaviorRecord.create({
    data: {
      studentId,
      authorId,
      type: positive ? 'POSITIVE' : 'NEGATIVE',
      points: positive ? 5 : 3,
      description: positive ? 'Faol ishtirok etdi' : 'Darsga kechikdi',
      date: new Date(2025, 8, 12),
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
