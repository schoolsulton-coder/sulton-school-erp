import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { CreateNormDto } from './dto/create-norm.dto';
import { BulkScheduleDto } from './dto/bulk-schedule.dto';
import {
  CopyScheduleWeekDto,
  CreateScheduleWeekDto,
  UpdateScheduleWeekDto,
} from './dto/schedule-week.dto';
import {
  activeWeek,
  addDays,
  dayFromStr,
  fmtDay,
  mondayOf,
  schoolToday,
  weekDayCount,
  ymd,
} from '../../common/schedule-weeks';

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

type WeekRange = { id: string; startDate: Date; endDate: Date };
type Db = Prisma.TransactionClient;

/**
 * Ustoz shu vaqtda boshqa sinfda band bo'lsa — darsni qo'shishni to'sish.
 * Maktab so'roviga ko'ra VAQTINCHA o'chirilgan: band ustozni ham tanlash mumkin,
 * jadvalda faqat ogohlantirish ko'rinadi. Qayta yoqish uchun — true.
 */
const BLOCK_TEACHER_CONFLICT = false;

/** Dars yozuvi bilan birga fan va ustozlar ro'yxati */
const LESSON_INCLUDE = {
  subject: true,
  teachers: { include: { teacher: { select: { id: true, fullName: true } } } },
} as const;

