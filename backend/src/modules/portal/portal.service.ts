import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ScheduleService } from '../classes/schedule.service';
import {
  MONTHLY_BEHAVIOR_POINTS,
  monthLabel,
  monthOf,
  monthRange,
} from '../behavior/behavior.service';
import { addDays, dayFromStr, schoolToday, ymd } from '../../common/schedule-weeks';

/**
 * Ota-ona / o'quvchi portali.
 * Ruxsat permission'ga emas, foydalanuvchining o'z bog'liqligiga asoslanadi:
 * har bir so'rovda o'quvchi shu foydalanuvchiniki ekani tekshiriladi.
 */

const DAY_MS = 86_400_000;
const dayEnd = (s: string) => new Date(`${s.slice(0, 10)}T23:59:59.999Z`);
/** Baho shkalasi: bazada 5 dan katta qiymat bo'lsa — 100 ballik (eski/import ma'lumot) */
const scaleOf = (values: number[]) => (values.some((v) => v > 5) ? 100 : 5);
const avg = (v: number[], d = 2) =>
  v.length ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10 ** d) / 10 ** d : 0;
const UZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const isMonth = (s?: string): s is string => !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
const shiftMonth = (ym: string, delta: number) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
/** Oyning [boshi, keyingi oy boshi) — sanalar UTC 00:00 "kun" sifatida saqlanadi */
const monthDays = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)), days: new Date(Date.UTC(y, m, 0)).getUTCDate() };
};

const GRADE_TYPE_LABEL: Record<string, string> = {
  DAILY: 'Kundalik',
  HOMEWORK: 'Uy vazifasi',
  EXAM: 'Imtihon',
  QUARTER: 'Chorak',
  SEMESTER: 'Yarim yil',
  YEAR: 'Yillik',
};
const SUB_STATUS_LABEL: Record<string, string> = {
  ASSIGNED: 'Berilgan',
  SUBMITTED: 'Topshirilgan',
  CHECKED: 'Baholangan',
  MISSING: 'Topshirilmagan',
};
const WEEKDAY_LABEL = ['', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];

/** Portal ko'radigan o'quvchi (myStudents select bilan bir xil) */
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  photo: string | null;
  classId: string | null;
  class: { id: string; name: string; language: string | null } | null;
  branch: { name: string } | null;
}

@Injectable()
export class PortalService {
  constructor(
    private prisma: PrismaService,
    private schedule: ScheduleService,
  ) {}

  // ===================== Ruxsat =====================

  /** Joriy foydalanuvchining farzandlari (yoki o'quvchining o'zi) */
  private async myStudents(userId: string) {
    const own = await this.prisma.student.findMany({
      where: { userId },
      select: this.studentSelect,
    });
    if (own.length) return own;
    const guardian = await this.prisma.guardian.findFirst({
      where: { userId },
      select: { students: { select: { student: { select: this.studentSelect } } } },
    });
    return guardian?.students.map((s) => s.student) ?? [];
  }

  private studentSelect = {
    id: true,
    firstName: true,
    lastName: true,
    photo: true,
    classId: true,
    class: { select: { id: true, name: true, language: true } },
    branch: { select: { name: true } },
  } as const;

  private async access(userId: string, studentId: string) {
    const list = await this.myStudents(userId);
    const s = list.find((x) => x.id === studentId);
    if (!s) throw new ForbiddenException("Bu o'quvchi ma'lumotiga ruxsat yo'q");
    return s;
  }

  private card(s: Awaited<ReturnType<PortalService['myStudents']>>[number]) {
    return {
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      fullName: `${s.lastName} ${s.firstName}`,
      photo: s.photo,
      classId: s.classId,
      className: s.class?.name ?? null,
      branch: s.branch?.name ?? null,
    };
  }

  /** Farzandlar ro'yxati (portal boshida tanlash uchun) */
  async children(userId: string) {
    return (await this.myStudents(userId)).map((s) => this.card(s));
  }

  // ===================== Bo'limlar =====================

  /** Baholar: fanlar kesimi, ro'yxat va o'sish grafigi */
  async grades(userId: string, studentId: string, params: { period?: string; subjectId?: string } = {}) {
    await this.access(userId, studentId);
    return this.gradesOf(studentId, params);
  }

