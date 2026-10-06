import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { canSeeAllClasses } from './rbac-open';
import { scheduleAccessWhere } from './schedule-weeks';

type ScopeUser = { id: string; role?: string };

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

/**
 * Ma'lumot doirasi: `null` — cheklov yo'q (hamma sinf),
 * massiv — faqat shu sinflar (ustoz/kurator/koordinator).
 */
export async function classScopeOf(
  prisma: PrismaService,
  user?: ScopeUser,
): Promise<string[] | null> {
  if (!user || canSeeAllClasses(user.role)) return null;
  return ownClassIds(prisma, user.id);
}

/**
 * Sinf foydalanuvchiga biriktirilganmi? Aks holda 403.
 * Oyna ruxsati yetarli emas: id'ni qo'lda o'zgartirib begona sinfni
 * ochib bo'lmasligi uchun har bir sinf bo'yicha so'rovda tekshiriladi.
 */
export async function assertClassAccess(
  prisma: PrismaService,
  user: ScopeUser | undefined,
  classId?: string | null,
): Promise<void> {
  const scope = await classScopeOf(prisma, user);
  if (!scope) return;
  if (!classId || !scope.includes(classId)) {
    throw new ForbiddenException('Bu sinf sizga biriktirilmagan');
  }
}

/** O'quvchi foydalanuvchining sinflaridanmi? Aks holda 403. */
export async function assertStudentAccess(
  prisma: PrismaService,
  user: ScopeUser | undefined,
  studentId: string,
): Promise<void> {
  const scope = await classScopeOf(prisma, user);
  if (!scope) return;
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { classId: true },
  });
  if (!student?.classId || !scope.includes(student.classId)) {
    throw new ForbiddenException("Bu o'quvchi sizga biriktirilgan sinflarda emas");
  }
}
