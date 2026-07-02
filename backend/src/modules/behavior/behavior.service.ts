import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBehaviorDto } from './dto/create-behavior.dto';

@Injectable()
export class BehaviorService {
  constructor(private prisma: PrismaService) {}

  create(authorId: string | null, dto: CreateBehaviorDto) {
    return this.prisma.behaviorRecord.create({
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
  }

  list(params: { studentId?: string; type?: string }) {
    const where: any = {};
    if (params.studentId) where.studentId = params.studentId;
    if (params.type) where.type = params.type;
    return this.prisma.behaviorRecord.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        author: { select: { fullName: true } },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });
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
