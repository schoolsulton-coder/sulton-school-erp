import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ymd } from '../../common/schedule-weeks';
import { RegistersService } from '../finance/registers.service';
import { MONTHLY_BEHAVIOR_POINTS, monthLabel, monthRange } from '../behavior/behavior.service';
import { DashboardQueries } from './dashboard.queries';
import {
  EXPENSE_STATUS_LABEL,
  GRADE_MAX,
  GRADE_MIN,
  GRADE_TYPES,
  academicYearOf,
  ageBucket,
  attAdd,
  attBlank,
  attRate,
  dayEnd,
  dayStart,
  fullName,
  instantEnd,
  instantStart,
  pct,
  resolveCtx,
  round,
  somEq,
} from './dashboard.helpers';

type ColType = 'text' | 'money' | 'int' | 'num' | 'pct' | 'date' | 'badge';
interface Col {
  key: string;
  label: string;
  type?: ColType;
}
type Row = Record<string, string | number | null | undefined> & { _href?: string; _tone?: string };
export interface DetailResult {
  title: string;
  subtitle?: string;
  columns: Col[];
  rows: Row[];
  total: number;
  truncated: boolean;
  summary?: { label: string; value: string | number; type?: ColType }[];
}

const LIMIT = 1000;
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Faol',
  COMPLETED: 'Faol (to‘langan)',
  SUSPENDED: 'Band',
  TEMP_SUSPENDED: 'Vaqtincha band',
  OVERDUE: "Muddati o'tgan",
  LEFT: 'Ketdi-aniqlashga',
  CANCELLED: 'Bekor qildi',
  INACTIVE: 'Nofaol',
  DRAFT: 'Qoralama',
  OTHER: 'Boshqa',
};
const ATT_LABEL: Record<string, string> = { PRESENT: 'Bor', LATE: 'Kechikdi', ABSENT: "Yo'q", EXCUSED: 'Sababli' };
const fmtD = (d: Date | string) => ymd(new Date(d));
/** "2026-09-22" → "22.09.2026"; oraliq bir kun bo'lsa — bitta sana */
const dmy = (s: string) => s.slice(0, 10).split('-').reverse().join('.');
const span = (f: string, t: string) => (f === t ? dmy(f) : `${dmy(f)} — ${dmy(t)}`);

@Injectable()
export class DashboardDetailService {
  constructor(
    private prisma: PrismaService,
    private registers: RegistersService,
    private q: DashboardQueries,
  ) {}

  private out(title: string, columns: Col[], rows: Row[], extra: Partial<DetailResult> = {}): DetailResult {
    return { title, columns, rows: rows.slice(0, LIMIT), total: rows.length, truncated: rows.length > LIMIT, ...extra };
  }

