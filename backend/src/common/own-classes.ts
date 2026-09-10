import { PrismaService } from '../prisma/prisma.service';

/**
 * Foydalanuvchiga tegishli sinflar: sinfga biriktirilgan (kurator/fan o'qituvchisi)
 * va dars jadvalidagi sinflar. Ustoz o'z sinflarini ko'rishi uchun ishlatiladi.
 */
export async function ownClassIds(
  prisma: PrismaService,
  userId: string,
): Promise<string[]> {
  const [assigned, scheduled] = await Promise.all([
    prisma.classTeacher.findMany({
      where: { teacherId: userId },
      select: { classId: true },
    }),
    prisma.schedule.findMany({
      where: { teacherId: userId },
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
