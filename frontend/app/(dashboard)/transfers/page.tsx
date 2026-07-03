'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeApi, money, type Transaction } from '@/lib/finance';

const inp = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';

export default function TransfersPage() {
  const qc = useQueryClient();
  const [f, setF] = useState({ fromAccountId: '', toAccountId: '', amount: '', description: '' });
  const [error, setError] = useState('');
  const { data } = useQuery({ queryKey: ['tx', 'TRANSFER'], queryFn: () => financeApi.transactions({ type: 'TRANSFER' }) });
  const { data: accounts } = useQuery({ queryKey: ['fin-accounts'], queryFn: financeApi.accounts });

  const add = useMutation({
    mutationFn: () => financeApi.transfer({ fromAccountId: f.fromAccountId, toAccountId: f.toAccountId, amount: Number(f.amount), description: f.description || undefined }),
    onSuccess: () => { setF({ fromAccountId: '', toAccountId: '', amount: '', description: '' }); setError(''); qc.invalidateQueries({ queryKey: ['tx', 'TRANSFER'] }); qc.invalidateQueries({ queryKey: ['fin-accounts'] }); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Ichki pul oqimi</h1>
        <p className="text-sm text-slate-500">Kassalar orasida o&apos;tkazmalar</p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="mb-2 flex flex-wrap items-end gap-2">
        <select value={f.fromAccountId} onChange={(e) => setF({ ...f, fromAccountId: e.target.value })} className={inp} required>
          <option value="">Qaysidan</option>
          {accounts?.map((a) => <option key={a.id} value={a.id}>{a.name} ({money(a.balance)})</option>)}
        </select>
        <select value={f.toAccountId} onChange={(e) => setF({ ...f, toAccountId: e.target.value })} className={inp} required>
          <option value="">Qaysiga</option>
          {accounts?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input type="number" placeholder="Summa" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className={inp} required />
        <input placeholder="Izoh" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={inp} />
        <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">⇄ O&apos;tkazish</button>
      </form>
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-4 py-2">Sana</th><th className="px-4 py-2">Kassa</th><th className="px-4 py-2">Tavsif</th><th className="px-4 py-2 text-right">Summa</th></tr></thead>
          <tbody>
            {data?.map((t: Transaction) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-500">{new Date(t.date).toLocaleDateString('uz-UZ')}</td>
                <td className="px-4 py-2">{t.account?.name}</td>
                <td className="px-4 py-2 text-slate-500">{t.description ?? '—'}</td>
                <td className="px-4 py-2 text-right font-medium">{money(t.amount)}</td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">O&apos;tkazma yo&apos;q</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
