import { PrismaService } from '../prisma/prisma.service';
import { scheduleAccessWhere } from './schedule-weeks';

/**
 * Foydalanuvchiga tegishli sinflar: sinfga biriktirilgan (kurator/fan o'qituvchisi)
 * va dars jadvalidagi sinflar. Ustoz o'z sinflarini ko'rishi uchun ishlatiladi.
 */
export async function ownClassIds(
  prisma: PrismaService,
  userId: string,
): Promise<string[]> {
  // Jadval — faqat dolzarb haftalar bo'yicha (qarang: scheduleAccessWhere)
  const weekScope = await scheduleAccessWhere(prisma);
  const [assigned, scheduled] = await Promise.all([
    prisma.classTeacher.findMany({
      where: { teacherId: userId },
      select: { classId: true },
    }),
    prisma.schedule.findMany({
      // Bir darsda bir nechta ustoz bo'lishi mumkin — ro'yxatdagilar ham o'z sinfini ko'radi
      where: { OR: [{ teacherId: userId }, { teachers: { some: { teacherId: userId } } }], ...weekScope },
      select: { classId: true },
    }),
  ]);
  return [
    ...new Set([
      ...assigned.map((a) => a.classId),
      ...scheduled.map((s) => s.classId),
    ]),
  ];
}
