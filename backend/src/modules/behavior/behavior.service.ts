import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { canSeeAllClasses } from '../../common/rbac-open';
import { ownClassIds } from '../../common/own-classes';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBehaviorDto } from './dto/create-behavior.dto';

const dayFromStr = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00.000Z`);

/** Har o'quvchiga har oy beriladigan ahloqiy ball — qoidabuzarlik uchun shundan ayiriladi */
export const MONTHLY_BEHAVIOR_POINTS = 100;

const TZ = 'Asia/Tashkent';
const TZ_OFFSET_MS = 5 * 3600_000; // Toshkent UTC+5, yozgi vaqt yo'q
const UZ_MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

/** Sana qaysi oyga tegishli (Toshkent vaqti) — "YYYY-MM" */
export const monthOf = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ }).slice(0, 7);

/** "YYYY-MM" oyining [boshi, keyingi oy boshi) oralig'i — Toshkent 00:00 bo'yicha */
export function monthRange(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, 1) - TZ_OFFSET_MS),
    end: new Date(Date.UTC(y, m, 1) - TZ_OFFSET_MS),
  };
}

/** "2026-09" + (-1) → "2026-08" */
function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** "2026-09" → "Sentabr 2026" */
export const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return `${UZ_MONTHS[m - 1]} ${y}`;
};

const isMonth = (s?: string): s is string => !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

@Injectable()
export class BehaviorService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /** Oyda ayirilgan ball (faqat ayirish yozuvlari; eski ijobiy yozuvlar hisobga olinmaydi) */
  private async deductedIn(db: Prisma.TransactionClient, studentId: string, ym: string) {
    const { start, end } = monthRange(ym);
    const agg = await db.behaviorRecord.aggregate({
      where: { studentId, type: 'NEGATIVE', date: { gte: start, lt: end } },
      _sum: { points: true },
    });
    return agg._sum.points ?? 0;
  }

  private monthly(ym: string, deducted: number) {
    return {
      month: ym,
      monthLabel: monthLabel(ym),
      limit: MONTHLY_BEHAVIOR_POINTS,
      deducted,
      remaining: Math.max(0, MONTHLY_BEHAVIOR_POINTS - deducted),
    };
  }

  /** Ball ayirish — oylik 100 balldan; qolgandan ko'p ayirib bo'lmaydi (0 dan pastga tushmaydi) */
  async create(authorId: string | null, dto: CreateBehaviorDto) {
    if (dto.type && dto.type !== 'NEGATIVE') {
      throw new BadRequestException(
        "Ahloqiy baho faqat ball ayirish uchun. Rag'batlantirish uchun Coin tizimidan foydalaning",
      );
    }
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!student) throw new NotFoundException("O'quvchi topilmadi");

    const date = dto.date ? new Date(dto.date) : new Date();
    const ym = monthOf(date);

    const { rec, before } = await this.prisma.$transaction(async (tx) => {
      // Bir o'quvchiga bir vaqtda bir nechta ayirish kelsa — navbat bilan (ball 0 dan pastga tushmasin)
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`behavior:${dto.studentId}`}))`;
      const before = await this.deductedIn(tx, dto.studentId, ym);
      const remaining = Math.max(0, MONTHLY_BEHAVIOR_POINTS - before);
      if (remaining === 0) {
        throw new BadRequestException(
          `${monthLabel(ym)}: o'quvchining ahloqiy bali 0 — boshqa ayirib bo'lmaydi`,
        );
      }
      if (dto.points > remaining) {
        throw new BadRequestException(
          `${monthLabel(ym)}: o'quvchida ${remaining} ball qolgan — ko'pi bilan ${remaining} ball ayirish mumkin`,
        );
      }
      const rec = await tx.behaviorRecord.create({
        data: {
          studentId: dto.studentId,
          authorId,
          type: 'NEGATIVE',
          points: dto.points,
          description: dto.description,
          date,
        },
        include: {
          student: { select: { firstName: true, lastName: true } },
          author: { select: { fullName: true } },
        },
      });
      return { rec, before };
    });

    const monthly = this.monthly(ym, before + dto.points);

    // Vasiyga Telegram (faqat Telegram — SMS emas): kim, nechta ball, sabab va oy qoldig'i
    void this.notifications.notifyGuardians(
      dto.studentId,
      '📌 Ahloqiy ball ayirildi',
      [
        `👦 ${student.lastName} ${student.firstName}`,
        `➖ ${dto.points} ball — ${dto.description}`,
        `📊 ${monthly.monthLabel}: ${monthly.remaining}/${monthly.limit} ball qoldi`,
      ].join('\n'),
      { telegramOnly: true },
    );
    return { ...rec, monthly };
  }

  async list(
    user: { id: string; role: string },
    params: { studentId?: string; type?: string; classId?: string; from?: string; to?: string },
  ) {
    const where: any = {};
    if (params.studentId) where.studentId = params.studentId;
    if (params.type) where.type = params.type;
    if (params.classId) where.student = { classId: params.classId };

    // Ustoz/kurator/koordinator — faqat o'z sinflari o'quvchilarining yozuvlari
    if (!canSeeAllClasses(user.role)) {
      const mine = await ownClassIds(this.prisma, user.id);
      const classId =
        params.classId && mine.includes(params.classId) ? params.classId : { in: mine };
      where.student = { ...(where.student ?? {}), classId };
    }
    if (params.from || params.to) {
      where.date = {};
      if (params.from) where.date.gte = dayFromStr(params.from);
      if (params.to) where.date.lte = new Date(`${params.to.slice(0, 10)}T23:59:59.999Z`);
    }
    return this.prisma.behaviorRecord.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, class: { select: { name: true } } } },
        author: { select: { fullName: true } },
      },
      orderBy: { date: 'desc' },
      take: 500,
    });
  }

  /** Sinf ahloqiy statistikasi — oy bo'yicha: har o'quvchi 100 dan qancha ayirilgani va qolgani */
  async classStats(classId: string, month?: string) {
    const ym = isMonth(month) ? month : monthOf(new Date());
    const { start, end } = monthRange(ym);
    const students = await this.prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        behavior: {
          where: { type: 'NEGATIVE', date: { gte: start, lt: end } },
          select: { points: true },
        },
      },
    });

    const limit = MONTHLY_BEHAVIOR_POINTS;
    const ranking = students
      .map((s) => {
        const deducted = s.behavior.reduce((sum, b) => sum + b.points, 0);
        return {
          id: s.id,
          name: `${s.lastName} ${s.firstName}`,
          deducted,
          remaining: Math.max(0, limit - deducted),
          records: s.behavior.length,
        };
      })
      .sort((a, b) => b.remaining - a.remaining || a.name.localeCompare(b.name));

    const n = ranking.length;
    return {
      month: ym,
      monthLabel: monthLabel(ym),
      limit,
      students: n,
      averageRemaining: n
        ? Math.round((ranking.reduce((s, r) => s + r.remaining, 0) / n) * 10) / 10
        : limit,
      totalDeducted: ranking.reduce((s, r) => s + r.deducted, 0),
      withDeductions: ranking.filter((r) => r.deducted > 0).length,
      records: ranking.reduce((s, r) => s + r.records, 0),
      buckets: {
        full: ranking.filter((r) => r.remaining === limit).length,
        good: ranking.filter((r) => r.remaining >= 80 && r.remaining < limit).length,
        mid: ranking.filter((r) => r.remaining >= 50 && r.remaining < 80).length,
        low: ranking.filter((r) => r.remaining < 50).length,
      },
      ranking,
    };
  }

  /** O'quvchi xulq xulosasi: tanlangan (yoki joriy) oy bali + so'nggi 6 oy tarixi */
  async studentSummary(studentId: string, month?: string) {
    const ym = isMonth(month) ? month : monthOf(new Date());
    const months = Array.from({ length: 6 }, (_, i) => shiftMonth(ym, -i)); // joriy → orqaga
    const histStart = monthRange(months[months.length - 1]).start;
    const curEnd = monthRange(ym).end;

    const [neg, records, count] = await Promise.all([
      this.prisma.behaviorRecord.findMany({
        where: { studentId, type: 'NEGATIVE', date: { gte: histStart, lt: curEnd } },
        select: { points: true, date: true },
      }),
      this.prisma.behaviorRecord.findMany({
        where: { studentId },
        include: { author: { select: { fullName: true } } },
        orderBy: { date: 'desc' },
        take: 100,
      }),
      this.prisma.behaviorRecord.count({ where: { studentId } }),
    ]);

    const byMonth = new Map<string, number>();
    for (const r of neg) {
      const k = monthOf(r.date);
      byMonth.set(k, (byMonth.get(k) ?? 0) + r.points);
    }
    const cur = this.monthly(ym, byMonth.get(ym) ?? 0);

    return {
      ...cur,
      // Moslik uchun (portal va boshqalar): score — shu oy qoldig'i
      score: cur.remaining,
      positive: 0,
      negative: cur.deducted,
      count,
      history: months.map((k) => this.monthly(k, byMonth.get(k) ?? 0)),
      records,
    };
  }

  /** Sinf reytingi — joriy oy bali bo'yicha (eng yuqori ball tepada) */
  async classRanking(classId: string) {
    const ym = monthOf(new Date());
    const { start, end } = monthRange(ym);
    const students = await this.prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        behavior: {
          where: { type: 'NEGATIVE', date: { gte: start, lt: end } },
          select: { points: true },
        },
      },
    });

    return students
      .map((s) => {
        const deducted = s.behavior.reduce((sum, b) => sum + b.points, 0);
        const remaining = Math.max(0, MONTHLY_BEHAVIOR_POINTS - deducted);
        return {
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          deducted,
          remaining,
          score: remaining,
          positive: 0,
          negative: deducted,
        };
      })
      .sort(
        (a, b) =>
          b.remaining - a.remaining ||
          `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`),
      );
  }

  /** Yozuvni o'chirish — ayirilgan ball qaytadi, vasiyga bu haqida xabar boradi */
  async remove(id: string) {
    const rec = await this.prisma.behaviorRecord.findUnique({
      where: { id },
      include: { student: { select: { firstName: true, lastName: true } } },
    });
    if (!rec) throw new NotFoundException('Yozuv topilmadi');
    await this.prisma.behaviorRecord.delete({ where: { id } });

    if (rec.type === 'NEGATIVE') {
      const ym = monthOf(rec.date);
      const monthly = this.monthly(ym, await this.deductedIn(this.prisma, rec.studentId, ym));
      void this.notifications.notifyGuardians(
        rec.studentId,
        '↩️ Ahloqiy ball qaytarildi',
        [
          `👦 ${rec.student.lastName} ${rec.student.firstName}`,
          `➕ ${rec.points} ball qaytarildi (yozuv bekor qilindi: ${rec.description})`,
          `📊 ${monthly.monthLabel}: ${monthly.remaining}/${monthly.limit} ball`,
        ].join('\n'),
        { telegramOnly: true },
      );
    }
    return { ok: true };
  }
}
