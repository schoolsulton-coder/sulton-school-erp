import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { BulkGradeDto } from './dto/bulk-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

type JwtUser = { id: string; role: string };

const avg = (nums: number[]) =>
  nums.length ? Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10 : 0;

// Hamma fanlarga baho qo'ya oladigan rollar (ustoz — faqat o'z fani)
const GRADE_ALL_ROLES = ['superadmin', 'akademik', 'admin'];
// Chorak/Yillik — "period" (chorak) bo'yicha ajratiladi; qolganlari — kun bo'yicha
const PERIOD_TYPES = ['QUARTER', 'YEAR'];

@Injectable()
export class GradesService {
  constructor(private prisma: PrismaService) {}

  private canGradeAll(role?: string) {
    return !!role && GRADE_ALL_ROLES.includes(role);
  }

  /** Berilgan kun uchun oraliq + saqlash sanasi (kun o'rtasi) */
  private dayRange(dateStr?: string) {
    const base =
      dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr)
        ? dateStr.slice(0, 10)
        : new Date().toISOString().slice(0, 10);
    return {
      start: new Date(base + 'T00:00:00.000Z'),
      end: new Date(base + 'T23:59:59.999Z'),
      store: new Date(base + 'T12:00:00.000Z'),
    };
  }

  /** Ustoz shu fanni (shu sinfda) o'qitadimi? Dars jadvali yoki asosiy fani bo'yicha. */
  private async assertCanGrade(user: JwtUser, subjectId: string, classId?: string) {
    if (this.canGradeAll(user.role)) return;
    const sched = await this.prisma.schedule.findFirst({
      where: { subjectId, teacherId: user.id, ...(classId ? { classId } : {}) },
      select: { id: true },
    });
    if (sched) return;
    // Fallback: ustozning asosiy fani (User.subjectId)
    const u = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { subjectId: true },
    });
    if (u?.subjectId && u.subjectId === subjectId) return;
    throw new ForbiddenException("Bu fan sizga biriktirilmagan — baho qo'ya olmaysiz");
  }

  /** Ustoz/kurator o'z fanlari va sinflari (hamma baholay oladiganlar — barchasi) */
  async mySubjects(user: JwtUser) {
    if (this.canGradeAll(user.role)) {
      const [classes, subjects] = await Promise.all([
        this.prisma.class.findMany({
          where: { status: 'Faol' },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.subject.findMany({
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
      ]);
      return { canGradeAll: true, classes, subjects, assignments: [] as any[] };
    }

    const sched = await this.prisma.schedule.findMany({
      where: { teacherId: user.id },
      select: {
        classId: true,
        subjectId: true,
        class: { select: { name: true } },
        subject: { select: { name: true } },
      },
    });

    if (sched.length) {
      const seen = new Set<string>();
      const assignments: { classId: string; className: string; subjectId: string; subjectName: string }[] = [];
      const classMap = new Map<string, string>();
      const subjMap = new Map<string, string>();
      for (const s of sched) {
        const key = `${s.classId}:${s.subjectId}`;
        if (!seen.has(key)) {
          seen.add(key);
          assignments.push({ classId: s.classId, className: s.class.name, subjectId: s.subjectId, subjectName: s.subject.name });
        }
        classMap.set(s.classId, s.class.name);
        subjMap.set(s.subjectId, s.subject.name);
      }
      return {
        canGradeAll: false,
        classes: [...classMap].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
        subjects: [...subjMap].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
        assignments,
      };
    }

    // Dars jadvalida biriktirilmagan bo'lsa — asosiy fani (User.subjectId) bo'yicha barcha faol sinflar
    const u = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { subjectId: true, subject: { select: { name: true } } },
    });
    if (u?.subjectId) {
      const classes = await this.prisma.class.findMany({
        where: { status: 'Faol' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      const subj = { id: u.subjectId, name: u.subject?.name ?? 'Fan' };
      return {
        canGradeAll: false,
        classes,
        subjects: [subj],
        assignments: classes.map((c) => ({ classId: c.id, className: c.name, subjectId: subj.id, subjectName: subj.name })),
      };
    }
    return { canGradeAll: false, classes: [], subjects: [], assignments: [] };
  }

  /** Mavjud bahoni topib yangilaydi, aks holda yaratadi (dublikatsiz — DB unique'siz) */
  private async upsertGrade(
    tx: any,
    user: JwtUser,
    args: { studentId: string; subjectId: string; value: number; type: string; period?: string | null; comment?: string | null; date: string | undefined },
  ) {
    const { start, end, store } = this.dayRange(args.date);
    const byPeriod = PERIOD_TYPES.includes(args.type);
    const where = byPeriod
      ? { studentId: args.studentId, subjectId: args.subjectId, type: args.type as any, period: args.period ?? null }
      : { studentId: args.studentId, subjectId: args.subjectId, type: args.type as any, date: { gte: start, lte: end } };
    const ex = await tx.grade.findFirst({ where, orderBy: { date: 'desc' } });
    if (ex) {
      return tx.grade.update({
        where: { id: ex.id },
        data: { value: args.value, comment: args.comment, teacherId: user.id, period: args.period ?? null },
      });
    }
    return tx.grade.create({
      data: {
        studentId: args.studentId,
        subjectId: args.subjectId,
        teacherId: user.id,
        value: args.value,
        type: args.type as any,
        period: args.period ?? null,
        comment: args.comment,
        date: store,
      },
    });
  }

  async create(user: JwtUser, dto: CreateGradeDto) {
    const st = await this.prisma.student.findUnique({ where: { id: dto.studentId }, select: { classId: true } });
    await this.assertCanGrade(user, dto.subjectId, st?.classId ?? undefined);
    return this.upsertGrade(this.prisma, user, {
      studentId: dto.studentId,
      subjectId: dto.subjectId,
      value: dto.value,
      type: dto.type ?? 'DAILY',
      period: dto.period,
      comment: dto.comment,
      date: dto.date,
    });
  }

  /** Butun sinfni bir fan+tur bo'yicha baholash — mavjudlarini yangilaydi (dublikatsiz) */
  async bulkCreate(user: JwtUser, dto: BulkGradeDto) {
    await this.assertCanGrade(user, dto.subjectId, dto.classId);
    // O'quvchilar haqiqatan shu sinfga tegishlimi? (ustoz uchun)
    if (!this.canGradeAll(user.role) && dto.classId && dto.items.length) {
      const ids = [...new Set(dto.items.map((i) => i.studentId))];
      const cnt = await this.prisma.student.count({ where: { id: { in: ids }, classId: dto.classId } });
      if (cnt !== ids.length) {
        throw new ForbiddenException("Ba'zi o'quvchilar bu sinfga tegishli emas");
      }
    }
    const type = dto.type ?? 'DAILY';
    await this.prisma.$transaction(async (tx) => {
      for (const i of dto.items) {
        await this.upsertGrade(tx, user, {
          studentId: i.studentId,
          subjectId: dto.subjectId,
          value: i.value,
          type,
          period: dto.period,
          comment: i.comment,
          date: dto.date,
        });
      }
    });
    return { saved: dto.items.length };
  }

  async update(user: JwtUser, id: string, dto: UpdateGradeDto) {
    const g = await this.prisma.grade.findUnique({ where: { id } });
    if (!g) throw new NotFoundException('Baho topilmadi');
    await this.assertCanGrade(user, g.subjectId);
    if (!this.canGradeAll(user.role) && g.teacherId !== user.id) {
      throw new ForbiddenException("Faqat o'zingiz qo'ygan bahoni tahrirlaysiz");
    }
    return this.prisma.grade.update({
      where: { id },
      data: {
        ...(dto.value != null ? { value: dto.value } : {}),
        ...(dto.comment !== undefined ? { comment: dto.comment } : {}),
      },
    });
  }

  async remove(user: JwtUser, id: string) {
    const g = await this.prisma.grade.findUnique({ where: { id } });
    if (!g) throw new NotFoundException('Baho topilmadi');
    await this.assertCanGrade(user, g.subjectId);
    if (!this.canGradeAll(user.role) && g.teacherId !== user.id) {
      throw new ForbiddenException("Faqat o'zingiz qo'ygan bahoni o'chirasiz");
    }
    return this.prisma.grade.delete({ where: { id } });
  }

  list(params: { studentId?: string; subjectId?: string; type?: string; period?: string }) {
    const where: any = {};
    if (params.studentId) where.studentId = params.studentId;
    if (params.subjectId) where.subjectId = params.subjectId;
    if (params.type) where.type = params.type;
    if (params.period) where.period = params.period;
    return this.prisma.grade.findMany({
      where,
      include: { subject: true },
      orderBy: { date: 'desc' },
      take: 200,
    });
  }

  /** O'quvchi tabeli: fan bo'yicha o'rtacha + umumiy o'rtacha + progress */
  async studentReport(studentId: string) {
    const grades = await this.prisma.grade.findMany({
      where: { studentId },
      include: { subject: true },
      orderBy: { date: 'asc' },
    });
    const bySubject: Record<string, { subject: any; values: number[] }> = {};
    for (const g of grades) {
      (bySubject[g.subjectId] ??= { subject: g.subject, values: [] }).values.push(g.value);
    }
    const subjects = Object.values(bySubject).map((s) => ({
      subject: s.subject,
      average: avg(s.values),
      count: s.values.length,
    }));
    const overall = avg(subjects.map((s) => s.average));
    const progress = grades
      .filter((g) => g.type === 'DAILY')
      .map((g) => ({ date: g.date, value: g.value, subject: g.subject.name }));
    return { overall, subjects, progress, totalGrades: grades.length };
  }

  /** Sinf jurnali: bir fan (+ tur) bo'yicha o'quvchilar va baholari */
  async classGradebook(classId: string, subjectId: string, type?: string) {
    const students = await this.prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        grades: {
          where: { subjectId, ...(type ? { type: type as any } : {}) },
          orderBy: { date: 'desc' },
          select: { id: true, value: true, type: true, date: true, comment: true },
        },
      },
      orderBy: { lastName: 'asc' },
    });
    return students.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      grades: s.grades,
      average: avg(s.grades.map((g) => g.value)),
    }));
  }
}
