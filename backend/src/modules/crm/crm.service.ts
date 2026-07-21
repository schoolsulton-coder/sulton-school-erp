import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateGuardianDto } from './dto/update-guardian.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { MoveStageDto } from './dto/move-stage.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  // ---- Bosqichlar (funnel ustunlari) ----
  listStages() {
    return this.prisma.leadStage.findMany({ orderBy: { order: 'asc' } });
  }

  /** Kanban board — bosqichlar bo'yicha guruhlangan lead'lar */
  async board(managerId?: string) {
    const stages = await this.prisma.leadStage.findMany({
      orderBy: { order: 'asc' },
      include: {
        leads: {
          where: {
            convertedAt: null,
            ...(managerId ? { managerId } : {}),
          },
          include: { manager: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    return stages;
  }

  // ---- Tashriflar (rejadagi / real — sana bo'yicha) ----
  async visits(params: {
    search?: string;
    filial?: string;
    from?: string;
    status?: string;
  }) {
    const where: any = {
      scheduledAt: params.from
        ? { gte: new Date(params.from) }
        : { not: null },
    };
    if (params.status) where.visitStatus = params.status;
    if (params.filial) where.filial = params.filial;
    if (params.search) {
      where.OR = [
        { fullName: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search } },
      ];
    }

    const [data, filials] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          manager: { select: { id: true, fullName: true } },
          stage: { select: { name: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      }),
      this.prisma.lead.findMany({
        where: { filial: { not: null } },
        select: { filial: true },
        distinct: ['filial'],
      }),
    ]);

    return {
      total: data.length,
      filials: filials.map((f) => f.filial).filter(Boolean),
      data,
    };
  }

  // ---- Lead ro'yxati (filtr + pagination) ----
  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    stageId?: string;
    managerId?: string;
  }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;

    const where: any = {};
    if (params.stageId) where.stageId = params.stageId;
    if (params.managerId) where.managerId = params.managerId;
    if (params.search) {
      where.OR = [
        { fullName: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          stage: true,
          manager: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        stage: true,
        manager: { select: { id: true, fullName: true } },
        psychologist: true,
        branch: true,
        class: true,
        student: { include: { _count: { select: { contracts: true } } } },
        activities: {
          include: { author: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!lead) throw new NotFoundException('Murojaat (lead) topilmadi');
    return lead;
  }

  // ---- CRUD ----
  async create(dto: CreateLeadDto) {
    let stageId = dto.stageId;
    if (!stageId) {
      const first = await this.prisma.leadStage.findFirst({
        orderBy: { order: 'asc' },
      });
      if (!first)
        throw new BadRequestException(
          'Lead bosqichlari sozlanmagan (seed ishga tushiring)',
        );
      stageId = first.id;
    }

    return this.prisma.lead.create({
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        source: dto.source,
        childAge: dto.childAge,
        note: dto.note,
        stageId,
        managerId: dto.managerId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        filial: dto.filial,
        gradeLevel: dto.gradeLevel,
        whoComes: dto.whoComes,
        crmUpdatedAt: new Date(),
      },
      include: { stage: true },
    });
  }

  /** Tashrif holatini o'zgartirish (keldi / kelmadi) */
  async markVisit(id: string, status: string, visitedAt?: string) {
    await this.findOne(id);
    return this.prisma.lead.update({
      where: { id },
      data: {
        visitStatus: status as any,
        visitedAt:
          status === 'ARRIVED'
            ? visitedAt
              ? new Date(visitedAt)
              : new Date()
            : null,
        crmUpdatedAt: new Date(),
      },
    });
  }

  async update(id: string, dto: UpdateLeadDto) {
    await this.findOne(id);
    const { demoStartDate, ...rest } = dto as any;
    const data: any = { ...rest, crmUpdatedAt: new Date() };
    // Demo sanasi: bo'sh bo'lsa null, aks holda Date
    if (demoStartDate !== undefined) {
      data.demoStartDate = demoStartDate ? new Date(demoStartDate) : null;
    }
    return this.prisma.lead.update({ where: { id }, data });
  }

  /** Lead'ni boshqa bosqichga ko'chirish (drag & drop / tugma) */
  async moveStage(id: string, dto: MoveStageDto) {
    await this.findOne(id);
    const stage = await this.prisma.leadStage.findUnique({
      where: { id: dto.stageId },
    });
    if (!stage) throw new NotFoundException('Bosqich topilmadi');
    return this.prisma.lead.update({
      where: { id },
      data: { stageId: dto.stageId },
      include: { stage: true },
    });
  }

  async assignManager(id: string, managerId: string) {
    await this.findOne(id);
    return this.prisma.lead.update({
      where: { id },
      data: { managerId },
      include: { manager: { select: { id: true, fullName: true } } },
    });
  }

  // ---- Faollik (qo'ng'iroq, izoh, eslatma) ----
  async addActivity(leadId: string, authorId: string | null, dto: CreateActivityDto) {
    await this.findOne(leadId);
    return this.prisma.leadActivity.create({
      data: {
        leadId,
        authorId,
        type: dto.type,
        note: dto.note,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
    });
  }

  async completeActivity(activityId: string) {
    return this.prisma.leadActivity.update({
      where: { id: activityId },
      data: { doneAt: new Date() },
    });
  }

  // ---- Konversiya: lead -> o'quvchi ----
  async convert(id: string, dto: ConvertLeadDto) {
    const lead = await this.findOne(id);
    if (lead.studentId) {
      throw new ConflictException("Bu murojaat allaqachon o'quvchiga aylantirilgan");
    }

    // Ism/familiyani aniqlash: DTO -> fallback lead.fullName ni bo'lish
    let firstName = dto.firstName;
    let lastName = dto.lastName;
    if (!firstName) {
      const parts = lead.fullName.trim().split(/\s+/);
      firstName = parts[0];
      lastName = lastName ?? parts.slice(1).join(' ') ?? '';
    }

    // Tranzaksiya: o'quvchi + vasiy + lead'ni yangilash
    return this.prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          firstName: firstName!,
          lastName: lastName || firstName!,
          classId: dto.classId,
          admissionDate: new Date(),
          status: 'ACTIVE',
        },
      });

      // Vasiy (ota-ona) — lead ma'lumotidan
      const guardian = await tx.guardian.create({
        data: {
          fullName: dto.guardianName ?? lead.fullName,
          phone: lead.phone,
          relation: dto.guardianRelation ?? 'ota-ona',
        },
      });
      await tx.studentGuardian.create({
        data: { studentId: student.id, guardianId: guardian.id, isPrimary: true },
      });

      await tx.lead.update({
        where: { id },
        data: { studentId: student.id, convertedAt: new Date() },
      });

      return student;
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.lead.delete({ where: { id } });
  }

  // ---- Statistika (AmoCRM stats tabi) ----
  async stats() {
    const [total, converted, byStage, byFilialRaw, bySourceRaw, byManagerRaw] =
      await Promise.all([
        this.prisma.lead.count(),
        this.prisma.lead.count({ where: { convertedAt: { not: null } } }),
        this.prisma.lead.groupBy({ by: ['stageId'], _count: { _all: true } }),
        this.prisma.lead.groupBy({ by: ['filial'], _count: { _all: true } }),
        this.prisma.lead.groupBy({ by: ['source'], _count: { _all: true } }),
        this.prisma.lead.groupBy({ by: ['managerId'], _count: { _all: true } }),
      ]);

    const stages = await this.prisma.leadStage.findMany({ orderBy: { order: 'asc' } });
    const funnel = stages.map((s) => ({
      stage: s.name,
      count: byStage.find((b) => b.stageId === s.id)?._count._all ?? 0,
    }));

    const managerIds = byManagerRaw.map((m) => m.managerId).filter(Boolean) as string[];
    const managers = await this.prisma.user.findMany({
      where: { id: { in: managerIds } },
      select: { id: true, fullName: true },
    });

    return {
      total,
      converted,
      conversionRate: total ? Math.round((converted / total) * 100) : 0,
      funnel,
      byFilial: byFilialRaw
        .filter((f) => f.filial)
        .map((f) => ({ name: f.filial!, count: f._count._all })),
      bySource: bySourceRaw
        .filter((s) => s.source)
        .map((s) => ({ name: s.source!, count: s._count._all })),
      byManager: byManagerRaw
        .filter((m) => m.managerId)
        .map((m) => ({
          name: managers.find((u) => u.id === m.managerId)?.fullName ?? '—',
          count: m._count._all,
        })),
    };
  }

  /** Konversiya kohorti — 30/60/90/120 kun bosqichlari + faol/nofaol */
  async cohort() {
    const leads = await this.prisma.lead.findMany({
      select: {
        createdAt: true,
        convertedAt: true,
        stage: { select: { name: true } },
      },
    });
    const total = leads.length;
    const DAY = 86400000;
    const rejected = (n: string) => /tuzmadi|yiqildi|rad|yo'q|bekor|lost/i.test(n);
    const b: Record<number, number> = { 30: 0, 60: 0, 90: 0, 120: 0 };
    let converted = 0;
    let active = 0;
    let inactive = 0;
    for (const l of leads) {
      if (l.convertedAt) {
        converted++;
        const days = (l.convertedAt.getTime() - l.createdAt.getTime()) / DAY;
        for (const d of [30, 60, 90, 120]) if (days <= d) b[d]++;
      } else if (rejected(l.stage?.name ?? '')) inactive++;
      else active++;
    }
    const pct = (n: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);
    return {
      total,
      converted,
      convertedPct: pct(converted),
      active,
      activePct: pct(active),
      inactive,
      inactivePct: pct(inactive),
      buckets: [30, 60, 90, 120].map((d) => ({ days: d, count: b[d], pct: pct(b[d]) })),
    };
  }

  // ---- Yillik taqqoslash ----
  async yearly() {
    const leads = await this.prisma.lead.findMany({
      select: { createdAt: true, convertedAt: true },
    });
    const map = new Map<number, { leads: number; converted: number }>();
    for (const l of leads) {
      const y = l.createdAt.getFullYear();
      const e = map.get(y) ?? { leads: 0, converted: 0 };
      e.leads++;
      if (l.convertedAt) e.converted++;
      map.set(y, e);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, v]) => ({
        year,
        leads: v.leads,
        converted: v.converted,
        conversionRate: v.leads ? Math.round((v.converted / v.leads) * 100) : 0,
      }));
  }

  // ---- Vasiylar (tab) ----
  guardians() {
    return this.prisma.guardian.findMany({
      include: {
        user: { select: { id: true } },
        students: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                class: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { fullName: 'asc' },
      take: 200,
    });
  }

  async guardian(id: string) {
    const g = await this.prisma.guardian.findUnique({
      where: { id },
      include: {
        user: { select: { id: true } },
        students: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                middleName: true,
                photo: true,
                status: true,
                class: { select: { name: true } },
                branch: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    if (!g) throw new NotFoundException('Vasiy topilmadi');
    return g;
  }

  async updateGuardian(id: string, dto: UpdateGuardianDto) {
    await this.guardian(id);
    return this.prisma.guardian.update({ where: { id }, data: { ...dto } });
  }

  // ---- Qabul rejasi ----
  listPlans(academicYear?: string) {
    return this.prisma.admissionPlan.findMany({
      where: academicYear ? { academicYear } : {},
      orderBy: [{ academicYear: 'asc' }, { gradeLevel: 'asc' }],
    });
  }

  createPlan(dto: {
    academicYear: string;
    filial?: string;
    gradeLevel: number;
    plannedCount: number;
  }) {
    return this.prisma.admissionPlan.create({ data: dto });
  }

  /** Reja vs fakt — sinf darajasi bo'yicha haqiqiy o'quvchilar soni */
  async admissionProgress(academicYear?: string) {
    const plans = await this.listPlans(academicYear);
    const result: any[] = [];
    for (const p of plans) {
      const classes = await this.prisma.class.findMany({
        where: { gradeLevel: p.gradeLevel, academicYear: p.academicYear },
        select: { _count: { select: { students: true } } },
      });
      const actual = classes.reduce((s, c) => s + c._count.students, 0);
      result.push({
        ...p,
        actual,
        percent: p.plannedCount ? Math.round((actual / p.plannedCount) * 100) : 0,
      });
    }
    return result;
  }

  // ===== Sozlamalar reference (Filial, Psixolog, O'quv yili) =====
  branches() {
    return this.prisma.branch.findMany({ orderBy: { name: 'asc' } });
  }
  createBranch(name: string) {
    return this.prisma.branch.create({ data: { name } });
  }
  psychologists() {
    return this.prisma.psychologist.findMany({ orderBy: { fullName: 'asc' } });
  }
  createPsychologist(fullName: string) {
    return this.prisma.psychologist.create({ data: { fullName } });
  }
  academicYears() {
    return this.prisma.academicYear.findMany({ orderBy: { name: 'desc' } });
  }
  createAcademicYear(name: string) {
    return this.prisma.academicYear.create({ data: { name } });
  }

  // Operatorlar (GAPLASHGAN) — xodim rollari
  operators() {
    return this.prisma.user.findMany({
      where: { role: { slug: { notIn: ['student', 'guardian'] } }, status: 'ACTIVE' },
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' },
    });
  }

  // Qabul ro'yxati (admissions — sana bo'yicha, barcha ustunlar)
  async admissionsList(params: {
    search?: string;
    academicYear?: string;
    branchId?: string;
  }) {
    const where: any = {};
    if (params.academicYear) where.academicYear = params.academicYear;
    if (params.branchId) where.branchId = params.branchId;
    if (params.search) {
      where.OR = [
        { fullName: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search } },
        { note: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    const data = await this.prisma.lead.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gender: true,
            _count: { select: { contracts: true } },
          },
        },
        branch: { select: { name: true } },
        class: { select: { name: true, language: true } },
        stage: { select: { name: true, order: true } },
        manager: { select: { fullName: true } },
        psychologist: { select: { fullName: true } },
        _count: { select: { activities: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    return { total: data.length, data };
  }

  // Barcha bosqichlar (Kanban ustunlari uchun)
  stagesList() {
    return this.prisma.leadStage.findMany({ orderBy: { order: 'asc' } });
  }

  // Forma uchun sinflar (band = faqat shartnomasi bor o'quvchilar)
  async classesForm(academicYear?: string, branchId?: string) {
    const classes = await this.prisma.class.findMany({
      where: {
        ...(academicYear ? { academicYear } : {}),
        ...(branchId ? { branchId } : {}),
      },
      include: {
        // Joyni faqat SHARTNOMA tuzilgan qabul band qiladi:
        // o'quvchisining shartnomasi bor YOKI statusi "Shartnoma tuzdi".
        admissions: {
          where: {
            OR: [
              { student: { contracts: { some: {} } } },
              { stage: { name: 'Shartnoma tuzdi' } },
            ],
          },
          select: { id: true },
        },
      },
      orderBy: [{ gradeLevel: 'asc' }, { name: 'asc' }],
    });
    return classes.map((c) => ({
      id: c.id,
      name: c.name,
      gradeLevel: c.gradeLevel,
      language: c.language,
      capacity: c.capacity,
      taken: c.admissions.length,
      free: Math.max(0, c.capacity - c.admissions.length),
    }));
  }

  // Talaba qidirish (F.I.Sh bo'yicha)
  searchStudents(q?: string, academicYear?: string) {
    const where: any = {};
    if (academicYear) where.class = { academicYear };
    if (q && q.length >= 2) {
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
      ];
    } else if (!academicYear) {
      // yil ham, qidiruv ham yo'q — bo'sh
      return [];
    }
    return this.prisma.student.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        class: { select: { name: true, academicYear: true } },
      },
      orderBy: { lastName: 'asc' },
      take: 50,
    });
  }

  // Ota-ona qidirish / so'nggi yozilganlar
  searchGuardians(q?: string) {
    return this.prisma.guardian.findMany({
      where: q
        ? {
            OR: [
              { fullName: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q } },
            ],
          }
        : {},
      select: { id: true, fullName: true, phone: true, relation: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  createGuardian(dto: { fullName: string; phone?: string; relation?: string }) {
    return this.prisma.guardian.create({
      data: { fullName: dto.fullName, phone: dto.phone ?? '', relation: dto.relation },
    });
  }

  // Yangi o'quvchi (qabul bosqichi — minimal)
  async quickCreateStudent(dto: {
    branchId?: string;
    gender: 'MALE' | 'FEMALE';
    lastName: string;
    firstName: string;
    guardianId?: string;
  }) {
    const student = await this.prisma.student.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        gender: dto.gender,
        branchId: dto.branchId,
        status: 'ACTIVE',
        admissionDate: new Date(),
      },
    });
    if (dto.guardianId) {
      await this.prisma.studentGuardian.create({
        data: { studentId: student.id, guardianId: dto.guardianId, isPrimary: true },
      });
    }
    return student;
  }

  // Yangi qabul (admission)
  async createAdmission(dto: {
    studentId: string;
    branchId?: string;
    academicYear?: string;
    classId?: string;
    managerId?: string;
    psychologistId?: string;
    stageId?: string;
    tags?: string[];
    note?: string;
  }) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      include: { guardians: { include: { guardian: true } } },
    });
    if (!student) throw new NotFoundException("O'quvchi topilmadi");

    let stageId = dto.stageId;
    if (!stageId) {
      const first = await this.prisma.leadStage.findFirst({ orderBy: { order: 'asc' } });
      stageId = first!.id;
    }
    const primary = student.guardians.find((g) => g.isPrimary)?.guardian ?? student.guardians[0]?.guardian;

    return this.prisma.lead.create({
      data: {
        fullName: `${student.lastName} ${student.firstName}`,
        phone: primary?.phone ?? '',
        studentId: dto.studentId,
        branchId: dto.branchId,
        academicYear: dto.academicYear,
        classId: dto.classId,
        managerId: dto.managerId,
        psychologistId: dto.psychologistId,
        stageId: stageId!,
        tags: dto.tags ?? [],
        note: dto.note,
        crmUpdatedAt: new Date(),
      },
    });
  }
}
