'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeApi, money, type Transaction } from '@/lib/finance';

const inp = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';

export default function ExpensesPage() {
  const qc = useQueryClient();
  const [f, setF] = useState({ accountId: '', categoryId: '', amount: '', description: '' });
  const { data } = useQuery({ queryKey: ['tx', 'EXPENSE'], queryFn: () => financeApi.transactions({ type: 'EXPENSE' }) });
  const { data: accounts } = useQuery({ queryKey: ['fin-accounts'], queryFn: financeApi.accounts });
  const { data: cats } = useQuery({ queryKey: ['fin-cats', 'EXPENSE'], queryFn: () => financeApi.categories('EXPENSE') });

  const add = useMutation({
    mutationFn: () => financeApi.createTransaction({
      type: 'EXPENSE', accountId: f.accountId, categoryId: f.categoryId || undefined,
      amount: Number(f.amount), description: f.description || undefined,
    }),
    onSuccess: () => { setF({ accountId: '', categoryId: '', amount: '', description: '' }); qc.invalidateQueries({ queryKey: ['tx', 'EXPENSE'] }); },
  });
  const total = (data ?? []).reduce((s, t) => s + t.amount, 0);

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Xarajatlar</h1>
        <p className="text-sm text-slate-500">Jami: <b className="text-red-600">{money(total)}</b></p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="mb-4 flex flex-wrap items-end gap-2">
        <select value={f.accountId} onChange={(e) => setF({ ...f, accountId: e.target.value })} className={inp} required>
          <option value="">Kassa</option>
          {accounts?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })} className={inp}>
          <option value="">Kategoriya</option>
          {cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="number" placeholder="Summa" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className={inp} required />
        <input placeholder="Izoh" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={inp} />
        <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">+ Xarajat</button>
      </form>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-4 py-2">Sana</th><th className="px-4 py-2">Kassa</th><th className="px-4 py-2">Kategoriya/izoh</th><th className="px-4 py-2 text-right">Summa</th></tr></thead>
          <tbody>
            {data?.map((t: Transaction) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-500">{new Date(t.date).toLocaleDateString('uz-UZ')}</td>
                <td className="px-4 py-2">{t.account?.name}</td>
                <td className="px-4 py-2 text-slate-500">{t.category?.name ?? t.description ?? '—'}</td>
                <td className="px-4 py-2 text-right font-medium text-red-600">−{money(t.amount)}</td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Xarajat yo&apos;q</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