  private async gradesOf(studentId: string, params: { period?: string; subjectId?: string } = {}) {
    const all = await this.prisma.grade.findMany({
      where: { studentId },
      include: { subject: { select: { id: true, name: true } }, teacher: { select: { fullName: true } } },
      orderBy: { date: 'desc' },
      take: 500,
    });
    const periods = [...new Set(all.map((g) => g.period).filter(Boolean))] as string[];
    const rows = all.filter(
      (g) => (!params.period || g.period === params.period) && (!params.subjectId || g.subjectId === params.subjectId),
    );
    const scale = scaleOf(all.map((g) => g.value));

    const bySubject = new Map<string, { id: string; name: string; values: number[] }>();
    for (const g of rows) {
      const x = bySubject.get(g.subjectId) ?? { id: g.subjectId, name: g.subject.name, values: [] };
      x.values.push(g.value);
      bySubject.set(g.subjectId, x);
    }

    return {
      scale,
      average: avg(rows.map((g) => g.value), 2),
      count: rows.length,
      periods,
      subjects: [...bySubject.values()]
        .map((s) => ({
          id: s.id,
          name: s.name,
          average: avg(s.values, 2),
          count: s.values.length,
          best: Math.max(...s.values),
          worst: Math.min(...s.values),
        }))
        .sort((a, b) => b.average - a.average),
      list: rows.slice(0, 200).map((g) => ({
        id: g.id,
        subject: g.subject.name,
        value: g.value,
        type: g.type,
        typeLabel: GRADE_TYPE_LABEL[g.type] ?? g.type,
        period: g.period,
        comment: g.comment,
        teacher: g.teacher?.fullName ?? null,
        date: ymd(g.date),
      })),
      // Grafik uchun — eski sanadan yangisiga (faqat kundalik/imtihon)
      trend: rows
        .filter((g) => ['DAILY', 'HOMEWORK', 'EXAM'].includes(g.type))
        .slice(0, 30)
        .reverse()
        .map((g) => ({ date: ymd(g.date), value: g.value, subject: g.subject.name })),
    };
  }

  /** Davomat: tanlangan oy bo'yicha kunlar va yig'indi */
  async attendance(userId: string, studentId: string, month?: string) {
    await this.access(userId, studentId);
    return this.attendanceOf(studentId, month);
  }

  private async attendanceOf(studentId: string, month?: string) {
    const today = ymd(schoolToday());
    const ym = isMonth(month) ? month : today.slice(0, 7);
    const { start, end, days } = monthDays(ym);
    const rows = await this.prisma.attendance.findMany({
      where: { studentId, date: { gte: start, lt: end } },
      orderBy: { date: 'asc' },
      select: { id: true, date: true, status: true, note: true },
    });
    const count = (st: string) => rows.filter((r) => r.status === st).length;
    const present = count('PRESENT');
    const late = count('LATE');
    const absent = count('ABSENT');
    const excused = count('EXCUSED');
    const total = rows.length;
    const denom = total - excused;
    const byDay = new Map(rows.map((r) => [ymd(r.date), r]));

    return {
      month: ym,
      monthLabel: `${UZ_MONTHS[Number(ym.slice(5)) - 1]} ${ym.slice(0, 4)}`,
      months: Array.from({ length: 6 }, (_, i) => {
        const m = shiftMonth(today.slice(0, 7), -i);
        return { month: m, label: `${UZ_MONTHS[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}` };
      }),
      total,
      present,
      absent,
      late,
      excused,
      // Belgilanmagan bo'lsa — foiz ko'rsatilmaydi (0% deb qo'rqitmaslik uchun)
      rate: denom > 0 ? Math.round(((present + late) / denom) * 100) : null,
      days: Array.from({ length: days }, (_, i) => {
        const d = `${ym}-${String(i + 1).padStart(2, '0')}`;
        const r = byDay.get(d);
        return { date: d, status: r?.status ?? null, note: r?.note ?? null, isFuture: d > today };
      }),
      // Faqat e'tibor talab qiladigan kunlar
      issues: rows
        .filter((r) => r.status !== 'PRESENT')
        .map((r) => ({ date: ymd(r.date), status: r.status, note: r.note }))
        .reverse(),
    };
  }

