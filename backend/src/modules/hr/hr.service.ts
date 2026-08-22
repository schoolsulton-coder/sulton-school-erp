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
    const ushlanma = r.jarima + r.soliq;
    const jami = asosiyHisob + soatlikHisob + r.rasmiyHisob + qoshimcha - ushlanma;
    const kunlik = r.ishchiKunlar > 0 ? r.asosiyOylik / r.ishchiKunlar : 0;
    return { asosiyHisob, soatlikHisob, kunlik, jami };
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
      const draft: any = { ishchiKunlar, ishlaganKun: ishchiKunlar, ishlaganSoat: 0, asosiyOylik, soatlikNarx, rasmiyHisob: 0, kpi: 0, bonus: 0, ovqatPuli: 0, tatilKartaga: 0, tatilNaqd: 0, ijara: 0, transport: 0, jarima: 0, soliq: 0 };
      const { jami } = this.calcJami(draft);
      await this.prisma.payrollRecord.create({ data: { period: dto.period, employeeId: e.id, ...draft, jami, naqd: jami, karta: 0 } });
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
      include: { employee: { include: { user: { select: { fullName: true } }, position: { select: { name: true } }, branch: { select: { name: true } }, department: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    const paid = await this.paidByEmployee(params.period, records.map((r) => r.employeeId));

    const data = records.map((r) => {
      const c = this.calcJami(r);
      const berildi = paid[r.employeeId] ?? 0;
      return {
        id: r.id,
        xodim: r.employee.user.fullName,
        position: r.employee.position?.name ?? null,
        branch: r.employee.branch?.name ?? null,
        department: r.employee.department?.name ?? null,
        ishlagan: r.ishlaganKun,
        bonusJarima: r.bonus - r.jarima,
        ovqat: r.ovqatPuli,
        jami: c.jami,
        berildi,
        qoldiq: c.jami - berildi,
        naqd: r.naqd,
        karta: r.karta,
        confirmed: r.confirmed,
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
        documents: true,
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
