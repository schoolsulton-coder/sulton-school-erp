import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { schoolToday } from '../../common/schedule-weeks';
import {
  DAY_MS,
  ENROLLED_STATUSES,
  GRADE_TYPES,
  LEFT_STATUSES,
  Range,
  dayEnd,
  dayStart,
  expenseStatus,
  instantEnd,
  instantStart,
  somEq,
} from './dashboard.helpers';

export interface ReceivableRow {
  contractId: string;
  number: string;
  studentId: string;
  firstName: string;
  lastName: string;
  className: string | null;
  overdueMonths: number;
  overdue: number;
  dueTotal: number;
  debt: number;
}

export interface ExpenseDoc {
  id: string;
  number: number;
  date: Date;
  supplierId: string;
  supplierName: string;
  branchName: string | null;
  total: number;
  paid: number;
  remaining: number;
  age: number;
  status: ReturnType<typeof expenseStatus>;
}

export interface CounterpartyBalance {
  id: string;
  name: string;
  branch: string | null;
  filiallararo: boolean;
  kirim: number;
  chiqim: number;
  balans: number; // > 0 — bizga qarzdor, < 0 — biz qarzdormiz
}

/** Dashboard kartalari, detallari va Excel eksporti uchun umumiy so'rovlar */
@Injectable()
export class DashboardQueries {
  constructor(private prisma: PrismaService) {}

  private branchSql(col: Prisma.Sql, branchId?: string) {
    return branchId ? Prisma.sql`AND ${col} = ${branchId}` : Prisma.empty;
  }

  /**
   * Shartnomalar bo'yicha qarz — "Qarzdorlar" bo'limi qoidasi: DRAFT/CANCELLED'dan tashqari,
   * qoldiq = max(0, summa − to'langan), muddati o'tgan = to'lov kuni bugundan oldin.
   */
  receivableRows(branchId?: string): Promise<ReceivableRow[]> {
    const today = schoolToday();
    return this.prisma.$queryRaw<ReceivableRow[]>`
      SELECT c.id AS "contractId", c.number, s.id AS "studentId", s."firstName", s."lastName", cl.name AS "className",
        (COUNT(*) FILTER (WHERE i."dueDate" < ${today} AND i.amount - i."paidAmount" > 0))::int AS "overdueMonths",
        COALESCE(SUM(GREATEST(i.amount - i."paidAmount", 0)) FILTER (WHERE i."dueDate" < ${today}), 0)::float8 AS overdue,
        COALESCE(SUM(i.amount) FILTER (WHERE i."dueDate" < ${today}), 0)::float8 AS "dueTotal",
        COALESCE(SUM(GREATEST(i.amount - i."paidAmount", 0)), 0)::float8 AS debt
      FROM contracts c
      JOIN contract_installments i ON i."contractId" = c.id
      JOIN students s ON s.id = c."studentId"
      LEFT JOIN classes cl ON cl.id = s."classId"
      WHERE c.status NOT IN ('DRAFT', 'CANCELLED') ${this.branchSql(Prisma.sql`s."branchId"`, branchId)}
      GROUP BY c.id, c.number, s.id, s."firstName", s."lastName", cl.name`;
  }

  /** Xarajat hujjatlari: jami (qatorlar), to'langan (qaytarishlar ayirilgan, dollar — kursda), holat va yoshi */
  async expenseDocs(branchId?: string): Promise<ExpenseDoc[]> {
    const rows = await this.prisma.$queryRaw<Omit<ExpenseDoc, 'remaining' | 'age' | 'status'>[]>`
      SELECT e.id, e.number, e.date, e."supplierId", sp.name AS "supplierName", b.name AS "branchName",
        COALESCE(l.total, 0)::float8 AS total, COALESCE(pp.paid, 0)::float8 AS paid
      FROM expenses e
      JOIN suppliers sp ON sp.id = e."supplierId"
      LEFT JOIN branches b ON b.id = e."branchId"
      LEFT JOIN (
        SELECT "expenseId", SUM(quantity * price) AS total FROM expense_lines GROUP BY "expenseId"
      ) l ON l."expenseId" = e.id
      LEFT JOIN (
        SELECT "expenseId",
          SUM((amount + COALESCE("dollarAmount", 0) * COALESCE("dollarRate", 0)) * CASE WHEN "isRefund" THEN -1 ELSE 1 END) AS paid
        FROM expense_payments GROUP BY "expenseId"
      ) pp ON pp."expenseId" = e.id
      WHERE TRUE ${this.branchSql(Prisma.sql`e."branchId"`, branchId)}`;
    const today = schoolToday().getTime();
    return rows.map((r) => ({
      ...r,
      remaining: r.total - r.paid,
      age: Math.max(0, Math.floor((today - new Date(r.date).getTime()) / DAY_MS)),
      status: expenseStatus(r.total, r.paid),
    }));
  }