  /** Ahloqiy ball (oyiga 100) + rag'bat coinlari */
  async behavior(userId: string, studentId: string, month?: string) {
    await this.access(userId, studentId);
    return this.behaviorOf(studentId, month);
  }

  private async behaviorOf(studentId: string, month?: string) {
    const ym = isMonth(month) ? month : monthOf(new Date());
    const cur = monthRange(ym);
    const months = Array.from({ length: 6 }, (_, i) => shiftMonth(ym, -i)).reverse();
    const histStart = monthRange(months[0]).start;

    const [records, hist, coinAgg, coins] = await Promise.all([
      this.prisma.behaviorRecord.findMany({
        where: { studentId, date: { gte: cur.start, lt: cur.end } },
        include: { author: { select: { fullName: true } } },
        orderBy: { date: 'desc' },
      }),
      this.prisma.behaviorRecord.findMany({
        where: { studentId, type: 'NEGATIVE', date: { gte: histStart, lt: cur.end } },
        select: { points: true, date: true },
      }),
      this.prisma.coinRecord.aggregate({ where: { studentId }, _sum: { amount: true } }),
      this.prisma.coinRecord.findMany({
        where: { studentId },
        orderBy: { date: 'desc' },
        take: 20,
        select: { id: true, amount: true, reason: true, date: true },
      }),
    ]);

    const limit = MONTHLY_BEHAVIOR_POINTS;
    const deductedOf = (m: string) => {
      const { start, end } = monthRange(m);
      return Math.min(limit, hist.filter((r) => r.date >= start && r.date < end).reduce((s, r) => s + r.points, 0));
    };
    const deducted = deductedOf(ym);

    return {
      month: ym,
      monthLabel: monthLabel(ym),
      limit,
      deducted,
      remaining: Math.max(0, limit - deducted),
      records: records.map((r) => ({
        id: r.id,
        type: r.type,
        points: r.points,
        description: r.description,
        author: r.author?.fullName ?? null,
        date: ymd(r.date),
      })),
      history: months.map((m) => {
        const d = deductedOf(m);
        return { month: m, label: monthLabel(m), deducted: d, remaining: Math.max(0, limit - d) };
      }),
      coins: {
        balance: coinAgg._sum.amount ?? 0,
        records: coins.map((c) => ({ id: c.id, amount: c.amount, reason: c.reason, date: ymd(c.date) })),
      },
    };
  }

  /** Uy vazifalari — muddati va holati bo'yicha */
  async homework(userId: string, studentId: string) {
    await this.access(userId, studentId);
    return this.homeworkOf(studentId);
  }

  private async homeworkOf(studentId: string) {
    const rows = await this.prisma.homeworkSubmission.findMany({
      where: { studentId },
      include: {
        homework: {
          select: {
            id: true,
            title: true,
            type: true,
            description: true,
            dueDate: true,
            subject: { select: { name: true } },
            teacher: { select: { fullName: true } },
          },
        },
      },
      orderBy: { homework: { dueDate: 'desc' } },
      take: 100,
    });
    const today = schoolToday();
    const list = rows.map((s) => {
      const due = s.homework.dueDate;
      const done = ['SUBMITTED', 'CHECKED'].includes(s.status);
      return {
        id: s.id,
        title: s.homework.title,
        subject: s.homework.subject.name,
        teacher: s.homework.teacher?.fullName ?? null,
        type: s.homework.type,
        description: s.homework.description,
        dueDate: ymd(due),
        status: s.status,
        statusLabel: SUB_STATUS_LABEL[s.status] ?? s.status,
        grade: s.grade,
        teacherNote: s.teacherNote,
        submittedAt: s.submittedAt ? ymd(s.submittedAt) : null,
        overdue: !done && due < today,
        done,
      };
    });
    return {
      list,
      counts: {
        pending: list.filter((x) => !x.done && !x.overdue).length,
        overdue: list.filter((x) => x.overdue).length,
        submitted: list.filter((x) => x.status === 'SUBMITTED').length,
        checked: list.filter((x) => x.status === 'CHECKED').length,
      },
    };
  }

