import { PrismaService } from '../prisma/prisma.service';

/**
 * Dars jadvali haftalari bo'yicha umumiy yordamchilar.
 * Sanalar "kun" sifatida UTC 00:00 da saqlanadi (Toshkent kuni) — server zonasiga bog'liq emas.
 */

const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" → o'sha kunning UTC 00:00 vaqti */
export const dayFromStr = (s: string) => new Date(`${String(s).slice(0, 10)}T00:00:00.000Z`);

/** Date → "YYYY-MM-DD" (UTC kuni) */
export const ymd = (d: Date) => d.toISOString().slice(0, 10);

export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);

/** "14.09.2026" (short=true bo'lsa "14.09") */
export function fmtDay(d: Date, short = false): string {
  const [y, m, dd] = ymd(d).split('-');
  return short ? `${dd}.${m}` : `${dd}.${m}.${y}`;
}

/** Bugungi kun — Toshkent vaqti bo'yicha, UTC 00:00 ko'rinishida */
export function schoolToday(): Date {
  return dayFromStr(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' }));
}

/** Berilgan kun joylashgan haftaning Dushanbasi */
export function mondayOf(d: Date): Date {
  const wd = d.getUTCDay(); // 0=Yakshanba
  return addDays(d, wd === 0 ? -6 : 1 - wd);
}

/** Haftadagi kunlar soni (Dushanbadan boshlab): Dushanba–Shanba = 6 */
export function weekDayCount(w: { startDate: Date; endDate: Date }): number {
  const diff = Math.round((w.endDate.getTime() - w.startDate.getTime()) / DAY_MS);
  return Math.min(7, Math.max(1, diff + 1));
}

/**
 * "Joriy" hafta: kun shu hafta oralig'ida bo'lsa — o'sha; bo'lmasa eng yaqin o'tgan hafta;
 * u ham bo'lmasa eng yaqin kelgusi hafta. Hafta umuman bo'lmasa — null.
 */
export async function activeWeek(prisma: PrismaService, day: Date = schoolToday()) {
  const current = await prisma.scheduleWeek.findFirst({
    where: { startDate: { lte: day }, endDate: { gte: day } },
    orderBy: { startDate: 'desc' },
  });
  if (current) return current;
  const past = await prisma.scheduleWeek.findFirst({
    where: { startDate: { lte: day } },
    orderBy: { startDate: 'desc' },
  });
  if (past) return past;
  return prisma.scheduleWeek.findFirst({ orderBy: { startDate: 'asc' } });
}

/**
 * Ruxsat tekshiruvlari (ustozning o'z sinfi/fani) uchun hisobga olinadigan haftalar filtri.
 * Oxirgi 2 hafta + kelasi hafta: ustoz jadvaldan olib tashlansa huquqi ko'pi bilan ~2 haftada
 * tugaydi, lekin dushanba kuni yangi hafta hali to'ldirilmagan bo'lsa ham bloklanib qolmaydi.
 * Oraliqda hafta bo'lmasa (uzoq ta'til) — joriy hafta. Hafta umuman yo'q bo'lsa — filtrsiz.
 */
export async function scheduleAccessWhere(
  prisma: PrismaService,
): Promise<{ weekId?: { in: string[] } }> {
  const today = schoolToday();
  const weeks = await prisma.scheduleWeek.findMany({
    where: { startDate: { lte: addDays(today, 7) }, endDate: { gte: addDays(today, -14) } },
    select: { id: true },
  });
  if (weeks.length) return { weekId: { in: weeks.map((w) => w.id) } };
  const fallback = await activeWeek(prisma, today);
  return fallback ? { weekId: { in: [fallback.id] } } : {};
}