/** Darsning ustozlari — asosiysi (teacherId) birinchi, qolganlari alifbo bo'yicha */
const lessonTeachers = (r: {
  teacherId?: string | null;
  teachers?: { teacher: { id: string; fullName: string } }[];
}) =>
  (r.teachers ?? [])
    .map((t) => ({ id: t.teacher.id, fullName: t.teacher.fullName }))
    .sort(
      (a, b) =>
        Number(b.id === r.teacherId) - Number(a.id === r.teacherId) || a.fullName.localeCompare(b.fullName),
    );

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

  // ---- Jadval haftalari ----

  /** Barcha haftalar (yangisi tepada) — darslar soni va joriy hafta bilan */
  async listWeeks() {
    const today = schoolToday();
    const [weeks, active] = await Promise.all([
      this.prisma.scheduleWeek.findMany({
        orderBy: { startDate: 'desc' },
        include: { _count: { select: { lessons: true } } },
      }),
      activeWeek(this.prisma, today),
    ]);
    return {
      today: ymd(today),
      activeWeekId: active?.id ?? null,
      weeks: weeks.map((w) => ({
        id: w.id,
        startDate: ymd(w.startDate),
        endDate: ymd(w.endDate),
        note: w.note,
        lessons: w._count.lessons,
        isCurrent: w.startDate <= today && w.endDate >= today,
      })),
    };
  }

  /** Hafta oralig'i: boshi Dushanbaga keltiriladi, oxiri berilmasa — Shanba */
  private parseRange(startStr: string, endStr?: string) {
    const raw = dayFromStr(startStr);
    if (Number.isNaN(raw.getTime())) throw new BadRequestException("Boshlanish sanasi noto'g'ri");
    const start = mondayOf(raw);
    const end = endStr ? dayFromStr(endStr) : addDays(start, 5);
    if (Number.isNaN(end.getTime())) throw new BadRequestException("Tugash sanasi noto'g'ri");
    if (end < start) {
      throw new BadRequestException("Hafta oxiri boshlanishidan oldin bo'lishi mumkin emas");
    }
    if (end > addDays(start, 6)) {
      throw new BadRequestException("Hafta 7 kundan uzun bo'lishi mumkin emas");
    }
    return { start, end };
  }

  /** Boshqa hafta bilan sanalar ustma-ust kelmasin */
  private async assertNoOverlap(db: Db, start: Date, end: Date, exceptId?: string) {
    const clash = await db.scheduleWeek.findFirst({
      where: {
        ...(exceptId ? { id: { not: exceptId } } : {}),
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });
    if (clash) {
      throw new BadRequestException(
        `Bu hafta allaqachon mavjud: ${fmtDay(clash.startDate)} – ${fmtDay(clash.endDate)}`,
      );
    }
  }

  /** Darslarni boshqa haftaga nusxalash (faqat maqsad hafta oralig'idagi kunlar) */
  private async copyLessons(db: Db, fromWeekId: string, to: WeekRange, classId?: string) {
    const rows = await db.schedule.findMany({
      where: {
        weekId: fromWeekId,
        weekday: { lte: weekDayCount(to) },
        ...(classId ? { classId } : {}),
      },
      select: {
        classId: true,
        subjectId: true,
        teacherId: true,
        weekday: true,
        startTime: true,
        endTime: true,
        room: true,
        teachers: { select: { teacherId: true } },
      },
    });
    if (!rows.length) return 0;
    const res = await db.schedule.createMany({
      data: rows.map(({ teachers, ...r }) => ({ ...r, weekId: to.id })),
    });
    // Ustozlar ro'yxati (bir darsda bir nechta) — yangi darslarga bog'lanadi
    const fresh = await db.schedule.findMany({
      where: { weekId: to.id, ...(classId ? { classId } : {}) },
      select: { id: true, classId: true, subjectId: true, weekday: true, startTime: true },
    });
    const key = (r: { classId: string; subjectId: string; weekday: number; startTime: string }) =>
      `${r.classId}|${r.subjectId}|${r.weekday}|${r.startTime}`;
    const idOf = new Map(fresh.map((f) => [key(f), f.id]));
    const links = rows.flatMap((r) => {
      const id = idOf.get(key(r));
      return id ? r.teachers.map((t) => ({ scheduleId: id, teacherId: t.teacherId })) : [];
    });
    if (links.length) await db.scheduleTeacher.createMany({ data: links, skipDuplicates: true });
    return res.count;
  }

  async createWeek(dto: CreateScheduleWeekDto, userId?: string) {
    const { start, end } = this.parseRange(dto.startDate, dto.endDate);
    if (dto.copyFromWeekId) {
      const src = await this.prisma.scheduleWeek.findUnique({
        where: { id: dto.copyFromWeekId },
        select: { id: true },
      });
      if (!src) throw new NotFoundException("Ko'chiriladigan hafta topilmadi");
    }
    return this.prisma.$transaction(async (tx) => {
      await this.assertNoOverlap(tx, start, end);
      const week = await tx.scheduleWeek.create({
        data: {
          startDate: start,
          endDate: end,
          note: dto.note?.trim() || null,
          createdById: userId ?? null,
        },
      });
      const copied = dto.copyFromWeekId
        ? await this.copyLessons(tx, dto.copyFromWeekId, week)
        : 0;
      return { id: week.id, startDate: ymd(week.startDate), endDate: ymd(week.endDate), copied };
    });
  }

  /** Hafta oxiri va izohini tahrirlash (boshlanish sanasi — haftaning o'zi, o'zgarmaydi) */
  async updateWeek(id: string, dto: UpdateScheduleWeekDto) {
    const w = await this.prisma.scheduleWeek.findUnique({ where: { id } });
    if (!w) throw new NotFoundException('Hafta topilmadi');
    const { end } = this.parseRange(ymd(w.startDate), dto.endDate ?? ymd(w.endDate));
    const updated = await this.prisma.scheduleWeek.update({
      where: { id },
      data: {
        endDate: end,
        ...(dto.note !== undefined ? { note: dto.note.trim() || null } : {}),
      },
    });
    return {
      id: updated.id,
      startDate: ymd(updated.startDate),
      endDate: ymd(updated.endDate),
      note: updated.note,
    };
  }

  /** Haftani o'chirish — undagi darslar ham o'chadi */
  async removeWeek(id: string) {
    const w = await this.prisma.scheduleWeek.findUnique({
      where: { id },
      include: { _count: { select: { lessons: true } } },
    });
    if (!w) throw new NotFoundException('Hafta topilmadi');
    await this.prisma.scheduleWeek.delete({ where: { id } });
    return { ok: true, removedLessons: w._count.lessons };
  }

  /** Ko'chirish uchun maqsad hafta: mavjud id, yoki sana bo'yicha topiladi/yaratiladi */
  private async resolveCopyTarget(
    tx: Db,
    source: WeekRange,
    dto: CopyScheduleWeekDto,
    userId?: string,
  ): Promise<WeekRange> {
    if (dto.targetWeekId) {
      const t = await tx.scheduleWeek.findUnique({ where: { id: dto.targetWeekId } });
      if (!t) throw new NotFoundException('Maqsad hafta topilmadi');
      return t;
    }
    const { start, end } = this.parseRange(
      dto.targetStartDate ?? ymd(addDays(source.startDate, 7)),
      dto.targetEndDate,
    );
    const existing = await tx.scheduleWeek.findUnique({ where: { startDate: start } });
    if (existing) return existing;
    await this.assertNoOverlap(tx, start, end);
    return tx.scheduleWeek.create({
      data: { startDate: start, endDate: end, createdById: userId ?? null },
    });
  }

  /**
   * Haftani bir tugma bilan ko'chirish. Maqsad berilmasa — keyingi hafta (yo'q bo'lsa yaratiladi).
   * Maqsad haftada darslar bo'lsa, faqat replace=true bilan almashtiriladi.
   */
  async copyWeek(sourceId: string, dto: CopyScheduleWeekDto, userId?: string) {
    const source = await this.prisma.scheduleWeek.findUnique({ where: { id: sourceId } });
    if (!source) throw new NotFoundException('Hafta topilmadi');

    return this.prisma.$transaction(async (tx) => {
      const target = await this.resolveCopyTarget(tx, source, dto, userId);
      if (target.id === source.id) {
        throw new BadRequestException("Haftani o'zining ustiga ko'chirib bo'lmaydi");
      }

      const scope: Prisma.ScheduleWhereInput = {
        weekId: target.id,
        ...(dto.classId ? { classId: dto.classId } : {}),
      };
      const existing = await tx.schedule.count({ where: scope });
      if (existing > 0 && !dto.replace) {
        throw new ConflictException(
          `${fmtDay(target.startDate)} haftasida ${existing} ta dars bor — almashtirish uchun tasdiqlang`,
        );
      }
      const removed = existing > 0 ? (await tx.schedule.deleteMany({ where: scope })).count : 0;
      const copied = await this.copyLessons(tx, source.id, target, dto.classId);
      return {
        targetWeekId: target.id,
        startDate: ymd(target.startDate),
        endDate: ymd(target.endDate),
        copied,
        removed,
      };
    });
  }

  /** O'qish uchun hafta: berilgan id (tekshiriladi) yoki joriy hafta (bo'lmasa null) */
  private async resolveWeek(weekId?: string | null): Promise<WeekRange | null> {
    if (weekId) {
      const w = await this.prisma.scheduleWeek.findUnique({ where: { id: weekId } });
      if (!w) throw new NotFoundException('Hafta topilmadi');
      return w;
    }
    return activeWeek(this.prisma);
  }

  /** Yozish uchun hafta: hafta umuman bo'lmasa — joriy hafta avtomatik yaratiladi */
  private async resolveWeekForWrite(weekId?: string | null): Promise<WeekRange> {
    const w = await this.resolveWeek(weekId);
    if (w) return w;
    const start = mondayOf(schoolToday());
    return this.prisma.scheduleWeek.upsert({
      where: { startDate: start },
      update: {},
      create: { startDate: start, endDate: addDays(start, 5) },
    });
  }

  private assertInWeek(week: WeekRange, weekday: number) {
    if (weekday > weekDayCount(week)) {
      throw new BadRequestException(
        `${WEEKDAYS[weekday]} bu hafta oralig'iga kirmaydi (${fmtDay(week.startDate)} – ${fmtDay(week.endDate)})`,
      );
    }
  }

  // ---- Jadval ----
  /** Sinf jadvali — tanlangan (yoki joriy) hafta bo'yicha, kunlarga guruhlangan grid */
  async byClass(classId: string, weekId?: string) {
    const week = await this.resolveWeek(weekId);
    const rows = await this.prisma.schedule.findMany({
      where: { classId, weekId: week?.id ?? null },
      include: LESSON_INCLUDE,
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    });

    const grid = WEEKDAYS.slice(1).map((label, i) => ({
      weekday: i + 1,
      label,
      lessons: rows
        .filter((r) => r.weekday === i + 1)
        .map((r) => ({
          ...r,
          teachers: lessonTeachers(r),
          startTime: normTime(r.startTime),
          endTime: normTime(r.endTime),
        })),
    }));
    return grid;
  }

  /** Dars ustozlari ro'yxati (takrorlarsiz); eski bitta maydon ham qo'llab-quvvatlanadi */
  private teacherList(dto: { teacherIds?: string[]; teacherId?: string }): string[] {
    const raw = dto.teacherIds?.length ? dto.teacherIds : dto.teacherId ? [dto.teacherId] : [];
    return [...new Set(raw.map((x) => (x ?? '').trim()).filter(Boolean))];
  }

  /** Darsga ustozlarni biriktirish (asosiysi — birinchisi) */
  private teacherData(ids: string[]) {
    return { teacherId: ids[0] ?? null, teachers: { create: ids.map((teacherId) => ({ teacherId })) } };
  }

  async create(dto: CreateScheduleDto) {
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException(
        "Boshlanish vaqti tugash vaqtidan oldin bo'lishi kerak",
      );
    }
    const week = await this.resolveWeekForWrite(dto.weekId);
    this.assertInWeek(week, dto.weekday);

    // Bir sinfda, bir kunda (shu haftada) vaqt ustma-ust kelmasligi kerak
    const overlap = await this.prisma.schedule.findFirst({
      where: {
        weekId: week.id,
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

    const teacherIds = this.teacherList(dto);
    // Ustoz bandligi — BLOCK_TEACHER_CONFLICT yoqilgandagina to'sadi (hozir o'chirilgan)
    if (BLOCK_TEACHER_CONFLICT && teacherIds.length) {
      const busy = await this.prisma.schedule.findFirst({
        where: {
          weekId: week.id,
          weekday: dto.weekday,
          startTime: { lt: dto.endTime },
          endTime: { gt: dto.startTime },
          OR: [{ teacherId: { in: teacherIds } }, { teachers: { some: { teacherId: { in: teacherIds } } } }],
        },
        include: { class: { select: { name: true } } },
      });
      if (busy) {
        throw new BadRequestException(`Ustoz bu vaqtda band (${busy.class.name} sinfida)`);
      }
    }

    const { teacherIds: _ids, teacherId: _tid, ...rest } = dto;
    return this.prisma.schedule.create({
      data: { ...rest, weekId: week.id, ...this.teacherData(teacherIds) },
      include: LESSON_INCLUDE,
    });
  }

  /**
   * Sinf va (ixtiyoriy) ustoz bo'yicha band paralar (tanlangan hafta) — jadvalga
   * bittada joylashda bo'sh slotlarni hisoblash uchun.
   */
  async availability(classId: string, teacherId?: string, weekId?: string) {
    const week = await this.resolveWeek(weekId);
    const weekWhere = { weekId: week?.id ?? null };

    const classRows = await this.prisma.schedule.findMany({
      where: { classId, ...weekWhere },
      include: { subject: { select: { name: true } }, teachers: { select: { teacherId: true } } },
    });
    // Sinf band slotlarida qaysi ustoz ekanini ko'rsatish uchun ismlarni yechamiz
    const teacherIds = [
      ...new Set(classRows.flatMap((r) => [r.teacherId, ...r.teachers.map((t) => t.teacherId)]).filter(Boolean)),
    ] as string[];
    const tUsers = teacherIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: teacherIds } },
          select: { id: true, fullName: true },
        })
      : [];
    const stripUstoz = (s: string) => s.replace(/\s*\(ustoz\)\s*$/i, '').trim();
    const tName = new Map(tUsers.map((u) => [u.id, stripUstoz(u.fullName)]));
    // id/subjectId — darsni sudrab ko'chirish, o'chirish va mavjud joylashuvni
    // tahrirlash (o'sha fanning darslarini ajratib olish) uchun kerak
    const classBusy = classRows.map((r) => ({
      id: r.id,
      subjectId: r.subjectId,
      teacherId: r.teacherId ?? null,
      teacherIds: [...new Set([r.teacherId, ...r.teachers.map((t) => t.teacherId)].filter(Boolean) as string[])],
      weekday: r.weekday,
      start: normTime(r.startTime),
      label: r.subject.name,
      teacher:
        [...new Set([r.teacherId, ...r.teachers.map((t) => t.teacherId)].filter(Boolean) as string[])]
          .map((id) => tName.get(id))
          .filter(Boolean)
          .join(', ') || null,
    }));

    let teacherBusy: { weekday: number; start: string; label: string }[] = [];
    if (teacherId) {
      const tRows = await this.prisma.schedule.findMany({
        where: {
          OR: [{ teacherId }, { teachers: { some: { teacherId } } }],
          ...weekWhere,
        },
        include: {
          subject: { select: { name: true } },
          class: { select: { name: true } },
        },
      });
      teacherBusy = tRows.map((r) => ({
        weekday: r.weekday,
        start: normTime(r.startTime),
        label: `${r.class.name} · ${r.subject.name}`,
      }));
    }
    return { classBusy, teacherBusy };
  }

  /**
   * Bir fanni bir nechta bo'sh slotga bittada joylash (tanlangan haftaga). Har bir slot
   * uchun sinf va ustoz bandligi qayta tekshiriladi; to'qnashganlari o'tkazib yuboriladi.
   */
  async bulkCreate(dto: BulkScheduleDto) {
    const week = await this.resolveWeekForWrite(dto.weekId);
    const teacherIds = this.teacherList(dto);
    const maxDay = weekDayCount(week);
    let created = 0;
    const skipped: { weekday: number; startTime: string; reason: string }[] = [];

    for (const slot of dto.slots) {
      if (slot.startTime >= slot.endTime) {
        skipped.push({ ...slot, reason: 'vaqt xato' });
        continue;
      }
      if (slot.weekday > maxDay) {
        skipped.push({ ...slot, reason: "hafta oralig'idan tashqari" });
        continue;
      }

      const classOverlap = await this.prisma.schedule.findFirst({
        where: {
          weekId: week.id,
          classId: dto.classId,
          weekday: slot.weekday,
          startTime: { lt: slot.endTime },
          endTime: { gt: slot.startTime },
        },
      });
      if (classOverlap) {
        skipped.push({ ...slot, reason: 'sinf band' });
        continue;
      }

      if (BLOCK_TEACHER_CONFLICT && teacherIds.length) {
        const teacherOverlap = await this.prisma.schedule.findFirst({
          where: {
            weekId: week.id,
            weekday: slot.weekday,
            startTime: { lt: slot.endTime },
            endTime: { gt: slot.startTime },
            OR: [{ teacherId: { in: teacherIds } }, { teachers: { some: { teacherId: { in: teacherIds } } } }],
          },
        });
        if (teacherOverlap) {
          skipped.push({ ...slot, reason: 'ustoz band' });
          continue;
        }
      }

      await this.prisma.schedule.create({
        data: {
          weekId: week.id,
          classId: dto.classId,
          subjectId: dto.subjectId,
          ...this.teacherData(teacherIds),
          weekday: slot.weekday,
          startTime: slot.startTime,
          endTime: slot.endTime,
          room: dto.room || null,
        },
      });
      created += 1;
    }

    return { created, skipped };
  }

  /** Darsni tahrirlash — vaqt ustma-ustligini o'z haftasi ichida, o'zidan tashqari tekshiradi */
  async update(id: string, dto: UpdateScheduleDto) {
    const existing = await this.prisma.schedule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Dars topilmadi');

    // Darsni boshqa haftaga bu yerda ko'chirib bo'lmaydi
    const data: UpdateScheduleDto = { ...dto };
    delete data.weekId;

    const startTime = data.startTime ?? existing.startTime;
    const endTime = data.endTime ?? existing.endTime;
    if (startTime >= endTime) {
      throw new BadRequestException(
        "Boshlanish vaqti tugash vaqtidan oldin bo'lishi kerak",
      );
    }

    const weekday = data.weekday ?? existing.weekday;
    // Kun o'zgartirilsa — yangi kun hafta oralig'ida bo'lishi kerak
    if (existing.weekId && data.weekday !== undefined && data.weekday !== existing.weekday) {
      const week = await this.prisma.scheduleWeek.findUnique({ where: { id: existing.weekId } });
      if (week) this.assertInWeek(week, weekday);
    }

    const overlap = await this.prisma.schedule.findFirst({
      where: {
        id: { not: id },
        weekId: existing.weekId,
        classId: data.classId ?? existing.classId,
        weekday,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
    if (overlap) {
      throw new BadRequestException(
        'Bu vaqtda sinfda boshqa dars bor (vaqt ustma-ust)',
      );
    }

    // Ustozlar ro'yxati berilgan bo'lsa — to'liq almashtiriladi
    const teacherIds =
      dto.teacherIds !== undefined || dto.teacherId !== undefined ? this.teacherList(dto) : null;
    const updateData: Record<string, unknown> = { ...data };
    delete updateData.teacherIds;
    if (teacherIds) updateData.teacherId = teacherIds[0] ?? null;

    return this.prisma.$transaction(async (tx) => {
      if (teacherIds) {
        await tx.scheduleTeacher.deleteMany({ where: { scheduleId: id } });
        if (teacherIds.length) {
          await tx.scheduleTeacher.createMany({
            data: teacherIds.map((teacherId) => ({ scheduleId: id, teacherId })),
            skipDuplicates: true,
          });
        }
      }
      return tx.schedule.update({ where: { id }, data: updateData, include: LESSON_INCLUDE });
    });
  }

  async remove(id: string) {
    const row = await this.prisma.schedule.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Dars topilmadi');
    return this.prisma.schedule.delete({ where: { id } });
  }

  // ---- Fan normasi (haftalik soat reja) ----
  /** Sinf bo'yicha fan normalari — reja va tanlangan haftada qo'yilgan (placed) soat bilan */
  async norms(classId: string, weekId?: string) {
    const week = await this.resolveWeek(weekId);
    const [norms, placedGroups] = await Promise.all([
      this.prisma.subjectNorm.findMany({
        where: { classId },
        include: { subject: { select: { id: true, name: true } } },
        orderBy: { subject: { name: 'asc' } },
      }),
      this.prisma.schedule.groupBy({
        by: ['subjectId'],
        where: { classId, weekId: week?.id ?? null },
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
