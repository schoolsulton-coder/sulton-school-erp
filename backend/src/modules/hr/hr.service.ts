import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreatePositionDto } from './dto/create-position.dto';
import { HireEmployeeDto } from './dto/hire-employee.dto';
import { SetSalaryDto } from './dto/set-salary.dto';
import { TerminateDto } from './dto/terminate.dto';
import { AddDocumentDto } from './dto/add-document.dto';

@Injectable()
export class HrService {
  constructor(private prisma: PrismaService) {}

  // ===== Bo'limlar =====
  listDepartments() {
    return this.prisma.department.findMany({
      include: {
        positions: true,
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  createDepartment(dto: CreateDepartmentDto) {
    return this.prisma.department.create({ data: dto });
  }

  // ===== Lavozimlar =====
  listPositions() {
    return this.prisma.position.findMany({
      include: { department: true },
      orderBy: { name: 'asc' },
    });
  }

  createPosition(dto: CreatePositionDto) {
    return this.prisma.position.create({ data: dto });
  }

  // ===== Xodimlar =====
  listEmployees(params: { status?: string; departmentId?: string }) {
    return this.prisma.employee.findMany({
      where: {
        ...(params.status ? { status: params.status as any } : {}),
        ...(params.departmentId ? { departmentId: params.departmentId } : {}),
      },
      include: {
        user: { select: { id: true, fullName: true, phone: true } },
        department: true,
        position: true,
        salary: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ===== Maoshlar · Xodimlar (boy ro'yxat + jamlanma) =====
  async xodimlar(params: { search?: string; branchId?: string }) {
    const where: any = {};
    if (params.branchId) where.branchId = params.branchId;
    if (params.search) {
      where.user = {
        OR: [
          { fullName: { contains: params.search, mode: 'insensitive' } },
          { phone: { contains: params.search } },
        ],
      };
    }

    const [rows, xodimlar, lavozimlar, kartaBor, telefonBor] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        include: {
          user: { select: { fullName: true, phone: true } },
          department: { select: { name: true } },
          position: { select: { name: true } },
          branch: { select: { id: true, name: true } },
          salary: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      this.prisma.employee.count(),
      this.prisma.position.count(),
      this.prisma.employee.count({ where: { cardNumber: { not: null } } }),
      this.prisma.employee.count({ where: { user: { phone: { not: '' } } } }),
    ]);

    const data = rows.map((e) => ({
      id: e.id,
      fio: e.user.fullName,
      gender: e.gender,
      phone: e.user.phone,
      branch: e.branch?.name ?? null,
      department: e.department?.name ?? null,
      position: e.position?.name ?? null,
      card: e.cardNumber,
      status: e.status,
      salaryType: e.salary?.type ?? null,
      baseRate: e.salary?.baseRate ?? null,
    }));

    return { totals: { xodimlar, lavozimlar, telefonBor, kartaBor }, data };
  }

  // ===== Maoshlar · Lavozimlar (bo'lim bo'yicha xodim-lavozim) =====
  async lavozimlar(params: { search?: string; branchId?: string; departmentId?: string; status?: string }) {
    const where: any = {};
    if (params.branchId) where.branchId = params.branchId;
    if (params.departmentId) where.departmentId = params.departmentId;
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { user: { fullName: { contains: params.search, mode: 'insensitive' } } },
        { position: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const rows = await this.prisma.employee.findMany({
      where,
      include: {
        user: { select: { fullName: true, phone: true } },
        department: { select: { id: true, name: true } },
        position: { select: { name: true } },
        branch: { select: { name: true } },
        salary: true,
      },
      orderBy: [{ department: { name: 'asc' } }, { createdAt: 'desc' }],
      take: 2000,
    });

    const data = rows.map((e) => ({
      id: e.id,
      fio: e.user.fullName,
      phone: e.user.phone,
      position: e.position?.name ?? null,
      department: e.department?.name ?? 'Boshqa',
      branch: e.branch?.name ?? null,
      hisobKitob: e.salary?.type ?? null,
      stavka: e.salary?.baseRate ?? null,
      formal: e.formal,
      status: e.status,
    }));

    const [jamiLavozimlar, faolXodimlar, boshagan, asosiyHisobKitob] = await Promise.all([
      this.prisma.employee.count(),
      this.prisma.employee.count({ where: { status: 'ACTIVE' } }),
      this.prisma.employee.count({ where: { status: 'TERMINATED' } }),
      this.prisma.salary.count(),
    ]);

    return {
      totals: { jamiLavozimlar, faolLavozimlar: faolXodimlar, faolXodimlar, boshagan, asosiyHisobKitob },
      data,
    };
  }

  // ===== Maoshlar · Shartnomalar =====
  async shartnomalar(params: { search?: string; branchId?: string; type?: string; employment?: string }) {
    const where: any = {};
    if (params.branchId) where.branchId = params.branchId;
    if (params.type) where.type = params.type;
    if (params.employment) where.employment = params.employment;
    if (params.search) {
      where.OR = [
        { number: { contains: params.search, mode: 'insensitive' } },
        { employee: { user: { fullName: { contains: params.search, mode: 'insensitive' } } } },
      ];
    }

    const rows = await this.prisma.employmentContract.findMany({
      where,
      include: {
        employee: { include: { user: { select: { fullName: true } }, position: { select: { name: true } } } },
        branch: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 500,
    });

    const data = rows.map((c) => ({
      id: c.id,
      date: c.date,
      number: c.number,
      xodim: c.employee.user.fullName,
      position: c.employee.position?.name ?? null,
      type: c.type,
      employment: c.employment,
      stavka: c.stavka,
      branch: c.branch?.name ?? null,
      status: c.status,
    }));

    const [jami, yaratilgan, ozgartirilgan, bekor] = await Promise.all([
      this.prisma.employmentContract.count(),
      this.prisma.employmentContract.count({ where: { status: 'YARATILGAN' } }),
      this.prisma.employmentContract.count({ where: { status: 'OZGARTIRILGAN' } }),
      this.prisma.employmentContract.count({ where: { status: 'BEKOR' } }),
    ]);

    return { totals: { jami, yaratilgan, ozgartirilgan, bekor }, data };
  }

  async createShartnoma(dto: any) {
    return this.prisma.employmentContract.create({
      data: {
        number: dto.number || '—',
        employeeId: dto.employeeId,
        date: dto.date ? new Date(dto.date) : new Date(),
        type: dto.type,
        status: dto.status || 'YARATILGAN',
        employment: dto.employment ?? null,
        stavka: dto.stavka ?? null,
        branchId: dto.branchId ?? null,
        date2: dto.date2 ? new Date(dto.date2) : null,
        kelishSana: dto.kelishSana ? new Date(dto.kelishSana) : null,
        kKuni: dto.kKuni ?? null,
        til: dto.til ?? null,
        qoshimchaLavozim: dto.qoshimchaLavozim ?? null,
        qoshimchaStavka: dto.qoshimchaStavka ?? null,
        modda: dto.modda ?? null,
        fayl1: dto.fayl1 ?? null,
        fayl2: dto.fayl2 ?? null,
        fayl3: dto.fayl3 ?? null,
        note: dto.note ?? null,
      },
    });
  }

  // ===== Maoshlar · To'lovlar =====
  async tolovlar(params: { search?: string; branchId?: string; kassa?: string; year?: string; month?: string }) {
    const where: any = {};
    if (params.branchId) where.branchId = params.branchId;
    if (params.kassa) where.kassa = params.kassa;
    if (params.year) where.periodYear = Number(params.year);
    if (params.month) where.periodMonth = Number(params.month);
    if (params.search) {
      where.OR = [
        { employee: { user: { fullName: { contains: params.search, mode: 'insensitive' } } } },
        { note: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.salaryPayment.findMany({
      where,
      include: {
        employee: { include: { user: { select: { fullName: true } } } },
        branch: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 800,
    });

    const data = rows.map((p) => {
      const som = p.somAmount ?? 0;
      const usd = p.dollarAmount ?? 0;
      const rate = p.dollarRate ?? 0;
      return {
        id: p.id,
        date: p.date,
        xodim: p.employee.user.fullName,
        branch: p.branch?.name ?? null,
        kassa: p.kassa,
        somAmount: som,
        dollarAmount: usd,
        dollarRate: rate,
        jami: som + usd * rate,
        periodYear: p.periodYear,
        periodMonth: p.periodMonth,
      };
    });

    const sumIf = (f: (d: (typeof data)[number]) => number) => data.reduce((s, d) => s + f(d), 0);
    return {
      totals: {
        somdaBerilgan: sumIf((d) => d.somAmount),
        naqd: sumIf((d) => (d.kassa === 'Naqd' ? d.somAmount : 0)),
        karta: sumIf((d) => (d.kassa === 'Karta' ? d.somAmount : 0)),
        bank: sumIf((d) => (d.kassa === 'Bank' ? d.somAmount : 0)),
        dollar: sumIf((d) => d.dollarAmount),
        jami: sumIf((d) => d.jami),
        count: data.length,
      },
      data,
    };
  }

  // ===== Maoshlar · Yangi xodim (ERP karta) =====
  async createXodim(dto: any) {
    if (dto.phone) {
      const exists = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (exists) throw new ConflictException('Bu telefon allaqachon mavjud');
    }
    const fullName = [dto.familiya, dto.ism, dto.middleName].filter(Boolean).join(' ').trim();
    const hashed = await argon2.hash(dto.password || 'parol123');
    const branchIds = (dto.branchIds ?? []).filter(Boolean);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { fullName, phone: dto.phone, password: hashed, roleId: dto.roleId } });
      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          gender: dto.gender ?? null,
          cardNumber: dto.cardNumber ?? null,
          middleName: dto.middleName ?? null,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          passportSeriya: dto.passportSeriya ?? null,
          passportRaqam: dto.passportRaqam ?? null,
          passportBerilgan: dto.passportBerilgan ? new Date(dto.passportBerilgan) : null,
          passportOrgan: dto.passportOrgan ?? null,
          stir: dto.stir ?? null,
          address: dto.address ?? null,
          mapLink: dto.mapLink ?? null,
          branchId: branchIds[0] ?? null,
          hireDate: new Date(),
          ...(branchIds.length ? { branchLinks: { create: branchIds.map((branchId: string) => ({ branchId })) } } : {}),
        },
      });
      return employee;
    });
  }

  // Kelishuv (Salary) maydonlarini dto'dan quradi — create/update uchun umumiy
  private salaryFields(dto: any) {
    const map: Record<string, any> = { Soatbay: 'HOURLY', Ishbay: 'PER_LESSON', Kunbay: 'MONTHLY', KPI: 'MONTHLY' };
    const num = (v: any) => (v === '' || v == null ? null : Number(v));
    return {
      hisobKitob: dto.hisobKitob,
      type: map[dto.hisobKitob] ?? 'MONTHLY',
      baseRate: num(dto.baseRate) ?? 0,
      rasmiyOyligi: num(dto.rasmiyOyligi),
      soliqKim: dto.soliqKim || null,
      startDate: dto.startDate ? new Date(dto.startDate) : dto.boshlanish ? new Date(dto.boshlanish) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      note: dto.note ?? null,
    };
  }

  // ===== Maoshlar · Yangi lavozim (+ birinchi kelishuv) =====
  async createLavozim(dto: any) {
    let positionId = dto.positionId;
    if (!positionId && dto.lavozim) {
      const pos = await this.prisma.position.create({ data: { name: dto.lavozim, departmentId: dto.departmentId || null } });
      positionId = pos.id;
    }
    await this.prisma.employee.update({
      where: { id: dto.employeeId },
      data: {
        branchId: dto.branchId ?? undefined,
        departmentId: dto.departmentId ?? undefined,
        positionId: positionId ?? undefined,
        formal: typeof dto.formal === 'boolean' ? dto.formal : undefined,
        employment: dto.employment ?? undefined,
        kimIshlaydi: dto.kimIshlaydi ?? undefined,
        ...(dto.boshlanish ? { hireDate: new Date(dto.boshlanish) } : {}),
      },
    });
    if (dto.hisobKitob) {
      const sf = this.salaryFields(dto);
      await this.prisma.salary.upsert({
        where: { employeeId: dto.employeeId },
        update: sf,
        create: { employeeId: dto.employeeId, ...sf },
      });
    }
    return { ok: true };
  }

  // ===== Maoshlar · Kelishuvni tahrirlash (joriy) =====
  async updateKelishuv(employeeId: string, dto: any) {
    if (typeof dto.formal === 'boolean') {
      await this.prisma.employee.update({ where: { id: employeeId }, data: { formal: dto.formal } });
    }
    if (dto.hisobKitob) {
      const sf = this.salaryFields(dto);
      await this.prisma.salary.upsert({
        where: { employeeId },
        update: sf,
        create: { employeeId, ...sf },
      });
    }
    return { ok: true };
  }

  // ===== Maoshlar · Lavozim (xodim) detali — rasm 1 =====
  async lavozimDetail(employeeId: string) {
    const e = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: { select: { fullName: true, phone: true } },
        position: { select: { name: true } },
        department: { select: { name: true } },
        branch: { select: { name: true } },
        salary: true,
        contracts: { orderBy: { date: 'desc' } },
      },
    });
    if (!e) throw new NotFoundException('Xodim topilmadi');

    const records = await this.prisma.payrollRecord.findMany({ where: { employeeId }, orderBy: { period: 'asc' } });
    const payments = await this.prisma.salaryPayment.findMany({ where: { employeeId } });
    const paidByPeriod: Record<string, number> = {};
    for (const p of payments) {
      if (p.periodYear && p.periodMonth) {
        const per = `${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`;
        paidByPeriod[per] = (paidByPeriod[per] ?? 0) + (p.somAmount ?? 0) + (p.dollarAmount ?? 0) * (p.dollarRate ?? 0);
      }
    }

    let running = 0, jamiHisob = 0, jamiBerilgan = 0;
    const oylar = records.map((r) => {
      const hisoblangan = this.calcJami(r).jami;
      const berilgan = paidByPeriod[r.period] ?? 0;
      const qoldiq = hisoblangan - berilgan;
      running += qoldiq;
      jamiHisob += hisoblangan;
      jamiBerilgan += berilgan;
      return { id: r.id, period: r.period, hisoblangan, berilgan, qoldiq, davrBalansi: running, confirmed: r.confirmed };
    });
    oylar.reverse(); // eng yangi tepada

    return {
      id: e.id,
      fio: e.user.fullName,
      phone: e.user.phone,
      position: e.position?.name ?? null,
      department: e.department?.name ?? null,
      branch: e.branch?.name ?? null,
      formal: e.formal,
      kimIshlaydi: e.kimIshlaydi ?? null,
      employment: e.employment ?? null,
      kelishuv: e.salary
        ? {
            hisobKitob: e.salary.hisobKitob,
            type: e.salary.type,
            baseRate: e.salary.baseRate,
            rasmiyOyligi: e.salary.rasmiyOyligi,
            soliqKim: e.salary.soliqKim,
            startDate: e.salary.startDate,
            endDate: e.salary.endDate,
            note: e.salary.note,
            formal: e.formal,
          }
        : null,
      cards: {
        stavka: e.salary?.baseRate ?? 0,
        jamiHisob,
        jamiBerilgan,
        qoldiqBalans: running,
        oyCount: oylar.length,
        tolovCount: payments.length,
      },
      oylar,
      hujjatlar: e.contracts.map((c) => ({
        id: c.id,
        type: c.type,
        number: c.number,
        date: c.date,
        status: c.status,
        stavka: c.stavka,
      })),
    };
  }

  async createTolov(dto: any) {
    return this.prisma.salaryPayment.create({
      data: {
        employeeId: dto.employeeId,
        date: dto.date ? new Date(dto.date) : new Date(),
        branchId: dto.branchId ?? null,
        kassa: dto.kassa || 'Naqd',
        somAmount: dto.somAmount ?? 0,
        somAccountId: dto.somAccountId ?? null,
        dollarAmount: dto.dollarAmount ?? null,
        dollarRate: dto.dollarRate ?? null,
        dollarKassa: dto.dollarKassa ?? null,
        dollarAccountId: dto.dollarAccountId ?? null,
        periodYear: dto.periodYear ?? null,
        periodMonth: dto.periodMonth ?? null,
        note: dto.note ?? null,
      },
    });
  }

  // Bitta xodim+davr uchun oylik holati (To'lov formasi preview)
  async oylikStatus(employeeId: string, period: string) {
    const r = await this.prisma.payrollRecord.findUnique({ where: { period_employeeId: { period, employeeId } } });
    const hisoblangan = r ? this.calcJami(r).jami : 0;
    const olingan = (await this.paidByEmployee(period, [employeeId]))[employeeId] ?? 0;
    const prev = await this.prisma.payrollRecord.findMany({ where: { employeeId, period: { lt: period } } });
    let avvalgi = 0;
    for (const p of prev) {
      avvalgi += this.calcJami(p).jami - ((await this.paidByEmployee(p.period, [employeeId]))[employeeId] ?? 0);
    }
    return { hisoblangan, olingan, qoldiq: hisoblangan - olingan, avvalgi, oyYakuni: avvalgi + (hisoblangan - olingan) };
  }

  // ===== Maoshlar · Oylik hisob =====
  private workdays(period: string) {
    const [y, m] = period.split('-').map(Number);
    const days = new Date(y, m, 0).getDate();
    let wd = 0;
    for (let d = 1; d <= days; d++) if (new Date(y, m - 1, d).getDay() !== 0) wd++; // yakshanba emas
    return wd;
  }

  private calcJami(r: any) {
    const asosiyHisob = r.ishchiKunlar > 0 ? (r.asosiyOylik * r.ishlaganKun) / r.ishchiKunlar : r.asosiyOylik;
    const soatlikHisob = (r.soatlikNarx || 0) * (r.ishlaganSoat || 0);
    const qoshimcha = r.kpi + r.bonus + r.ovqatPuli + r.tatilKartaga + r.tatilNaqd + r.ijara + r.transport;
    // Jami — yalpi (soliq/karta bu yerdan ushlanmaydi, quyida ajratiladi)
    const jami = asosiyHisob + soatlikHisob + qoshimcha - r.jarima;
    const kunlik = r.ishchiKunlar > 0 ? r.asosiyOylik / r.ishchiKunlar : 0;
    // Karta = rasmiy oylik (rasmiyHisob). O'zi to'lasa 12% soliq ushlanadi,
    // Kompaniya to'lasa to'liq kartaga. Naqd = Jami − rasmiy oylik.
    const rasmiy = Math.max(0, r.rasmiyHisob || 0);
    const selfPays = r.soliqKim === "O'zi" || r.soliqKim === 'Ishchi';
    const soliq = selfPays ? Math.round(rasmiy * 0.12) : 0;
    const karta = Math.max(0, rasmiy - soliq);
    const naqd = jami - rasmiy;
    return { asosiyHisob, soatlikHisob, kunlik, jami, rasmiy, soliq, karta, naqd };
  }

  private async paidByEmployee(period: string, employeeIds: string[]) {
    const [y, m] = period.split('-').map(Number);
    const pays = await this.prisma.salaryPayment.findMany({
      where: { periodYear: y, periodMonth: m, employeeId: { in: employeeIds } },
    });
    const map: Record<string, number> = {};
    for (const p of pays) map[p.employeeId] = (map[p.employeeId] ?? 0) + (p.somAmount ?? 0) + (p.dollarAmount ?? 0) * (p.dollarRate ?? 0);
    return map;
  }

  // Oylik hisoblash oldidan — faol xodimlar + shu davrda yozuvi bor-yo'qligi
  async oylikPreview(params: { period: string; branchId?: string; departmentId?: string }) {
    const where: any = { status: 'ACTIVE' };
    if (params.branchId) where.branchId = params.branchId;
    if (params.departmentId) where.departmentId = params.departmentId;
    const emps = await this.prisma.employee.findMany({
      where,
      include: { user: { select: { fullName: true } }, position: { select: { name: true } }, salary: true },
      orderBy: { createdAt: 'desc' },
    });
    const existing = await this.prisma.payrollRecord.findMany({ where: { period: params.period, employeeId: { in: emps.map((e) => e.id) } }, select: { employeeId: true } });
    const has = new Set(existing.map((x) => x.employeeId));
    const data = emps.map((e) => ({
      id: e.id,
      fio: e.user.fullName,
      position: e.position?.name ?? null,
      hisobKitob: e.salary?.type ?? null,
      stavka: e.salary?.baseRate ?? null,
      exists: has.has(e.id),
    }));
    return { ishchiKunlar: this.workdays(params.period), yaratiladi: data.filter((d) => !d.exists).length, allaqachonBor: data.filter((d) => d.exists).length, data };
  }

  // Jamoaga oylik hisoblash — tanlangan xodimlar uchun yozuv yaratadi (mavjudini o'zgartirmaydi)
  async oylikHisoblash(dto: { period: string; branchId?: string; departmentId?: string; ishchiKunlar?: number; employeeIds?: string[] }) {
    let ids = dto.employeeIds ?? [];
    if (!ids.length) {
      const where: any = { status: 'ACTIVE' };
      if (dto.branchId) where.branchId = dto.branchId;
      if (dto.departmentId) where.departmentId = dto.departmentId;
      ids = (await this.prisma.employee.findMany({ where, select: { id: true } })).map((e) => e.id);
    }
    const emps = await this.prisma.employee.findMany({ where: { id: { in: ids } }, include: { salary: true } });
    const ishchiKunlar = dto.ishchiKunlar && dto.ishchiKunlar > 0 ? dto.ishchiKunlar : this.workdays(dto.period);
    let yaratildi = 0;
    for (const e of emps) {
      const existing = await this.prisma.payrollRecord.findUnique({ where: { period_employeeId: { period: dto.period, employeeId: e.id } } });
      if (existing) continue;
      const hourly = e.salary?.type === 'HOURLY';
      const asosiyOylik = hourly ? 0 : e.salary?.baseRate ?? 0;
      const soatlikNarx = hourly ? e.salary?.baseRate ?? 0 : 0;
      // Rasmiy oylik (kartaga) + soliqni kim to'laydi — kelishuvdan
      const rasmiyHisob = e.salary?.rasmiyOyligi ?? 0;
      const soliqKim = e.salary?.soliqKim ?? null;
      const draft: any = { ishchiKunlar, ishlaganKun: ishchiKunlar, ishlaganSoat: 0, asosiyOylik, soatlikNarx, rasmiyHisob, soliqKim, kpi: 0, bonus: 0, ovqatPuli: 0, tatilKartaga: 0, tatilNaqd: 0, ijara: 0, transport: 0, jarima: 0, soliq: 0 };
      const c = this.calcJami(draft);
      await this.prisma.payrollRecord.create({ data: { period: dto.period, employeeId: e.id, ...draft, jami: c.jami, soliq: c.soliq, naqd: c.naqd, karta: c.karta } });
      yaratildi++;
    }
    return { ok: true, yaratildi, jami: emps.length };
  }

  async oylikList(params: { period: string; branchId?: string; search?: string }) {
    const where: any = { period: params.period };
    const empFilter: any = {};
    if (params.branchId) empFilter.branchId = params.branchId;
    if (params.search) empFilter.user = { fullName: { contains: params.search, mode: 'insensitive' } };
    if (Object.keys(empFilter).length) where.employee = empFilter;

    const records = await this.prisma.payrollRecord.findMany({
      where,
      include: { employee: { include: { user: { select: { fullName: true } }, position: { select: { name: true } }, branch: { select: { name: true } }, department: { select: { name: true } }, salary: { select: { hisobKitob: true, rasmiyOyligi: true, soliqKim: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    const paid = await this.paidByEmployee(params.period, records.map((r) => r.employeeId));

    const data = records.map((r) => {
      // Rasmiy oylik + soliqKim — joriy kelishuvdan (eski yozuvlar ham to'g'ri ko'rinsin)
      const withSal = { ...r, rasmiyHisob: r.employee.salary?.rasmiyOyligi ?? r.rasmiyHisob, soliqKim: r.employee.salary?.soliqKim ?? r.soliqKim };
      const c = this.calcJami(withSal);
      const berildi = paid[r.employeeId] ?? 0;
      return {
        id: r.id,
        xodim: r.employee.user.fullName,
        position: r.employee.position?.name ?? null,
        branch: r.employee.branch?.name ?? null,
        department: r.employee.department?.name ?? null,
        hisobKitob: r.employee.salary?.hisobKitob ?? null,
        ishlagan: r.ishlaganKun,
        bonusJarima: r.bonus - r.jarima,
        ovqat: r.ovqatPuli,
        jami: c.jami,
        berildi,
        qoldiq: c.jami - berildi,
        naqd: c.naqd,
        karta: c.karta,
        soliq: c.soliq,
        rasmiy: c.rasmiy,
        kunlik: Math.round(c.kunlik),
        confirmed: r.confirmed,
        // inline tahrir uchun xom maydonlar
        ishchiKunlar: r.ishchiKunlar,
        ishlaganKun: r.ishlaganKun,
        ishlaganSoat: r.ishlaganSoat,
        asosiyOylik: r.asosiyOylik,
        soatlikNarx: r.soatlikNarx,
        kpi: r.kpi,
        bonus: r.bonus,
        ovqatPuli: r.ovqatPuli,
        ijara: r.ijara,
        transport: r.transport,
        jarima: r.jarima,
        note: r.note,
      };
    });

    const sum = (f: (d: (typeof data)[number]) => number) => data.reduce((s, d) => s + f(d), 0);
    return {
      totals: {
        jamiHisoblar: data.length,
        jamiSumma: sum((d) => d.jami),
        naqd: sum((d) => d.naqd),
        karta: sum((d) => d.karta),
        berilgan: sum((d) => d.berildi),
        ortiqcha: sum((d) => (d.qoldiq < 0 ? d.qoldiq : 0)),
        ovqatUshlanma: sum((d) => d.ovqat),
      },
      data,
    };
  }

  async oylikDetail(id: string) {
    const r = await this.prisma.payrollRecord.findUnique({
      where: { id },
      include: { employee: { include: { user: { select: { fullName: true } }, position: { select: { name: true } }, branch: { select: { name: true } }, department: { select: { name: true } } } } },
    });
    if (!r) throw new NotFoundException('Topilmadi');
    const c = this.calcJami(r);
    const [y, m] = r.period.split('-').map(Number);
    const pays = await this.prisma.salaryPayment.findMany({ where: { employeeId: r.employeeId, periodYear: y, periodMonth: m }, orderBy: { date: 'desc' } });
    const berildi = pays.reduce((s, p) => s + (p.somAmount ?? 0) + (p.dollarAmount ?? 0) * (p.dollarRate ?? 0), 0);

    // Avvalgi oydan qoldiq: shu xodimning oldingi davrlardagi (jami − to'langan) yig'indisi
    const prev = await this.prisma.payrollRecord.findMany({ where: { employeeId: r.employeeId, period: { lt: r.period } } });
    let avvalgiQoldiq = 0;
    for (const p of prev) {
      const pc = this.calcJami(p);
      const pp = await this.paidByEmployee(p.period, [r.employeeId]);
      avvalgiQoldiq += pc.jami - (pp[r.employeeId] ?? 0);
    }

    return {
      ...r,
      xodim: r.employee.user.fullName,
      position: r.employee.position?.name ?? null,
      branch: r.employee.branch?.name ?? null,
      department: r.employee.department?.name ?? null,
      kunlik: c.kunlik,
      asosiyHisob: c.asosiyHisob,
      soatlikHisob: c.soatlikHisob,
      hisoblangan: c.jami,
      berildi,
      buOyBalansi: c.jami - berildi,
      avvalgiQoldiq,
      oyYakuniBalans: avvalgiQoldiq + (c.jami - berildi),
      payments: pays.map((p) => ({ id: p.id, date: p.date, amount: (p.somAmount ?? 0) + (p.dollarAmount ?? 0) * (p.dollarRate ?? 0) })),
    };
  }

  async oylikConfirm(id: string, confirm: boolean) {
    return this.prisma.payrollRecord.update({ where: { id }, data: { confirmed: confirm } });
  }

  // ===== Maoshlar · Oylik to'ldirish (inline tahrir) =====
  // Karta/Naqd/Soliq/rasmiyHisob qo'lda tahrirlanmaydi — kelishuvdan avtomat.
  private static readonly OYLIK_NUM_FIELDS = [
    'ishchiKunlar', 'ishlaganKun', 'ishlaganSoat', 'asosiyOylik', 'soatlikNarx',
    'kpi', 'bonus', 'ovqatPuli', 'tatilKartaga', 'tatilNaqd', 'ijara', 'transport', 'jarima',
  ];
  async updateOylik(id: string, patch: any) {
    const cur = await this.prisma.payrollRecord.findUnique({
      where: { id },
      include: { employee: { include: { salary: true } } },
    });
    if (!cur) throw new NotFoundException('Oylik yozuvi topilmadi');

    const data: any = {};
    for (const k of HrService.OYLIK_NUM_FIELDS) {
      if (k in patch) data[k] = patch[k] === '' || patch[k] == null ? 0 : Number(patch[k]) || 0;
    }
    if ('note' in patch) data.note = patch.note || null;

    // Rasmiy oylik + soliqni kim to'laydi — joriy kelishuvdan yangilanadi
    const sal = cur.employee?.salary;
    data.rasmiyHisob = sal?.rasmiyOyligi ?? cur.rasmiyHisob ?? 0;
    data.soliqKim = sal?.soliqKim ?? cur.soliqKim ?? null;

    const merged = { ...cur, ...data };
    const c = this.calcJami(merged);
    data.jami = c.jami;
    data.soliq = c.soliq;
    data.karta = c.karta;
    data.naqd = c.naqd;
    return this.prisma.payrollRecord.update({ where: { id }, data });
  }

  async deleteOylik(id: string) {
    await this.prisma.payrollRecord.delete({ where: { id } });
    return { ok: true };
  }

  // ===== Maoshlar · 10 oylik (o'quv yili: Sentabr–Iyun) =====
  async oylik10(academicYear: string, branchId?: string) {
    const [y1, y2] = academicYear.split('-').map(Number);
    const periods: string[] = [];
    for (let m = 9; m <= 12; m++) periods.push(`${y1}-${String(m).padStart(2, '0')}`);
    for (let m = 1; m <= 6; m++) periods.push(`${y2}-${String(m).padStart(2, '0')}`);

    const where: any = { period: { in: periods } };
    if (branchId) where.employee = { branchId };
    const records = await this.prisma.payrollRecord.findMany({ where });

    const g: Record<string, { xodim: Set<string>; hisoblangan: number; tasdiqlangan: number; tasdiqlashga: number }> = {};
    periods.forEach((p) => (g[p] = { xodim: new Set(), hisoblangan: 0, tasdiqlangan: 0, tasdiqlashga: 0 }));
    const allEmp = new Set<string>();
    for (const r of records) {
      const c = this.calcJami(r);
      const gg = g[r.period];
      if (!gg) continue;
      gg.xodim.add(r.employeeId);
      allEmp.add(r.employeeId);
      gg.hisoblangan += c.jami;
      if (r.confirmed) gg.tasdiqlangan += c.jami;
      else gg.tasdiqlashga += c.jami;
    }
    const months = periods.map((p) => ({ period: p, xodim: g[p].xodim.size, hisoblangan: g[p].hisoblangan, tasdiqlangan: g[p].tasdiqlangan, tasdiqlashga: g[p].tasdiqlashga }));
    const jami = months.reduce((s, m) => s + m.hisoblangan, 0);
    const toldirilgan = months.filter((m) => m.xodim > 0).length;
    return { totals: { jami, ortacha: jami / 10, xodimlar: allEmp.size, toldirilgan }, months };
  }

  // ===== Maoshlar · Umumiy (dashboard) =====
  async umumiy(period: string, branchId?: string) {
    const empWhere: any = { status: 'ACTIVE' };
    if (branchId) empWhere.branchId = branchId;
    const [xodimlar, oyRes, contracts] = await Promise.all([
      this.prisma.employee.count({ where: empWhere }),
      this.oylikList({ period, branchId }),
      this.prisma.employmentContract.count(),
    ]);
    return {
      xodimlar,
      hisoblangan: oyRes.totals.jamiSumma,
      berilgan: oyRes.totals.berilgan,
      qoldiq: oyRes.totals.jamiSumma - oyRes.totals.berilgan,
      shartnomalar: contracts,
      period,
    };
  }

  async getEmployee(id: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, phone: true, email: true } },
        department: true,
        position: true,
        salary: true,
        documents: { orderBy: { createdAt: 'desc' } },
        branchLinks: { include: { branch: { select: { name: true } } } },
        payrollItems: {
          include: { payrollRun: true },
          orderBy: { id: 'desc' },
          take: 12,
        },
      },
    });
    if (!emp) throw new NotFoundException('Xodim topilmadi');
    return emp;
  }

  async deleteDocument(docId: string) {
    await this.prisma.employeeDocument.delete({ where: { id: docId } });
    return { ok: true };
  }

  // ===== Izohlar (xodimga) =====
  listNotes(employeeId: string) {
    return this.prisma.employeeNote.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { fullName: true } } },
    });
  }
  async addNote(authorId: string | null, employeeId: string, text: string) {
    const t = (text ?? '').trim();
    if (!t) throw new NotFoundException('Izoh bo‘sh');
    return this.prisma.employeeNote.create({
      data: { employeeId, authorId, text: t },
      include: { author: { select: { fullName: true } } },
    });
  }
  async deleteNote(noteId: string) {
    await this.prisma.employeeNote.delete({ where: { id: noteId } });
    return { ok: true };
  }

  /** Ishga qabul: login + xodim + stavka (bitta tranzaksiyada) */
  async hire(dto: HireEmployeeDto) {
    const exists = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (exists) throw new ConflictException('Bu telefon allaqachon mavjud');

    const hashed = await argon2.hash(dto.password);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: dto.fullName,
          phone: dto.phone,
          password: hashed,
          roleId: dto.roleId,
        },
      });
      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          departmentId: dto.departmentId,
          positionId: dto.positionId,
          hireDate: new Date(dto.hireDate),
        },
      });
      if (dto.salaryType && dto.baseRate != null) {
        await tx.salary.create({
          data: {
            employeeId: employee.id,
            type: dto.salaryType,
            baseRate: dto.baseRate,
          },
        });
      }
      return employee;
    });
  }

  async setSalary(id: string, dto: SetSalaryDto) {
    await this.getEmployee(id);
    return this.prisma.salary.upsert({
      where: { employeeId: id },
      update: { type: dto.type, baseRate: dto.baseRate },
      create: { employeeId: id, type: dto.type, baseRate: dto.baseRate },
    });
  }

  async terminate(id: string, dto: TerminateDto) {
    await this.getEmployee(id);
    return this.prisma.employee.update({
      where: { id },
      data: {
        fireDate: dto.fireDate ? new Date(dto.fireDate) : new Date(),
        status: 'TERMINATED',
      },
    });
  }

  async addDocument(id: string, dto: AddDocumentDto) {
    await this.getEmployee(id);
    return this.prisma.employeeDocument.create({
      data: { employeeId: id, ...dto },
    });
  }
}