  async detail(
    kindIn: string,
    query: { from?: string; to?: string; branchId?: string; key?: string; classId?: string },
  ): Promise<DetailResult> {
    const c = resolveCtx(query);
    const b = c.branchId;
    let kind = kindIn;
    let key = query.key ?? '';
    // O'quv jarayoni sinf filtri: "barcha sinflar" ro'yxatlari shu sinf o'quvchilariga aylanadi
    const classId = query.classId || undefined;
    const TO_CLASS: Record<string, string> = { 'attendance-classes': 'attendance-class', 'grades-classes': 'grades-class', coins: 'coins-class' };
    if (classId && TO_CLASS[kind]) {
      kind = TO_CLASS[kind];
      key = classId;
    }
    const period = span(c.from, c.to);

    switch (kind) {
      // ===================== BUGUNGI HOLAT =====================
      case 'cash': {
        const { registers } = await this.registers.list({ branchId: b });
        const rows = registers
          .map((r: any) => ({
            name: r.name,
            branch: r.branch ?? '—',
            kassa: r.kassaTuri ?? 'Moliya kassa',
            currency: r.currency === 'USD' ? 'USD' : "so'm",
            balance: round(r.storedBalance, 2),
            pending: round(r.pendingNet, 2),
            _href: `/accounts/${r.type}/${r.id}`,
            _tone: r.active === false ? 'muted' : undefined,
          }))
          .sort((x, y) => (x.currency === y.currency ? y.balance - x.balance : x.currency === "so'm" ? -1 : 1));
        const som = registers.filter((r: any) => r.currency !== 'USD');
        const usd = registers.filter((r: any) => r.currency === 'USD');
        return this.out(
          "Kassa qoldig'i",
          [
            { key: 'name', label: 'Hisob' },
            { key: 'branch', label: 'Filial' },
            { key: 'kassa', label: 'Turi' },
            { key: 'currency', label: 'Valyuta' },
            { key: 'balance', label: 'Qoldiq', type: 'num' },
            { key: 'pending', label: 'Tasdiq kutmoqda', type: 'num' },
          ],
          rows,
          {
            subtitle: "Hisoblar bo'limidagi joriy qoldiqlar · bugungi holat",
            summary: [
              { label: "Jami so'm", value: round(som.reduce((s: number, r: any) => s + r.storedBalance, 0)), type: 'money' },
              { label: 'Jami USD', value: round(usd.reduce((s: number, r: any) => s + r.storedBalance, 0), 2), type: 'num' },
              { label: "So'm, tasdiq kutmoqda", value: round(som.reduce((s: number, r: any) => s + r.pendingNet, 0)), type: 'money' },
            ],
          },
        );
      }

      case 'receivables': {
        const recv = await this.q.receivableRows(b);
        const rows = recv
          .filter((r) => r.overdue > 0)
          .filter((r) => !key || (key === '3' ? r.overdueMonths >= 3 : String(Math.max(1, r.overdueMonths)) === key))
          .sort((x, y) => y.overdue - x.overdue)
          .map((r) => ({
            student: fullName(r),
            cls: r.className ?? '—',
            number: r.number,
            months: r.overdueMonths,
            overdue: round(r.overdue),
            debt: round(r.debt),
            _href: `/contracts/${r.contractId}`,
          }));
        const bucket = key === '3' ? " · 3 oy va undan ko'p" : key ? ` · ${key} oy` : '';
        return this.out(
          `Muddati o'tgan qarzdorlik${bucket}`,
          [
            { key: 'student', label: "O'quvchi" },
            { key: 'cls', label: 'Sinf' },
            { key: 'number', label: 'Shartnoma' },
            { key: 'months', label: 'Oy', type: 'int' },
            { key: 'overdue', label: "Muddati o'tgan", type: 'money' },
            { key: 'debt', label: 'Jami qarz', type: 'money' },
          ],
          rows,
          {
            subtitle: "Qarzdorlar bo'limi qoidasi: to'lov kuni o'tgan va to'lanmagan oylar · bugungi holat",
            summary: [
              { label: "Muddati o'tgan", value: rows.reduce((s, r) => s + (r.overdue as number), 0), type: 'money' },
              { label: 'Shartnoma', value: rows.length, type: 'int' },
            ],
          },
        );
      }

      case 'suppliers': {
        const docs = await this.q.expenseDocs(b);
        const m = new Map<string, { name: string; purchase: number; paid: number; docs: number }>();
        for (const d of docs) {
          const x = m.get(d.supplierId) ?? { name: d.supplierName, purchase: 0, paid: 0, docs: 0 };
          x.purchase += d.total;
          x.paid += d.paid;
          x.docs++;
          m.set(d.supplierId, x);
        }
        const rows = [...m.entries()]
          .map(([id, x]) => {
            const rem = x.purchase - x.paid;
            return {
              name: x.name,
              docs: x.docs,
              purchase: round(x.purchase),
              paid: round(x.paid),
              qarz: rem > 0.5 ? round(rem) : 0,
              avans: rem < -0.5 ? round(-rem) : 0,
              _href: `/expenses/suppliers/${id}`,
            };
          })
          .filter((r) => r.qarz || r.avans)
          .sort((x, y) => y.qarz - x.qarz || y.avans - x.avans);
        return this.out(
          "Ta'minotchilarga qarz",
          [
            { key: 'name', label: "Ta'minotchi" },
            { key: 'docs', label: 'Hujjat', type: 'int' },
            { key: 'purchase', label: 'Xarid', type: 'money' },
            { key: 'paid', label: "To'langan", type: 'money' },
            { key: 'qarz', label: 'Qarz', type: 'money' },
            { key: 'avans', label: 'Avans', type: 'money' },
          ],
          rows,
          { subtitle: "Har ta'minotchi bo'yicha xarid − to'lov · bugungi holat" },
        );
      }

      case 'supplier-aging':
      case 'expenses': {
        const docs = await this.q.expenseDocs(b);
        let list = docs;
        let title = 'Xarajat hujjatlari';
        if (kind === 'supplier-aging') {
          list = docs.filter((d) => d.remaining > 0.5 && (!key || (key === '31+' ? d.age > 30 : ageBucket(d.age) === key)));
          title = key === '31+' ? "30 kundan oshgan ta'minotchi qarzi" : `Ta'minotchi qarzi${key ? ` · ${key} kun` : ''}`;
        } else {
          const want = key === 'OPEN' || !key ? ['UNPAID', 'PARTIAL', 'EXCESS', 'INCOMPLETE'] : [key];
          list = docs.filter((d) => want.includes(d.status));
          title = key && key !== 'OPEN' ? `Xarajat hujjatlari · ${EXPENSE_STATUS_LABEL[key as keyof typeof EXPENSE_STATUS_LABEL] ?? key}` : 'Nazoratdagi xarajat hujjatlari';
        }
        const rows = list
          .sort((x, y) => y.age - x.age)
          .map((d) => ({
            number: d.number,
            supplier: d.supplierName,
            branch: d.branchName ?? '—',
            date: fmtD(d.date),
            age: d.age,
            total: round(d.total),
            paid: round(d.paid),
            remaining: round(d.remaining),
            status: EXPENSE_STATUS_LABEL[d.status],
            _href: `/expenses/suppliers/${d.supplierId}`,
          }));
        return this.out(
          title,
          [
            { key: 'number', label: '№', type: 'int' },
            { key: 'supplier', label: "Ta'minotchi" },
            { key: 'date', label: 'Sana', type: 'date' },
            { key: 'age', label: 'Kun', type: 'int' },
            { key: 'total', label: 'Jami', type: 'money' },
            { key: 'paid', label: "To'langan", type: 'money' },
            { key: 'remaining', label: 'Qoldiq', type: 'money' },
            { key: 'status', label: 'Holat', type: 'badge' },
          ],
          rows,
          {
            subtitle: 'Hujjat sanasidan beri o‘tgan kunlar · bugungi holat',
            summary: [{ label: 'Qoldiq jami', value: round(rows.reduce((s, r) => s + Math.max(0, r.remaining), 0)), type: 'money' }],
          },
        );
      }

      case 'external':
      case 'interbranch': {
        const inter = kind === 'interbranch';
        const cps = (await this.q.counterpartyBalances(b)).filter((x) => x.filiallararo === inter && Math.abs(x.balans) > 0.5);
        const rows = cps
          .sort((x, y) => Math.abs(y.balans) - Math.abs(x.balans))
          .map((x) => ({
            name: x.name,
            branch: x.branch ?? '—',
            kirim: round(x.kirim),
            chiqim: round(x.chiqim),
            balans: round(x.balans),
            holat: x.balans > 0 ? (inter ? 'Haqdor' : 'Bizga qarzdor') : inter ? 'Qarzdor' : 'Biz qarzdormiz',
            _href: `/cashflow/${x.id}`,
            _tone: x.balans > 0 ? 'good' : 'bad',
          }));
        return this.out(
          inter ? 'Filiallararo saldo' : 'Tashqi saldo',
          [
            { key: 'name', label: 'Kontragent' },
            { key: 'branch', label: 'Filial' },
            { key: 'kirim', label: 'Kirim (bizga)', type: 'money' },
            { key: 'chiqim', label: 'Chiqim (bizdan)', type: 'money' },
            { key: 'balans', label: 'Balans', type: 'money' },
            { key: 'holat', label: 'Holat', type: 'badge' },
          ],
          rows,
          { subtitle: "Tashqi pul oqimi · oldi-berdi balanslari (chiqim − kirim) · bugungi holat" },
        );
      }

      case 'enrolled': {
        const year = /^\d{4}-\d{4}$/.test(key) ? key : academicYearOf(c.today);
        const students = await this.prisma.student.findMany({
          where: this.q.enrolledWhere(year, b),
          select: {
            id: true,
            firstName: true,
            lastName: true,
            class: { select: { name: true } },
            branch: { select: { name: true } },
            contracts: { select: { status: true, number: true }, orderBy: { createdAt: 'desc' }, take: 1 },
          },
          orderBy: [{ class: { name: 'asc' } }, { lastName: 'asc' }],
        });
        const rows = students.map((s) => ({
          student: fullName(s),
          cls: s.class?.name ?? '—',
          branch: s.branch?.name ?? '—',
          contract: s.contracts[0]?.number ?? '—',
          status: STATUS_LABEL[s.contracts[0]?.status ?? ''] ?? '—',
          _href: `/students/${s.id}`,
        }));
        return this.out(
          `Yozilgan o'quvchilar · ${year}`,
          [
            { key: 'student', label: "O'quvchi" },
            { key: 'cls', label: 'Sinf' },
            { key: 'branch', label: 'Filial' },
            { key: 'contract', label: 'Oxirgi shartnoma' },
            { key: 'status', label: 'Holat', type: 'badge' },
          ],
          rows,
          { subtitle: "Faol, Band va Vaqtincha band shartnomali o'quvchilar · har biri bir marta" },
        );
      }

      case 'capacity': {
        const year = academicYearOf(c.today);
        const [classes, counts] = await Promise.all([
          this.prisma.class.findMany({
            where: { academicYear: year, status: { not: 'Arxiv' }, ...(b ? { branchId: b } : {}) },
            select: { id: true, name: true, capacity: true, language: true, branch: { select: { name: true } } },
          }),
          this.prisma.student.groupBy({ by: ['classId'], where: this.q.enrolledWhere(year, b), _count: { _all: true } }),
        ]);
        const cnt = new Map(counts.map((x) => [x.classId, x._count._all]));
        const rows = classes
          .map((cl) => {
            const n = cnt.get(cl.id) ?? 0;
            return {
              name: cl.language ? `${cl.name} (${cl.language})` : cl.name,
              branch: cl.branch?.name ?? '—',
              capacity: cl.capacity,
              enrolled: n,
              free: Math.max(0, cl.capacity - n),
              fill: pct(n, cl.capacity),
              _href: `/classes/${cl.id}`,
              _tone: n >= cl.capacity ? 'bad' : undefined,
            };
          })
          .sort((x, y) => y.fill - x.fill || x.name.localeCompare(y.name, 'uz', { numeric: true }));
        return this.out(
          `Sig'im · ${year}`,
          [
            { key: 'name', label: 'Sinf' },
            { key: 'branch', label: 'Filial' },
            { key: 'capacity', label: "O'rin", type: 'int' },
            { key: 'enrolled', label: 'Band', type: 'int' },
            { key: 'free', label: "Bo'sh", type: 'int' },
            { key: 'fill', label: 'Band %', type: 'pct' },
          ],
          rows,
          { subtitle: "Arxivlanmagan sinflar · yozilgan o'quvchilar bo'yicha" },
        );
      }

      case 'left': {
        const p = key === 'prev' ? c.prev : c;
        const list = await this.prisma.contract.findMany({
          where: this.q.leftWhere(p, b),
          select: {
            id: true,
            number: true,
            status: true,
            statusChangedAt: true,
            student: { select: { firstName: true, lastName: true, class: { select: { name: true } } } },
          },
          orderBy: { statusChangedAt: 'desc' },
        });
        const rows = list.map((x) => ({
          date: x.statusChangedAt ? fmtD(new Date(x.statusChangedAt.getTime() + 5 * 3600_000)) : '—',
          student: fullName(x.student),
          cls: x.student.class?.name ?? '—',
          number: x.number,
          status: STATUS_LABEL[x.status] ?? x.status,
          _href: `/contracts/${x.id}`,
        }));
        return this.out(
          `Ketganlar${key === 'prev' ? ' · oldingi davr' : ''}`,
          [
            { key: 'date', label: 'Sana', type: 'date' },
            { key: 'student', label: "O'quvchi" },
            { key: 'cls', label: 'Sinf' },
            { key: 'number', label: 'Shartnoma' },
            { key: 'status', label: 'Holat', type: 'badge' },
          ],
          rows,
          { subtitle: `${span(p.from, p.to)} · holati Bekor qildi / Ketdi-aniqlashga / Nofaol'ga o'zgargan shartnomalar` },
        );
      }

      // ===================== DAVR NATIJASI =====================
      case 'income':
      case 'pending': {
        const pending = kind === 'pending';
        const list = await this.prisma.payment.findMany({
          where: { ...this.q.paymentWhere(c, b), confirmedAt: pending ? null : { not: null } },
          select: {
            id: true,
            paidAt: true,
            amount: true,
            isRefund: true,
            method: true,
            type: true,
            contractId: true,
            studentId: true,
            student: { select: { firstName: true, lastName: true, class: { select: { name: true } } } },
            contract: { select: { number: true } },
          },
          orderBy: { paidAt: 'desc' },
        });
        const rows = list.map((p) => ({
          date: fmtD(p.paidAt),
          student: fullName(p.student),
          cls: p.student.class?.name ?? '—',
          contract: p.contract?.number ?? '—',
          method: [p.method, p.type].filter(Boolean).join(' · '),
          amount: p.isRefund ? -p.amount : p.amount,
          _href: p.contractId ? `/contracts/${p.contractId}` : `/students/${p.studentId}`,
          _tone: p.isRefund ? 'bad' : undefined,
        }));
        return this.out(
          pending ? "Tasdiq kutayotgan to'lovlar" : 'Tushum',
          [
            { key: 'date', label: 'Sana', type: 'date' },
            { key: 'student', label: "O'quvchi" },
            { key: 'cls', label: 'Sinf' },
            { key: 'contract', label: 'Shartnoma' },
            { key: 'method', label: "To'lov turi" },
            { key: 'amount', label: 'Summa', type: 'money' },
          ],
          rows,
          {
            subtitle: `${period} · ${pending ? "bank/karta to'lovlari tasdiqlanmagan" : "tasdiqlangan o'quvchi to'lovlari, qaytarishlar ayirilgan"}`,
            summary: [{ label: 'Jami', value: round(rows.reduce((s, r) => s + r.amount, 0)), type: 'money' }],
          },
        );
      }

      case 'expense-payments': {
        const list = await this.prisma.expensePayment.findMany({
          where: this.q.expensePaymentWhere(c, b),
          select: {
            paidAt: true,
            amount: true,
            dollarAmount: true,
            dollarRate: true,
            isRefund: true,
            method: true,
            expense: { select: { number: true, supplierId: true, supplier: { select: { name: true } }, branch: { select: { name: true } } } },
          },
          orderBy: { paidAt: 'desc' },
        });
        const rows = list.map((e) => {
          const v = somEq(e.amount, e.dollarAmount, e.dollarRate);
          return {
            date: fmtD(e.paidAt),
            supplier: e.expense.supplier.name,
            number: e.expense.number,
            branch: e.expense.branch?.name ?? '—',
            method: e.dollarAmount ? `${e.method} + $${e.dollarAmount}` : e.method,
            amount: round(e.isRefund ? -v : v),
            _href: `/expenses/suppliers/${e.expense.supplierId}`,
            _tone: e.isRefund ? 'good' : undefined,
          };
        });
        return this.out(
          "Xarajat to'lovlari",
          [
            { key: 'date', label: 'Sana', type: 'date' },
            { key: 'supplier', label: "Ta'minotchi" },
            { key: 'number', label: 'Hujjat №', type: 'int' },
            { key: 'branch', label: 'Filial' },
            { key: 'method', label: 'Kassa' },
            { key: 'amount', label: "Summa (so'mda)", type: 'money' },
          ],
          rows,
          {
            subtitle: `${period} · dollar qismi to'lov kursida, qaytarishlar ayirilgan`,
            summary: [{ label: 'Jami', value: round(rows.reduce((s, r) => s + r.amount, 0)), type: 'money' }],
          },
        );
      }

      case 'salaries': {
        const list = await this.prisma.salaryPayment.findMany({
          where: this.q.salaryWhere(c, b),
          select: {
            date: true,
            somAmount: true,
            dollarAmount: true,
            dollarRate: true,
            kassa: true,
            employeeId: true,
            employee: { select: { user: { select: { fullName: true } } } },
            branch: { select: { name: true } },
          },
          orderBy: { date: 'desc' },
        });
        const rows = list.map((s) => ({
          date: fmtD(s.date),
          employee: s.employee.user.fullName,
          branch: s.branch?.name ?? '—',
          kassa: s.dollarAmount ? `${s.kassa} + $${s.dollarAmount}` : s.kassa,
          amount: round(somEq(s.somAmount, s.dollarAmount, s.dollarRate)),
          _href: `/hr/${s.employeeId}`,
        }));
        return this.out(
          'Berilgan maosh',
          [
            { key: 'date', label: 'Sana', type: 'date' },
            { key: 'employee', label: 'Xodim' },
            { key: 'branch', label: 'Filial' },
            { key: 'kassa', label: 'Kassa' },
            { key: 'amount', label: "Summa (so'mda)", type: 'money' },
          ],
          rows,
          {
            subtitle: `${period} · to'lov sanasi bo'yicha`,
            summary: [{ label: 'Jami', value: round(rows.reduce((s, r) => s + r.amount, 0)), type: 'money' }],
          },
        );
      }

      case 'cashflow': {
        const [pays, exps, sals] = await Promise.all([
          this.prisma.payment.findMany({
            where: { ...this.q.paymentWhere(c, b), confirmedAt: { not: null } },
            select: { paidAt: true, amount: true, isRefund: true, contractId: true, studentId: true, student: { select: { firstName: true, lastName: true } } },
          }),
          this.prisma.expensePayment.findMany({
            where: this.q.expensePaymentWhere(c, b),
            select: { paidAt: true, amount: true, dollarAmount: true, dollarRate: true, isRefund: true, expense: { select: { supplierId: true, supplier: { select: { name: true } } } } },
          }),
          this.prisma.salaryPayment.findMany({
            where: this.q.salaryWhere(c, b),
            select: { date: true, somAmount: true, dollarAmount: true, dollarRate: true, employeeId: true, employee: { select: { user: { select: { fullName: true } } } } },
          }),
        ]);
        const rows: (Row & { _t: number; amount: number })[] = [
          ...pays.map((p) => ({
            _t: p.paidAt.getTime(),
            date: fmtD(p.paidAt),
            type: 'Tushum',
            name: fullName(p.student),
            amount: p.isRefund ? -p.amount : p.amount,
            _href: p.contractId ? `/contracts/${p.contractId}` : `/students/${p.studentId}`,
            _tone: 'good',
          })),
          ...exps.map((e) => {
            const v = somEq(e.amount, e.dollarAmount, e.dollarRate);
            return {
              _t: e.paidAt.getTime(),
              date: fmtD(e.paidAt),
              type: 'Xarajat',
              name: e.expense.supplier.name,
              amount: round(e.isRefund ? v : -v),
              _href: `/expenses/suppliers/${e.expense.supplierId}`,
              _tone: 'bad',
            };
          }),
          ...sals.map((s) => ({
            _t: s.date.getTime(),
            date: fmtD(s.date),
            type: 'Maosh',
            name: s.employee.user.fullName,
            amount: -round(somEq(s.somAmount, s.dollarAmount, s.dollarRate)),
            _href: `/hr/${s.employeeId}`,
            _tone: 'bad',
          })),
        ].sort((x, y) => y._t - x._t);
        const inc = rows.filter((r) => r.type === 'Tushum').reduce((s, r) => s + r.amount, 0);
        const outf = rows.filter((r) => r.type !== 'Tushum').reduce((s, r) => s - r.amount, 0);
        return this.out(
          `Pul oqimi · ${period}`,
          [
            { key: 'date', label: 'Sana', type: 'date' },
            { key: 'type', label: 'Turi', type: 'badge' },
            { key: 'name', label: 'Kim / kimga' },
            { key: 'amount', label: 'Summa', type: 'money' },
          ],
          rows.map(({ _t, ...r }) => r),
          {
            subtitle: 'Tasdiqlangan tushum, xarajat to‘lovlari va maoshlar',
            summary: [
              { label: 'Tushum', value: round(inc), type: 'money' },
              { label: 'Chiqim', value: round(outf), type: 'money' },
              { label: 'Natija', value: round(inc - outf), type: 'money' },
            ],
          },
        );
      }

      case 'new-contracts': {
        const list = await this.prisma.contract.findMany({
          where: {
            createdAt: { gte: instantStart(c.from), lte: instantEnd(c.to) },
            ...(b ? { student: { branchId: b } } : {}),
          },
          select: {
            id: true,
            number: true,
            createdAt: true,
            status: true,
            category: true,
            type: true,
            student: { select: { firstName: true, lastName: true, class: { select: { name: true } } } },
            installments: { select: { amount: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
        const rows = list.map((x) => ({
          date: fmtD(new Date(x.createdAt.getTime() + 5 * 3600_000)),
          number: x.number,
          student: fullName(x.student),
          cls: x.student.class?.name ?? '—',
          type: x.category ?? (x.type === 'YEARLY' ? 'Yillik' : 'Oylik'),
          status: STATUS_LABEL[x.status] ?? x.status,
          payable: round(x.installments.reduce((s, i) => s + i.amount, 0)),
          _href: `/contracts/${x.id}`,
        }));
        return this.out(
          'Yangi shartnomalar',
          [
            { key: 'date', label: 'Sana', type: 'date' },
            { key: 'number', label: 'Raqam' },
            { key: 'student', label: "O'quvchi" },
            { key: 'cls', label: 'Sinf' },
            { key: 'type', label: 'Turi' },
            { key: 'status', label: 'Holat', type: 'badge' },
            { key: 'payable', label: "To'lanadigan", type: 'money' },
          ],
          rows,
          { subtitle: period, summary: [{ label: "To'lanadigan jami", value: round(rows.reduce((s, r) => s + r.payable, 0)), type: 'money' }] },
        );
      }

      case 'leads': {
        const list = await this.prisma.lead.findMany({
          where: {
            createdAt: { gte: instantStart(c.from), lte: instantEnd(c.to) },
            ...(b ? { branchId: b } : {}),
          },
          select: { id: true, fullName: true, source: true, createdAt: true, convertedAt: true, stage: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        });
        const rows = list.map((l) => ({
          date: fmtD(new Date(l.createdAt.getTime() + 5 * 3600_000)),
          name: l.fullName,
          source: l.source ?? '—',
          stage: l.stage?.name ?? '—',
          converted: l.convertedAt ? 'Ha' : '',
          _href: `/crm/${l.id}`,
        }));
        return this.out(
          'Yangi murojaatlar',
          [
            { key: 'date', label: 'Sana', type: 'date' },
            { key: 'name', label: 'Talaba' },
            { key: 'source', label: 'Manba' },
            { key: 'stage', label: 'Bosqich', type: 'badge' },
            { key: 'converted', label: 'Shartnoma' },
          ],
          rows,
          { subtitle: period },
        );
      }

      // ===================== O'QUV JARAYONI =====================
      case 'attendance-classes': {
        const rows0 = await this.prisma.attendance.groupBy({
          by: ['classId', 'status'],
          where: this.q.attendanceWhere(c, b),
          _count: { _all: true },
        });
        const m = new Map<string, ReturnType<typeof attBlank>>();
        for (const r of rows0) {
          if (!r.classId) continue;
          const a = m.get(r.classId) ?? attBlank();
          attAdd(a, r.status, r._count._all);
          m.set(r.classId, a);
        }
        const names = await this.prisma.class.findMany({ where: { id: { in: [...m.keys()] } }, select: { id: true, name: true } });
        const nameOf = new Map(names.map((x) => [x.id, x.name]));
        const rows = [...m.entries()]
          .map(([id, a]) => ({
            name: nameOf.get(id) ?? '—',
            rate: attRate(a),
            present: a.present,
            late: a.late,
            absent: a.absent,
            excused: a.excused,
            _drill: `attendance-class:${id}`,
            _tone: attRate(a) < 85 ? 'bad' : undefined,
          }))
          .sort((x, y) => x.rate - y.rate);
        return this.out(
          'Davomat · sinflar',
          [
            { key: 'name', label: 'Sinf' },
            { key: 'rate', label: 'Davomat', type: 'pct' },
            { key: 'present', label: 'Bor', type: 'int' },
            { key: 'late', label: 'Kechikdi', type: 'int' },
            { key: 'absent', label: "Yo'q", type: 'int' },
            { key: 'excused', label: 'Sababli', type: 'int' },
          ],
          rows,
          { subtitle: `${period} · sababli kunlar hisobga olinmaydi` },
        );
      }

      case 'attendance-class': {
        const cls = await this.prisma.class.findUnique({ where: { id: key }, select: { name: true } });
        if (!cls) throw new BadRequestException('Sinf topilmadi');
        const rows0 = await this.prisma.attendance.groupBy({
          by: ['studentId', 'status'],
          where: { ...this.q.attendanceWhere(c, b), classId: key },
          _count: { _all: true },
        });
        const m = new Map<string, ReturnType<typeof attBlank>>();
        for (const r of rows0) {
          const a = m.get(r.studentId) ?? attBlank();
          attAdd(a, r.status, r._count._all);
          m.set(r.studentId, a);
        }
        const students = await this.prisma.student.findMany({ where: { id: { in: [...m.keys()] } }, select: { id: true, firstName: true, lastName: true } });
        const rows = students
          .map((s) => {
            const a = m.get(s.id)!;
            return { student: fullName(s), rate: attRate(a), present: a.present, late: a.late, absent: a.absent, excused: a.excused, _href: `/students/${s.id}` };
          })
          .sort((x, y) => x.rate - y.rate || y.absent - x.absent);
        return this.out(
          `Davomat · ${cls.name}`,
          [
            { key: 'student', label: "O'quvchi" },
            { key: 'rate', label: 'Davomat', type: 'pct' },
            { key: 'present', label: 'Bor', type: 'int' },
            { key: 'late', label: 'Kechikdi', type: 'int' },
            { key: 'absent', label: "Yo'q", type: 'int' },
            { key: 'excused', label: 'Sababli', type: 'int' },
          ],
          rows,
          { subtitle: period },
        );
      }

      case 'attendance-day': {
        const list = await this.prisma.attendance.findMany({
          where: { ...this.q.attendanceWhere(c, b, classId), status: { not: 'PRESENT' } },
          select: {
            date: true,
            status: true,
            note: true,
            student: { select: { id: true, firstName: true, lastName: true } },
            class: { select: { name: true } },
          },
          orderBy: [{ date: 'desc' }, { status: 'asc' }],
        });
        const rows = list.map((a) => ({
          date: fmtD(a.date),
          student: fullName(a.student),
          cls: a.class?.name ?? '—',
          status: ATT_LABEL[a.status] ?? a.status,
          note: a.note ?? '',
          _href: `/students/${a.student.id}`,
          _tone: a.status === 'ABSENT' ? 'bad' : undefined,
        }));
        return this.out(
          `Kelmagan va kechikkanlar · ${period}`,
          [
            { key: 'date', label: 'Sana', type: 'date' },
            { key: 'student', label: "O'quvchi" },
            { key: 'cls', label: 'Sinf' },
            { key: 'status', label: 'Holat', type: 'badge' },
            { key: 'note', label: 'Izoh' },
          ],
          rows,
        );
      }

      case 'grades-classes':
      case 'grades-subject': {
        const subject = kind === 'grades-subject' ? await this.prisma.subject.findUnique({ where: { id: key }, select: { name: true } }) : null;
        if (kind === 'grades-subject' && !subject) throw new BadRequestException('Fan topilmadi');
        if (subject && classId) {
          // Sinf tanlangan: shu fan bo'yicha sinf o'quvchilari
          const g = await this.prisma.grade.groupBy({
            by: ['studentId'],
            where: { ...this.q.gradeWhere(c, b, classId), subjectId: key },
            _avg: { value: true },
            _count: { _all: true },
          });
          const st = await this.prisma.student.findMany({ where: { id: { in: g.map((x) => x.studentId) } }, select: { id: true, firstName: true, lastName: true } });
          const sm = new Map(st.map((x) => [x.id, x]));
          const rows = g
            .filter((x) => sm.has(x.studentId))
            .map((x) => ({ student: fullName(sm.get(x.studentId)!), average: round(x._avg.value ?? 0, 2), count: x._count._all, _href: `/students/${x.studentId}` }))
            .sort((x, y) => x.average - y.average);
          return this.out(
            `Baholar · ${subject.name}`,
            [
              { key: 'student', label: "O'quvchi" },
              { key: 'average', label: "O'rtacha", type: 'num' },
              { key: 'count', label: 'Baholar', type: 'int' },
            ],
            rows,
            { subtitle: period },
          );
        }
        const list = await this.prisma.$queryRaw<{ id: string; name: string; average: number; count: number; fives: number; fails: number }[]>`
          SELECT s."classId" AS id, cl.name, AVG(g.value)::float8 AS average, COUNT(*)::int AS count,
            (COUNT(*) FILTER (WHERE g.value >= 4.5))::int AS fives, (COUNT(*) FILTER (WHERE g.value < 3))::int AS fails
          FROM grades g
          JOIN students s ON s.id = g."studentId"
          JOIN classes cl ON cl.id = s."classId"
          WHERE g.date >= ${dayStart(c.from)} AND g.date <= ${dayEnd(c.to)}
            AND g.type::text IN (${Prisma.join(GRADE_TYPES)})
            AND g.value BETWEEN ${GRADE_MIN} AND ${GRADE_MAX}
            ${subject ? Prisma.sql`AND g."subjectId" = ${key}` : Prisma.empty}
            ${b ? Prisma.sql`AND s."branchId" = ${b}` : Prisma.empty}
          GROUP BY s."classId", cl.name`;
        const rows = list
          .map((x) => ({
            name: x.name,
            average: round(x.average, 2),
            count: x.count,
            excellent: pct(x.fives, x.count),
            fail: pct(x.fails, x.count),
            _drill: subject ? undefined : `grades-class:${x.id}`,
            _href: subject ? `/classes/${x.id}` : undefined,
            _tone: x.average < 3.5 ? 'bad' : undefined,
          }))
          .sort((x, y) => x.average - y.average);
        return this.out(
          subject ? `Baholar · ${subject.name}` : 'Baholar · sinflar',
          [
            { key: 'name', label: 'Sinf' },
            { key: 'average', label: "O'rtacha", type: 'num' },
            { key: 'count', label: 'Baholar', type: 'int' },
            { key: 'excellent', label: '5 lar', type: 'pct' },
            { key: 'fail', label: '2 va past', type: 'pct' },
          ],
          rows,
          { subtitle: `${period} · kundalik, uy vazifasi va imtihon baholari` },
        );
      }

      case 'grades-class':
      case 'grades-value': {
        const cls = kind === 'grades-class' ? await this.prisma.class.findUnique({ where: { id: key }, select: { name: true } }) : null;
        if (kind === 'grades-class' && !cls) throw new BadRequestException('Sinf topilmadi');
        const v = Number(key);
        if (kind === 'grades-value' && !(v >= 1 && v <= 5)) throw new BadRequestException("Baho 1–5 bo'lishi kerak");
        const where: Prisma.GradeWhereInput = {
          ...this.q.gradeWhere(c, b, cls ? key : classId),
          ...(kind === 'grades-value' ? { value: { gte: v - 0.5, lt: v + 0.5 } } : {}),
        };
        const g = await this.prisma.grade.groupBy({ by: ['studentId'], where, _avg: { value: true }, _count: { _all: true } });
        const students = await this.prisma.student.findMany({
          where: { id: { in: g.map((x) => x.studentId) } },
          select: { id: true, firstName: true, lastName: true, class: { select: { name: true } } },
        });
        const sm = new Map(students.map((s) => [s.id, s]));
        const rows = g
          .filter((x) => sm.has(x.studentId))
          .map((x) => {
            const s = sm.get(x.studentId)!;
            return {
              student: fullName(s),
              cls: s.class?.name ?? '—',
              average: round(x._avg.value ?? 0, 2),
              count: x._count._all,
              _href: `/students/${s.id}`,
            };
          })
          .sort((x, y) => (kind === 'grades-value' ? y.count - x.count : x.average - y.average));
        return this.out(
          cls ? `Baholar · ${cls.name}` : `"${v}" baho olganlar`,
          kind === 'grades-value'
            ? [
                { key: 'student', label: "O'quvchi" },
                { key: 'cls', label: 'Sinf' },
                { key: 'count', label: `"${v}" soni`, type: 'int' },
              ]
            : [
                { key: 'student', label: "O'quvchi" },
                { key: 'average', label: "O'rtacha", type: 'num' },
                { key: 'count', label: 'Baholar', type: 'int' },
              ],
          rows,
          { subtitle: period },
        );
      }

      case 'coins':
      case 'coins-class': {
        const where: Prisma.CoinRecordWhereInput = {
          ...this.q.coinWhere(c, b, kind === 'coins-class' ? key : undefined),
        };
        const [plus, minus] = await Promise.all([
          this.prisma.coinRecord.groupBy({ by: ['studentId'], where: { ...where, amount: { gt: 0 } }, _sum: { amount: true } }),
          this.prisma.coinRecord.groupBy({ by: ['studentId'], where: { ...where, amount: { lt: 0 } }, _sum: { amount: true } }),
        ]);
        const m = new Map<string, { earned: number; spent: number }>();
        for (const x of plus) m.set(x.studentId, { earned: x._sum.amount ?? 0, spent: 0 });
        for (const x of minus) m.set(x.studentId, { earned: m.get(x.studentId)?.earned ?? 0, spent: -(x._sum.amount ?? 0) });
        const students = await this.prisma.student.findMany({
          where: { id: { in: [...m.keys()] } },
          select: { id: true, firstName: true, lastName: true, class: { select: { name: true } } },
        });
        const clsName = kind === 'coins-class' ? (await this.prisma.class.findUnique({ where: { id: key }, select: { name: true } }))?.name : null;
        const rows = students
          .map((s) => {
            const x = m.get(s.id)!;
            return { student: fullName(s), cls: s.class?.name ?? '—', earned: x.earned, spent: x.spent, net: x.earned - x.spent, _href: `/students/${s.id}` };
          })
          .sort((x, y) => y.net - x.net);
        return this.out(
          clsName ? `Coin · ${clsName}` : 'Coin · o‘quvchilar',
          [
            { key: 'student', label: "O'quvchi" },
            { key: 'cls', label: 'Sinf' },
            { key: 'earned', label: "Qo'shildi", type: 'int' },
            { key: 'spent', label: 'Ayirildi', type: 'int' },
            { key: 'net', label: 'Natija', type: 'int' },
          ],
          rows,
          { subtitle: period },
        );
      }

      case 'behavior':
      case 'behavior-class': {
        const month = c.to.slice(0, 7);
        const { start, end } = monthRange(month);
        const students = await this.prisma.student.findMany({
          where: {
            status: 'ACTIVE',
            classId: kind === 'behavior-class' ? key : classId ?? { not: null },
            ...(b ? { branchId: b } : {}),
          },
          select: { id: true, firstName: true, lastName: true, class: { select: { name: true } } },
        });
        const ded = await this.prisma.behaviorRecord.groupBy({
          by: ['studentId'],
          where: { type: 'NEGATIVE', studentId: { in: students.map((s) => s.id) }, date: { gte: start, lt: end } },
          _sum: { points: true },
          _count: { _all: true },
        });
        const dm = new Map(ded.map((x) => [x.studentId, x]));
        const L = MONTHLY_BEHAVIOR_POINTS;
        const inBucket = (rem: number) =>
          !key || kind === 'behavior-class' || key === 'all'
            ? true
            : key === 'full'
              ? rem >= L
              : key === 'good'
                ? rem >= 80 && rem < L
                : key === 'mid'
                  ? rem >= 50 && rem < 80
                  : rem < 50;
        const rows = students
          .map((s) => {
            const d = dm.get(s.id);
            const deducted = Math.min(L, d?._sum.points ?? 0);
            const remaining = L - deducted;
            return {
              student: fullName(s),
              cls: s.class?.name ?? '—',
              remaining,
              deducted,
              records: d?._count._all ?? 0,
              _href: `/students/${s.id}`,
              _tone: remaining < 50 ? 'bad' : remaining < 80 ? 'warn' : undefined,
            };
          })
          .filter((r) => inBucket(r.remaining))
          .sort((x, y) => x.remaining - y.remaining || x.student.localeCompare(y.student));
        const BUCKET: Record<string, string> = { full: '100 (toza)', good: '80–99', mid: '50–79', low: '0–49' };
        const clsName = kind === 'behavior-class' ? students[0]?.class?.name ?? '' : '';
        return this.out(
          kind === 'behavior-class' ? `Ahloq · ${clsName}` : `Ahloqiy ball${BUCKET[key] ? ` · ${BUCKET[key]}` : ''}`,
          [
            { key: 'student', label: "O'quvchi" },
            { key: 'cls', label: 'Sinf' },
            { key: 'remaining', label: `Ball (/${L})`, type: 'int' },
            { key: 'deducted', label: 'Ayirilgan', type: 'int' },
            { key: 'records', label: 'Yozuvlar', type: 'int' },
          ],
          rows,
          { subtitle: `${monthLabel(month)} · har o'quvchiga oyiga ${L} ball` },
        );
      }

      default:
        throw new BadRequestException("Noma'lum ko'rsatkich");
    }
  }
}

