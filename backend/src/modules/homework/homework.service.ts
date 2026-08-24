import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { SubmitHomeworkDto } from './dto/submit-homework.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

@Injectable()
export class HomeworkService {
  constructor(private prisma: PrismaService) {}

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
  async create(teacherId: string, dto: CreateHomeworkDto) {
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

    return this.prisma.homework.create({
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
  }

  async findAll(params: { classId?: string; subjectId?: string; teacherId?: string }) {
    const where: any = {};
    if (params.classId) where.classId = params.classId;
    if (params.subjectId) where.subjectId = params.subjectId;
    if (params.teacherId) where.teacherId = params.teacherId;

    const rows = await this.prisma.homework.findMany({
      where,
      include: {
        subject: true,
        class: { select: { name: true } },
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
      return {
        id: h.id,
        title: h.title,
        type: h.type,
        subject: h.subject,
        className: h.class.name,
        dueDate: h.dueDate,
        total: h._count.submissions,
        submitted,
        checked,
      };
    });
  }

  async findOne(id: string) {
    const hw = await this.prisma.homework.findUnique({
      where: { id },
      include: {
        subject: true,
        class: { select: { id: true, name: true } },
        submissions: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { student: { lastName: 'asc' } },
        },
      },
    });
    if (!hw) throw new NotFoundException('Vazifa topilmadi');

    const counts = {
      total: hw.submissions.length,
      submitted: hw.submissions.filter((s) =>
        ['SUBMITTED', 'CHECKED', 'LATE'].includes(s.status),
      ).length,
      checked: hw.submissions.filter((s) => s.status === 'CHECKED').length,
      missing: hw.submissions.filter((s) => s.status === 'MISSING').length,
    };
    return { ...hw, counts };
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
