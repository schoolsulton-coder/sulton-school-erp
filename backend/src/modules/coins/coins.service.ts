import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { canSeeAllClasses } from '../../common/rbac-open';
import { ownClassIds } from '../../common/own-classes';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCoinDto } from './dto/create-coin.dto';

type JwtUser = { id: string; role: string };

const dayFromStr = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00.000Z`);
const dayToStr = (s: string) => new Date(`${s.slice(0, 10)}T23:59:59.999Z`);

@Injectable()
export class CoinsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /** Ustoz/kurator — faqat o'z sinflari; qolgan rollar — barcha sinflar */
  private async classScope(user: JwtUser): Promise<string[] | null> {
    if (canSeeAllClasses(user.role)) return null;
    return ownClassIds(this.prisma, user.id);
  }

  /** Coin yozuvlari ro'yxati (o'z sinflari bilan cheklangan) */
  async list(
    user: JwtUser,
    params: { studentId?: string; classId?: string; from?: string; to?: string },
  ) {
    const where: any = {};
    if (params.studentId) where.studentId = params.studentId;
    if (params.classId) where.student = { classId: params.classId };
    if (params.from || params.to) {
      where.date = {};
      if (params.from) where.date.gte = dayFromStr(params.from);
      if (params.to) where.date.lte = dayToStr(params.to);
    }

    const mine = await this.classScope(user);
    if (mine) {
      const classId =
        params.classId && mine.includes(params.classId) ? params.classId : { in: mine };
      where.student = { ...(where.student ?? {}), classId };
    }

    return this.prisma.coinRecord.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            class: { select: { name: true } },
          },
        },
        author: { select: { fullName: true } },
      },
      orderBy: { date: 'desc' },
      take: 500,
    });
  }

  /** O'quvchi balansi va oxirgi yozuvlari */
  async studentSummary(studentId: string) {
    const [agg, records] = await Promise.all([
      this.prisma.coinRecord.aggregate({
        where: { studentId },
        _sum: { amount: true },
      }),
      this.prisma.coinRecord.findMany({
        where: { studentId },
        include: { author: { select: { fullName: true } } },
        orderBy: { date: 'desc' },
        take: 100,
      }),
    ]);
    return { balance: agg._sum.amount ?? 0, records };
  }

  /** Sinf statistikasi: jami, qo'shilgan/ayirilgan va o'quvchilar reytingi */
  async classStats(classId: string, from?: string, to?: string) {
    const dateWhere: any = {};
    if (from) dateWhere.gte = dayFromStr(from);
    if (to) dateWhere.lte = dayToStr(to);

    const students = await this.prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        coins: {
          where: from || to ? { date: dateWhere } : undefined,
          select: { amount: true },
        },
      },
    });

    let earned = 0;
    let spent = 0;
    const ranking = students
      .map((s) => {
        const plus = s.coins.filter((c) => c.amount > 0).reduce((sum, c) => sum + c.amount, 0);
        const minus = s.coins.filter((c) => c.amount < 0).reduce((sum, c) => sum + c.amount, 0);
        earned += plus;
        spent += minus;
        return {
          id: s.id,
          name: `${s.lastName} ${s.firstName}`,
          earned: plus,
          spent: Math.abs(minus),
          balance: plus + minus,
          count: s.coins.length,
        };
      })
      .sort((a, b) => b.balance - a.balance);

    return {
      students: students.length,
      earned,
      spent: Math.abs(spent),
      balance: earned + spent,
      average: students.length
        ? Math.round(((earned + spent) / students.length) * 10) / 10
        : 0,
      ranking,
    };
  }

  /** Coin qo'shish/ayirish — ustoz faqat o'z sinfi o'quvchisiga */
  async create(user: JwtUser, dto: CreateCoinDto) {
    if (!dto.amount) {
      throw new ForbiddenException('Coin miqdori 0 bo‘lishi mumkin emas');
    }
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      select: { id: true, classId: true },
    });
    if (!student) throw new NotFoundException("O'quvchi topilmadi");

    const mine = await this.classScope(user);
    if (mine && (!student.classId || !mine.includes(student.classId))) {
      throw new ForbiddenException(
        "Bu o'quvchi sizga biriktirilgan sinflarda emas",
      );
    }

    const rec = await this.prisma.coinRecord.create({
      data: {
        studentId: dto.studentId,
        authorId: user.id,
        amount: dto.amount,
        reason: dto.reason,
        date: dto.date ? new Date(dto.date) : new Date(),
      },
      include: {
        student: { select: { firstName: true, lastName: true } },
        author: { select: { fullName: true } },
      },
    });

    // Vasiyga Telegram xabari (faqat Telegram — SMS emas)
    const label = dto.amount > 0 ? 'qo‘shildi' : 'ayirildi';
    void this.notifications.notifyGuardians(
      dto.studentId,
      '🪙 Coin',
      `${Math.abs(dto.amount)} coin ${label}: ${dto.reason}`,
      { telegramOnly: true },
    );
    return rec;
  }

  /** Yozuvni o'chirish — o'zi yozgan yoki to'liq kirish roli */
  async remove(user: JwtUser, id: string) {
    const rec = await this.prisma.coinRecord.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException('Yozuv topilmadi');
    if (rec.authorId !== user.id && !canSeeAllClasses(user.role)) {
      throw new ForbiddenException("Faqat o'zingiz yozgan coinni o'chira olasiz");
    }
    await this.prisma.coinRecord.delete({ where: { id } });
    return { ok: true };
  }
}
