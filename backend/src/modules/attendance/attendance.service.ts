import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

// Sanani kun boshiga (00:00) keltiramiz — unique(studentId, date) uchun
const dayStart = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /** Sinfni kunlik belgilash (har o'quvchi uchun upsert) */
  async markClass(dto: MarkAttendanceDto) {
    const date = dayStart(new Date(dto.date));

    await this.prisma.$transaction(
      dto.records.map((r) =>
        this.prisma.attendance.upsert({
          where: { studentId_date: { studentId: r.studentId, date } },
          update: { status: r.status, note: r.note, classId: dto.classId },
          create: {
            studentId: r.studentId,
            classId: dto.classId,
            date,
            status: r.status,
            note: r.note,
          },
        }),
      ),
    );

    // ABSENT/LATE -> ota-onaga avtomatik bildirishnoma (fire-and-forget)
    const dateLabel = date.toLocaleDateString('uz-UZ');
    const toNotify = dto.records.filter(
      (r) => r.status === 'ABSENT' || r.status === 'LATE',
    );
    for (const r of toNotify) {
      const msg =
        r.status === 'ABSENT'
          ? `Farzandingiz bugun (${dateLabel}) darsda qatnashmadi.`
          : `Farzandingiz bugun (${dateLabel}) darsga kechikdi.`;
      void this.notifications.notifyGuardians(r.studentId, 'Davomat', msg);
    }

    return { marked: dto.records.length, toNotify: toNotify.length };
  }

  /** Sinf kunlik varaqasi: o'quvchilar + shu kungi holati (belgilash UI uchun) */
  async classDay(classId: string, dateStr?: string) {
    const date = dayStart(dateStr ? new Date(dateStr) : new Date());
    const students = await this.prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        attendances: {
          where: { date },
          select: { status: true, note: true },
        },
      },
      orderBy: { lastName: 'asc' },
    });

    return students.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      status: s.attendances[0]?.status ?? null,
      note: s.attendances[0]?.note ?? null,
    }));
  }

  /** O'quvchi davomat hisoboti (oy bo'yicha) */
  async studentReport(studentId: string, month?: string) {
    const where: any = { studentId };
    if (month) {
      const [y, m] = month.split('-').map(Number);
      where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    }
    const records = await this.prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const count = (st: string) => records.filter((r) => r.status === st).length;
    const present = count('PRESENT');
    const total = records.length;
    return {
      total,
      present,
      absent: count('ABSENT'),
      late: count('LATE'),
      excused: count('EXCUSED'),
      rate: total ? Math.round((present / total) * 100) : 0,
      records,
    };
  }

  /** Sinf statistikasi (davr bo'yicha) */
  async classStats(classId: string, from?: string, to?: string) {
    const where: any = { classId };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = dayStart(new Date(from));
      if (to) where.date.lte = dayStart(new Date(to));
    }
    const records = await this.prisma.attendance.findMany({ where });
    const count = (st: string) => records.filter((r) => r.status === st).length;
    const present = count('PRESENT');
    const total = records.length;
    return {
      total,
      present,
      absent: count('ABSENT'),
      late: count('LATE'),
      excused: count('EXCUSED'),
      rate: total ? Math.round((present / total) * 100) : 0,
    };
  }
}
