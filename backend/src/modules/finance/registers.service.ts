import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type Dir = 'IN' | 'OUT';
export interface Movement {
  date: Date;
  source: string;
  label: string;
  direction: Dir;
  amount: number; // musbat, register valyutasida
  currency: string; // SOM | USD
  confirmed: boolean;
  refType: string;
  refId: string;
  counterparty: string;
  note: string | null;
  runningBalance?: number;
}

const dayFromStr = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00.000Z`);
const dayEnd = (s: string) => new Date(`${s.slice(0, 10)}T23:59:59.999Z`);

@Injectable()
export class RegistersService {
  constructor(private prisma: PrismaService) {}

  /** Barcha kassalar (Account + FlowAccount) birlashtirilgan ro'yxati */
  async list(params: { type?: string; branchId?: string; active?: string }) {
    const out: any[] = [];
    if (params.type !== 'FLOW') {
      const accs = await this.prisma.account.findMany({ orderBy: { name: 'asc' } });
      for (const a of accs) {
        out.push({ id: a.id, type: 'ACCOUNT', name: a.name, currency: 'SOM', kassaTuri: null, branch: null, branchId: null, storedBalance: a.balance, active: true });
      }
    }
    if (params.type !== 'ACCOUNT') {
      const flows = await this.prisma.flowAccount.findMany({ include: { branch: { select: { name: true } } }, orderBy: { name: 'asc' } });
      for (const f of flows) {
        if (params.branchId && f.branchId !== params.branchId) continue;
        if (params.active === 'true' && !f.active) continue;
        if (params.active === 'false' && f.active) continue;
        out.push({ id: f.id, type: 'FLOW', name: f.name, currency: f.currency === 'USD' ? 'USD' : 'SOM', kassaTuri: f.kassaTuri, branch: f.branch?.name ?? null, branchId: f.branchId, storedBalance: f.balance, active: f.active });
      }
    }
    const totals = { somBalance: 0, usdBalance: 0, count: out.length };
    for (const r of out) (r.currency === 'USD' ? (totals.usdBalance += r.storedBalance) : (totals.somBalance += r.storedBalance));
    return { registers: out, totals };
  }

  /** Bitta kassaning BARCHA harakatlari (sana bo'yicha o'sish) */
  private async movements(type: string, id: string, currency: string): Promise<Movement[]> {
    const mv: Movement[] = [];
    const usd = currency === 'USD';

    if (type === 'ACCOUNT') {
      // Maktab to'lovlari (so'm)
      const pays = await this.prisma.payment.findMany({ where: { accountId: id }, include: { student: { select: { firstName: true, lastName: true } } } });
      for (const p of pays) mv.push({ date: p.paidAt, source: 'SCHOOL_PAYMENT', label: p.isRefund ? "Maktab to'lovi qaytarish" : "Maktab to'lovi", direction: p.isRefund ? 'OUT' : 'IN', amount: p.amount, currency: 'SOM', confirmed: p.confirmedAt != null, refType: 'Payment', refId: p.id, counterparty: p.student ? `${p.student.lastName} ${p.student.firstName}` : '—', note: p.note });
      // Xarajat to'lovlari — so'm legi (accountId) + valyuta legi (dollarAccountId, so'm-ekvivalent)
      const somExp = await this.prisma.expensePayment.findMany({ where: { accountId: id } });
      for (const e of somExp) mv.push({ date: e.paidAt, source: 'EXPENSE', label: e.isRefund ? 'Xarajat qaytarish' : 'Xarajat to\'lovi', direction: e.isRefund ? 'IN' : 'OUT', amount: e.amount, currency: 'SOM', confirmed: true, refType: 'ExpensePayment', refId: e.id, counterparty: '—', note: e.note });
      const dolExp = await this.prisma.expensePayment.findMany({ where: { dollarAccountId: id } });
      for (const e of dolExp) mv.push({ date: e.paidAt, source: 'EXPENSE', label: 'Xarajat (valyuta)', direction: e.isRefund ? 'IN' : 'OUT', amount: (e.dollarAmount ?? 0) * (e.dollarRate ?? 0), currency: 'SOM', confirmed: true, refType: 'ExpensePayment', refId: e.id, counterparty: '—', note: e.note });
      // Moliya tranzaksiyalari (kirim/chiqim/investitsiya/ichki o'tkazma)
      const txs = await this.prisma.transaction.findMany({ where: { accountId: id } });
      for (const t of txs) {
        let dir: Dir = 'IN'; let label = 'Kirim';
        if (t.type === 'EXPENSE') { dir = 'OUT'; label = 'Chiqim'; }
        else if (t.type === 'INVESTMENT') { dir = 'IN'; label = 'Investitsiya'; }
        else if (t.type === 'TRANSFER') { dir = (t.description ?? '').startsWith('→') ? 'OUT' : 'IN'; label = "Ichki o'tkazma"; }
        mv.push({ date: t.date, source: 'FIN_TX', label, direction: dir, amount: t.amount, currency: 'SOM', confirmed: true, refType: 'Transaction', refId: t.id, counterparty: t.description ?? '—', note: t.description });
      }
    } else {
      // FLOW
      // Maosh (chiqim)
      const salSom = await this.prisma.salaryPayment.findMany({ where: { somAccountId: id }, include: { employee: { include: { user: { select: { fullName: true } } } } } });
      for (const s of salSom) mv.push({ date: s.date, source: 'SALARY', label: 'Maosh', direction: 'OUT', amount: s.somAmount, currency: 'SOM', confirmed: true, refType: 'SalaryPayment', refId: s.id, counterparty: s.employee?.user?.fullName ?? '—', note: s.note });
      const salDol = await this.prisma.salaryPayment.findMany({ where: { dollarAccountId: id }, include: { employee: { include: { user: { select: { fullName: true } } } } } });
      for (const s of salDol) mv.push({ date: s.date, source: 'SALARY', label: 'Maosh (valyuta)', direction: 'OUT', amount: s.dollarAmount ?? 0, currency: 'USD', confirmed: true, refType: 'SalaryPayment', refId: s.id, counterparty: s.employee?.user?.fullName ?? '—', note: s.note });
      // Ichki/filiallararo o'tkazma
      const itFrom = await this.prisma.internalTransfer.findMany({ where: { fromAccountId: id }, include: { toAccount: { select: { name: true } } } });
      for (const t of itFrom) mv.push({ date: t.date, source: 'INTERNAL_TRANSFER', label: "Ichki o'tkazma", direction: 'OUT', amount: usd ? (t.dollarAmount ?? 0) : (t.somAmount ?? 0), currency, confirmed: t.confirmedAt != null, refType: 'InternalTransfer', refId: t.id, counterparty: t.toAccount?.name ?? '—', note: t.note });
      const itTo = await this.prisma.internalTransfer.findMany({ where: { toAccountId: id }, include: { fromAccount: { select: { name: true } } } });
      for (const t of itTo) mv.push({ date: t.date, source: 'INTERNAL_TRANSFER', label: "Ichki o'tkazma", direction: 'IN', amount: usd ? (t.dollarAmount ?? 0) : (t.somAmount ?? 0), currency, confirmed: t.confirmedAt != null, refType: 'InternalTransfer', refId: t.id, counterparty: t.fromAccount?.name ?? '—', note: t.note });
      // Oldi-berdi / investitsiya (kontragent)
      const cpSom = await this.prisma.counterpartyEntry.findMany({ where: { somFlowAccountId: id }, include: { counterparty: { select: { name: true } } } });
      for (const c of cpSom) mv.push({ date: c.date, source: 'COUNTERPARTY', label: this.cpLabel(c), direction: c.direction === 'IN' ? 'IN' : 'OUT', amount: c.somAmount ?? 0, currency: 'SOM', confirmed: c.confirmedAt != null, refType: 'CounterpartyEntry', refId: c.id, counterparty: c.counterparty?.name ?? '—', note: c.note });
      const cpDol = await this.prisma.counterpartyEntry.findMany({ where: { dollarFlowAccountId: id }, include: { counterparty: { select: { name: true } } } });
      for (const c of cpDol) mv.push({ date: c.date, source: 'COUNTERPARTY', label: this.cpLabel(c) + ' (valyuta)', direction: c.direction === 'IN' ? 'IN' : 'OUT', amount: c.dollarAmount ?? 0, currency: 'USD', confirmed: c.confirmedAt != null, refType: 'CounterpartyEntry', refId: c.id, counterparty: c.counterparty?.name ?? '—', note: c.note });
    }

    mv.sort((a, b) => a.date.getTime() - b.date.getTime());
    return mv;
  }

  private cpLabel(c: any) {
    const dir = c.direction === 'IN' ? '(kirim)' : '(chiqim)';
    if (c.transferPairId) return 'Kontragent transfer ' + dir;
    if (c.investType) return 'Investitsiya ' + dir;
    return 'Oldi-berdi ' + dir;
  }

  /** Kassa DETAL oynasi — kirim/chiqim manbalari + tranzaksiyalar + davr balansi */
  async detail(type: string, id: string, params: { from?: string; to?: string; limit?: number }) {
    let reg: any;
    if (type === 'ACCOUNT') {
      const a = await this.prisma.account.findUnique({ where: { id } });
      if (!a) throw new NotFoundException('Kassa topilmadi');
      reg = { id: a.id, type: 'ACCOUNT', name: a.name, currency: 'SOM', kassaTuri: null, branch: null, storedBalance: a.balance };
    } else {
      const f = await this.prisma.flowAccount.findUnique({ where: { id }, include: { branch: { select: { name: true } } } });
      if (!f) throw new NotFoundException('Kassa topilmadi');
      reg = { id: f.id, type: 'FLOW', name: f.name, currency: f.currency === 'USD' ? 'USD' : 'SOM', kassaTuri: f.kassaTuri, branch: f.branch?.name ?? null, storedBalance: f.balance };
    }

    const all = await this.movements(type, id, reg.currency);
    const totalNet = all.reduce((s, m) => s + (m.direction === 'IN' ? m.amount : -m.amount), 0);
    // opening — joriy balansdan barcha harakatlarni yechib (opening + Σ = storedBalance)
    const opening = reg.storedBalance - totalNet;

    // Yugurib boruvchi balans (barcha harakatlar bo'yicha)
    let run = opening;
    for (const m of all) { run += m.direction === 'IN' ? m.amount : -m.amount; m.runningBalance = run; }
    const liveBalance = run; // = storedBalance

    // Davr filtri
    const from = params.from ? dayFromStr(params.from) : null;
    const to = params.to ? dayEnd(params.to) : null;
    const inPeriod = (m: Movement) => (!from || m.date >= from) && (!to || m.date <= to);
    const period = all.filter(inPeriod);

    // Davr balansi
    const periodOpening = from ? opening + all.filter((m) => m.date < from).reduce((s, m) => s + (m.direction === 'IN' ? m.amount : -m.amount), 0) : opening;
    let totalIn = 0, totalOut = 0, pendingIn = 0, pendingOut = 0, confirmedNet = 0, allIn = 0, allOut = 0;
    for (const m of all) {
      const signed = m.direction === 'IN' ? m.amount : -m.amount;
      if (m.confirmed) confirmedNet += signed;
      else (m.direction === 'IN' ? (pendingIn += m.amount) : (pendingOut += m.amount));
      m.direction === 'IN' ? (allIn += m.amount) : (allOut += m.amount);
    }
    for (const m of period) (m.direction === 'IN' ? (totalIn += m.amount) : (totalOut += m.amount));

    // Manba breakdown (davr ichida)
    const inMap = new Map<string, { label: string; count: number; total: number }>();
    const outMap = new Map<string, { label: string; count: number; total: number }>();
    for (const m of period) {
      const map = m.direction === 'IN' ? inMap : outMap;
      const cur = map.get(m.label) ?? { label: m.label, count: 0, total: 0 };
      cur.count += 1; cur.total += m.amount; map.set(m.label, cur);
    }
    const incomeBreakdown = [...inMap.values()].sort((a, b) => b.total - a.total);
    const expenseBreakdown = [...outMap.values()].sort((a, b) => b.total - a.total);

    // Tranzaksiyalar — davr (yoki oxirgi), eng yangisi tepada, limit
    const limit = params.limit && params.limit > 0 ? params.limit : 300;
    const txList = [...period].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, limit);

    return {
      register: reg,
      period: { from: params.from ?? null, to: params.to ?? null },
      balances: {
        opening: periodOpening,
        totalIn,
        totalOut,
        closing: periodOpening + totalIn - totalOut,
        liveBalance,
        confirmedBalance: opening + confirmedNet,
        pendingIn,
        pendingOut,
        allIn,
        allOut,
      },
      incomeBreakdown,
      expenseBreakdown,
      transactions: txList,
      count: period.length,
    };
  }
}
