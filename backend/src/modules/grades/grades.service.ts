import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { BulkGradeDto } from './dto/bulk-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

type JwtUser = { id: string; role: string };

const avg = (nums: number[]) =>
  nums.length ? Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10 : 0;

// Hamma fanlarga baho qo'ya oladigan rollar (ustoz — faqat o'z fani, faqat bugun)
const GRADE_ALL_ROLES = ['superadmin', 'akademik', 'admin'];
// Chorak/Yillik — "period" (chorak) bo'yicha ajratiladi; qolganlari — kun bo'yicha
const PERIOD_TYPES = ['QUARTER', 'YEAR'];

// "O'qiyotgan" o'quvchi — shartnomasi shu holatlardan birida (ketgan/bekor/lead emas).
// To'liq to'langan shartnoma avtomat COMPLETED bo'ladi — u ham baholanadi.
const ENROLLED_CONTRACT: any = {
  some: { status: { in: ['ACTIVE', 'COMPLETED', 'SUSPENDED', 'TEMP_SUSPENDED'] } },
};

const GRADE_TYPE_LABEL: Record<string, string> = {
  DAILY: 'Kunlik',
  HOMEWORK: 'Uyga vazifa',
  EXAM: 'Nazorat',
  QUARTER: 'Chorak',
  YEAR: 'Yillik',
  SEMESTER: 'Yarim yillik',
};

