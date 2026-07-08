/**
 * Pipeline statuslarini 5 taga qisqartirish + mavjud leadlarni ko'chirish.
 * Faqat 5 status qoladi: Yangi, Suhbatga chaqirildi, Shartnoma tuzishga,
 * Shartnoma tuzdi, Shartnoma tuzmadi.
 * Ishga tushirish:  npm run prisma:stages
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NEW_STAGES = [
  'Yangi',
  'Suhbatga chaqirildi',
  'Shartnoma tuzishga',
  'Shartnoma tuzdi',
  'Shartnoma tuzmadi',
];

// Eski status nomini yangi statusga moslash (leadlarni ko'chirish uchun)
function mapOld(name: string): string {
  const n = name.toLowerCase();
  if (/tuzmadi|yiqildi|rad etil/.test(n)) return 'Shartnoma tuzmadi';
  if (/tuzdi|tuzildi/.test(n)) return 'Shartnoma tuzdi';
  if (/shartnoma|chegirma|hujjat/.test(n)) return 'Shartnoma tuzishga';
  if (/suhbat|test|ota-ona|qaror/.test(n)) return 'Suhbatga chaqirildi';
  return 'Yangi'; // aniqlashga, bog'lanildi va boshqalar
}

async function main() {
  console.log('🌱 Statuslarni yangilash boshlandi...');

  // 1) 5 ta yangi statusni yaratish (bor bo'lsa order'ini to'g'rilash)
  const idByName: Record<string, string> = {};
  for (let i = 0; i < NEW_STAGES.length; i++) {
    const name = NEW_STAGES[i];
    const existing = await prisma.leadStage.findFirst({ where: { name } });
    const row = existing
      ? await prisma.leadStage.update({ where: { id: existing.id }, data: { order: i } })
      : await prisma.leadStage.create({ data: { name, order: i } });
    idByName[name] = row.id;
  }

  // 2) Yangi to'plamda bo'lmagan eski statuslar
  const olds = await prisma.leadStage.findMany({ where: { name: { notIn: NEW_STAGES } } });

  // 3) Har bir eski statusdagi leadlarni yangisiga ko'chirish
  for (const old of olds) {
    const targetName = mapOld(old.name);
    const res = await prisma.lead.updateMany({
      where: { stageId: old.id },
      data: { stageId: idByName[targetName] },
    });
    console.log(`  "${old.name}" → "${targetName}" (${res.count} lead)`);
  }

  // 4) Eski statuslarni o'chirish
  const del = await prisma.leadStage.deleteMany({ where: { name: { notIn: NEW_STAGES } } });
  console.log(`  ${del.count} ta eski status o'chirildi`);

  const final = await prisma.leadStage.findMany({ orderBy: { order: 'asc' } });
  console.log('✅ Yakuniy statuslar:', final.map((s) => s.name).join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
