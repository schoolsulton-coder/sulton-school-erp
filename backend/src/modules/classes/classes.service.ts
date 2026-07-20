import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { AssignStudentsDto } from './dto/assign-students.dto';
import { AssignTeacherDto } from './dto/assign-teacher.dto';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async findAll(academicYear?: string) {
    const classes = await this.prisma.class.findMany({
      where: academicYear ? { academicYear } : {},
      include: {
        _count: { select: { students: true } },
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
      where: { classId: id },
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
    return this.prisma.classTeacher.delete({
      where: { classId_teacherId: { classId: id, teacherId } },
    });
  }

  private async ensureExists(id: string) {
    const cls = await this.prisma.class.findUnique({ where: { id } });
    if (!cls) throw new NotFoundException('Sinf topilmadi');
    return cls;
  }
}
