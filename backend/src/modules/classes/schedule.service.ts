import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { CreateNormDto } from './dto/create-norm.dto';

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

/** Vaqtni "HH:MM" ko'rinishiga keltiradi ("010:15" -> "10:15", "8:5" -> "08:05") */
function normTime(t?: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hh = String(parseInt(h, 10) || 0).padStart(2, '0');
  const mm = String(parseInt(m ?? '0', 10) || 0).padStart(2, '0');
  return `${hh}:${mm}`;
}

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  // ---- Fanlar ----
  listSubjects() {
    return this.prisma.subject.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { schedules: true, norms: true } } },
    });
  }

  createSubject(dto: CreateSubjectDto) {
    return this.prisma.subject.create({ data: { name: dto.name, code: dto.code || null } });
  }

  async updateSubject(id: string, dto: CreateSubjectDto) {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    if (!subject) throw new NotFoundException('Fan topilmadi');
    return this.prisma.subject.update({
      where: { id },
      data: { name: dto.name, code: dto.code || null },
    });
  }

  async removeSubject(id: string) {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    if (!subject) throw new NotFoundException('Fan topilmadi');
    const [sched, grades, hw] = await Promise.all([
      this.prisma.schedule.count({ where: { subjectId: id } }),
      this.prisma.grade.count({ where: { subjectId: id } }),
      this.prisma.homework.count({ where: { subjectId: id } }),
    ]);
    if (sched + grades + hw > 0) {
      throw new BadRequestException(
        "Fan dars jadvali yoki baholarda ishlatilmoqda — avval o'chiring",
      );
    }
    // Normalar bog'liq — fan bilan birga o'chiriladi
    await this.prisma.subjectNorm.deleteMany({ where: { subjectId: id } });
    return this.prisma.subject.delete({ where: { id } });
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
      lessons: rows
        .filter((r) => r.weekday === i + 1)
        .map((r) => ({
          ...r,
          startTime: normTime(r.startTime),
          endTime: normTime(r.endTime),
        })),
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

  /** Darsni tahrirlash — vaqt ustma-ustligini o'zidan tashqari tekshiradi */
  async update(id: string, dto: UpdateScheduleDto) {
    const existing = await this.prisma.schedule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Dars topilmadi');

    const startTime = dto.startTime ?? existing.startTime;
    const endTime = dto.endTime ?? existing.endTime;
    if (startTime >= endTime) {
      throw new BadRequestException(
        'Boshlanish vaqti tugash vaqtidan oldin bo‘lishi kerak',
      );
    }

    const overlap = await this.prisma.schedule.findFirst({
      where: {
        id: { not: id },
        classId: dto.classId ?? existing.classId,
        weekday: dto.weekday ?? existing.weekday,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
    if (overlap) {
      throw new BadRequestException(
        'Bu vaqtda sinfda boshqa dars bor (vaqt ustma-ust)',
      );
    }

    return this.prisma.schedule.update({
      where: { id },
      data: dto,
      include: { subject: true },
    });
  }

  async remove(id: string) {
    const row = await this.prisma.schedule.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Dars topilmadi');
    return this.prisma.schedule.delete({ where: { id } });
  }

  // ---- Fan normasi (haftalik soat reja) ----
  /** Sinf bo'yicha fan normalari — reja va qo'yilgan (placed) soat bilan */
  async norms(classId: string) {
    const [norms, placedGroups] = await Promise.all([
      this.prisma.subjectNorm.findMany({
        where: { classId },
        include: { subject: { select: { id: true, name: true } } },
        orderBy: { subject: { name: 'asc' } },
      }),
      this.prisma.schedule.groupBy({
        by: ['subjectId'],
        where: { classId },
        _count: { _all: true },
      }),
    ]);
    const placedMap = new Map(
      placedGroups.map((g) => [g.subjectId, g._count._all]),
    );
    return norms.map((n) => ({
      id: n.id,
      subjectId: n.subjectId,
      subjectName: n.subject.name,
      weeklyHours: n.weeklyHours,
      placed: placedMap.get(n.subjectId) ?? 0,
    }));
  }

  /** Norma qo'shish/yangilash (sinf+fan bo'yicha) */
  upsertNorm(classId: string, dto: CreateNormDto) {
    return this.prisma.subjectNorm.upsert({
      where: {
        classId_subjectId: { classId, subjectId: dto.subjectId },
      },
      update: { weeklyHours: dto.weeklyHours },
      create: {
        classId,
        subjectId: dto.subjectId,
        weeklyHours: dto.weeklyHours,
      },
    });
  }

  async removeNorm(id: string) {
    const row = await this.prisma.subjectNorm.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Norma topilmadi');
    return this.prisma.subjectNorm.delete({ where: { id } });
  }
}