  /** Dars jadvali — tanlangan (yoki joriy) hafta */
  async weekSchedule(userId: string, studentId: string, weekId?: string) {
    return this.scheduleOf(await this.access(userId, studentId), weekId);
  }

  private async scheduleOf(s: Student, weekId?: string) {
    const today = ymd(schoolToday());
    if (!s.classId) {
      return { weeks: [], week: null, today, days: [], className: null };
    }
    const [weeksInfo, grid] = await Promise.all([
      this.schedule.listWeeks(),
      this.schedule.byClass(s.classId, weekId),
    ]);
    const week = weekId
      ? weeksInfo.weeks.find((w) => w.id === weekId)
      : weeksInfo.weeks.find((w) => w.isCurrent) ?? weeksInfo.weeks.find((w) => w.id === weeksInfo.activeWeekId);
    const start = week ? dayFromStr(week.startDate) : null;
    const dayCount = week
      ? Math.min(7, Math.round((dayFromStr(week.endDate).getTime() - dayFromStr(week.startDate).getTime()) / DAY_MS) + 1)
      : 6;

    return {
      className: s.class?.name ?? null,
      today,
      weeks: weeksInfo.weeks.map((w) => ({ id: w.id, startDate: w.startDate, endDate: w.endDate, isCurrent: w.isCurrent })),
      week: week ? { id: week.id, startDate: week.startDate, endDate: week.endDate, isCurrent: week.isCurrent } : null,
      days: (grid as any[])
        .filter((d) => d.weekday <= dayCount)
        .map((d) => {
          const date = start ? ymd(addDays(start, d.weekday - 1)) : null;
          return {
            weekday: d.weekday,
            label: WEEKDAY_LABEL[d.weekday] ?? d.label,
            date,
            isToday: date === today,
            lessons: d.lessons.map((l: any) => ({
              id: l.id,
              subject: l.subject?.name ?? '—',
              startTime: l.startTime,
              endTime: l.endTime,
              room: l.room,
              teachers: (l.teachers ?? []).map((t: any) => t.fullName),
            })),
          };
        }),
    };
  }

  /** To'lovlar: shartnomalar, oylik jadval va to'lov tarixi */
  async payments(userId: string, studentId: string) {
    await this.access(userId, studentId);
    return this.paymentsOf(studentId);
  }

