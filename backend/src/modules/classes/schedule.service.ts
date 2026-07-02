import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';

const WEEKDAYS = [
  '',
  'Dushanba',
  'Seshanba',
  'Chorshanba',
  'Payshanba',
  'Juma',
  'Shanba',
  'Yakshanba',
];

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  // ---- Fanlar ----
  listSubjects() {
    return this.prisma.subject.findMany({ orderBy: { name: 'asc' } });
  }

  createSubject(dto: CreateSubjectDto) {
    return this.prisma.subject.create({ data: dto });
  }

  // ---- Jadval ----
  /** Sinf jadvali — hafta kunlari bo'yicha guruhlangan grid */
  async byClass(classId: string) {
    const rows = await this.prisma.schedule.findMany({
      where: { classId },
      include: { subject: true },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    });

    const grid = WEEKDAYS.slice(1).map((label, i) => ({
      weekday: i + 1,
      label,
      lessons: rows.filter((r) => r.weekday === i + 1),
    }));
    return grid;
  }

  async create(dto: CreateScheduleDto) {
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException(
        'Boshlanish vaqti tugash vaqtidan oldin bo‘lishi kerak',
      );
    }

    // Bir sinfda, bir kunda vaqt ustma-ust kelmasligi kerak
    const overlap = await this.prisma.schedule.findFirst({
      where: {
        classId: dto.classId,
        weekday: dto.weekday,
        startTime: { lt: dto.endTime },
        endTime: { gt: dto.startTime },
      },
    });
    if (overlap) {
      throw new BadRequestException(
        'Bu vaqtda sinfda boshqa dars bor (vaqt ustma-ust)',
      );
    }

    return this.prisma.schedule.create({
      data: dto,
      include: { subject: true },
    });
  }

  async remove(id: string) {
    const row = await this.prisma.schedule.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Dars topilmadi');
    return this.prisma.schedule.delete({ where: { id } });
  }
}
