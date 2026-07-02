'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  financeApi,
  money,
  type Account,
  type Transaction,
} from '@/lib/finance';

const TYPE_LABEL: Record<string, string> = {
  INCOME: 'Kirim',
  EXPENSE: 'Chiqim',
  TRANSFER: "O'tkazma",
  INVESTMENT: 'Investitsiya',
};
const TYPE_COLOR: Record<string, string> = {
  INCOME: 'text-green-600',
  EXPENSE: 'text-red-600',
  TRANSFER: 'text-slate-500',
  INVESTMENT: 'text-brand',
};

export default function FinancePage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<null | 'tx' | 'transfer' | 'account'>(null);

  const { data: summary } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: financeApi.summary,
  });
  const { data: cf } = useQuery({
    queryKey: ['finance-cashflow'],
    queryFn: () => financeApi.cashFlow(),
  });
  const { data: txns } = useQuery({
    queryKey: ['finance-txns'],
    queryFn: () => financeApi.transactions(),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['finance-summary'] });
    qc.invalidateQueries({ queryKey: ['finance-cashflow'] });
    qc.invalidateQueries({ queryKey: ['finance-txns'] });
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">G&apos;azna &amp; Moliya</h1>
          <p className="text-sm text-slate-500">Kassalar, kirim-chiqim va pul oqimi</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal('tx')} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">+ Kirim/Chiqim</button>
          <button onClick={() => setModal('transfer')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">⇄ O&apos;tkazma</button>
          <button onClick={() => setModal('account')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">+ Kassa</button>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card label="Umumiy balans" value={money(summary?.totalBalance ?? 0)} />
        <Card label="Oylik kirim" value={money(summary?.month.income ?? 0)} color="text-green-600" />
        <Card label="Oylik chiqim" value={money(summary?.month.expense ?? 0)} color="text-red-600" />
        <Card label="Sof oqim" value={money(summary?.month.net ?? 0)} color={(summary?.month.net ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Cash Flow */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Pul oqimi (joriy oy)</h2>
          <Row label="🎓 Shartnoma to'lovlari" value={cf?.income.contract ?? 0} positive />
          <Row label="Boshqa kirim" value={cf?.income.other ?? 0} positive />
          <Row label="Investitsiya" value={cf?.income.investment ?? 0} positive />
          <div className="my-2 border-t border-slate-100" />
          <Row label="Jami kirim" value={cf?.totalIncome ?? 0} positive bold />
          <Row label="Jami chiqim" value={cf?.expense ?? 0} bold />
          <div className="my-2 border-t border-slate-100" />
          <Row label="Sof oqim" value={cf?.net ?? 0} positive={(cf?.net ?? 0) >= 0} bold />
        </div>

        {/* Xarajat kategoriyalari */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Xarajatlar (kategoriya)</h2>
          {cf && Object.keys(cf.expenseByCategory).length ? (
            Object.entries(cf.expenseByCategory).map(([name, val]) => (
              <Row key={name} label={name} value={val} />
            ))
          ) : (
            <p className="text-sm text-slate-400">Bu oyda xarajat yo&apos;q</p>
          )}
        </div>

        {/* Kassalar */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Kassalar</h2>
          {summary?.accounts.map((a: Account) => (
            <div key={a.id} className="flex justify-between py-1 text-sm">
              <span>{a.name}</span>
              <span className="font-medium">{money(a.balance)}</span>
            </div>
          ))}
          {!summary?.accounts.length && (
            <p className="text-sm text-slate-400">Kassa yo&apos;q — yangi qo&apos;shing</p>
          )}
        </div>
      </div>

      {/* Tranzaksiyalar */}
      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">So&apos;nggi tranzaksiyalar</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2">Sana</th>
                <th className="px-4 py-2">Tur</th>
                <th className="px-4 py-2">Kassa</th>
                <th className="px-4 py-2">Izoh</th>
                <th className="px-4 py-2 text-right">Summa</th>
              </tr>
            </thead>
            <tbody>
              {txns?.map((t: Transaction) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{new Date(t.date).toLocaleDateString('uz-UZ')}</td>
                  <td className={`px-4 py-2 font-medium ${TYPE_COLOR[t.type]}`}>{TYPE_LABEL[t.type]}</td>
                  <td className="px-4 py-2">{t.account?.name}</td>
                  <td className="px-4 py-2 text-slate-500">{t.category?.name ?? t.description ?? '—'}</td>
                  <td className={`px-4 py-2 text-right font-medium ${TYPE_COLOR[t.type]}`}>
                    {t.type === 'EXPENSE' ? '−' : t.type === 'INCOME' || t.type === 'INVESTMENT' ? '+' : ''}
                    {money(t.amount)}
                  </td>
                </tr>
              ))}
              {!txns?.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Tranzaksiya yo&apos;q</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'tx' && <TxModal onClose={() => setModal(null)} onDone={() => { setModal(null); refresh(); }} />}
      {modal === 'transfer' && <TransferModal onClose={() => setModal(null)} onDone={() => { setModal(null); refresh(); }} />}
      {modal === 'account' && <AccountModal onClose={() => setModal(null)} onDone={() => { setModal(null); refresh(); }} />}
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-bold ${color ?? ''}`}>{value}</div>
    </div>
  );
}

function Row({ label, value, positive, bold }: { label: string; value: number; positive?: boolean; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1 text-sm ${bold ? 'font-semibold' : ''}`}>
      <span>{label}</span>
      <span className={positive ? 'text-green-600' : 'text-red-600'}>{money(value)}</span>
    </div>
  );
}

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        {children}
      </div>
    </div>
  );
}

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2';

function TxModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ type: 'EXPENSE', accountId: '', categoryId: '', amount: '', description: '' });
  const { data: accounts } = useQuery({ queryKey: ['fin-accounts'], queryFn: financeApi.accounts });
  const { data: categories } = useQuery({ queryKey: ['fin-cats', form.type], queryFn: () => financeApi.categories(form.type) });

  const save = useMutation({
    mutationFn: () => financeApi.createTransaction({
      type: form.type as any,
      accountId: form.accountId,
      categoryId: form.categoryId || undefined,
      amount: Number(form.amount),
      description: form.description || undefined,
    }),
    onSuccess: onDone,
  });

  return (
    <Backdrop onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
        <h2 className="text-lg font-bold">Kirim / Chiqim</h2>
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, categoryId: '' })} className={inputCls}>
          <option value="INCOME">Kirim</option>
          <option value="EXPENSE">Chiqim</option>
          <option value="INVESTMENT">Investitsiya</option>
        </select>
        <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} className={inputCls} required>
          <option value="">Kassa tanlang</option>
          {accounts?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={inputCls}>
          <option value="">Kategoriyasiz</option>
          {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="number" placeholder="Summa" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} required />
        <input placeholder="Izoh" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
        <Actions onClose={onClose} pending={save.isPending} />
      </form>
    </Backdrop>
  );
}

function TransferModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ fromAccountId: '', toAccountId: '', amount: '', description: '' });
  const { data: accounts } = useQuery({ queryKey: ['fin-accounts'], queryFn: financeApi.accounts });
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: () => financeApi.transfer({
      fromAccountId: form.fromAccountId,
      toAccountId: form.toAccountId,
      amount: Number(form.amount),
      description: form.description || undefined,
    }),
    onSuccess: onDone,
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  return (
    <Backdrop onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
        <h2 className="text-lg font-bold">Ichki o&apos;tkazma</h2>
        <select value={form.fromAccountId} onChange={(e) => setForm({ ...form, fromAccountId: e.target.value })} className={inputCls} required>
          <option value="">Qaysi kassadan</option>
          {accounts?.map((a) => <option key={a.id} value={a.id}>{a.name} ({money(a.balance)})</option>)}
        </select>
        <select value={form.toAccountId} onChange={(e) => setForm({ ...form, toAccountId: e.target.value })} className={inputCls} required>
          <option value="">Qaysi kassaga</option>
          {accounts?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input type="number" placeholder="Summa" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} required />
        <input placeholder="Izoh" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Actions onClose={onClose} pending={save.isPending} />
      </form>
    </Backdrop>
  );
}

function AccountModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ name: '', balance: '0' });
  const save = useMutation({
    mutationFn: () => financeApi.createAccount({ name: form.name, balance: Number(form.balance) }),
    onSuccess: onDone,
  });
  return (
    <Backdrop onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
        <h2 className="text-lg font-bold">Yangi kassa</h2>
        <input placeholder="Nom (Asosiy kassa, Bank...)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} required />
        <input type="number" placeholder="Boshlang'ich qoldiq" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} className={inputCls} />
        <Actions onClose={onClose} pending={save.isPending} />
      </form>
    </Backdrop>
  );
}

function Actions({ onClose, pending }: { onClose: () => void; pending: boolean }) {
  return (
    <div className="flex gap-2 pt-2">
      <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-300 py-2">Bekor</button>
      <button type="submit" disabled={pending} className="flex-1 rounded-lg bg-brand py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
        {pending ? 'Saqlanmoqda...' : 'Saqlash'}
      </button>
    </div>
  );
}
