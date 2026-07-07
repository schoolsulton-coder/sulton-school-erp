/**
 * Sinflar seed — 0-sinfdan 11-sinfgacha (A/B), O'zbek tili, real band/bo'sh sonlar.
 * Qabul formasi SINF dropdown'i uchun. Bir marta ishlating:
 *   npm run prisma:classes
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FIRST_M = ['Ali', 'Sardor', 'Jasur', 'Bekzod', 'Aziz', 'Doniyor', 'Otabek', 'Shahzod', 'Diyor', 'Bobur'];
const FIRST_F = ['Aziza', 'Madina', 'Nilufar', 'Sevara', 'Dilnoza', 'Malika', 'Zarina', 'Gulnoza', 'Kamola', 'Shahnoza'];
const LAST = ['Karimov', 'Rahimov', 'Aliyev', 'Yusupov', 'Tursunov', 'Saidov', 'Ergashev', 'Qodirov', 'Nazarov', 'Ismoilov'];
const YEAR = '2026-2027';

async function main() {
  console.log('🌱 Sinflar seed boshlandi...');
  // Bosh filial (yo'q bo'lsa yaratamiz)
  let branch = await prisma.branch.findFirst({ where: { name: 'Bosh filial' } });
  if (!branch) branch = await prisma.branch.create({ data: { name: 'Bosh filial' } });
  const branchId = branch.id;

  let created = 0;
  let students = 0;
  for (let g = 0; g <= 11; g++) {
    const sections = g >= 5 ? ['A', 'B'] : ['A'];
    for (const s of sections) {
      const name = `${g}-${s}`;
      const exists = await prisma.class.findFirst({ where: { name, academicYear: YEAR } });
      if (exists) continue;

      const capacity = 20 + Math.floor(Math.random() * 3); // 20..22
      const cls = await prisma.class.create({
        data: {
          name,
          gradeLevel: g,
          academicYear: YEAR,
          language: "O'zbek",
          capacity,
          room: `${100 + g}`,
          branchId,
        },
      });
      void cls;
      created++;
      // Diqqat: o'quvchi qo'shilmaydi. Sinf joyi faqat SHARTNOMA tuzilgach band bo'ladi.
    }
  }

  console.log(`✅ Sinflar seed tugadi: ${created} sinf (${YEAR}) — hammasi bo'sh`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