  private async paymentsOf(studentId: string) {
    const today = schoolToday();
    const [contracts, payments] = await Promise.all([
      this.prisma.contract.findMany({
        where: { studentId, status: { notIn: ['DRAFT', 'CANCELLED'] } },
        include: { installments: { orderBy: { dueDate: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.findMany({
        where: { studentId },
        orderBy: { paidAt: 'desc' },
        take: 30,
        select: { id: true, amount: true, method: true, paidAt: true, isRefund: true, confirmedAt: true },
      }),
    ]);

    let debt = 0;
    let overdue = 0;
    let next: { dueDate: string; amount: number } | null = null;
    for (const c of contracts) {
      for (const i of c.installments) {
        const rem = Math.max(0, i.amount - i.paidAmount);
        if (rem <= 0) continue;
        debt += rem;
        if (i.dueDate < today) overdue += rem;
        else if (!next || i.dueDate < dayFromStr(next.dueDate)) next = { dueDate: ymd(i.dueDate), amount: rem };
      }
    }

    return {
      debt: Math.round(debt),
      overdue: Math.round(overdue),
      next,
      contracts: contracts.map((c) => ({
        id: c.id,
        number: c.number,
        status: c.status,
        monthlyAmount: c.monthlyAmount,
        installments: c.installments.map((i) => ({
          id: i.id,
          dueDate: ymd(i.dueDate),
          amount: i.amount,
          paidAmount: i.paidAmount,
          remaining: Math.max(0, i.amount - i.paidAmount),
          status: i.status,
          overdue: i.dueDate < today && i.amount - i.paidAmount > 0,
        })),
      })),
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.isRefund ? -p.amount : p.amount,
        method: p.method,
        date: ymd(p.paidAt),
        confirmed: !!p.confirmedAt,
      })),
    };
  }

  /** Oxirgi N kun davomati (bosh sahifadagi nuqtalar chizig'i uchun) */
  private async recentDays(studentId: string, days = 14) {
    const today = schoolToday();
    const from = addDays(today, -(days - 1));
    const rows = await this.prisma.attendance.findMany({
      where: { studentId, date: { gte: from, lte: today } },
      select: { date: true, status: true },
    });
    const byDay = new Map(rows.map((r) => [ymd(r.date), r.status]));
    return Array.from({ length: days }, (_, i) => {
      const d = ymd(addDays(from, i));
      return { date: d, status: byDay.get(d) ?? null };
    });
  }

  // ===================== Bosh sahifa =====================

  /** Dashboard: barcha bo'limlardan qisqacha */
  async summary(userId: string, studentId: string) {
    const s = await this.access(userId, studentId);
    const today = ymd(schoolToday());
    const ym = today.slice(0, 7);

    const [grades, attendance, behavior, homework, schedule, payments, recentDays] = await Promise.all([
      this.gradesOf(studentId),
      this.attendanceOf(studentId, ym),
      this.behaviorOf(studentId),
      this.homeworkOf(studentId),
      this.scheduleOf(s),
      this.paymentsOf(studentId),
      this.recentDays(studentId),
    ]);

    const todayDay = schedule.days.find((d) => d.isToday);
    const nextDay = schedule.days.find((d) => d.date && d.date > today && d.lessons.length);
    const upcoming = homework.list
      .filter((h) => !h.done)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    return {
      student: this.card(s),
      today,
      grades: {
        scale: grades.scale,
        average: grades.average,
        count: grades.count,
        subjects: grades.subjects.slice(0, 4),
        recent: grades.list.slice(0, 5),
      },
      attendance: {
        month: attendance.month,
        monthLabel: attendance.monthLabel,
        rate: attendance.rate,
        present: attendance.present,
        absent: attendance.absent,
        late: attendance.late,
        excused: attendance.excused,
        total: attendance.total,
        todayStatus: attendance.days.find((d) => d.date === today)?.status ?? null,
        // Oxirgi 2 hafta — nuqtalar chizig'i uchun
        recentDays,
      },
      behavior: {
        month: behavior.month,
        monthLabel: behavior.monthLabel,
        limit: behavior.limit,
        remaining: behavior.remaining,
        deducted: behavior.deducted,
        records: behavior.records.length,
        coins: behavior.coins.balance,
        // Oxirgi ayirilgan ballar — sabablari bilan
        last: behavior.records.slice(0, 2).map((r) => ({ points: r.points, description: r.description, date: r.date, type: r.type })),
      },
      homework: {
        total: homework.list.length,
        done: homework.list.filter((h) => h.done).length,
        pending: homework.counts.pending,
        overdue: homework.counts.overdue,
        next: upcoming[0] ?? null,
      },
      schedule: {
        weekId: schedule.week?.id ?? null,
        today: todayDay ? { label: todayDay.label, date: todayDay.date, lessons: todayDay.lessons } : null,
        next: nextDay ? { label: nextDay.label, date: nextDay.date, lessons: nextDay.lessons } : null,
      },
      payments: { debt: payments.debt, overdue: payments.overdue, next: payments.next },
    };
  }

  /** Farzandlar ro'yxati — har biri uchun qisqa ko'rsatkichlar */
  async overview(userId: string) {
    const students = await this.myStudents(userId);
    return Promise.all(
      students.map(async (s) => {
        const [g, a, b, h, p] = await Promise.all([
          this.gradesOf(s.id),
          this.attendanceOf(s.id),
          this.behaviorOf(s.id),
          this.homeworkOf(s.id),
          this.paymentsOf(s.id),
        ]);
        return {
          ...this.card(s),
          gradeAvg: g.average,
          gradeScale: g.scale,
          attendanceRate: a.rate,
          behaviorRemaining: b.remaining,
          behaviorLimit: b.limit,
          homeworkPending: h.counts.pending + h.counts.overdue,
          debt: p.debt,
          overdue: p.overdue,
        };
      }),
    );
  }
}