@Injectable()
export class GradesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private canGradeAll(role?: string) {
    return !!role && GRADE_ALL_ROLES.includes(role);
  }

  /** Maktab (Toshkent) mahalliy sanasi "YYYY-MM-DD" */
  private schoolToday(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
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
      const changed = ex.value !== args.value;
      const grade = await tx.grade.update({
        where: { id: ex.id },
        data: { value: args.value, comment: args.comment, teacherId: user.id, period: args.period ?? null },
      });
      return { grade, changed };
    }
    const grade = await tx.grade.create({
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
    return { grade, changed: true };
  }

  /** Baho qo'yilganda vasiyga Telegram (best-effort, jarayonni bloklamaydi) */
  private async notifyGrades(
    subjectId: string,
    type: string,
    items: { studentId: string; value: number }[],
  ) {
    const subj = await this.prisma.subject.findUnique({ where: { id: subjectId }, select: { name: true } });
    const subjName = subj?.name ?? 'Fan';
    const typeLabel = GRADE_TYPE_LABEL[type] ?? type;
    for (const it of items) {
      await this.notifications.notifyGuardians(
        it.studentId,
        '📊 Yangi baho',
        `${subjName} (${typeLabel}): ${it.value} ball`,
        { telegramOnly: true },
      );
    }
  }

  /** Ustoz faqat bugungi kunga baho qo'ya oladi (akademik — istalgan kun) */
  private assertTeacherToday(user: JwtUser, day: string) {
    if (!this.canGradeAll(user.role) && day !== this.schoolToday()) {
      throw new ForbiddenException("Ustoz faqat bugungi kunga baho qo'ya oladi");
    }
  }

  async create(user: JwtUser, dto: CreateGradeDto) {
    const st = await this.prisma.student.findUnique({ where: { id: dto.studentId }, select: { classId: true } });
    await this.assertCanGrade(user, dto.subjectId, st?.classId ?? undefined);
    const type = dto.type ?? 'DAILY';
    const day = dto.date ? dto.date.slice(0, 10) : this.schoolToday();
    this.assertTeacherToday(user, day);
    const r = await this.upsertGrade(this.prisma, user, {
      studentId: dto.studentId,
      subjectId: dto.subjectId,
      value: dto.value,
      type,
      period: dto.period,
      comment: dto.comment,
      date: day,
    });
    if (r.changed) {
      this.notifyGrades(dto.subjectId, type, [{ studentId: dto.studentId, value: dto.value }]).catch(() => undefined);
    }
    return r.grade;
  }

  /** Butun sinfni bir fan+tur bo'yicha baholash — mavjudlarini yangilaydi (dublikatsiz) */
  async bulkCreate(user: JwtUser, dto: BulkGradeDto) {
    await this.assertCanGrade(user, dto.subjectId, dto.classId);
    const day = dto.date ? dto.date.slice(0, 10) : this.schoolToday();
    this.assertTeacherToday(user, day);
    // O'quvchilar haqiqatan shu sinfga tegishlimi? (ustoz uchun)
    if (!this.canGradeAll(user.role) && dto.classId && dto.items.length) {
      const ids = [...new Set(dto.items.map((i) => i.studentId))];
      const cnt = await this.prisma.student.count({ where: { id: { in: ids }, classId: dto.classId } });
      if (cnt !== ids.length) {
        throw new ForbiddenException("Ba'zi o'quvchilar bu sinfga tegishli emas");
      }
    }
    const type = dto.type ?? 'DAILY';
    const changed: { studentId: string; value: number }[] = [];
    await this.prisma.$transaction(async (tx) => {
      for (const i of dto.items) {
        const r = await this.upsertGrade(tx, user, {
          studentId: i.studentId,
          subjectId: dto.subjectId,
          value: i.value,
          type,
          period: dto.period,
          comment: i.comment,
          date: day,
        });
        if (r.changed) changed.push({ studentId: i.studentId, value: i.value });
      }
    });
    if (changed.length) {
      this.notifyGrades(dto.subjectId, type, changed).catch(() => undefined);
    }
    return { saved: dto.items.length };
  }

  async update(user: JwtUser, id: string, dto: UpdateGradeDto) {
    const g = await this.prisma.grade.findUnique({ where: { id } });
    if (!g) throw new NotFoundException('Baho topilmadi');
    await this.assertCanGrade(user, g.subjectId);
    if (!this.canGradeAll(user.role)) {
      if (g.teacherId !== user.id) {
        throw new ForbiddenException("Faqat o'zingiz qo'ygan bahoni tahrirlaysiz");
      }
      const gradeDay = g.date.toISOString().slice(0, 10);
      if (gradeDay !== this.schoolToday()) {
        throw new ForbiddenException('Ustoz faqat bugungi baholarni tahrirlaydi');
      }
    }
    const updated = await this.prisma.grade.update({
      where: { id },
      data: {
        ...(dto.value != null ? { value: dto.value } : {}),
        ...(dto.comment !== undefined ? { comment: dto.comment } : {}),
      },
    });
    if (dto.value != null && dto.value !== g.value) {
      this.notifyGrades(g.subjectId, g.type, [{ studentId: g.studentId, value: dto.value }]).catch(() => undefined);
    }
    return updated;
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

  /** Sinf statistikasi: filtrlar (fan/tur/sana oralig'i) bo'yicha taqsimot, o'rtacha, reyting */
  async classStats(
    classId: string,
    params: { subjectId?: string; type?: string; from?: string; to?: string; period?: string },
  ) {
    const where: any = { student: { classId, status: 'ACTIVE', contracts: ENROLLED_CONTRACT } };
    if (params.subjectId) where.subjectId = params.subjectId;
    if (params.type) where.type = params.type;
    if (params.period) where.period = params.period;
    if (params.from || params.to) {
      where.date = {};
      if (params.from) where.date.gte = new Date(params.from.slice(0, 10) + 'T00:00:00.000Z');
      if (params.to) where.date.lte = new Date(params.to.slice(0, 10) + 'T23:59:59.999Z');
    }
    const grades = await this.prisma.grade.findMany({
      where,
      select: {
        value: true,
        studentId: true,
        subjectId: true,
        student: { select: { firstName: true, lastName: true } },
        subject: { select: { name: true } },
      },
    });

    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const g of grades) {
      const v = Math.round(g.value);
      if (distribution[v] != null) distribution[v] += 1;
    }

    const byStudent = new Map<string, { id: string; name: string; values: number[] }>();
    for (const g of grades) {
      const s = byStudent.get(g.studentId) ?? {
        id: g.studentId,
        name: `${g.student.lastName} ${g.student.firstName}`,
        values: [],
      };
      s.values.push(g.value);
      byStudent.set(g.studentId, s);
    }
    const students = [...byStudent.values()]
      .map((s) => ({ id: s.id, name: s.name, average: avg(s.values), count: s.values.length }))
      .sort((a, b) => b.average - a.average);

    const bySubjectMap = new Map<string, { name: string; values: number[] }>();
    for (const g of grades) {
      const s = bySubjectMap.get(g.subjectId) ?? { name: g.subject.name, values: [] };
      s.values.push(g.value);
      bySubjectMap.set(g.subjectId, s);
    }
    const bySubject = [...bySubjectMap.values()]
      .map((s) => ({ name: s.name, average: avg(s.values), count: s.values.length }))
      .sort((a, b) => b.average - a.average);

    const all = grades.map((g) => g.value);
    return {
      average: avg(all),
      count: all.length,
      excellentPct: all.length ? Math.round((all.filter((v) => v >= 4.5).length / all.length) * 100) : 0,
      failPct: all.length ? Math.round((all.filter((v) => v < 3).length / all.length) * 100) : 0,
      distribution,
      students,
      bySubject,
    };
  }

  /** Sinf jurnali: bir fan (+ tur) bo'yicha o'quvchilar va baholari */
  async classGradebook(classId: string, subjectId: string, type?: string, period?: string) {
    const students = await this.prisma.student.findMany({
      // Faqat o'qiyotgan (shartnomasi faol/to'langan/band) o'quvchilar jurnalga kiradi
      where: { classId, status: 'ACTIVE', contracts: ENROLLED_CONTRACT },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        grades: {
          where: { subjectId, ...(type ? { type: type as any } : {}), ...(period ? { period } : {}) },
          orderBy: { date: 'desc' },
          select: {
            id: true,
            value: true,
            type: true,
            date: true,
            comment: true,
            createdAt: true,
            teacher: { select: { fullName: true } },
          },
        },
      },
      orderBy: { lastName: 'asc' },
    });
    return students.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      grades: s.grades.map((g) => ({
        id: g.id,
        value: g.value,
        type: g.type,
        date: g.date,
        comment: g.comment,
        createdAt: g.createdAt,
        teacherName: g.teacher?.fullName ?? null,
      })),
      average: avg(s.grades.map((g) => g.value)),
    }));
  }
}
