import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

type JwtUser = { id: string; role: string };

// Hamma sinf davomatini belgilay oladigan rollar (ustoz/kurator — faqat o'z sinfi)
const MARK_ALL_ROLES = ['superadmin', 'akademik', 'admin'];
// "O'qiyotgan" o'quvchi — shartnomasi shu holatlardan birida (ketgan/bekor/lead emas)
const ENROLLED_CONTRACT: any = {
  some: { status: { in: ['ACTIVE', 'COMPLETED', 'SUSPENDED', 'TEMP_SUSPENDED'] } },
};

// Sanani kun boshiga (00:00) keltiramiz — unique(studentId, date) uchun
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private canMarkAll(role?: string) {
    return !!role && MARK_ALL_ROLES.includes(role);
  }

  private schoolToday(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
  }

  /** Ustoz/kurator shu sinfga biriktirilganmi? (ClassTeacher yoki dars jadvali) */
  private async assertCanMarkClass(user: JwtUser, classId: string) {
    if (this.canMarkAll(user.role)) return;
    const ct = await this.prisma.classTeacher.findFirst({
      where: { classId, teacherId: user.id },
      select: { id: true },
    });
    if (ct) return;
    const sch = await this.prisma.schedule.findFirst({
      where: { classId, teacherId: user.id },
      select: { id: true },
    });
    if (sch) return;
    throw new ForbiddenException("Bu sinf sizga biriktirilmagan — davomat qo'ya olmaysiz");
  }

  /** Foydalanuvchi belgilay oladigan sinflar (hamma belgilay oladiganlar — barchasi) */
  async myClasses(user: JwtUser) {
    if (this.canMarkAll(user.role)) {
      const classes = await this.prisma.class.findMany({
        where: { status: 'Faol' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      return { canMarkAll: true, classes };
    }
    const [cts, schs] = await Promise.all([
      this.prisma.classTeacher.findMany({
        where: { teacherId: user.id },
        select: { class: { select: { id: true, name: true } } },
      }),
      this.prisma.schedule.findMany({
        where: { teacherId: user.id },
        select: { class: { select: { id: true, name: true } } },
      }),
    ]);
    const map = new Map<string, string>();
    for (const c of cts) if (c.class) map.set(c.class.id, c.class.name);
    for (const s of schs) if (s.class) map.set(s.class.id, s.class.name);
    return {
      canMarkAll: false,
      classes: [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  /** Sinfni kunlik belgilash (har o'quvchi uchun upsert) */
  async markClass(user: JwtUser, dto: MarkAttendanceDto) {
    await this.assertCanMarkClass(user, dto.classId);
    // Ustoz/kurator faqat bugungi kunga (akademik — istalgan kun)
    const day = dto.date.slice(0, 10);
    if (!this.canMarkAll(user.role) && day !== this.schoolToday()) {
      throw new ForbiddenException('Faqat bugungi davomatni belgilaysiz');
    }
    const date = dayStart(new Date(dto.date));

    // O'quvchilar haqiqatan shu sinfga tegishlimi?
    if (!this.canMarkAll(user.role) && dto.records.length) {
      const ids = [...new Set(dto.records.map((r) => r.studentId))];
      const cnt = await this.prisma.student.count({ where: { id: { in: ids }, classId: dto.classId } });
      if (cnt !== ids.length) {
        throw new ForbiddenException("Ba'zi o'quvchilar bu sinfga tegishli emas");
      }
    }

    // Mavjud holatni bilib olamiz — faqat O'ZGARGAN holatlarga xabar yuboramiz
    const existing = await this.prisma.attendance.findMany({
      where: { date, studentId: { in: dto.records.map((r) => r.studentId) } },
      select: { studentId: true, status: true },
    });
    const prev = new Map(existing.map((e) => [e.studentId, e.status]));

    await this.prisma.$transaction(
      dto.records.map((r) =>
        this.prisma.attendance.upsert({
          where: { studentId_date: { studentId: r.studentId, date } },
          update: { status: r.status, note: r.note, classId: dto.classId, markedById: user.id },
          create: { studentId: r.studentId, classId: dto.classId, date, status: r.status, note: r.note, markedById: user.id },
        }),
      ),
    );

    // Yo'q / kechikkan / sababli — vasiyga Telegram (bor bo'lsa xabar yubormaymiz; spam bo'lmasin)
    const dateLabel = date.toLocaleDateString('uz-UZ');
    const toNotify = dto.records.filter(
      (r) => r.status !== 'PRESENT' && prev.get(r.studentId) !== r.status,
    );
    for (const r of toNotify) {
      const label =
        r.status === 'ABSENT' ? 'darsda qatnashmadi' : r.status === 'LATE' ? 'darsga kechikdi' : 'sababli darsda bo\'lmadi';
      void this.notifications.notifyGuardians(
        r.studentId,
        '📋 Davomat',
        `Farzandingiz ${dateLabel} kuni ${label}.`,
        { telegramOnly: true },
      );
    }

    return { marked: dto.records.length, notified: toNotify.length };
  }

  /** Sinf kunlik varaqasi: o'qiyotgan o'quvchilar + shu kungi holati */
  async classDay(classId: string, dateStr?: string) {
    const date = dayStart(dateStr ? new Date(dateStr) : new Date());
    const students = await this.prisma.student.findMany({
      where: { classId, status: 'ACTIVE', contracts: ENROLLED_CONTRACT },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        attendances: { where: { date }, select: { status: true, note: true } },
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
    const records = await this.prisma.attendance.findMany({ where, orderBy: { date: 'desc' } });
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

  /** Sinf statistikasi (davr bo'yicha) — umumiy + o'quvchilar reytingi (o'qiyotganlar) */
  async classStats(classId: string, from?: string, to?: string) {
    const where: any = { classId, student: { contracts: ENROLLED_CONTRACT } };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = dayStart(new Date(from));
      if (to) where.date.lte = dayStart(new Date(to));
    }
    const records = await this.prisma.attendance.findMany({
      where,
      select: {
        status: true,
        studentId: true,
        student: { select: { firstName: true, lastName: true } },
      },
    });
    const count = (st: string) => records.filter((r) => r.status === st).length;
    const present = count('PRESENT');
    const total = records.length;

    // O'quvchilar bo'yicha davomat foizi (reyting)
    const byStudent = new Map<string, { id: string; name: string; present: number; total: number }>();
    for (const r of records) {
      const s = byStudent.get(r.studentId) ?? {
        id: r.studentId,
        name: `${r.student.lastName} ${r.student.firstName}`,
        present: 0,
        total: 0,
      };
      s.total += 1;
      if (r.status === 'PRESENT') s.present += 1;
      byStudent.set(r.studentId, s);
    }
    const students = [...byStudent.values()]
      .map((s) => ({ id: s.id, name: s.name, rate: s.total ? Math.round((s.present / s.total) * 100) : 0, present: s.present, total: s.total }))
      .sort((a, b) => a.rate - b.rate); // eng ko'p qoldirganlar tepada

    return {
      total,
      present,
      absent: count('ABSENT'),
      late: count('LATE'),
      excused: count('EXCUSED'),
      rate: total ? Math.round((present / total) * 100) : 0,
      students,
    };
  }
}
