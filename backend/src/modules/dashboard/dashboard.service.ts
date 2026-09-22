import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { addDays, dayFromStr, ymd } from '../../common/schedule-weeks';
import { RegistersService } from '../finance/registers.service';
import { MONTHLY_BEHAVIOR_POINTS, monthLabel, monthOf, monthRange } from '../behavior/behavior.service';
import { DashboardQueries } from './dashboard.queries';
import {
  AGE_BUCKETS,
  Ctx,
  GRADE_MAX,
  GRADE_MIN,
  GRADE_TYPES,
  Range,
  academicYearOf,
  ageBucket,
  attAdd,
  attBlank,
  attRate,
  bucketIndex,
  change,
  dayEnd,
  dayStart,
  fullName,
  instantEnd,
  instantStart,
  makeBuckets,
  nextAcademicYear,
  pct,
  resolveCtx,
  round,
  shiftMonth,
  shortMoney,
  somEq,
} from './dashboard.helpers';

type Alert = { level: 'danger' | 'warning' | 'info'; title: string; text: string; kind: string; key?: string };

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private registers: RegistersService,
    private q: DashboardQueries,
  ) {}

  async ceo(query: { from?: string; to?: string; branchId?: string }) {
    const c = resolveCtx(query);
    const b = c.branchId;
    const year = academicYearOf(c.today);
    const nextYear = nextAcademicYear(year);
    const runwayRange: Range = { from: ymd(addDays(dayFromStr(c.today), -89)), to: c.today };

    const [
      branches,
      reg,
      recv,
      docs,
      cps,
      enrolledCur,
      enrolledNext,
      classes,
      leftCur,
      leftPrev,
      money,
      moneyPrev,
      runwayMoney,
      growth,
      academic,
    ] = await Promise.all([
      this.prisma.branch.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      this.registers.list({ branchId: b }),
      this.q.receivableRows(b),
      this.q.expenseDocs(b),
      this.q.counterpartyBalances(b),
      this.prisma.student.count({ where: this.q.enrolledWhere(year, b) }),
      this.prisma.student.count({ where: this.q.enrolledWhere(nextYear, b) }),
      this.prisma.class.findMany({
        where: { academicYear: year, status: { not: 'Arxiv' }, ...(b ? { branchId: b } : {}) },
        select: { id: true, name: true, language: true, capacity: true },
      }),
      this.prisma.contract.findMany({ where: this.q.leftWhere(c, b), select: { studentId: true }, distinct: ['studentId'] }),
      this.prisma.contract.findMany({ where: this.q.leftWhere(c.prev, b), select: { studentId: true }, distinct: ['studentId'] }),
      this.q.moneyRows(c, b),
      this.q.moneyRows(c.prev, b),
      this.q.moneyRows(runwayRange, b, { payments: false }),
      this.growth(c, b),
      this.academic(c, b),
    ]);

    // ===== Kassa (Hisoblar bo'limi bilan bir xil) =====
    const cash = { som: 0, usd: 0, somPending: 0, usdPending: 0, somConfirmed: 0, usdConfirmed: 0, accounts: reg.registers.length };
    for (const r of reg.registers) {
      if (r.currency === 'USD') {
        cash.usd += r.storedBalance;
        cash.usdPending += r.pendingNet;
        cash.usdConfirmed += r.confirmedBalance;
      } else {
        cash.som += r.storedBalance;
        cash.somPending += r.pendingNet;
        cash.somConfirmed += r.confirmedBalance;
      }
    }

    // ===== O'quvchilar qarzi =====
    const recvAging: Record<string, { amount: number; count: number }> = {
      '1': { amount: 0, count: 0 },
      '2': { amount: 0, count: 0 },
      '3': { amount: 0, count: 0 },
    };
    const debtorStudents = new Set<string>();
    let overdue = 0;
    let dueTotal = 0;
    let debt = 0;
    let debtorContracts = 0;
    for (const r of recv) {
      dueTotal += r.dueTotal;
      debt += r.debt;
      if (r.overdue > 0) {
        overdue += r.overdue;
        debtorContracts++;
        debtorStudents.add(r.studentId);
        const k = r.overdueMonths >= 3 ? '3' : String(Math.max(1, r.overdueMonths));
        recvAging[k].amount += r.overdue;
        recvAging[k].count++;
      }
    }

    // ===== Ta'minotchilar va xarajat hujjatlari =====
    const bySupplier = new Map<string, number>();
    const ctrl = { open: 0, unpaid: 0, partial: 0, excess: 0, incomplete: 0, qarz: 0, avans: 0 };
    const supAging: Record<string, { amount: number; count: number }> = Object.fromEntries(
      AGE_BUCKETS.map((a) => [a.key, { amount: 0, count: 0 }]),
    );
    let supOver30 = 0;
    for (const d of docs) {
      bySupplier.set(d.supplierId, (bySupplier.get(d.supplierId) ?? 0) + d.remaining);
      if (d.status === 'UNPAID') ctrl.unpaid++;
      else if (d.status === 'PARTIAL') ctrl.partial++;
      else if (d.status === 'EXCESS') ctrl.excess++;
      else if (d.status === 'INCOMPLETE') ctrl.incomplete++;
      if (d.remaining > 0) ctrl.qarz += d.remaining;
      else ctrl.avans += -d.remaining;
      if (d.remaining > 0.5) {
        const k = ageBucket(d.age);
        supAging[k].amount += d.remaining;
        supAging[k].count++;
        if (d.age > 30) supOver30 += d.remaining;
      }
    }
    ctrl.open = ctrl.unpaid + ctrl.partial + ctrl.excess + ctrl.incomplete;
    const suppliers = { qarz: 0, avans: 0, farq: 0, balances: 0 };
    for (const rem of bySupplier.values()) {
      if (rem > 0.5) {
        suppliers.qarz += rem;
        suppliers.balances++;
      } else if (rem < -0.5) {
        suppliers.avans += -rem;
        suppliers.balances++;
      }
    }
    suppliers.farq = suppliers.qarz - suppliers.avans;

    // ===== Kontragentlar: tashqi va filiallararo saldo =====
    const saldo = (list: typeof cps) => {
      let plus = 0;
      let minus = 0;
      for (const x of list) {
        if (x.balans > 0) plus += x.balans;
        else minus += -x.balans;
      }
      return { plus, minus, saldo: plus - minus, count: list.filter((x) => Math.abs(x.balans) > 0.5).length };
    };
    const ext = saldo(cps.filter((x) => !x.filiallararo));
    const inter = saldo(cps.filter((x) => x.filiallararo));

    // ===== Sig'im, kassa yetish muddati, davr natijasi =====
    const capacity = classes.reduce((s, x) => s + x.capacity, 0);
    const cur = DashboardQueries.sums(money);
    const prev = DashboardQueries.sums(moneyPrev);
    const out90 = DashboardQueries.sums(runwayMoney);
    const monthlyOut = (out90.expense + out90.salary) / 3;
    const runwayMonths = monthlyOut > 0 ? Math.max(0, round(cash.somConfirmed / monthlyOut, 1)) : null;

    // ===== Pul oqimi grafigi =====
    const ranges = makeBuckets(c.from, c.to, c.bucketDays);
    const flow = ranges.map((r) => ({ ...r, income: 0, expense: 0, salary: 0, outflow: 0, net: 0 }));
    const idx = (d: Date) => bucketIndex(d, c.from, c.bucketDays, flow.length);
    for (const p of money.payments) if (p.confirmedAt) flow[idx(p.paidAt)].income += p.isRefund ? -p.amount : p.amount;
    for (const e of money.expenses) flow[idx(e.paidAt)].expense += (e.isRefund ? -1 : 1) * somEq(e.amount, e.dollarAmount, e.dollarRate);
    for (const s of money.salaries) flow[idx(s.date)].salary += somEq(s.somAmount, s.dollarAmount, s.dollarRate);
    for (const f of flow) {
      f.income = round(f.income);
      f.expense = round(f.expense);
      f.salary = round(f.salary);
      f.outflow = f.expense + f.salary;
      f.net = f.income - f.outflow;
    }

    const today = {
      cash: { ...cash, som: round(cash.som, 2), usd: round(cash.usd, 2) },
      receivables: {
        overdue: round(overdue),
        dueTotal: round(dueTotal),
        ratio: pct(overdue, dueTotal),
        debt: round(debt),
        contracts: debtorContracts,
        students: debtorStudents.size,
      },
      suppliers: { qarz: round(suppliers.qarz), avans: round(suppliers.avans), farq: round(suppliers.farq), balances: suppliers.balances },
      expenseControl: { ...ctrl, qarz: round(ctrl.qarz), avans: round(ctrl.avans) },
      external: { saldo: round(ext.saldo), bizga: round(ext.plus), bizning: round(ext.minus), count: ext.count },
      interbranch: { saldo: round(inter.saldo), haqdor: round(inter.plus), qarzdor: round(inter.minus), count: inter.count },
      enrolled: { current: { year, count: enrolledCur }, next: { year: nextYear, count: enrolledNext } },
      runway: { months: runwayMonths, monthlyOut: round(monthlyOut), cash: round(cash.somConfirmed) },
      perStudent: { value: enrolledCur ? round(cur.income / enrolledCur) : 0, income: round(cur.income), students: enrolledCur },
      left: { count: leftCur.length, prev: leftPrev.length, diff: leftCur.length - leftPrev.length },
      capacity: {
        enrolled: enrolledCur,
        capacity,
        free: Math.max(0, capacity - enrolledCur),
        fill: pct(enrolledCur, capacity),
        classes: classes.length,
      },
    };

    const result = {
      income: { value: round(cur.income), prev: round(prev.income), change: change(cur.income, prev.income), count: cur.incomeCount },
      expense: { value: round(cur.expense), prev: round(prev.expense), change: change(cur.expense, prev.expense) },
      salary: { value: round(cur.salary), prev: round(prev.salary), change: change(cur.salary, prev.salary) },
      net: { value: round(cur.net), prev: round(prev.net), change: change(cur.net, prev.net), ratio: pct(cur.net, cur.income) },
      pending: { count: cur.pendingCount, sum: round(cur.pendingSum) },
      incompleteExpenses: ctrl.incomplete,
      ...growth,
    };

    return {
      generatedAt: new Date().toISOString(),
      period: { from: c.from, to: c.to, days: c.days, prevFrom: c.prev.from, prevTo: c.prev.to, bucketDays: c.bucketDays },
      branchId: b ?? null,
      branches,
      // O'quv jarayoni sinf filtri uchun — joriy o'quv yili sinflari
      classes: classes
        .map((x) => ({ id: x.id, name: x.language ? `${x.name} (${x.language})` : x.name }))
        .sort((x, y) => x.name.localeCompare(y.name, 'uz', { numeric: true })),
      alerts: this.alerts({ today, result, supOver30, academic }),
      today,
      aging: {
        receivables: {
          total: round(overdue),
          buckets: [
            { key: '1', label: '1 oy', ...recvAging['1'] },
            { key: '2', label: '2 oy', ...recvAging['2'] },
            { key: '3', label: "3 oy va undan ko'p", ...recvAging['3'] },
          ].map((x) => ({ ...x, amount: round(x.amount) })),
        },
        suppliers: {
          total: round(ctrl.qarz),
          buckets: AGE_BUCKETS.map((a) => ({ ...a, amount: round(supAging[a.key].amount), count: supAging[a.key].count })),
        },
      },
      result,
      flow: { bucketDays: c.bucketDays, buckets: flow },
      academic,
    };
  }

  private alerts(d: { today: any; result: any; supOver30: number; academic: any }): Alert[] {
    const out: Alert[] = [];
    const { today, result } = d;
    const rw = today.runway.months;
    if (rw !== null && rw < 2) {
      out.push({
        level: rw < 1 ? 'danger' : 'warning',
        title: `Kassa ${String(rw).replace('.', ',')} oyga yetadi`,
        text: `Tasdiqlangan so'm qoldiq ${shortMoney(today.runway.cash)}, o'rtacha oylik chiqim ${shortMoney(today.runway.monthlyOut)} (oxirgi 90 kun).`,
        kind: 'cash',
      });
    }
    if (today.receivables.overdue > 0) {
      out.push({
        level: 'warning',
        title: `Muddati o'tgan qarzdorlik: ${shortMoney(today.receivables.overdue)}`,
        text: `${today.receivables.students} ta o'quvchi · muddati kelgan summaning ${String(today.receivables.ratio).replace('.', ',')}%.`,
        kind: 'receivables',
      });
    }
    if (d.supOver30 > 0.5) {
      out.push({
        level: 'warning',
        title: `Ta'minotchilarga 30 kundan oshgan qarz: ${shortMoney(d.supOver30)}`,
        text: `Hujjatlar bo'yicha ochiq qarz jami ${shortMoney(today.expenseControl.qarz)}.`,
        kind: 'supplier-aging',
        key: '31+',
      });
    }
    if (today.left.count > today.left.prev && today.left.count > 0) {
      out.push({
        level: 'info',
        title: `Ketganlar oldingi davrdan ko'p: ${today.left.count} (oldingi ${today.left.prev})`,
        text: "Shartnomasini bekor qilgan, ketgan yoki nofaol bo'lgan o'quvchilar soni oshdi.",
        kind: 'left',
      });
    }
    if (result.pending.count > 0) {
      out.push({
        level: 'info',
        title: `${result.pending.count} ta to'lov tasdiq kutmoqda: ${shortMoney(result.pending.sum)}`,
        text: "Bank/karta to'lovlari tasdiqlanmaguncha davr tushumiga qo'shilmaydi.",
        kind: 'pending',
      });
    }
    if (today.capacity.capacity > 0 && today.capacity.fill >= 95) {
      out.push({
        level: 'warning',
        title: `Sig'im ${String(today.capacity.fill).replace('.', ',')}% band`,
        text: `Bo'sh o'rin: ${today.capacity.free} ta (${today.enrolled.current.year}).`,
        kind: 'capacity',
      });
    }
    const att = d.academic.attendance;
    if (att.total > 0 && att.rate < 85) {
      out.push({
        level: 'warning',
        title: `Davomat past: ${String(att.rate).replace('.', ',')}%`,
        text: `Davr bo'yicha ${att.absent} ta sababsiz qoldirilgan dars kuni.`,
        kind: 'attendance-classes',
      });
    }
    if (result.incompleteExpenses > 0) {
      out.push({
        level: 'info',
        title: `${result.incompleteExpenses} ta xarajat hujjati noto'liq`,
        text: "Summasi kiritilmagan hujjatlar ta'minotchi qarzini noto'g'ri ko'rsatadi.",
        kind: 'expenses',
        key: 'INCOMPLETE',
      });
    }
    return out;
  }

  /** Yangi shartnomalar va murojaatlar (lidlar) — davr va oldingi davr */
  private async growth(c: Ctx, b?: string) {
    const cw = (p: Range): Prisma.ContractWhereInput => ({
      createdAt: { gte: instantStart(p.from), lte: instantEnd(p.to) },
      ...(b ? { student: { branchId: b } } : {}),
    });
    const lw = (p: Range): Prisma.LeadWhereInput => ({
      createdAt: { gte: instantStart(p.from), lte: instantEnd(p.to) },
      ...(b ? { branchId: b } : {}),
    });
    const [nc, ncPrev, ncSum, leads, leadsPrev, converted] = await Promise.all([
      this.prisma.contract.count({ where: cw(c) }),
      this.prisma.contract.count({ where: cw(c.prev) }),
      this.prisma.contractInstallment.aggregate({ where: { contract: cw(c) }, _sum: { amount: true } }),
      this.prisma.lead.count({ where: lw(c) }),
      this.prisma.lead.count({ where: lw(c.prev) }),
      this.prisma.lead.count({
        where: { convertedAt: { gte: instantStart(c.from), lte: instantEnd(c.to) }, ...(b ? { branchId: b } : {}) },
      }),
    ]);
    return {
      newContracts: { count: nc, prev: ncPrev, change: change(nc, ncPrev), sum: round(ncSum._sum.amount ?? 0) },
      leads: { count: leads, prev: leadsPrev, change: change(leads, leadsPrev), converted, conversion: pct(converted, leads) },
    };
  }

  // ======================= O'QUV JARAYONI =======================

  /** O'quv jarayoni bo'limi — filial va (ixtiyoriy) bitta sinf bo'yicha; moliya qismi qayta hisoblanmaydi */
  async academicScoped(query: { from?: string; to?: string; branchId?: string; classId?: string }) {
    const c = resolveCtx(query);
    const classId = query.classId || undefined;
    const cls = classId
      ? await this.prisma.class.findUnique({ where: { id: classId }, select: { id: true, name: true, language: true } })
      : null;
    if (classId && !cls) throw new BadRequestException('Sinf topilmadi');
    const academic = await this.academic(c, c.branchId, classId);
    return {
      ...academic,
      scope: cls ? { classId: cls.id, className: cls.language ? `${cls.name} (${cls.language})` : cls.name } : null,
    };
  }

  private async academic(c: Ctx, b?: string, classId?: string) {
    const [attendance, grades, coins, behavior] = await Promise.all([
      this.attendance(c, b, classId),
      this.grades(c, b, classId),
      this.coins(c, b, classId),
      this.behavior(c, b, classId),
    ]);
    return { attendance, grades, coins, behavior };
  }

  private async studentNames(ids: string[]) {
    if (!ids.length) return new Map<string, string>();
    const list = await this.prisma.student.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true } });
    return new Map(list.map((s) => [s.id, fullName(s)]));
  }

  private async attendance(c: Ctx, b?: string, classId?: string) {
    const w = this.q.attendanceWhere(c, b, classId);
    const [byDay, byGroup, prevRows] = await Promise.all([
      this.prisma.attendance.groupBy({ by: ['date', 'status'], where: w, _count: { _all: true } }),
      // Sinf tanlangan bo'lsa — o'quvchilar kesimi, aks holda sinflar kesimi
      classId
        ? this.prisma.attendance.groupBy({ by: ['studentId', 'status'], where: w, _count: { _all: true } })
        : this.prisma.attendance.groupBy({ by: ['classId', 'status'], where: w, _count: { _all: true } }),
      this.prisma.attendance.groupBy({ by: ['status'], where: this.q.attendanceWhere(c.prev, b, classId), _count: { _all: true } }),
    ]);
    const total = attBlank();
    const prev = attBlank();
    for (const r of prevRows) attAdd(prev, r.status, r._count._all);

    // Kunlik (31 kungacha) yoki guruhlangan trend — faqat davomat belgilangan kunlar
    const size = c.days <= 31 ? 1 : c.bucketDays;
    const ranges = makeBuckets(c.from, c.to, size);
    const buckets = ranges.map((r) => ({ ...r, ...attBlank() }));
    for (const r of byDay) {
      attAdd(total, r.status, r._count._all);
      attAdd(buckets[bucketIndex(r.date, c.from, size, buckets.length)], r.status, r._count._all);
    }

    const groups = new Map<string, ReturnType<typeof attBlank>>();
    for (const r of byGroup as { studentId?: string; classId?: string | null; status: string; _count: { _all: number } }[]) {
      const id = classId ? r.studentId : r.classId;
      if (!id) continue;
      const a = groups.get(id) ?? attBlank();
      attAdd(a, r.status, r._count._all);
      groups.set(id, a);
    }
    const nameOf = classId
      ? await this.studentNames([...groups.keys()])
      : new Map(
          (await this.prisma.class.findMany({ where: { id: { in: [...groups.keys()] } }, select: { id: true, name: true } })).map((n) => [n.id, n.name]),
        );
    const rows = [...groups.entries()]
      .map(([id, a]) => ({ id, name: nameOf.get(id) ?? '—', rate: attRate(a), total: a.total, absent: a.absent, late: a.late }))
      .sort((x, y) => x.rate - y.rate || y.absent - x.absent);

    const rate = attRate(total, 1);
    const prevRate = attRate(prev, 1);
    return {
      rate,
      prev: prevRate,
      change: prev.total ? round(rate - prevRate, 1) : null,
      ...total,
      trendSize: size,
      trend: buckets
        .filter((x) => x.total > 0)
        .map((x) => ({ from: x.from, to: x.to, rate: attRate(x, 1), total: x.total, absent: x.absent, late: x.late, excused: x.excused })),
      classes: classId ? [] : rows,
      students: classId ? rows : [],
    };
  }

  private async grades(c: Ctx, b?: string, classId?: string) {
    const w = this.q.gradeWhere(c, b, classId);
    const [agg, prevAgg, dist, bySubject, byGroup] = await Promise.all([
      this.prisma.grade.aggregate({ where: w, _avg: { value: true }, _count: { _all: true } }),
      this.prisma.grade.aggregate({ where: this.q.gradeWhere(c.prev, b, classId), _avg: { value: true } }),
      this.prisma.grade.groupBy({ by: ['value'], where: w, _count: { _all: true } }),
      this.prisma.grade.groupBy({ by: ['subjectId'], where: w, _avg: { value: true }, _count: { _all: true } }),
      classId
        ? this.prisma.grade.groupBy({ by: ['studentId'], where: w, _avg: { value: true }, _count: { _all: true } })
        : this.prisma.$queryRaw<{ id: string; name: string; average: number; count: number }[]>`
            SELECT s."classId" AS id, cl.name, AVG(g.value)::float8 AS average, COUNT(*)::int AS count
            FROM grades g
            JOIN students s ON s.id = g."studentId"
            JOIN classes cl ON cl.id = s."classId"
            WHERE g.date >= ${dayStart(c.from)} AND g.date <= ${dayEnd(c.to)}
              AND g.type::text IN (${Prisma.join(GRADE_TYPES)})
              AND g.value BETWEEN ${GRADE_MIN} AND ${GRADE_MAX}
              ${b ? Prisma.sql`AND s."branchId" = ${b}` : Prisma.empty}
            GROUP BY s."classId", cl.name`,
    ]);
    const subjects = await this.prisma.subject.findMany({
      where: { id: { in: bySubject.map((x) => x.subjectId) } },
      select: { id: true, name: true },
    });
    const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
    const distribution: Record<'5' | '4' | '3' | '2' | '1', number> = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
    for (const r of dist) {
      const k = String(Math.min(5, Math.max(1, Math.round(r.value)))) as keyof typeof distribution;
      distribution[k] += r._count._all;
    }
    let rows: { id: string; name: string; average: number; count: number }[];
    if (classId) {
      const g = byGroup as { studentId: string; _avg: { value: number | null }; _count: { _all: number } }[];
      const names = await this.studentNames(g.map((x) => x.studentId));
      rows = g.map((x) => ({ id: x.studentId, name: names.get(x.studentId) ?? '—', average: round(x._avg.value ?? 0, 2), count: x._count._all }));
    } else {
      rows = (byGroup as { id: string; name: string; average: number; count: number }[]).map((x) => ({ ...x, average: round(x.average, 2) }));
    }
    rows.sort((x, y) => x.average - y.average);
    const average = round(agg._avg.value ?? 0, 2);
    const prev = round(prevAgg._avg.value ?? 0, 2);
    return {
      average,
      prev,
      change: prev ? round(average - prev, 2) : null,
      count: agg._count._all,
      distribution,
      excellentPct: pct(distribution['5'], agg._count._all),
      failPct: pct(distribution['2'] + distribution['1'], agg._count._all),
      subjects: bySubject
        .map((s) => ({ id: s.subjectId, name: subjectName.get(s.subjectId) ?? '—', average: round(s._avg.value ?? 0, 2), count: s._count._all }))
        .sort((x, y) => y.average - x.average),
      classes: classId ? [] : rows,
      students: classId ? rows : [],
    };
  }

  private async coins(c: Ctx, b?: string, classId?: string) {
    const rows = await this.prisma.coinRecord.findMany({
      where: this.q.coinWhere(c, b, classId),
      select: { studentId: true, amount: true, date: true },
    });
    const ranges = makeBuckets(c.from, c.to, c.bucketDays);
    const trend = ranges.map((r) => ({ ...r, earned: 0, spent: 0 }));
    const per = new Map<string, { earned: number; spent: number }>();
    let earned = 0;
    let spent = 0;
    for (const r of rows) {
      const t = trend[bucketIndex(r.date, c.from, c.bucketDays, trend.length)];
      const m = per.get(r.studentId) ?? { earned: 0, spent: 0 };
      if (r.amount > 0) {
        earned += r.amount;
        t.earned += r.amount;
        m.earned += r.amount;
      } else {
        spent += -r.amount;
        t.spent += -r.amount;
        m.spent += -r.amount;
      }
      per.set(r.studentId, m);
    }
    const students = per.size
      ? await this.prisma.student.findMany({
          where: { id: { in: [...per.keys()] } },
          select: { id: true, firstName: true, lastName: true, classId: true, class: { select: { name: true } } },
        })
      : [];
    const cls = new Map<string, { id: string; name: string; earned: number; spent: number; students: number }>();
    const list = students.map((s) => {
      const m = per.get(s.id)!;
      if (s.classId) {
        const x = cls.get(s.classId) ?? { id: s.classId, name: s.class?.name ?? '—', earned: 0, spent: 0, students: 0 };
        x.earned += m.earned;
        x.spent += m.spent;
        x.students++;
        cls.set(s.classId, x);
      }
      return { id: s.id, name: fullName(s), className: s.class?.name ?? null, earned: m.earned, spent: m.spent, net: m.earned - m.spent };
    });
    return {
      earned,
      spent,
      net: earned - spent,
      records: rows.length,
      students: per.size,
      trend,
      topStudents: [...list].sort((x, y) => y.earned - x.earned).slice(0, 5),
      classes: classId ? [] : [...cls.values()].map((x) => ({ ...x, net: x.earned - x.spent })).sort((x, y) => y.net - x.net),
      studentList: classId ? list.sort((x, y) => y.net - x.net) : [],
    };
  }

  /** Ahloq — tanlangan davr oxiridagi oy (har o'quvchiga 100 ball, faqat ayirish) + oxirgi 6 oy */
  private async behavior(c: Ctx, b?: string, classId?: string) {
    const month = c.to.slice(0, 7);
    const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
    const students = await this.prisma.student.findMany({
      where: { status: 'ACTIVE', classId: classId ?? { not: null }, ...(b ? { branchId: b } : {}) },
      select: { id: true, firstName: true, lastName: true, classId: true, class: { select: { name: true } } },
    });
    const ids = students.map((s) => s.id);
    const records = ids.length
      ? await this.prisma.behaviorRecord.findMany({
          where: {
            type: 'NEGATIVE',
            studentId: { in: ids },
            date: { gte: monthRange(months[0]).start, lt: monthRange(month).end },
          },
          select: { studentId: true, points: true, date: true },
        })
      : [];
    const byMonth = new Map<string, Map<string, number>>(months.map((m) => [m, new Map()]));
    for (const r of records) {
      const m = byMonth.get(monthOf(r.date));
      if (m) m.set(r.studentId, (m.get(r.studentId) ?? 0) + r.points);
    }
    const L = MONTHLY_BEHAVIOR_POINTS;
    const remainingOf = (ded: number) => Math.max(0, L - ded);
    const cur = byMonth.get(month)!;
    const buckets = { full: 0, good: 0, mid: 0, low: 0 };
    const cls = new Map<string, { id: string; name: string; sum: number; students: number; deducted: number }>();
    const list: { id: string; name: string; remaining: number; deducted: number }[] = [];
    let sum = 0;
    let totalDeducted = 0;
    for (const s of students) {
      const ded = Math.min(L, cur.get(s.id) ?? 0);
      const rem = remainingOf(ded);
      sum += rem;
      totalDeducted += ded;
      if (rem >= L) buckets.full++;
      else if (rem >= 80) buckets.good++;
      else if (rem >= 50) buckets.mid++;
      else buckets.low++;
      const x = cls.get(s.classId!) ?? { id: s.classId!, name: s.class?.name ?? '—', sum: 0, students: 0, deducted: 0 };
      x.sum += rem;
      x.students++;
      x.deducted += ded;
      cls.set(s.classId!, x);
      if (classId) list.push({ id: s.id, name: fullName(s), remaining: rem, deducted: ded });
    }
    const n = students.length;
    return {
      month,
      monthLabel: monthLabel(month),
      limit: L,
      students: n,
      average: n ? round(sum / n, 1) : L,
      totalDeducted,
      withDeductions: n - buckets.full,
      buckets,
      classes: classId
        ? []
        : [...cls.values()]
            .map((x) => ({ id: x.id, name: x.name, students: x.students, deducted: x.deducted, average: round(x.sum / x.students, 1) }))
            .sort((a, z) => a.average - z.average),
      studentList: list.sort((a, z) => a.remaining - z.remaining || a.name.localeCompare(z.name)),
      history: months.map((m) => {
        const mm = byMonth.get(m)!;
        const total = students.reduce((s, st) => s + remainingOf(mm.get(st.id) ?? 0), 0);
        return { month: m, label: monthLabel(m), average: n ? round(total / n, 1) : L };
      }),
    };
  }

  // ======================= EXCEL =======================

  async exportXlsx(query: { from?: string; to?: string; branchId?: string }): Promise<{ buffer: Buffer; name: string }> {
    const d = await this.ceo(query);
    const [recv, docs] = await Promise.all([this.q.receivableRows(d.branchId ?? undefined), this.q.expenseDocs(d.branchId ?? undefined)]);
    const branch = d.branches.find((x) => x.id === d.branchId)?.name ?? 'Barcha filiallar';
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Sulton School ERP';

    const sheet = (name: string, cols: { header: string; key: string; width: number; money?: boolean }[]) => {
      const ws = wb.addWorksheet(name);
      ws.columns = cols.map((col) => ({ header: col.header, key: col.key, width: col.width, style: col.money ? { numFmt: '#,##0' } : {} }));
      ws.getRow(1).font = { bold: true };
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      return ws;
    };

    const t = d.today;
    const r = d.result;
    const kpi = sheet('Umumiy', [
      { header: "Ko'rsatkich", key: 'k', width: 42 },
      { header: 'Qiymat', key: 'v', width: 20, money: true },
      { header: 'Izoh', key: 'n', width: 50 },
    ]);
    kpi.addRows([
      { k: 'Davr', n: `${d.period.from} — ${d.period.to} · ${branch}` },
      { k: "Kassa qoldig'i (so'm)", v: t.cash.som },
      { k: "Kassa qoldig'i (USD)", v: t.cash.usd },
      { k: "Muddati o'tgan qarzdorlik", v: t.receivables.overdue, n: `${t.receivables.students} o'quvchi · ${t.receivables.ratio}%` },
      { k: "Ta'minotchilarga qarz", v: t.suppliers.qarz, n: `avans ${t.suppliers.avans}` },
      { k: 'Tashqi saldo', v: t.external.saldo, n: `bizga ${t.external.bizga} · bizning ${t.external.bizning}` },
      { k: 'Filiallararo saldo', v: t.interbranch.saldo },
      { k: `Yozilgan o'quvchilar · ${t.enrolled.current.year}`, v: t.enrolled.current.count },
      { k: `Yozilgan o'quvchilar · ${t.enrolled.next.year}`, v: t.enrolled.next.count },
      { k: "Sig'im (band %)", v: t.capacity.fill, n: `${t.capacity.enrolled}/${t.capacity.capacity}` },
      { k: 'Kassa yetish muddati (oy)', v: t.runway.months ?? undefined },
      { k: 'Ketganlar', v: t.left.count, n: `oldingi davr: ${t.left.prev}` },
      { k: 'Tushum (tasdiqlangan)', v: r.income.value, n: `oldingi: ${r.income.prev}` },
      { k: "Xarajat to'lovlari", v: r.expense.value, n: `oldingi: ${r.expense.prev}` },
      { k: 'Berilgan maosh', v: r.salary.value, n: `oldingi: ${r.salary.prev}` },
      { k: 'Pul oqimi natijasi', v: r.net.value, n: `tushumga nisbati ${r.net.ratio}%` },
      { k: 'Tasdiq kutayotgan tushum', v: r.pending.sum, n: `${r.pending.count} ta` },
      { k: 'Yangi shartnomalar', v: r.newContracts.count },
      { k: 'Yangi murojaatlar', v: r.leads.count, n: `shartnomaga aylangan: ${r.leads.converted}` },
      { k: 'Davomat (%)', v: d.academic.attendance.rate },
      { k: "O'rtacha baho", v: d.academic.grades.average },
      { k: "Coin (qo'shilgan / ayirilgan)", v: d.academic.coins.earned, n: `ayirilgan: ${d.academic.coins.spent}` },
      { k: `Ahloqiy ball o'rtachasi (${d.academic.behavior.monthLabel})`, v: d.academic.behavior.average },
    ]);

    const fl = sheet('Pul oqimi', [
      { header: 'Sanadan', key: 'from', width: 12 },
      { header: 'Sanagacha', key: 'to', width: 12 },
      { header: 'Tushum', key: 'income', width: 16, money: true },
      { header: 'Xarajat', key: 'expense', width: 16, money: true },
      { header: 'Maosh', key: 'salary', width: 16, money: true },
      { header: 'Natija', key: 'net', width: 16, money: true },
    ]);
    fl.addRows(d.flow.buckets);

    const dr = sheet('Qarzdorlar', [
      { header: "O'quvchi", key: 'name', width: 30 },
      { header: 'Sinf', key: 'cls', width: 14 },
      { header: 'Shartnoma', key: 'number', width: 16 },
      { header: "Muddati o'tgan oy", key: 'months', width: 10 },
      { header: "Muddati o'tgan", key: 'overdue', width: 16, money: true },
      { header: 'Jami qarz', key: 'debt', width: 16, money: true },
    ]);
    dr.addRows(
      recv
        .filter((x) => x.overdue > 0)
        .sort((a, z) => z.overdue - a.overdue)
        .map((x) => ({ name: fullName(x), cls: x.className, number: x.number, months: x.overdueMonths, overdue: x.overdue, debt: x.debt })),
    );

    const sp = sheet("Ta'minotchi qarzi", [
      { header: '№', key: 'number', width: 8 },
      { header: "Ta'minotchi", key: 'supplier', width: 30 },
      { header: 'Sana', key: 'date', width: 12 },
      { header: 'Yoshi (kun)', key: 'age', width: 10 },
      { header: 'Jami', key: 'total', width: 16, money: true },
      { header: "To'langan", key: 'paid', width: 16, money: true },
      { header: 'Qoldiq', key: 'remaining', width: 16, money: true },
    ]);
    sp.addRows(
      docs
        .filter((x) => x.remaining > 0.5)
        .sort((a, z) => z.age - a.age)
        .map((x) => ({ number: x.number, supplier: x.supplierName, date: ymd(new Date(x.date)), age: x.age, total: x.total, paid: x.paid, remaining: x.remaining })),
    );

    const at = sheet('Davomat', [
      { header: 'Sinf', key: 'name', width: 16 },
      { header: 'Davomat %', key: 'rate', width: 12 },
      { header: 'Belgilangan', key: 'total', width: 12 },
      { header: 'Sababsiz', key: 'absent', width: 12 },
      { header: 'Kechikkan', key: 'late', width: 12 },
    ]);
    at.addRows(d.academic.attendance.classes);

    const gr = sheet('Baholar', [
      { header: 'Fan / sinf', key: 'name', width: 24 },
      { header: "O'rtacha", key: 'average', width: 12 },
      { header: 'Baholar soni', key: 'count', width: 12 },
    ]);
    gr.addRow({ name: 'FANLAR' }).font = { bold: true };
    gr.addRows(d.academic.grades.subjects);
    gr.addRow({});
    gr.addRow({ name: 'SINFLAR' }).font = { bold: true };
    gr.addRows(d.academic.grades.classes);

    const bh = sheet('Ahloq va coin', [
      { header: 'Sinf', key: 'name', width: 16 },
      { header: `Ahloq o'rtacha (${d.academic.behavior.monthLabel})`, key: 'average', width: 22 },
      { header: 'Ayirilgan ball', key: 'deducted', width: 14 },
      { header: "Coin qo'shilgan", key: 'earned', width: 16 },
      { header: 'Coin ayirilgan', key: 'spent', width: 16 },
    ]);
    const coinCls = new Map(d.academic.coins.classes.map((x) => [x.id, x]));
    bh.addRows(
      d.academic.behavior.classes.map((x) => ({
        name: x.name,
        average: x.average,
        deducted: x.deducted,
        earned: coinCls.get(x.id)?.earned ?? 0,
        spent: coinCls.get(x.id)?.spent ?? 0,
      })),
    );

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    return { buffer, name: `ceo-dashboard_${d.period.from}_${d.period.to}` };
  }
}