  /** Kontragentlar (oldi-berdi) balansi — "Tashqi pul oqimi" qoidasi: balans = chiqim − kirim */
  async counterpartyBalances(branchId?: string): Promise<CounterpartyBalance[]> {
    const cps = await this.prisma.counterparty.findMany({
      where: { category: 'OLDI_BERDICHI', ...(branchId ? { branchId } : {}) },
      select: { id: true, name: true, filiallararo: true, branch: { select: { name: true } } },
    });
    if (!cps.length) return [];
    const sums = await this.prisma.counterpartyEntry.groupBy({
      by: ['counterpartyId', 'direction'],
      where: { counterpartyId: { in: cps.map((c) => c.id) } },
      _sum: { amount: true },
    });
    const map = new Map<string, { kirim: number; chiqim: number }>();
    for (const s of sums) {
      const m = map.get(s.counterpartyId) ?? { kirim: 0, chiqim: 0 };
      if (s.direction === 'IN') m.kirim += s._sum.amount ?? 0;
      else m.chiqim += s._sum.amount ?? 0;
      map.set(s.counterpartyId, m);
    }
    return cps.map((c) => {
      const m = map.get(c.id) ?? { kirim: 0, chiqim: 0 };
      return {
        id: c.id,
        name: c.name,
        branch: c.branch?.name ?? null,
        filiallararo: c.filiallararo,
        kirim: m.kirim,
        chiqim: m.chiqim,
        balans: m.chiqim - m.kirim,
      };
    });
  }

  /** Yozilgan o'quvchi: shu o'quv yili sinfida va Faol/Band/Vaqtincha band shartnomasi bor (har biri bir marta) */
  enrolledWhere(year: string, branchId?: string): Prisma.StudentWhereInput {
    return {
      class: { academicYear: year },
      ...(branchId ? { branchId } : {}),
      contracts: { some: { status: { in: ENROLLED_STATUSES } } },
    };
  }

  leftWhere(p: Range, branchId?: string): Prisma.ContractWhereInput {
    return {
      status: { in: LEFT_STATUSES },
      statusChangedAt: { gte: instantStart(p.from), lte: instantEnd(p.to) },
      ...(branchId ? { student: { branchId } } : {}),
    };
  }

  paymentWhere(p: Range, branchId?: string): Prisma.PaymentWhereInput {
    return {
      paidAt: { gte: dayStart(p.from), lte: dayEnd(p.to) },
      ...(branchId ? { student: { branchId } } : {}),
    };
  }

  expensePaymentWhere(p: Range, branchId?: string): Prisma.ExpensePaymentWhereInput {
    return {
      paidAt: { gte: dayStart(p.from), lte: dayEnd(p.to) },
      ...(branchId ? { expense: { branchId } } : {}),
    };
  }

  salaryWhere(p: Range, branchId?: string): Prisma.SalaryPaymentWhereInput {
    return {
      date: { gte: dayStart(p.from), lte: dayEnd(p.to) },
      ...(branchId ? { branchId } : {}),
    };
  }

  attendanceWhere(p: Range, branchId?: string): Prisma.AttendanceWhereInput {
    return {
      date: { gte: dayStart(p.from), lte: dayEnd(p.to) },
      ...(branchId ? { student: { branchId } } : {}),
    };
  }

  gradeWhere(p: Range, branchId?: string): Prisma.GradeWhereInput {
    return {
      date: { gte: dayStart(p.from), lte: dayEnd(p.to) },
      type: { in: GRADE_TYPES },
      ...(branchId ? { student: { branchId } } : {}),
    };
  }

  coinWhere(p: Range, branchId?: string): Prisma.CoinRecordWhereInput {
    return {
      date: { gte: dayStart(p.from), lte: dayEnd(p.to) },
      ...(branchId ? { student: { branchId } } : {}),
    };
  }

  /** Davr pul harakatlari: o'quvchi to'lovlari, xarajat to'lovlari, maoshlar */
  async moneyRows(p: Range, branchId?: string, opts: { payments?: boolean } = {}) {
    const [payments, expenses, salaries] = await Promise.all([
      opts.payments === false
        ? Promise.resolve([] as { paidAt: Date; amount: number; isRefund: boolean; confirmedAt: Date | null }[])
        : this.prisma.payment.findMany({
            where: this.paymentWhere(p, branchId),
            select: { paidAt: true, amount: true, isRefund: true, confirmedAt: true },
          }),
      this.prisma.expensePayment.findMany({
        where: this.expensePaymentWhere(p, branchId),
        select: { paidAt: true, amount: true, dollarAmount: true, dollarRate: true, isRefund: true },
      }),
      this.prisma.salaryPayment.findMany({
        where: this.salaryWhere(p, branchId),
        select: { date: true, somAmount: true, dollarAmount: true, dollarRate: true },
      }),
    ]);
    return { payments, expenses, salaries };
  }

  /**
   * Tushum — faqat tasdiqlangan o'quvchi to'lovlari (naqd avtomatik tasdiqlanadi; bank/karta tasdiqni kutadi),
   * qaytarishlar ayiriladi. Chiqim — xarajat to'lovlari (dollar — kursda) + berilgan maosh.
   */
  static sums(rows: Awaited<ReturnType<DashboardQueries['moneyRows']>>) {
    let income = 0;
    let incomeCount = 0;
    let pendingSum = 0;
    let pendingCount = 0;
    for (const p of rows.payments) {
      const v = p.isRefund ? -p.amount : p.amount;
      if (p.confirmedAt) {
        income += v;
        incomeCount++;
      } else {
        pendingSum += v;
        pendingCount++;
      }
    }
    const expense = rows.expenses.reduce(
      (s, e) => s + (e.isRefund ? -1 : 1) * somEq(e.amount, e.dollarAmount, e.dollarRate),
      0,
    );
    const salary = rows.salaries.reduce((s, x) => s + somEq(x.somAmount, x.dollarAmount, x.dollarRate), 0);
    return { income, incomeCount, pendingSum, pendingCount, expense, salary, net: income - expense - salary };
  }
}
