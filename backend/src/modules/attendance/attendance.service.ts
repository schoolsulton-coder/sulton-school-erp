import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { isOpenAccess } from '../../common/rbac-open';
import { NotificationsService } from '../notifications/notifications.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

type JwtUser = { id: string; role: string };

// Hamma sinf davomatini belgilay oladigan rollar (ustoz/kurator — faqat o'z sinfi)
const MARK_ALL_ROLES = ['superadmin', 'akademik', 'admin'];
// "O'qiyotgan" o'quvchi — shartnomasi shu holatlardan birida (ketgan/bekor/lead emas)
const ENROLLED_CONTRACT: any = {
  some: { status: { in: ['ACTIVE', 'COMPLETED', 'SUSPENDED', 'TEMP_SUSPENDED'] } },
};

// Sana stringidan (YYYY-MM-DD) barqaror UTC kun boshi — server zonasiga bog'liq emas
const dayFromStr = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00.000Z`);

// Davomat foizi: kelgan(PRESENT)+kechikkan(LATE) hisobga olinadi;
// sababli(EXCUSED) jazolanmaydi — maxrajdan chiqariladi.
const attRate = (c: { present: number; late: number; excused: number; total: number }) => {
  const denom = c.total - c.excused;
  const attended = c.present + c.late;
  return denom > 0 ? Math.round((attended / denom) * 100) : c.total > 0 ? 100 : 0;
};

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private canMarkAll(role?: string) {
    // Ochiq rejimda har qanday xodim istalgan sinf davomatini ko'radi/belgilaydi
    return isOpenAccess(role) || (!!role && MARK_ALL_ROLES.includes(role));
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
    const date = dayFromStr(dto.date);

    // O'quvchilar haqiqatan shu sinfga tegishlimi?
    if (!this.canMarkAll(user.role) && dto.records.length) {
      const ids = [...new Set(dto.records.map((r) => r.studentId))];
      const cnt = await this.prisma.student.count({ where: { id: { in: ids }, classId: dto.classId } });
      if (cnt !== ids.length) {
        throw new ForbiddenException("Ba'zi o'quvchilar bu sinfga tegishli emas");
      }
    }

    // Mavjud holat — faqat O'ZGARGAN yozuvlarni yozamiz (audit/updatedAt behuda buzilmasin)
    const existing = await this.prisma.attendance.findMany({
      where: { date, studentId: { in: dto.records.map((r) => r.studentId) } },
      select: { studentId: true, status: true, note: true },
    });
    const prev = new Map(existing.map((e) => [e.studentId, e]));

    const changed = dto.records.filter((r) => {
      const p = prev.get(r.studentId);
      return !p || p.status !== r.status || (r.note ?? null) !== (p.note ?? null);
    });

    if (changed.length) {
      await this.prisma.$transaction(
        changed.map((r) =>
          this.prisma.attendance.upsert({
            where: { studentId_date: { studentId: r.studentId, date } },
            update: { status: r.status, note: r.note, classId: dto.classId, markedById: user.id },
            create: { studentId: r.studentId, classId: dto.classId, date, status: r.status, note: r.note, markedById: user.id },
          }),
        ),
      );
    }

    // Yo'q / kechikkan / sababli — vasiyga Telegram (bor bo'lsa xabar yubormaymiz; spam bo'lmasin)
    const dateLabel = date.toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent' });
    const toNotify = changed.filter(
      (r) => r.status !== 'PRESENT' && prev.get(r.studentId)?.status !== r.status,
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

    return { marked: changed.length, notified: toNotify.length };
  }

  /** Sinf kunlik varaqasi: o'qiyotgan o'quvchilar + shu kungi holati (+ kim/qachon belgilagan) */
  async classDay(classId: string, dateStr?: string) {
    const date = dayFromStr(dateStr ?? this.schoolToday());
    const students = await this.prisma.student.findMany({
      where: { classId, status: 'ACTIVE', contracts: ENROLLED_CONTRACT },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        attendances: {
          where: { date },
          select: {
            status: true,
            note: true,
            updatedAt: true,
            markedBy: { select: { fullName: true } },
          },
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
      markedBy: s.attendances[0]?.markedBy?.fullName ?? null,
      markedAt: s.attendances[0]?.updatedAt ?? null,
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
    const late = count('LATE');
    const excused = count('EXCUSED');
    const total = records.length;
    return {
      total,
      present,
      absent: count('ABSENT'),
      late,
      excused,
      rate: attRate({ present, late, excused, total }),
      records,
    };
  }

  /** Sinf statistikasi (davr bo'yicha) — umumiy + o'quvchilar reytingi (o'qiyotganlar) */
  async classStats(classId: string, from?: string, to?: string) {
    const where: any = { classId, student: { status: 'ACTIVE', contracts: ENROLLED_CONTRACT } };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = dayFromStr(from);
      if (to) where.date.lte = dayFromStr(to);
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
    const late = count('LATE');
    const excused = count('EXCUSED');
    const total = records.length;

    // O'quvchilar bo'yicha davomat foizi (reyting)
    const byStudent = new Map<string, { id: string; name: string; present: number; late: number; excused: number; total: number }>();
    for (const r of records) {
      const s = byStudent.get(r.studentId) ?? {
        id: r.studentId,
        name: `${r.student.lastName} ${r.student.firstName}`,
        present: 0,
        late: 0,
        excused: 0,
        total: 0,
      };
      s.total += 1;
      if (r.status === 'PRESENT') s.present += 1;
      else if (r.status === 'LATE') s.late += 1;
      else if (r.status === 'EXCUSED') s.excused += 1;
      byStudent.set(r.studentId, s);
    }
    const students = [...byStudent.values()]
      .map((s) => ({ id: s.id, name: s.name, rate: attRate(s), present: s.present, total: s.total }))
      .sort((a, b) => a.rate - b.rate); // eng past davomatchilar tepada (e'tibor uchun)

    return {
      total,
      present,
      absent: count('ABSENT'),
      late,
      excused,
      rate: attRate({ present, late, excused, total }),
      students,
    };
  }
}
