import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBehaviorDto } from './dto/create-behavior.dto';

const dayFromStr = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00.000Z`);

@Injectable()
export class BehaviorService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(authorId: string | null, dto: CreateBehaviorDto) {
    const rec = await this.prisma.behaviorRecord.create({
      data: {
        studentId: dto.studentId,
        authorId,
        type: dto.type,
        points: dto.points,
        description: dto.description,
        date: dto.date ? new Date(dto.date) : new Date(),
      },
      include: {
        student: { select: { firstName: true, lastName: true } },
        author: { select: { fullName: true } },
      },
    });

    // Vasiyга Telegram (faqat Telegram — SMS emas)
    const label = dto.type === 'POSITIVE' ? 'Ijobiy' : 'Salbiy';
    void this.notifications.notifyGuardians(
      dto.studentId,
      '📌 Ahloqiy baho',
      `${label} (${dto.points} ball): ${dto.description}`,
      { telegramOnly: true },
    );
    return rec;
  }

  list(params: { studentId?: string; type?: string; classId?: string; from?: string; to?: string }) {
    const where: any = {};
    if (params.studentId) where.studentId = params.studentId;
    if (params.type) where.type = params.type;
    if (params.classId) where.student = { classId: params.classId };
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

  /** Sinf ahloqiy statistikasi (davr bo'yicha) — taqsimot + reyting */
  async classStats(classId: string, from?: string, to?: string) {
    const dateWhere: any = {};
    if (from) dateWhere.gte = dayFromStr(from);
    if (to) dateWhere.lte = new Date(`${to.slice(0, 10)}T23:59:59.999Z`);
    const students = await this.prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        behavior: {
          where: from || to ? { date: dateWhere } : undefined,
          select: { type: true, points: true },
        },
      },
    });
    let posPoints = 0, negPoints = 0, posCount = 0, negCount = 0;
    const ranking = students.map((s) => {
      const positive = s.behavior.filter((b) => b.type === 'POSITIVE').reduce((sum, b) => sum + b.points, 0);
      const negative = s.behavior.filter((b) => b.type === 'NEGATIVE').reduce((sum, b) => sum + b.points, 0);
      posPoints += positive; negPoints += negative;
      posCount += s.behavior.filter((b) => b.type === 'POSITIVE').length;
      negCount += s.behavior.filter((b) => b.type === 'NEGATIVE').length;
      return { id: s.id, name: `${s.lastName} ${s.firstName}`, positive, negative, score: positive - negative };
    }).sort((a, b) => b.score - a.score);

    return {
      total: posCount + negCount,
      posCount,
      negCount,
      posPoints,
      negPoints,
      net: posPoints - negPoints,
      students: ranking,
    };
  }

  /** O'quvchi xulq xulosasi: ball = ijobiy − salbiy */
  async studentSummary(studentId: string) {
    const records = await this.prisma.behaviorRecord.findMany({
      where: { studentId },
      include: { author: { select: { fullName: true } } },
      orderBy: { date: 'desc' },
    });
    const positive = records
      .filter((r) => r.type === 'POSITIVE')
      .reduce((s, r) => s + r.points, 0);
    const negative = records
      .filter((r) => r.type === 'NEGATIVE')
      .reduce((s, r) => s + r.points, 0);

    return {
      score: positive - negative,
      positive,
      negative,
      count: records.length,
      records,
    };
  }

  /** Sinf reytingi — rag'batlantirish uchun (ballga ko'ra) */
  async classRanking(classId: string) {
    const students = await this.prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        behavior: { select: { type: true, points: true } },
      },
    });

    return students
      .map((s) => {
        const positive = s.behavior
          .filter((b) => b.type === 'POSITIVE')
          .reduce((sum, b) => sum + b.points, 0);
        const negative = s.behavior
          .filter((b) => b.type === 'NEGATIVE')
          .reduce((sum, b) => sum + b.points, 0);
        return {
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          positive,
          negative,
          score: positive - negative,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  remove(id: string) {
    return this.prisma.behaviorRecord.delete({ where: { id } });
  }
}
