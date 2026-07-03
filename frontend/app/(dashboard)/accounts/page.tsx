'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeApi, money, type Account } from '@/lib/finance';

export default function AccountsPage() {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: '', balance: '0' });
  const { data: sum } = useQuery({ queryKey: ['finance-summary'], queryFn: financeApi.summary });

  const add = useMutation({
    mutationFn: () => financeApi.createAccount({ name: f.name, balance: Number(f.balance) }),
    onSuccess: () => { setF({ name: '', balance: '0' }); qc.invalidateQueries({ queryKey: ['finance-summary'] }); },
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Hisoblar (Kassalar)</h1>
        <p className="text-sm text-slate-500">Umumiy balans: <b>{money(sum?.totalBalance ?? 0)}</b></p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="mb-6 flex flex-wrap items-end gap-2">
        <input placeholder="Kassa nomi" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
        <input type="number" placeholder="Boshlang'ich qoldiq" value={f.balance} onChange={(e) => setF({ ...f, balance: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">+ Kassa</button>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sum?.accounts.map((a: Account) => (
          <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">{a.name}</div>
            <div className="mt-2 text-2xl font-bold text-brand">{money(a.balance)}</div>
          </div>
        ))}
        {!sum?.accounts.length && <p className="text-sm text-slate-400">Kassa yo&apos;q — yangi qo&apos;shing</p>}
      </div>
    </div>
  );
}
