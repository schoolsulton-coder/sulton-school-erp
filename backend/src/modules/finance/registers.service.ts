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

  /** Bitta hisob uchun harakatlardan agregat (tasdiqlangan/pending/drift/oxirgi) */
  private async aggregate(
    type: 'ACCOUNT' | 'FLOW',
    id: string,
    currency: string,
    opening: number,
    storedBalance: number,
    asOfEnd: Date | null,
  ) {
    let mv = await this.movements(type, id, currency);
    if (asOfEnd) mv = mv.filter((m) => m.date <= asOfEnd);
    let confirmedNet = 0;
    let allNet = 0;
    let pendingIn = 0;
    let pendingOut = 0;
    let last: Date | null = null;
    for (const m of mv) {
      const signed = m.direction === 'IN' ? m.amount : -m.amount;
      allNet += signed;
      if (m.confirmed) confirmedNet += signed;
      else m.direction === 'IN' ? (pendingIn += m.amount) : (pendingOut += m.amount);
      if (!last || m.date > last) last = m.date;
    }
    const liveBalance = opening + allNet;
    const stored = asOfEnd ? liveBalance : storedBalance;
    return {
      confirmedBalance: opening + confirmedNet,
      pendingIn,
      pendingOut,
      pendingNet: pendingIn - pendingOut,
      storedBalance: stored,
      drift: asOfEnd ? 0 : Math.round((storedBalance - liveBalance) * 100) / 100,
      lastMovement: last ? last.toISOString() : null,
    };
  }

  /** Barcha kassalar (Account + FlowAccount) — boyitilgan balans ro'yxati */
  async list(params: {
    type?: string;
    branchId?: string;
    active?: string;
    kassaTuri?: string;
    currency?: string;
    mine?: string;
    userId?: string;
    asOf?: string;
  }) {
    const asOfEnd = params.asOf ? dayEnd(params.asOf) : null;
    const mineOnly = params.mine === 'true';
    const out: any[] = [];

    // Moliya kassa (Account) — filial/kassaTuri/egasi yo'q, doim SOM
    const skipAccounts =
      params.type === 'FLOW' ||
      mineOnly ||
      !!params.branchId ||
      !!params.kassaTuri ||
      (!!params.currency && params.currency !== 'SOM');
    if (!skipAccounts) {
      const accs = await this.prisma.account.findMany({ orderBy: { name: 'asc' } });
      for (const a of accs) {
        const agg = await this.aggregate('ACCOUNT', a.id, 'SOM', a.openingBalance ?? 0, a.balance, asOfEnd);
        out.push({
          id: a.id,
          type: 'ACCOUNT',
          name: a.name,
          currency: 'SOM',
          kassaTuri: null,
          branch: null,
          branchId: null,
          userId: null,
          active: true,
          mine: false,
          bankName: null,
          cardNumber: null,
          cardHolder: null,
          cardType: null,
          ...agg,
        });
      }
    }

    if (params.type !== 'ACCOUNT') {
      const flows = await this.prisma.flowAccount.findMany({
        include: { branch: { select: { name: true } } },
        orderBy: { name: 'asc' },
      });
      for (const f of flows) {
        if (params.branchId && f.branchId !== params.branchId) continue;
        if (params.active === 'true' && !f.active) continue;
        if (params.active === 'false' && f.active) continue;
        if (params.kassaTuri && f.kassaTuri !== params.kassaTuri) continue;
        const cur = f.currency === 'USD' ? 'USD' : 'SOM';
        if (params.currency && cur !== params.currency) continue;
        if (mineOnly && (!params.userId || f.userId !== params.userId)) continue;
        const agg = await this.aggregate('FLOW', f.id, cur, f.openingBalance ?? 0, f.balance, asOfEnd);
        out.push({
          id: f.id,
          type: 'FLOW',
          name: f.name,
          currency: cur,
          kassaTuri: f.kassaTuri,
          branch: f.branch?.name ?? null,
          branchId: f.branchId,
          userId: f.userId,
          active: f.active,
          mine: !!params.userId && f.userId === params.userId,
          bankName: f.bankName ?? null,
          cardNumber: f.cardNumber ?? null,
          cardHolder: f.cardHolder ?? null,
          cardType: f.cardType ?? null,
          ...agg,
        });
      }
    }

    const totals = {
      count: out.length,
      somConfirmed: 0,
      usdConfirmed: 0,
      somPendingIn: 0,
      somPendingOut: 0,
      somPendingNet: 0,
      usdPendingIn: 0,
      usdPendingOut: 0,
      usdPendingNet: 0,
    };
    for (const r of out) {
      if (r.currency === 'USD') {
        totals.usdConfirmed += r.confirmedBalance;
        totals.usdPendingIn += r.pendingIn;
        totals.usdPendingOut += r.pendingOut;
        totals.usdPendingNet += r.pendingNet;
      } else {
        totals.somConfirmed += r.confirmedBalance;
        totals.somPendingIn += r.pendingIn;
        totals.somPendingOut += r.pendingOut;
        totals.somPendingNet += r.pendingNet;
      }
    }
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
      // Maktab to'lovi (kirim) — «Hisoblar» kassasiga bog'langan
      const pays = await this.prisma.payment.findMany({ where: { flowAccountId: id }, include: { student: { select: { firstName: true, lastName: true } } } });
      for (const p of pays) mv.push({ date: p.paidAt, source: 'SCHOOL_PAYMENT', label: p.isRefund ? "Maktab to'lovi qaytarish" : "Maktab to'lovi", direction: p.isRefund ? 'OUT' : 'IN', amount: p.amount, currency: 'SOM', confirmed: p.confirmedAt != null, refType: 'Payment', refId: p.id, counterparty: p.student ? `${p.student.lastName} ${p.student.firstName}` : '—', note: p.note });
      // Xarajat to'lovi (chiqim) — so'm va dollar qismlari o'z hisobiga
      const expSom = await this.prisma.expensePayment.findMany({ where: { flowAccountId: id } });
      for (const e of expSom) mv.push({ date: e.paidAt, source: 'EXPENSE', label: e.isRefund ? 'Xarajat qaytarish' : "Xarajat to'lovi", direction: e.isRefund ? 'IN' : 'OUT', amount: e.amount, currency: 'SOM', confirmed: true, refType: 'ExpensePayment', refId: e.id, counterparty: '—', note: e.note });
      const expDol = await this.prisma.expensePayment.findMany({ where: { dollarFlowAccountId: id } });
      for (const e of expDol) mv.push({ date: e.paidAt, source: 'EXPENSE', label: 'Xarajat (valyuta)', direction: e.isRefund ? 'IN' : 'OUT', amount: e.dollarAmount ?? 0, currency: 'USD', confirmed: true, refType: 'ExpensePayment', refId: e.id, counterparty: '—', note: e.note });
      // Maosh (chiqim)
      const salSom = await this.prisma.salaryPayment.findMany({ where: { somAccountId: id }, include: { employee: { include: { user: { select: { fullName: true } } } } } });
      for (const s of salSom) mv.push({ date: s.date, source: 'SALARY', label: 'Maosh', direction: 'OUT', amount: s.somAmount, currency: 'SOM', confirmed: true, refType: 'SalaryPayment', refId: s.id, counterparty: s.employee?.user?.fullName ?? '—', note: s.note });
      const salDol = await this.prisma.salaryPayment.findMany({ where: { dollarAccountId: id }, include: { employee: { include: { user: { select: { fullName: true } } } } } });
      for (const s of salDol) mv.push({ date: s.date, source: 'SALARY', label: 'Maosh (valyuta)', direction: 'OUT', amount: s.dollarAmount ?? 0, currency: 'USD', confirmed: true, refType: 'SalaryPayment', refId: s.id, counterparty: s.employee?.user?.fullName ?? '—', note: s.note });
      // Ichki/filiallararo o'tkazma
      const itFrom = await this.prisma.internalTransfer.findMany({ where: { fromAccountId: id }, include: { toAccount: { select: { name: true } } } });
      for (const t of itFrom) mv.push({ date: t.date, source: 'INTERNAL_TRANSFER', label: "Ichki o'tkazma", direction: 'OUT', amount: usd ? (t.dollarAmount ?? 0) : (t.somAmount ?? 0), currency, confirmed: t.confirmedAt != null, refType: 'InternalTransfer', refId: t.id, counterparty: t.toAccount?.name ?? '—', note: t.note });
      const itTo = await this.prisma.internalTransfer.findMany({ where: { toAccountId: id }, include: { fromAccount: { select: { name: true } } } });
      for (const t of itTo) {
        // PUL o'tkazmada yo'qotish (loss) qabul qiluvchiga yetib bormaydi — kirim = amount − loss (applyBalance bilan bir xil)
        const inAmt = (usd ? (t.dollarAmount ?? 0) : (t.somAmount ?? 0)) - (t.kind === 'PUL' ? (t.loss ?? 0) : 0);
        mv.push({ date: t.date, source: 'INTERNAL_TRANSFER', label: "Ichki o'tkazma", direction: 'IN', amount: Math.max(0, inAmt), currency, confirmed: t.confirmedAt != null, refType: 'InternalTransfer', refId: t.id, counterparty: t.fromAccount?.name ?? '—', note: t.note });
      }
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

  /**
   * Balans-tekshiruv. To'g'ri balans = openingBalance (boshlang'ich qoldiq) + Σ(harakatlar).
   * drift = saqlangan balans − to'g'ri balans. Rejimlar:
   *   'check'  → faqat hisobot (o'zgartirmaydi).
   *   'adopt'  → hozirgi saqlangan balanslarni baseline sifatida qabul qiladi
   *              (openingBalance = stored − net), shunda drift 0 bo'ladi. Bir marta,
   *              tizim jonli ma'lumotga o'tishdan oldin ishlatiladi — balansni buzmaydi.
   *   'apply'  → saqlangan balansni to'g'ri qiymatga (opening + net) qo'yadi.
   */
  async reconcile(mode: 'check' | 'adopt' | 'apply' = 'check') {
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const rows: any[] = [];
    const accs = await this.prisma.account.findMany();
    for (const a of accs) {
      const mv = await this.movements('ACCOUNT', a.id, 'SOM');
      const net = mv.reduce((s, m) => s + (m.direction === 'IN' ? m.amount : -m.amount), 0);
      const opening = a.openingBalance ?? 0;
      rows.push({ type: 'ACCOUNT', id: a.id, name: a.name, currency: 'SOM', opening, net, stored: a.balance, correct: opening + net, drift: round2(a.balance - (opening + net)) });
    }
    const flows = await this.prisma.flowAccount.findMany();
    for (const f of flows) {
      const cur = f.currency === 'USD' ? 'USD' : 'SOM';
      const mv = await this.movements('FLOW', f.id, cur);
      const net = mv.reduce((s, m) => s + (m.direction === 'IN' ? m.amount : -m.amount), 0);
      const opening = f.openingBalance ?? 0;
      rows.push({ type: 'FLOW', id: f.id, name: f.name, currency: cur, opening, net, stored: f.balance, correct: opening + net, drift: round2(f.balance - (opening + net)) });
    }
    const drifted = rows.filter((r) => Math.abs(r.drift) > 0.001);

    if (mode === 'adopt') {
      // Hozirgi balansni to'g'ri deb qabul qilib, boshlang'ich qoldiqni shunga moslaymiz
      for (const r of rows) {
        const newOpening = round2(r.stored - r.net);
        if (r.type === 'ACCOUNT') await this.prisma.account.update({ where: { id: r.id }, data: { openingBalance: newOpening } });
        else await this.prisma.flowAccount.update({ where: { id: r.id }, data: { openingBalance: newOpening } });
        r.opening = newOpening; r.correct = r.stored; r.drift = 0;
      }
    } else if (mode === 'apply') {
      for (const r of drifted) {
        if (r.type === 'ACCOUNT') await this.prisma.account.update({ where: { id: r.id }, data: { balance: r.correct } });
        else await this.prisma.flowAccount.update({ where: { id: r.id }, data: { balance: r.correct } });
      }
    }

    return {
      mode,
      checked: rows.length,
      driftedCount: mode === 'adopt' ? 0 : drifted.length,
      totalDriftAbs: round2((mode === 'adopt' ? [] : drifted).reduce((s, r) => s + Math.abs(r.drift), 0)),
      drifted: mode === 'adopt' ? [] : drifted,
      all: rows,
    };
  }
}
