import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { BulkGradeDto } from './dto/bulk-grade.dto';

const avg = (nums: number[]) =>
  nums.length ? Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10 : 0;

@Injectable()
export class GradesService {
  constructor(private prisma: PrismaService) {}

  create(teacherId: string | null, dto: CreateGradeDto) {
    return this.prisma.grade.create({
      data: {
        studentId: dto.studentId,
        subjectId: dto.subjectId,
        teacherId,
        value: dto.value,
        type: dto.type ?? 'DAILY',
        period: dto.period,
        comment: dto.comment,
        date: dto.date ? new Date(dto.date) : new Date(),
      },
    });
  }

  /** Butun sinfni bir fan bo'yicha bir vaqtda baholash */
  async bulkCreate(teacherId: string | null, dto: BulkGradeDto) {
    const date = dto.date ? new Date(dto.date) : new Date();
    await this.prisma.grade.createMany({
      data: dto.items.map((i) => ({
        studentId: i.studentId,
        subjectId: dto.subjectId,
        teacherId,
        value: i.value,
        type: dto.type ?? 'DAILY',
        period: dto.period,
        comment: i.comment,
        date,
      })),
    });
    return { created: dto.items.length };
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

    // fan bo'yicha guruhlash
    const bySubject: Record<string, { subject: any; values: number[] }> = {};
    for (const g of grades) {
      const key = g.subjectId;
      (bySubject[key] ??= { subject: g.subject, values: [] }).values.push(g.value);
    }

    const subjects = Object.values(bySubject).map((s) => ({
      subject: s.subject,
      average: avg(s.values),
      count: s.values.length,
    }));

    const overall = avg(subjects.map((s) => s.average));

    // progress grafigi uchun (DAILY baholar vaqt bo'yicha)
    const progress = grades
      .filter((g) => g.type === 'DAILY')
      .map((g) => ({ date: g.date, value: g.value, subject: g.subject.name }));

    return { overall, subjects, progress, totalGrades: grades.length };
  }

  /** Sinf jurnali: bir fan bo'yicha o'quvchilar va baholari */
  async classGradebook(classId: string, subjectId: string) {
    const students = await this.prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        grades: {
          where: { subjectId },
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

  remove(id: string) {
    return this.prisma.grade.delete({ where: { id } });
  }
}
