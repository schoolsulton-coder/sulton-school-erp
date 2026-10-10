import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { canSeeAllClasses } from '../../common/rbac-open';
import {
  assertClassAccess,
  assertStudentAccess,
} from '../../common/own-classes';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateDailyTaskDto,
  MarkAllDailyTasksDto,
  MarkBulkDto,
  MarkDailyTaskDto,
  UpdateDailyTaskDto,
} from './dto/daily-task.dto';

type JwtUser = { id: string; role: string };

/** Kun — UTC yarim tunida saqlanadi (davomat/baho bilan bir xil qoida) */
const dayFromStr = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00.000Z`);
const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Maktab (Toshkent) mahalliy sanasi "YYYY-MM-DD" */
const schoolToday = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });

// "O'qiyotgan" o'quvchi — davomat/baho oynalari bilan bir xil ta'rif
const ENROLLED_CONTRACT: any = {
  some: { status: { in: ['ACTIVE', 'COMPLETED', 'SUSPENDED', 'TEMP_SUSPENDED', 'OVERDUE'] } },
};

const STUDENT_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  classId: true,
} as const;

@Injectable()
export class DailyTasksService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ===================== Vazifalar ro'yxati =====================

  /** Sinf uchun ko'rinadigan vazifalar: maktab bo'yicha umumiy + shu sinfniki */
  async tasks(user: JwtUser, classId?: string, includeInactive = false) {
    if (classId) await assertClassAccess(this.prisma, user, classId);
    const where: Prisma.DailyTaskWhereInput = {
      ...(includeInactive ? {} : { active: true }),
      ...(classId ? { OR: [{ classId: null }, { classId }] } : {}),
    };
    const rows = await this.prisma.dailyTask.findMany({
      where,
      orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
      include: { class: { select: { id: true, name: true } } },
    });
    return rows.map((t) => ({
      id: t.id,
      title: t.title,
      coins: t.coins,
      sort: t.sort,
      active: t.active,
      classId: t.classId,
      className: t.class?.name ?? null,
      scope: t.classId ? ('class' as const) : ('school' as const),
    }));
  }

  /** Umumiy ro'yxatga faqat to'liq kirish rollari tegadi, sinfnikiga — o'sha sinf egasi */
  private async assertCanManage(user: JwtUser, classId?: string | null) {
    if (classId) {
      await assertClassAccess(this.prisma, user, classId);
      return;
    }
    if (!canSeeAllClasses(user.role)) {
      throw new ForbiddenException(
        "Maktab bo'yicha umumiy vazifani faqat rahbariyat o'zgartiradi — o'z sinfingizga qo'shimcha vazifa qo'shing",
      );
    }
  }

  async createTask(user: JwtUser, dto: CreateDailyTaskDto) {
    await this.assertCanManage(user, dto.classId ?? null);
    const last = await this.prisma.dailyTask.findFirst({
      where: { classId: dto.classId ?? null },
      orderBy: { sort: 'desc' },
      select: { sort: true },
    });
    return this.prisma.dailyTask.create({
      data: {
        title: dto.title.trim(),
        coins: dto.coins,
        classId: dto.classId ?? null,
        sort: dto.sort ?? (last?.sort ?? 0) + 1,
        authorId: user.id,
      },
    });
  }

  async updateTask(user: JwtUser, id: string, dto: UpdateDailyTaskDto) {
    const task = await this.prisma.dailyTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Vazifa topilmadi');
    await this.assertCanManage(user, task.classId);
    return this.prisma.dailyTask.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.coins !== undefined ? { coins: dto.coins } : {}),
        ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  /**
   * O'chirish. Belgilangan kunlari bo'lsa — o'chirilmaydi, yopiladi (active=false):
   * aks holda berilgan coinlar ham tarixdan yo'qolib ketardi.
   */
  async removeTask(user: JwtUser, id: string) {
    const task = await this.prisma.dailyTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Vazifa topilmadi');
    await this.assertCanManage(user, task.classId);
    const used = await this.prisma.dailyTaskMark.count({ where: { taskId: id } });
    if (used > 0) {
      await this.prisma.dailyTask.update({ where: { id }, data: { active: false } });
      return { closed: true, marks: used };
    }
    await this.prisma.dailyTask.delete({ where: { id } });
    return { deleted: true };
  }

  // ===================== Kunlik jadval =====================

  private day(date?: string) {
    const str = date?.slice(0, 10) || schoolToday();
    const day = dayFromStr(str);
    if (Number.isNaN(day.getTime())) throw new BadRequestException("Sana noto'g'ri");
    if (day > dayFromStr(schoolToday())) {
      throw new BadRequestException("Kelajak kuni uchun belgilab bo'lmaydi");
    }
    return day;
  }

  /** Koordinator ishlaydigan asosiy oyna: sinf × kun bo'yicha butun jadval */
  async board(user: JwtUser, params: { classId: string; date?: string }) {
    if (!params.classId) throw new BadRequestException('Sinf tanlanmagan');
    await assertClassAccess(this.prisma, user, params.classId);
    const day = this.day(params.date);

    const [cls, tasks, students] = await Promise.all([
      this.prisma.class.findUnique({
        where: { id: params.classId },
        select: { id: true, name: true },
      }),
      this.tasks(user, params.classId),
      this.prisma.student.findMany({
        where: { classId: params.classId, status: 'ACTIVE', contracts: ENROLLED_CONTRACT },
        select: STUDENT_SELECT,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
    ]);
    if (!cls) throw new NotFoundException('Sinf topilmadi');

    const marks = await this.prisma.dailyTaskMark.findMany({
      where: { date: day, studentId: { in: students.map((s) => s.id) } },
      select: { taskId: true, studentId: true, coins: true },
    });

    const byStudent = new Map<string, { tasks: string[]; coins: number }>();
    for (const m of marks) {
      const row = byStudent.get(m.studentId) ?? { tasks: [], coins: 0 };
      row.tasks.push(m.taskId);
      row.coins += m.coins;
      byStudent.set(m.studentId, row);
    }

    const maxCoins = tasks.reduce((a, t) => a + t.coins, 0);
    const rows = students.map((s) => {
      const r = byStudent.get(s.id) ?? { tasks: [], coins: 0 };
      return {
        id: s.id,
        name: `${s.lastName} ${s.firstName}`.trim(),
        done: r.tasks,
        doneCount: r.tasks.length,
        coins: r.coins,
      };
    });

    return {
      date: ymd(day),
      today: schoolToday(),
      class: { id: cls.id, name: cls.name },
      tasks,
      students: rows,
      totals: {
        students: rows.length,
        tasks: tasks.length,
        done: rows.reduce((a, r) => a + r.doneCount, 0),
        possible: rows.length * tasks.length,
        coins: rows.reduce((a, r) => a + r.coins, 0),
        maxCoins: rows.length * maxCoins,
        perStudentMax: maxCoins,
      },
    };
  }

  /** Koordinatorning sinflari — oynadagi tanlov uchun */
  async myClasses(user: JwtUser) {
    const all = canSeeAllClasses(user.role);
    const where: Prisma.ClassWhereInput = all
      ? { status: 'Faol' }
      : { teachers: { some: { teacherId: user.id } } };
    const classes = await this.prisma.class.findMany({
      where,
      select: { id: true, name: true, _count: { select: { students: { where: { status: 'ACTIVE' } } } } },
      orderBy: [{ gradeLevel: 'asc' }, { name: 'asc' }],
    });
    return classes.map((c) => ({ id: c.id, name: c.name, students: c._count.students }));
  }

  // ===================== Belgilash =====================

  private async studentDay(studentId: string, day: Date) {
    const marks = await this.prisma.dailyTaskMark.findMany({
      where: { studentId, date: day },
      select: { taskId: true, coins: true },
    });
    return {
      studentId,
      date: ymd(day),
      done: marks.map((m) => m.taskId),
      coins: marks.reduce((a, m) => a + m.coins, 0),
    };
  }

  /** Vazifa o'quvchiga tegishlimi (umumiy yoki o'sha sinfniki) va faolmi */
  private async taskFor(taskId: string, studentClassId: string | null) {
    const task = await this.prisma.dailyTask.findUnique({ where: { id: taskId } });
    if (!task || !task.active) throw new NotFoundException('Vazifa topilmadi');
    if (task.classId && task.classId !== studentClassId) {
      throw new ForbiddenException("Bu vazifa o'quvchining sinfiga tegishli emas");
    }
    return task;
  }

  async mark(user: JwtUser, dto: MarkDailyTaskDto) {
    await assertStudentAccess(this.prisma, user, dto.studentId);
    const day = this.day(dto.date);
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      select: STUDENT_SELECT,
    });
    if (!student) throw new NotFoundException("O'quvchi topilmadi");
    const task = await this.taskFor(dto.taskId, student.classId);

    const existing = await this.prisma.dailyTaskMark.findUnique({
      where: {
        taskId_studentId_date: { taskId: task.id, studentId: student.id, date: day },
      },
      select: { id: true, coinRecordId: true },
    });

    if (!dto.done) {
      if (existing) {
        // Coin yozuvi o'chsa — belgi ham ketadi (FK cascade)
        if (existing.coinRecordId) {
          await this.prisma.coinRecord.delete({ where: { id: existing.coinRecordId } });
        } else {
          await this.prisma.dailyTaskMark.delete({ where: { id: existing.id } });
        }
      }
    } else if (!existing) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const coin =
            task.coins > 0
              ? await tx.coinRecord.create({
                  data: {
                    studentId: student.id,
                    authorId: user.id,
                    amount: task.coins,
                    reason: `Kunlik vazifa: ${task.title}`,
                    date: day,
                  },
                  select: { id: true },
                })
              : null;
          await tx.dailyTaskMark.create({
            data: {
              taskId: task.id,
              studentId: student.id,
              date: day,
              coins: task.coins,
              coinRecordId: coin?.id ?? null,
              authorId: user.id,
            },
          });
        });
      } catch (e: any) {
        // Ikki marta bosilib ketgan bo'lsa — jim o'tamiz
        if (e?.code !== 'P2002') throw e;
      }
    }
    return this.studentDay(student.id, day);
  }

  /** Ko'p belgi bitta so'rovda — ustunni (bitta vazifani hammaga) belgilash uchun */
  async markBulk(user: JwtUser, dto: MarkBulkDto) {
    for (const it of dto.items) {
      await this.mark(user, { ...it, date: dto.date });
    }
    return { count: dto.items.length };
  }

  /** "Hammasi" tugmasi — o'quvchining shu kundagi barcha vazifalari */
  async markAll(user: JwtUser, dto: MarkAllDailyTasksDto) {
    await assertStudentAccess(this.prisma, user, dto.studentId);
    const day = this.day(dto.date);
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      select: STUDENT_SELECT,
    });
    if (!student) throw new NotFoundException("O'quvchi topilmadi");

    const tasks = await this.prisma.dailyTask.findMany({
      where: {
        active: true,
        OR: [{ classId: null }, { classId: student.classId ?? undefined }],
      },
      select: { id: true },
    });
    for (const t of tasks) {
      await this.mark(user, {
        studentId: student.id,
        taskId: t.id,
        date: ymd(day),
        done: dto.done,
      });
    }
    return this.studentDay(student.id, day);
  }

  // ===================== Davr statistikasi =====================

  async stats(
    user: JwtUser,
    params: { classId: string; from?: string; to?: string },
  ) {
    if (!params.classId) throw new BadRequestException('Sinf tanlanmagan');
    await assertClassAccess(this.prisma, user, params.classId);
    const to = this.day(params.to);
    const from = params.from ? dayFromStr(params.from) : new Date(to.getTime() - 6 * 864e5);
    if (from > to) throw new BadRequestException("Sana oralig'i noto'g'ri");

    const [tasks, students, marks] = await Promise.all([
      this.tasks(user, params.classId, true),
      this.prisma.student.findMany({
        where: { classId: params.classId, status: 'ACTIVE', contracts: ENROLLED_CONTRACT },
        select: STUDENT_SELECT,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      this.prisma.dailyTaskMark.findMany({
        where: {
          date: { gte: from, lte: to },
          student: { classId: params.classId },
        },
        select: { taskId: true, studentId: true, coins: true, date: true },
      }),
    ]);

    const days: string[] = [];
    for (let d = new Date(from); d <= to; d = new Date(d.getTime() + 864e5)) {
      days.push(ymd(d));
    }

    const perTask = new Map<string, { done: number; coins: number }>();
    const perStudent = new Map<string, { done: number; coins: number }>();
    const perDay = new Map<string, { done: number; coins: number }>();
    for (const m of marks) {
      const t = perTask.get(m.taskId) ?? { done: 0, coins: 0 };
      t.done++; t.coins += m.coins; perTask.set(m.taskId, t);
      const s = perStudent.get(m.studentId) ?? { done: 0, coins: 0 };
      s.done++; s.coins += m.coins; perStudent.set(m.studentId, s);
      const key = ymd(m.date);
      const d = perDay.get(key) ?? { done: 0, coins: 0 };
      d.done++; d.coins += m.coins; perDay.set(key, d);
    }

    const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
    const activeTasks = tasks.filter((t) => t.active);
    const perStudentPossible = activeTasks.length * days.length;

    return {
      from: ymd(from),
      to: ymd(to),
      days,
      class: { id: params.classId },
      tasks: tasks.map((t) => {
        const row = perTask.get(t.id) ?? { done: 0, coins: 0 };
        const possible = students.length * days.length;
        return { ...t, done: row.done, coins: row.coins, possible, percent: pct(row.done, possible) };
      }),
      students: students.map((s) => {
        const row = perStudent.get(s.id) ?? { done: 0, coins: 0 };
        return {
          id: s.id,
          name: `${s.lastName} ${s.firstName}`.trim(),
          done: row.done,
          coins: row.coins,
          possible: perStudentPossible,
          percent: pct(row.done, perStudentPossible),
        };
      }),
      daily: days.map((d) => ({ date: d, ...(perDay.get(d) ?? { done: 0, coins: 0 }) })),
      totals: {
        done: marks.length,
        coins: marks.reduce((a, m) => a + m.coins, 0),
        possible: students.length * activeTasks.length * days.length,
        students: students.length,
        tasks: activeTasks.length,
      },
    };
  }

  // ===================== Vasiylarga kunlik xulosa =====================

  /**
   * Kun yakunida bitta xabar: "5/7 vazifa · +27 coin".
   * Har belgilashda emas — qo'lda bosilganda yuboriladi (spam bo'lmasligi uchun).
   */
  async notifyDay(user: JwtUser, params: { classId: string; date?: string }) {
    const board = await this.board(user, params);
    const day = this.day(params.date);
    let sent = 0;
    for (const s of board.students) {
      if (!s.doneCount) continue;
      void this.notifications.notifyGuardians(
        s.id,
        '✅ Kunlik vazifalar',
        [
          `📅 ${ymd(day).split('-').reverse().join('.')}`,
          `✔️ Bajarildi: ${s.doneCount}/${board.tasks.length}`,
          `🪙 Bugungi coin: +${s.coins}`,
        ].join('\n'),
        { telegramOnly: true },
      );
      sent++;
    }
    return { sent, students: board.students.length };
  }
}
