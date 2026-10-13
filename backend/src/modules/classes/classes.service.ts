import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { activeWeek } from '../../common/schedule-weeks';
import { canSeeAllClasses, PORTAL_ROLES } from '../../common/rbac-open';

// Sinfga biriktirilishi mumkin bo'lgan rollar
const ASSIGNABLE_ROLES = ['coordinator', 'teacher', 'curator'];
import { ownClassIds } from '../../common/own-classes';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { AssignStudentsDto } from './dto/assign-students.dto';
import { AssignTeacherDto } from './dto/assign-teacher.dto';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async findAll(academicYear?: string, user?: { id: string; role: string }) {
    // Ustoz/kurator/koordinator faqat o'ziga biriktirilgan sinflarni ko'radi
    const mine = user && !canSeeAllClasses(user.role) ? await ownClassIds(this.prisma, user.id) : null;
    const classes = await this.prisma.class.findMany({
      where: {
        ...(academicYear ? { academicYear } : {}),
        ...(mine ? { id: { in: mine } } : {}),
      },
      include: {
        // Joy band qiladigan faqat o'qiyotgan o'quvchi (nofaol/bitirgan/chetlatilgan emas)
        _count: { select: { students: { where: { status: 'ACTIVE' } } } },
        branch: { select: { id: true, name: true } },
        teachers: {
          include: { teacher: { select: { id: true, fullName: true } } },
        },
      },
      orderBy: [{ gradeLevel: 'asc' }, { name: 'asc' }],
    });
    // sig'im, band/bo'sh joy va to'lganlik foizi
    return classes.map((c) => {
      const studentCount = c._count.students;
      const freeSeats = Math.max(c.capacity - studentCount, 0);
      return {
        ...c,
        studentCount,
        freeSeats,
        fillPercent: c.capacity
          ? Math.round((studentCount / c.capacity) * 100)
          : 0,
      };
    });
  }

  async findOne(id: string) {
    // Sinf ichidagi jadval — joriy hafta bo'yicha (haftalar nusxasi takrorlanmasin)
    const week = await activeWeek(this.prisma);
    const cls = await this.prisma.class.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        students: {
          orderBy: { lastName: 'asc' },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photo: true,
            status: true,
          },
        },
        teachers: {
          include: { teacher: { select: { id: true, fullName: true } } },
        },
        schedules: {
          where: { weekId: week?.id ?? null },
          include: {
            subject: true,
            // teacher relation Schedule modelida bevosita yo'q — teacherId orqali
          },
          orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
        },
      },
    });
    if (!cls) throw new NotFoundException('Sinf topilmadi');
    return cls;
  }

  create(dto: CreateClassDto) {
    return this.prisma.class.create({
      data: { ...dto, capacity: dto.capacity ?? 30 },
    });
  }

  async update(id: string, dto: UpdateClassDto) {
    await this.ensureExists(id);
    return this.prisma.class.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    // o'quvchilarni sinfdan ajratamiz, so'ng sinfni o'chiramiz
    await this.prisma.student.updateMany({
      where: { classId: id },
      data: { classId: null },
    });
    return this.prisma.class.delete({ where: { id } });
  }

  /** O'quvchilarni sinfga biriktirish — SIG'IM NAZORATI bilan */
  async assignStudents(id: string, dto: AssignStudentsDto) {
    const cls = await this.ensureExists(id);
    const currentCount = await this.prisma.student.count({
      where: { classId: id, status: 'ACTIVE' },
    });

    // faqat hozir shu sinfda bo'lmagan o'quvchilar yangi qo'shiladi
    const incoming = await this.prisma.student.findMany({
      where: { id: { in: dto.studentIds }, NOT: { classId: id } },
      select: { id: true },
    });

    if (currentCount + incoming.length > cls.capacity) {
      throw new BadRequestException(
        `Sig'im yetarli emas: ${cls.capacity} (hozir ${currentCount}, qo'shilmoqchi ${incoming.length})`,
      );
    }

    await this.prisma.student.updateMany({
      where: { id: { in: dto.studentIds } },
      data: { classId: id },
    });
    return { assigned: dto.studentIds.length };
  }

  async removeStudent(id: string, studentId: string) {
    await this.ensureExists(id);
    return this.prisma.student.update({
      where: { id: studentId },
      data: { classId: null },
    });
  }

  /** Ustoz yoki kurator biriktirish */
  async assignTeacher(id: string, dto: AssignTeacherDto) {
    await this.ensureExists(id);
    return this.prisma.classTeacher.upsert({
      where: {
        classId_teacherId: { classId: id, teacherId: dto.teacherId },
      },
      update: { isCurator: dto.isCurator ?? false },
      create: {
        classId: id,
        teacherId: dto.teacherId,
        isCurator: dto.isCurator ?? false,
      },
    });
  }

  async removeTeacher(id: string, teacherId: string) {
    await this.ensureExists(id);
    // deleteMany — ikki marta bosilsa ham xato bermaydi
    const r = await this.prisma.classTeacher.deleteMany({
      where: { classId: id, teacherId },
    });
    return { removed: r.count };
  }

  /**
   * Xodim–sinf biriktirish oynasi uchun ma'lumot.
   * Xodimlar: sinfga biriktirilishi mumkin bo'lgan rollar + allaqachon
   * biriktirilgan har qanday xodim (roli keyin o'zgargan bo'lsa ham ko'rinsin).
   */
  async staffWithClasses() {
    const [staff, classes] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          AND: [
            { NOT: { role: { slug: { in: PORTAL_ROLES } } } },
            {
              OR: [
                { role: { slug: { in: ASSIGNABLE_ROLES } } },
                { taughtClasses: { some: {} } },
              ],
            },
          ],
        },
        select: {
          id: true,
          fullName: true,
          phone: true,
          status: true,
          role: { select: { slug: true, name: true } },
          subject: { select: { name: true } },
          taughtClasses: { select: { classId: true, isCurator: true } },
        },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.class.findMany({
        select: {
          id: true,
          name: true,
          gradeLevel: true,
          academicYear: true,
          status: true,
          _count: { select: { students: { where: { status: 'ACTIVE' } } } },
          teachers: {
            select: { isCurator: true, teacher: { select: { id: true, fullName: true } } },
          },
        },
        orderBy: [{ gradeLevel: 'asc' }, { name: 'asc' }],
      }),
    ]);

    return {
      staff: staff.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        phone: u.phone,
        status: u.status,
        role: u.role.slug,
        roleName: u.role.name,
        subject: u.subject?.name ?? null,
        classes: u.taughtClasses.map((t) => ({ id: t.classId, isCurator: t.isCurator })),
      })),
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        gradeLevel: c.gradeLevel,
        academicYear: c.academicYear,
        status: c.status,
        students: c._count.students,
        staff: c.teachers.map((t) => ({
          id: t.teacher.id,
          fullName: t.teacher.fullName,
          isCurator: t.isCurator,
        })),
      })),
    };
  }

  private async ensureExists(id: string) {
    const cls = await this.prisma.class.findUnique({ where: { id } });
    if (!cls) throw new NotFoundException('Sinf topilmadi');
    return cls;
  }
}
