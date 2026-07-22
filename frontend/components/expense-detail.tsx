'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Trash2, Pencil, CreditCard, RotateCcw, DollarSign } from 'lucide-react';
import {
  expensesApi, money, EXPENSE_STATUS_LABEL, EXPENSE_STATUS_COLOR,
  type ExpenseDetail as ExpenseDetailT, type ExpenseLine, type LineInput,
  type ExpensePayment as ExpensePaymentT,
} from '@/lib/expenses';
import { financeApi } from '@/lib/finance';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('uz-UZ');

/** Hisobni kassa turiga qarab ajratadi (nom bo'yicha) — To'lovlar oynasidagi kabi */
const accKind = (name?: string) => {
  const s = (name ?? '').toLowerCase();
  if (s.includes('bank')) return 'Bank';
  if (['karta', 'terminal', 'plastik', 'click', 'payme', 'uzcard', 'humo'].some((k) => s.includes(k))) return 'Karta';
  return 'Naqd';
};

export function ExpenseDetail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const { data: e } = useQuery({ queryKey: ['expense', id], queryFn: () => expensesApi.get(id) });
  const [addLines, setAddLines] = useState(false);
  const [editLine, setEditLine] = useState<ExpenseLine | null>(null);
  const [pay, setPay] = useState<null | { refund: boolean; payment?: ExpensePaymentT }>(null);

  const refresh = () => { qc.invalidateQueries({ queryKey: ['expense', id] }); onChanged(); };
  const removeLine = useMutation({ mutationFn: (lid: string) => expensesApi.removeLine(lid), onSuccess: refresh });
  const removePayment = useMutation({ mutationFn: (pid: string) => expensesApi.removePayment(pid), onSuccess: refresh });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(ev) => ev.stopPropagation()} className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-slate-50 shadow-2xl">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"><X size={16} /> Yopish</button>
          {e && <span className="text-sm text-slate-400">№{e.number}</span>}
        </div>

        {!e ? (
          <div className="p-10 text-center text-slate-400">Yuklanmoqda...</div>
        ) : (
          <div className="space-y-4 p-5">
            {/* Header karta */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">№{e.number}</div>
                  <h2 className="text-xl font-bold text-slate-800">{e.supplier.name}</h2>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Tag>{fmtDate(e.date)}</Tag>
                    <Tag>{e.branch.name}</Tag>
                    {e.department && <Tag>{e.department}</Tag>}
                    {e.academicYear && <Tag>{e.academicYear}</Tag>}
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${EXPENSE_STATUS_COLOR[e.status]}`}>{EXPENSE_STATUS_LABEL[e.status]}</span>
                  </div>
                  {e.note && <div className="mt-2 text-sm text-slate-400">{e.note}</div>}
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase text-slate-400">Jami</div>
                  <div className="text-2xl font-bold text-slate-800">{money(e.total)} <span className="text-sm font-medium text-slate-400">so&apos;m</span></div>
                  <div className="text-xs text-emerald-600">To&apos;langan: {money(e.paid)}</div>
                  {e.remaining !== 0 && <div className={`text-xs ${e.remaining > 0 ? 'text-rose-500' : 'text-indigo-500'}`}>{e.remaining > 0 ? 'Qoldiq' : 'Ortiqcha'}: {money(Math.abs(e.remaining))}</div>}
                </div>
              </div>
            </div>

            {/* XARAJATLAR (lines) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-700">Xarajatlar <span className="text-slate-400">({e.lines.length})</span></h3>
                <button onClick={() => setAddLines(true)} className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"><Plus size={14} /> Qo&apos;shish</button>
              </div>
              {e.lines.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">Qator yo&apos;q — «Qo&apos;shish» bilan kiriting</p>
              ) : (
                <div className="space-y-2">
                  {e.lines.map((l) => (
                    <div key={l.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-700">{l.name}</div>
                        <div className="text-xs text-slate-400">
                          {[l.category?.name, l.subCategory].filter(Boolean).join(' · ') || '—'}
                          {l.note ? ` · ${l.note}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="whitespace-nowrap text-right">
                          <div className="text-xs text-slate-400">{money(l.quantity)} × {money(l.price)}</div>
                          <div className="font-semibold text-slate-800">{money(l.quantity * l.price)} so&apos;m</div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button onClick={() => setEditLine(l)} className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:bg-brand/10 hover:text-brand"><Pencil size={13} /></button>
                          <button onClick={() => removeLine.mutate(l.id)} className="grid h-6 w-6 place-items-center rounded text-slate-300 hover:bg-rose-50 hover:text-rose-500"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-slate-100 px-3 pt-2.5 text-sm">
                    <span className="font-semibold text-slate-500">Jami</span>
                    <span className="font-bold text-slate-800">{money(e.total)} so&apos;m</span>
                  </div>
                </div>
              )}
            </div>

            {/* TO'LOVLAR (payments) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-700">To&apos;lovlar <span className="text-slate-400">({e.payments.length})</span></h3>
                <div className="flex gap-2">
                  <button onClick={() => setPay({ refund: true })} className="inline-flex items-center gap-1 rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-600"><RotateCcw size={13} /> Qaytarish</button>
                  <button onClick={() => setPay({ refund: false })} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"><Plus size={14} /> To&apos;lov</button>
                </div>
              </div>
              {e.payments.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">To&apos;lov yo&apos;q</p>
              ) : (
                <div className="space-y-2">
                  {e.payments.map((p) => {
                    const dollarSom = (p.dollarAmount || 0) * (p.dollarRate || 0);
                    const totalSom = (p.amount || 0) + dollarSom;
                    return (
                      <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-700">{fmtDate(p.paidAt)}{p.isRefund && <span className="ml-1.5 rounded bg-rose-100 px-1.5 text-xs text-rose-600">qaytarish</span>}</div>
                          <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-400"><CreditCard size={11} /> {p.method}{p.account ? ` · ${p.account.name}` : ''}{p.note ? ` · ${p.note}` : ''}</div>
                          {dollarSom > 0 && (
                            <div className="mt-0.5 text-xs text-emerald-600">💵 ${money(p.dollarAmount || 0)} × {money(p.dollarRate || 0)}{p.dollarAccount ? ` · ${p.dollarAccount.name}` : ''} = {money(dollarSom)} so&apos;m</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`whitespace-nowrap font-semibold ${p.isRefund ? 'text-rose-600' : 'text-emerald-600'}`}>{p.isRefund ? '− ' : ''}{money(totalSom)} so&apos;m</span>
                          <button onClick={() => setPay({ refund: p.isRefund, payment: p })} title="Tahrirlash" className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:bg-brand/10 hover:text-brand"><Pencil size={13} /></button>
                          <button onClick={() => removePayment.mutate(p.id)} className="grid h-6 w-6 place-items-center rounded text-slate-300 hover:bg-rose-50 hover:text-rose-500"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {addLines && e && <AddLinesModal expenseId={id} onClose={() => setAddLines(false)} onSaved={() => { setAddLines(false); refresh(); }} />}
      {editLine && <LineEditModal line={editLine} onClose={() => setEditLine(null)} onSaved={() => { setEditLine(null); refresh(); }} />}
      {pay && e && <PaymentModal expense={e} refund={pay.refund} payment={pay.payment} onClose={() => setPay(null)} onSaved={() => { setPay(null); refresh(); }} />}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-500">{children}</span>;
}

/* ===== Ko'p qatorli qo'shish ===== */
function AddLinesModal({ expenseId, onClose, onSaved }: { expenseId: string; onClose: () => void; onSaved: () => void }) {
  const qc = useQueryClient();
  const { data: cats } = useQuery({ queryKey: ['fin-cats', 'EXPENSE'], queryFn: () => financeApi.categories('EXPENSE') });
  const [newCat, setNewCat] = useState('');
  const createCat = useMutation({
    mutationFn: () => financeApi.createCategory({ name: newCat.trim(), type: 'EXPENSE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fin-cats', 'EXPENSE'] }); setNewCat(''); },
  });
  const empty = (): LineInput & { key: number } => ({ key: Math.floor(performance.now() * 1000) % 1e9 + Math.floor(performance.now() % 1000), name: '', quantity: 1, price: 0, categoryId: '', subCategory: '', note: '' });
  const [rows, setRows] = useState<(LineInput & { key: number })[]>(() => Array.from({ length: 5 }, (_, i) => ({ key: i + 1, name: '', quantity: 1, price: 0, categoryId: '', subCategory: '', note: '' })));
  const [error, setError] = useState('');

  const setRow = (key: number, patch: Partial<LineInput>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const valid = rows.filter((r) => r.name.trim());
  const total = valid.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.price) || 0), 0);

  const save = useMutation({
    mutationFn: () => expensesApi.addLinesBulk(expenseId, valid.map((r) => ({
      name: r.name, quantity: Number(r.quantity) || 1, price: Number(r.price) || 0,
      categoryId: r.categoryId || undefined, subCategory: r.subCategory || undefined, note: r.note || undefined,
    }))),
    onSuccess: onSaved,
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  const cell = 'w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-sm outline-none focus:border-brand focus:bg-white';
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="mt-6 w-full max-w-5xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-800">Bir nechta qator qo&apos;shish</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-slate-50 p-0.5 ring-1 ring-slate-200">
              <input value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newCat.trim()) createCat.mutate(); }} placeholder="Yangi kategoriya" className="w-32 bg-transparent px-2 py-1 text-sm outline-none" />
              <button onClick={() => newCat.trim() && createCat.mutate()} disabled={createCat.isPending} title="Kategoriya qo'shish" className="rounded-md px-2 py-1 text-xs font-semibold text-brand hover:bg-brand/10 disabled:opacity-50">+ Kat</button>
            </div>
            <button onClick={() => setRows((rs) => [...rs, empty()])} className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"><Plus size={14} /> Qator</button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
          </div>
        </div>
        <div className="max-h-[60vh] overflow-auto px-6 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="pb-2 pr-2">#</th>
                <th className="pb-2 pr-2">Kategoriya</th>
                <th className="pb-2 pr-2">Nomi *</th>
                <th className="pb-2 pr-2 text-right">Miqdor</th>
                <th className="pb-2 pr-2 text-right">Narx</th>
                <th className="pb-2 pr-2 text-right">Jami</th>
                <th className="pb-2 pr-2">Izoh</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.key}>
                  <td className="py-1 pr-2 text-slate-400">{i + 1}</td>
                  <td className="py-1 pr-2 min-w-[130px]">
                    <select value={r.categoryId} onChange={(e) => setRow(r.key, { categoryId: e.target.value })} className={cell}>
                      <option value="">—</option>
                      {cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </td>
                  <td className="py-1 pr-2 min-w-[160px]"><input value={r.name} onChange={(e) => setRow(r.key, { name: e.target.value })} placeholder="masalan: Reklama" className={cell} /></td>
                  <td className="py-1 pr-2"><input type="number" min={0} value={r.quantity} onChange={(e) => setRow(r.key, { quantity: Number(e.target.value) })} className={`${cell} w-16 text-right`} /></td>
                  <td className="py-1 pr-2"><input type="number" min={0} value={r.price} onChange={(e) => setRow(r.key, { price: Number(e.target.value) })} className={`${cell} w-28 text-right`} /></td>
                  <td className="py-1 pr-2 whitespace-nowrap text-right font-medium text-slate-600">{money((Number(r.quantity) || 0) * (Number(r.price) || 0))}</td>
                  <td className="py-1 pr-2 min-w-[120px]"><input value={r.note} onChange={(e) => setRow(r.key, { note: e.target.value })} className={cell} /></td>
                  <td className="py-1"><button onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="text-rose-400 hover:text-rose-600"><X size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <div className="text-sm text-slate-500">Bo&apos;sh qatorlar o&apos;tkazib yuboriladi · Jami: <b className="text-slate-800">{money(total)} so&apos;m</b></div>
          <div className="flex items-center gap-2">
            {error && <span className="text-sm text-rose-500">{error}</span>}
            <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Bekor</button>
            <button onClick={() => { setError(''); if (!valid.length) return setError('Kamida bitta nomli qator'); save.mutate(); }} disabled={save.isPending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
              {valid.length} ta qatorni saqlash
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Bitta qatorni tahrirlash ===== */
function LineEditModal({ line, onClose, onSaved }: { line: ExpenseLine; onClose: () => void; onSaved: () => void }) {
  const { data: cats } = useQuery({ queryKey: ['fin-cats', 'EXPENSE'], queryFn: () => financeApi.categories('EXPENSE') });
  const [form, setForm] = useState({ name: line.name, quantity: line.quantity, price: line.price, categoryId: line.categoryId ?? '', subCategory: line.subCategory ?? '', note: line.note ?? '' });
  const save = useMutation({
    mutationFn: () => expensesApi.updateLine(line.id, { name: form.name, quantity: Number(form.quantity), price: Number(form.price), categoryId: form.categoryId || undefined, subCategory: form.subCategory || undefined, note: form.note || undefined }),
    onSuccess: onSaved,
  });
  const inp = 'w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white';
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-3 rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-800">Qatorni tahrirlash</h2>
        <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={inp}>
          <option value="">Kategoriya —</option>
          {cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nomi" className={inp} />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} placeholder="Miqdor" className={inp} />
          <input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} placeholder="Narx" className={inp} />
        </div>
        <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Izoh" className={inp} />
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Bekor</button>
          <button onClick={() => form.name.trim() && save.mutate()} disabled={save.isPending} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">Saqlash</button>
        </div>
      </div>
    </div>
  );
}

/* ===== Xarajat uchun to'lov (alohida oyna, xarajatlar yonida) ===== */
function PaymentModal({ expense, refund, payment, onClose, onSaved }: { expense: ExpenseDetailT; refund: boolean; payment?: ExpensePaymentT; onClose: () => void; onSaved: () => void }) {
  const editing = !!payment;
  const { data: accounts } = useQuery({ queryKey: ['fin-accounts'], queryFn: financeApi.accounts });
  const [isRefund, setIsRefund] = useState(payment?.isRefund ?? refund);
  const [amount, setAmount] = useState(payment?.amount ? String(payment.amount) : '');
  const [method, setMethod] = useState(payment?.method ?? 'Naqd');
  const [accountId, setAccountId] = useState(payment?.accountId ?? '');
  const [date, setDate] = useState((payment?.paidAt ?? new Date().toISOString()).slice(0, 10));
  const [note, setNote] = useState(payment?.note ?? '');
  const [error, setError] = useState('');
  // Dollar
  const [useDollar, setUseDollar] = useState(!!payment?.dollarAmount);
  const [dollarAmount, setDollarAmount] = useState(payment?.dollarAmount ? String(payment.dollarAmount) : '');
  const [dollarRate, setDollarRate] = useState(payment?.dollarRate ? String(payment.dollarRate) : '');
  const [dollarMethod, setDollarMethod] = useState(payment?.dollarMethod ?? 'Naqd');
  const [dollarAccountId, setDollarAccountId] = useState(payment?.dollarAccountId ?? '');

  const somAccounts = (accounts ?? []).filter((a) => accKind(a.name) === method);
  const dollarAccounts = (accounts ?? []).filter((a) => accKind(a.name) === dollarMethod);

  // Kassa turi o'zgarsa: bitta hisob bo'lsa avtomat, mos kelmasa tozalaymiz
  useEffect(() => {
    if (somAccounts.length === 1) setAccountId(somAccounts[0].id);
    else if (accountId && !somAccounts.some((a) => a.id === accountId)) setAccountId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, accounts]);
  useEffect(() => {
    if (dollarAccounts.length === 1) setDollarAccountId(dollarAccounts[0].id);
    else if (dollarAccountId && !dollarAccounts.some((a) => a.id === dollarAccountId)) setDollarAccountId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dollarMethod, accounts]);

  const dollarSom = useDollar ? (Number(dollarAmount) || 0) * (Number(dollarRate) || 0) : 0;
  const totalSom = (Number(amount) || 0) + dollarSom;

  const payload = () => ({
    amount: Number(amount) || undefined,
    method,
    accountId: accountId || undefined,
    dollarAmount: useDollar ? Number(dollarAmount) || undefined : undefined,
    dollarRate: useDollar ? Number(dollarRate) || undefined : undefined,
    dollarMethod: useDollar ? dollarMethod : undefined,
    dollarAccountId: useDollar ? dollarAccountId || undefined : undefined,
    paidAt: date, isRefund, note: note || undefined,
  });
  const save = useMutation({
    mutationFn: () => editing ? expensesApi.updatePayment(payment!.id, payload()) : expensesApi.addPayment(expense.id, payload()),
    onSuccess: onSaved,
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  const inp = 'w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20';
  const lbl = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500';
  const AccWarn = ({ n, kind }: { n: number; kind: string }) => n === 0
    ? <p className="mt-1 text-xs text-amber-500">«{kind}» uchun hisob yo&apos;q — Hisoblar bo&apos;limidan qo&apos;shing.</p> : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="my-6 w-full max-w-3xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{editing ? "To'lovni tahrirlash" : isRefund ? "To'lovni qaytarish" : "Xarajat uchun to'lov"}</h2>
            <p className="text-xs text-slate-400">№{expense.number} · {expense.supplier.name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Chap: xarajat elementlari (yonida) */}
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 md:border-b-0 md:border-r">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Xarajatlar ({expense.lines.length})</h3>
            <div className="space-y-1.5">
              {expense.lines.length ? expense.lines.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-2 text-sm ring-1 ring-slate-100">
                  <span className="min-w-0 truncate text-slate-700">{l.name}<span className="ml-1 text-xs text-slate-400">{money(l.quantity)}×{money(l.price)}</span></span>
                  <span className="whitespace-nowrap font-medium text-slate-700">{money(l.quantity * l.price)}</span>
                </div>
              )) : <p className="text-sm text-slate-400">Element yo&apos;q</p>}
            </div>
            <div className="mt-3 space-y-1 border-t border-slate-200 pt-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Item jami</span><span className="font-semibold">{money(expense.total)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">To&apos;langan</span><span className="font-medium text-emerald-600">{money(expense.paid)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Qoldiq</span><span className={`font-semibold ${expense.remaining > 0 ? 'text-rose-500' : 'text-slate-600'}`}>{money(expense.remaining)}</span></div>
            </div>
          </div>

          {/* O'ng: to'lov formasi */}
          <div className="space-y-3 px-5 py-4">
            <div>
              <label className={lbl}>Sana</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
            </div>
            <label className="flex items-start gap-2 rounded-xl bg-rose-50/50 p-2.5 text-sm ring-1 ring-rose-100">
              <input type="checkbox" checked={isRefund} onChange={(e) => setIsRefund(e.target.checked)} className="mt-0.5" />
              <span><b className="text-rose-600">Qaytarish (−)</b><span className="block text-xs text-slate-400">Summa kassaga qaytgan to&apos;lov sifatida yoziladi.</span></span>
            </label>
            <div>
              <label className={lbl}>Summa (so&apos;m)</label>
              <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className={inp} autoFocus />
            </div>
            <div>
              <label className={lbl}>Kassa turi</label>
              <div className="grid grid-cols-3 gap-1">
                {['Naqd', 'Karta', 'Bank'].map((k) => (
                  <button key={k} type="button" onClick={() => setMethod(k)} className={`rounded-lg border py-2 text-xs font-medium transition ${method === k ? 'border-brand bg-brand text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{k}</button>
                ))}
              </div>
            </div>
            <div>
              <label className={lbl}>Hisob</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inp}>
                <option value="">Tanlang...</option>
                {somAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <AccWarn n={somAccounts.length} kind={method} />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={useDollar} onChange={(e) => setUseDollar(e.target.checked)} />
              <DollarSign size={14} className="text-emerald-500" /> Dollar bilan qo&apos;shimcha
            </label>
            {useDollar && (
              <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={lbl}>Dollar</label><input type="number" min={0} value={dollarAmount} onChange={(e) => setDollarAmount(e.target.value)} className={inp} /></div>
                  <div><label className={lbl}>Kurs (so&apos;m)</label><input type="number" min={0} value={dollarRate} onChange={(e) => setDollarRate(e.target.value)} className={inp} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={lbl}>Dollar kassa turi</label>
                    <select value={dollarMethod} onChange={(e) => setDollarMethod(e.target.value)} className={inp}><option>Naqd</option><option>Karta</option><option>Bank</option></select>
                  </div>
                  <div>
                    <label className={lbl}>Dollar hisobi</label>
                    <select value={dollarAccountId} onChange={(e) => setDollarAccountId(e.target.value)} className={inp}>
                      <option value="">Tanlang...</option>
                      {dollarAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">Dollar ekvivalenti: <b className="text-slate-700">{money(dollarSom)} so&apos;m</b></div>
              </div>
            )}

            <div>
              <label className={lbl}>Izoh</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ixtiyoriy" className={inp} />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-2.5 text-white">
              <span className="text-sm opacity-80">Jami so&apos;mda</span>
              <span className="text-lg font-bold">{money(totalSom)} so&apos;m</span>
            </div>
            {error && <p className="text-sm text-rose-500">{error}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Bekor</button>
          <button onClick={() => { setError(''); if (!(totalSom > 0)) return setError('Summa kiriting'); save.mutate(); }} disabled={save.isPending} className={`rounded-lg px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 ${isRefund ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
            {save.isPending ? 'Saqlanmoqda...' : editing ? 'Yangilash' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  );
}
