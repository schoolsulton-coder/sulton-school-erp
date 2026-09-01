import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { isOpenAccess } from '../../common/rbac-open';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { SubmitHomeworkDto } from './dto/submit-homework.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

type JwtUser = { id: string; role: string };
const ADMIN_ROLES = ['superadmin', 'admin'];

@Injectable()
export class HomeworkService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /** Vazifa turlari ro'yxati (qayta ishlatish uchun) */
  listTypes() {
    return this.prisma.homeworkType.findMany({ orderBy: { createdAt: 'asc' } });
  }

  /** Yangi tur qo'shish — dedup (unique name orqali 2 marta yozilmaydi) */
  async addType(name: string) {
    const n = (name ?? '').trim();
    if (!n) throw new BadRequestException('Tur nomi bo‘sh bo‘lishi mumkin emas');
    return this.prisma.homeworkType.upsert({
      where: { name: n },
      update: {},
      create: { name: n },
    });
  }

  /** Vazifa yaratish — butun sinf yoki tanlangan o'quvchilarga ASSIGNED yoziladi */
  async create(user: JwtUser, dto: CreateHomeworkDto) {
    // Ustoz: faqat admin/owner boshqa ustozni tanlay oladi, aks holda o'zi
    const isAdmin = isOpenAccess(user.role) || ADMIN_ROLES.includes(user.role);
    const teacherId = isAdmin && dto.teacherId ? dto.teacherId : user.id;

    // O'quvchilar: tanlanган bo'lsa faqat ular (sinfga tegishlilari), aks holda butun sinf
    let students: { id: string }[];
    if (dto.studentIds?.length) {
      students = await this.prisma.student.findMany({
        where: { id: { in: dto.studentIds }, classId: dto.classId },
        select: { id: true },
      });
      if (!students.length) {
        throw new BadRequestException('Tanlangan o‘quvchilar sinfga tegishli emas');
      }
    } else {
      students = await this.prisma.student.findMany({
        where: { classId: dto.classId, status: 'ACTIVE' },
        select: { id: true },
      });
    }

    const type = (dto.type ?? '').trim() || 'Uyga vazifa';
    // Turni ro'yxatga saqlab qo'yamiz (dedup) — keyingi safar tanlash uchun
    await this.prisma.homeworkType
      .upsert({ where: { name: type }, update: {}, create: { name: type } })
      .catch(() => undefined);

    const hw = await this.prisma.homework.create({
      data: {
        classId: dto.classId,
        subjectId: dto.subjectId,
        teacherId,
        title: dto.title,
        type,
        description: dto.description,
        dueDate: new Date(dto.dueDate),
        attachments: dto.attachments ?? [],
        submissions: {
          create: students.map((s) => ({
            studentId: s.id,
            status: 'ASSIGNED' as const,
          })),
        },
      },
      include: { subject: true, class: true },
    });

    // Vasiyга Telegram bildirishnoma (faqat Telegram — SMS emas)
    const dueLabel = new Date(dto.dueDate).toLocaleDateString('uz-UZ');
    const notifyTitle = `📚 Yangi vazifa — ${hw.subject.name}`;
    const notifyBody = `${dto.title} (${type})\nMuddat: ${dueLabel}`;
    for (const s of students) {
      void this.notifications.notifyGuardians(s.id, notifyTitle, notifyBody, {
        telegramOnly: true,
      });
    }

    return hw;
  }

  async findAll(params: {
    classId?: string;
    subjectId?: string;
    teacherId?: string;
    studentId?: string;
    from?: string;
    to?: string;
  }) {
    const where: any = {};
    if (params.classId) where.classId = params.classId;
    if (params.subjectId) where.subjectId = params.subjectId;
    if (params.teacherId) where.teacherId = params.teacherId;
    if (params.studentId) where.submissions = { some: { studentId: params.studentId } };
    if (params.from || params.to) {
      where.dueDate = {};
      if (params.from) where.dueDate.gte = new Date(params.from);
      if (params.to) where.dueDate.lte = new Date(`${params.to}T23:59:59`);
    }

    const rows = await this.prisma.homework.findMany({
      where,
      include: {
        subject: true,
        class: { select: { name: true } },
        teacher: { select: { fullName: true } },
        _count: { select: { submissions: true } },
        submissions: { select: { status: true } },
      },
      orderBy: { dueDate: 'desc' },
    });

    return rows.map((h) => {
      const submitted = h.submissions.filter((s) =>
        ['SUBMITTED', 'CHECKED', 'LATE'].includes(s.status),
      ).length;
      const checked = h.submissions.filter((s) => s.status === 'CHECKED').length;
      const total = h._count.submissions;
      // Hammasi tekshirilgan yoki topshirmagan (MISSING) — ya'ni kutilayotgan yo'q
      const pending = h.submissions.filter((s) => !['CHECKED', 'MISSING'].includes(s.status)).length;
      return {
        id: h.id,
        title: h.title,
        type: h.type,
        subject: h.subject,
        className: h.class.name,
        teacher: h.teacher?.fullName ?? null,
        dueDate: h.dueDate,
        total,
        submitted,
        checked,
        done: total > 0 && pending === 0,
      };
    });
  }

  async findOne(id: string) {
    const hw = await this.prisma.homework.findUnique({
      where: { id },
      include: {
        subject: true,
        class: { select: { id: true, name: true } },
        teacher: { select: { fullName: true } },
        submissions: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { student: { lastName: 'asc' } },
        },
      },
    });
    if (!hw) throw new NotFoundException('Vazifa topilmadi');

    const total = hw.submissions.length;
    const submitted = hw.submissions.filter((s) =>
      ['SUBMITTED', 'CHECKED', 'LATE'].includes(s.status),
    ).length;
    const counts = {
      total,
      submitted,
      checked: hw.submissions.filter((s) => s.status === 'CHECKED').length,
      missing: hw.submissions.filter((s) => s.status === 'MISSING').length,
      notSubmitted: total - submitted, // topshirmagan (ASSIGNED + MISSING)
    };
    return { ...hw, teacherName: hw.teacher?.fullName ?? null, counts };
  }

  /** Topshirish — muddatdan keyin bo'lsa LATE belgilanadi */
  async submit(homeworkId: string, dto: SubmitHomeworkDto) {
    const hw = await this.prisma.homework.findUnique({
      where: { id: homeworkId },
    });
    if (!hw) throw new NotFoundException('Vazifa topilmadi');

    const late = new Date() > hw.dueDate;
    return this.prisma.homeworkSubmission.upsert({
      where: {
        homeworkId_studentId: { homeworkId, studentId: dto.studentId },
      },
      update: {
        files: dto.files ?? [],
        comment: dto.comment,
        status: late ? 'LATE' : 'SUBMITTED',
        submittedAt: new Date(),
      },
      create: {
        homeworkId,
        studentId: dto.studentId,
        files: dto.files ?? [],
        comment: dto.comment,
        status: late ? 'LATE' : 'SUBMITTED',
        submittedAt: new Date(),
      },
    });
  }

  /** Tekshirish — ball va izoh */
  async grade(submissionId: string, dto: GradeSubmissionDto) {
    const sub = await this.prisma.homeworkSubmission.findUnique({
      where: { id: submissionId },
    });
    if (!sub) throw new NotFoundException('Topshiriq topilmadi');

    return this.prisma.homeworkSubmission.update({
      where: { id: submissionId },
      data: {
        grade: dto.grade,
        teacherNote: dto.teacherNote,
        status: dto.status ?? 'CHECKED',
      },
    });
  }

  /** Muddati o'tib topshirilmagan vazifalar -> MISSING (cron chaqiradi) */
  async markOverdue() {
    const overdueHw = await this.prisma.homework.findMany({
      where: { dueDate: { lt: new Date() } },
      select: { id: true },
    });
    const ids = overdueHw.map((h) => h.id);
    const res = await this.prisma.homeworkSubmission.updateMany({
      where: { homeworkId: { in: ids }, status: 'ASSIGNED' },
      data: { status: 'MISSING' },
    });
    return { updated: res.count };
  }
}
