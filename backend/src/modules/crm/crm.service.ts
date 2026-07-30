import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateGuardianDto } from './dto/update-guardian.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { MoveStageDto } from './dto/move-stage.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';

@Injectable()
export class CrmService implements OnModuleInit {
  private readonly logger = new Logger(CrmService.name);

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // Sayt (Supabase) sozlangan bo'lsa — har 5 daqiqada avtomat sync
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) {
      this.logger.log('🌐 Sayt (Supabase) sync yoqildi — har 5 daqiqada');
      setInterval(() => {
        this.syncWebsite().catch(() => undefined);
      }, 5 * 60 * 1000);
    }
  }

  /**
   * sultonschool.uz saytida (Supabase `applications` jadvali) ro'yxatdan
   * o'tganlarni Qabulga (lead) qo'shadi. externalId orqali takror import bo'lmaydi.
   */
  async syncWebsite() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    const table = process.env.SUPABASE_APPLICATIONS_TABLE || 'applications';
    if (!url || !key) {
      return { ok: false, reason: 'not_configured', imported: 0, skipped: 0 };
    }
    try {
      // Saytdan kelgan leadlar "Tasdiqlanmagan" bosqichiga tushadi
      const first = await this.unconfirmedStage();
      if (!first) return { ok: false, reason: 'no_stage', imported: 0, skipped: 0 };

      // Avtomat: filial (Bosh filial), aktual o'quv yili, grade -> mos sinf
      let branch = await this.prisma.branch.findFirst({ where: { name: 'Bosh filial' } });
      if (!branch) branch = await this.prisma.branch.findFirst({ orderBy: { createdAt: 'asc' } });
      const year = await this.prisma.academicYear.findFirst({
        where: { isActive: true },
        orderBy: { name: 'desc' },
      });
      const classes = year
        ? await this.prisma.class.findMany({
            where: {
              status: 'Faol',
              academicYear: year.name,
              ...(branch ? { branchId: branch.id } : {}),
            },
            select: { id: true, gradeLevel: true },
            orderBy: { name: 'asc' },
          })
        : [];
      // Har grade uchun birinchi mos sinf (5 -> 5-A ...)
      const classByGrade = new Map<number, string>();
      for (const c of classes) if (!classByGrade.has(c.gradeLevel)) classByGrade.set(c.gradeLevel, c.id);

      // Cursor: oxirgi import qilingan sayt id'si (externalId "website:N" dan).
      // Faqat undan katta id'larni olamiz — barcha yangilar (o'sib boruvchi id) kiradi,
      // eski 1000 qayta o'qilmaydi (N+1 yo'q) va ko'lam cheklovi bartaraf etiladi.
      const imported0 = await this.prisma.lead.findMany({
        where: { externalId: { startsWith: 'website:' } },
        select: { externalId: true },
      });
      let cursor = 0;
      for (const l of imported0) {
        const n = parseInt((l.externalId || '').split(':')[1] || '', 10);
        if (!Number.isNaN(n) && n > cursor) cursor = n;
      }

      let imported = 0;
      let skipped = 0;
      const PAGE = 1000;
      for (let page = 0; page < 100; page++) {
        const res = await fetch(
          `${url}/rest/v1/${table}?select=id,created_at,name,phone,grade,lang&id=gt.${cursor}&order=id.asc&limit=${PAGE}`,
          { headers: { apikey: key, Authorization: `Bearer ${key}` } },
        );
        if (!res.ok) {
          this.logger.error(`Supabase sync xatosi: HTTP ${res.status}`);
          return { ok: false, reason: `http_${res.status}`, imported, skipped };
        }
        const rows: any[] = await res.json();
        if (!Array.isArray(rows) || rows.length === 0) break;

        for (const r of rows) {
          const g = parseInt(String(r.grade ?? ''), 10);
          try {
            await this.prisma.lead.create({
              data: {
                fullName: (r.name ?? '').toString().trim() || 'Nomsiz',
                phone: (r.phone ?? '').toString().trim(),
                source: 'Sayt (sultonschool.uz)',
                gradeLevel: Number.isNaN(g) ? null : g,
                branchId: branch?.id ?? null,
                academicYear: year?.name ?? null,
                classId: Number.isNaN(g) ? null : (classByGrade.get(g) ?? null),
                note: [r.grade, r.lang].filter(Boolean).join(' · ') || null,
                externalId: `website:${r.id}`,
                stageId: first.id,
                createdAt: r.created_at ? new Date(r.created_at) : undefined,
                crmUpdatedAt: new Date(),
              },
            });
            imported += 1;
          } catch {
            // takror (unique) yoki xato qator — o'tkazib yuboramiz
            skipped += 1;
          }
          const idNum = Number(r.id);
          if (Number.isFinite(idNum) && idNum > cursor) cursor = idNum;
        }
        if (rows.length < PAGE) break; // oxirgi (to'liq bo'lmagan) sahifa
      }
      return { ok: true, imported, skipped };
    } catch (e) {
      this.logger.error('Supabase sync xatosi', e as Error);
      return { ok: false, reason: 'error', imported: 0, skipped: 0 };
    }
  }

  /** Xabar matnidan O'zbek telefon raqamini ajratadi (+998XXXXXXXXX / 9 xonali) */
  private extractPhone(text: string): string | null {
    const matches = text.match(/[+(]?\d[\d\s()\-]{6,}/g) || [];
    for (const m of matches) {
      const digits = m.replace(/\D/g, '');
      if (digits.length === 12 && digits.startsWith('998')) return '+' + digits;
      if (digits.length === 9) return '+998' + digits;
    }
    return null;
  }

  /**
   * Instagram Direct suhbatlarini Meta API orqali Qabulga (lead) tortadi.
   * Sayt sync kabi — mavjudlarni qoldiradi (externalId ig:<id> dedup),
   * xabarlar mid bo'yicha takrorlanmaydi. App "Опубликовано" bo'lishi shart
   * (aks holda Meta "API access blocked" qaytaradi).
   */
  async syncInstagram() {
    const token = process.env.IG_PAGE_TOKEN;
    if (!token) {
      return { ok: false, reason: 'not_configured', imported: 0, skipped: 0, messages: 0 };
    }
    const BASE = 'https://graph.instagram.com/v21.0';
    const blocked = (b: any) =>
      typeof b?.error?.message === 'string' &&
      /access blocked|not been approved|permission/i.test(b.error.message);
    try {
      const stage = await this.unconfirmedStage();
      if (!stage) return { ok: false, reason: 'no_stage', imported: 0, skipped: 0, messages: 0 };

      // Bizning IG account id — o'z xabarlarimizni (OUT) ajratish uchun
      const meRes = await fetch(`${BASE}/me?fields=user_id,username&access_token=${token}`);
      const me: any = await meRes.json().catch(() => ({}));
      if (!meRes.ok) {
        return {
          ok: false,
          reason: blocked(me) ? 'access_blocked' : `http_${meRes.status}`,
          imported: 0,
          skipped: 0,
          messages: 0,
        };
      }
      const myId = String(me.user_id ?? me.id ?? '');
      if (!myId) {
        this.logger.error("Instagram sync: hisob id aniqlanmadi (me.user_id yo'q)");
        return { ok: false, reason: 'no_account_id', imported: 0, skipped: 0, messages: 0 };
      }

      let imported = 0;
      let skipped = 0;
      let messages = 0;
      let next: string | null =
        `${BASE}/me/conversations?platform=instagram` +
        `&fields=participants{id,username},messages.limit(50){id,from{id,username},message,created_time}` +
        `&limit=50&access_token=${token}`;

      for (let page = 0; page < 50 && next; page++) {
        const res = await fetch(next);
        const body: any = await res.json().catch(() => ({}));
        if (!res.ok) {
          return {
            ok: false,
            reason: blocked(body) ? 'access_blocked' : `http_${res.status}`,
            imported,
            skipped,
            messages,
          };
        }
        const convs: any[] = Array.isArray(body?.data) ? body.data : [];
        for (const conv of convs) {
          const parts: any[] = conv?.participants?.data ?? [];
          // Suhbatdoshimiz — o'zimiz (myId) bo'lmagan, id'si bor ishtirokchi
          const other = parts.find((p) => p?.id && String(p.id) !== myId);
          if (!other?.id) {
            skipped += 1; // faqat o'zimiz / id yo'q — o'tkazamiz
            continue;
          }
          const externalId = `ig:${other.id}`;
          const username: string | null = other.username ?? null;

          let lead = await this.prisma.lead.findUnique({ where: { externalId } });
          if (!lead) {
            try {
              lead = await this.prisma.lead.create({
                data: {
                  fullName: username || 'Instagram foydalanuvchisi',
                  phone: '',
                  igUsername: username,
                  source: 'Instagram Direct',
                  externalId,
                  stageId: stage.id,
                  crmUpdatedAt: new Date(),
                },
              });
              imported += 1;
            } catch (e: any) {
              // Parallel sync (poyga) — allaqachon yaratilgan bo'lsa qayta o'qiymiz
              if (e?.code === 'P2002') {
                lead = await this.prisma.lead.findUnique({ where: { externalId } });
                skipped += 1;
              } else {
                throw e;
              }
            }
          } else {
            skipped += 1;
            if (username && !lead.igUsername) {
              await this.prisma.lead.update({
                where: { id: lead.id },
                data: { igUsername: username },
              });
            }
          }
          if (!lead) continue; // yaratish muvaffaqiyatsiz — xavfsiz o'tkazamiz

          // Xabarlar — sahifalab olamiz (har suhbatga ko'proq tarix), mid bo'yicha dedup
          let foundPhone: string | null = null;
          let msgs: any[] = conv?.messages?.data ?? [];
          let msgNext: string | null = conv?.messages?.paging?.next ?? null;
          for (let mp = 0; mp < 10; mp++) {
            for (const m of msgs) {
              const text = (m?.message ?? '').toString();
              if (!text.trim()) continue; // media/bo'sh xabar — o'tkazamiz
              const direction = String(m?.from?.id) === myId ? 'OUT' : 'IN';
              if (direction === 'IN' && !foundPhone) foundPhone = this.extractPhone(text);
              try {
                await this.prisma.leadMessage.create({
                  data: {
                    leadId: lead.id,
                    direction,
                    text: text.slice(0, 4000),
                    externalId: m?.id ? String(m.id) : null,
                    createdAt: m?.created_time ? new Date(m.created_time) : undefined,
                  },
                });
                messages += 1;
              } catch (e: any) {
                // faqat takror (unique mid, P2002) jim; boshqa xatolarni loglaymiz
                if (e?.code !== 'P2002') {
                  this.logger.warn(`IG xabar saqlashda xato: ${e?.message ?? e}`);
                }
              }
            }
            if (!msgNext) break;
            const mr = await fetch(msgNext);
            const mb: any = await mr.json().catch(() => ({}));
            if (!mr.ok) break;
            msgs = Array.isArray(mb?.data) ? mb.data : [];
            msgNext = mb?.paging?.next ?? null;
          }
          // Vasiy telefoni bo'sh bo'lsa va xabardan topilgan bo'lsa — yozamiz
          if (foundPhone && !lead.phone) {
            await this.prisma.lead.update({
              where: { id: lead.id },
              data: { phone: foundPhone },
            });
          }
        }
        next = body?.paging?.next ?? null;
      }
      return { ok: true, imported, skipped, messages };
    } catch (e) {
      this.logger.error('Instagram sync xatosi', e as Error);
      return { ok: false, reason: 'error', imported: 0, skipped: 0, messages: 0 };
    }
  }

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
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!lead) throw new NotFoundException('Murojaat (lead) topilmadi');
    return lead;
  }

  // ---- Bosqich yordamchilari ----
  /** "Yangi" (yoki birinchi ijobiy tartibli) bosqich — qo'lda qo'shilgan leadlar uchun */
  private async yangiStage() {
    return (
      (await this.prisma.leadStage.findFirst({
        where: { order: { gte: 0 } },
        orderBy: { order: 'asc' },
      })) ?? (await this.prisma.leadStage.findFirst({ orderBy: { order: 'asc' } }))
    );
  }

  /** "Tasdiqlanmagan" bosqichi (Instagram/Sayt leadlar) — topilmasa birinchi bosqich */
  private async unconfirmedStage() {
    return (
      (await this.prisma.leadStage.findFirst({
        where: { name: { contains: 'Tasdiq', mode: 'insensitive' } },
      })) ?? (await this.prisma.leadStage.findFirst({ orderBy: { order: 'asc' } }))
    );
  }

  /** "Tasdiqlanmagan"dan chiqishda vasiy(ism+tel)+talaba(ism) to'ldirilganini tekshiradi */
  private assertCanLeaveUnconfirmed(
    currentStageName: string | null | undefined,
    targetStageName: string | null | undefined,
    vals: { fullName?: string | null; guardianName?: string | null; phone?: string | null },
  ) {
    if (!/tasdiq/i.test(currentStageName ?? '')) return; // hozir Tasdiqlanmaganda emas
    if (/tasdiq/i.test(targetStageName ?? '')) return; // hali ham Tasdiqlanmaganga
    const missing: string[] = [];
    if (!vals.fullName?.trim()) missing.push('Talaba ismi');
    if (!vals.guardianName?.trim()) missing.push('Vasiy ismi');
    if (!vals.phone?.trim()) missing.push('Vasiy telefoni');
    if (missing.length) {
      throw new BadRequestException(
        `Keyingi bosqichga o'tkazish uchun avval to'ldiring: ${missing.join(', ')}`,
      );
    }
  }

  // ---- CRUD ----
  async create(dto: CreateLeadDto) {
    let stageId = dto.stageId;
    if (!stageId) {
      // Qo'lda qo'shilgan lead — "Yangi" bosqichiga (Tasdiqlanmaganga emas)
      const first = await this.yangiStage();
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
        guardianName: dto.guardianName,
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
    const lead = await this.findOne(id); // stage bilan
    // Status (bosqich) o'zgartirilsa — "Tasdiqlanmagan" gate'ini tekshiramiz
    // (shu PATCH ichida to'ldirilgan qiymatlarni hisobga olib)
    if (dto.stageId && dto.stageId !== lead.stageId) {
      const target = await this.prisma.leadStage.findUnique({
        where: { id: dto.stageId },
      });
      this.assertCanLeaveUnconfirmed(lead.stage?.name, target?.name, {
        fullName: dto.fullName ?? lead.fullName,
        guardianName: dto.guardianName ?? lead.guardianName,
        phone: dto.phone ?? lead.phone,
      });
    }
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
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { stage: true },
    });
    if (!lead) throw new NotFoundException('Murojaat (lead) topilmadi');
    const stage = await this.prisma.leadStage.findUnique({
      where: { id: dto.stageId },
    });
    if (!stage) throw new NotFoundException('Bosqich topilmadi');
    // "Tasdiqlanmagan"dan chiqishda vasiy+talaba to'ldirilgan bo'lishi shart
    this.assertCanLeaveUnconfirmed(lead.stage?.name, stage.name, lead);
    return this.prisma.lead.update({
      where: { id },
      data: { stageId: dto.stageId, crmUpdatedAt: new Date() },
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
          branchId: dto.branchId,
          admissionDate: new Date(),
          status: 'ACTIVE',
        },
      });

      // Vasiy (ota-ona) — lead ma'lumotidan (vasiy ismi alohida bo'lsa — o'sha)
      const guardian = await tx.guardian.create({
        data: {
          fullName: dto.guardianName ?? lead.guardianName ?? lead.fullName,
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
    stageId?: string;
    source?: string;
  }) {
    const where: any = {};
    if (params.academicYear) where.academicYear = params.academicYear;
    if (params.branchId) where.branchId = params.branchId;
    if (params.stageId) where.stageId = params.stageId;
    if (params.source) where.source = params.source;
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
      take: 2000,
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
    const hasQ = !!q && q.length >= 2;
    if (hasQ) {
      // Ism bo'yicha qidirilganda — o'quv yilidan qat'i nazar barcha mos o'quvchilar
      // (sinf biriktirilmagan yoki boshqa yildagi o'quvchilar ham chiqsin)
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
      ];
    } else if (academicYear) {
      // Qidiruvsiz — faqat o'sha o'quv yilidagi (sinf bo'yicha) o'quvchilar
      where.class = { academicYear };
    } else {
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
    source?: string;
  }) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      include: { guardians: { include: { guardian: true } } },
    });
    if (!student) throw new NotFoundException("O'quvchi topilmadi");

    let stageId = dto.stageId;
    if (!stageId) {
      // Qo'lda yangi qabul — "Yangi" bosqichiga (Tasdiqlanmaganga emas)
      const first = await this.yangiStage();
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
        source: dto.source || null,
        crmUpdatedAt: new Date(),
      },
    });
  }
}
