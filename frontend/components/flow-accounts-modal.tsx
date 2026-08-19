'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet, Plus, Trash2 } from 'lucide-react';
import { crmApi } from '@/lib/crm';
import { usersApi } from '@/lib/users';
import { KASSA_TURI, som } from '@/lib/counterparties';
import { flowAccountsApi, CURRENCIES, type Currency } from '@/lib/flow-accounts';
import { ModalShell, inp, lbl } from './flow-ui';

export function FlowAccountsModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [branchId, setBranchId] = useState('');
  const [currency, setCurrency] = useState<Currency>('SOM');
  const [kassaTuri, setKassa] = useState(KASSA_TURI[0]);
  const [userId, setUser] = useState('');
  const [error, setError] = useState('');

  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data: users } = useQuery({ queryKey: ['users-lite'], queryFn: () => usersApi.list() });
  const { data: accounts } = useQuery({ queryKey: ['flow-accounts'], queryFn: () => flowAccountsApi.list() });

  const refresh = () => qc.invalidateQueries({ queryKey: ['flow-accounts'] });

  const create = useMutation({
    mutationFn: () =>
      flowAccountsApi.create({ name: name.trim(), branchId: branchId || undefined, currency, kassaTuri, userId: userId || undefined }),
    onSuccess: () => {
      setName('');
      setError('');
      refresh();
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  const del = useMutation({
    mutationFn: (id: string) => flowAccountsApi.remove(id),
    onSuccess: refresh,
  });

  const submit = () => {
    setError('');
    if (!name.trim()) return setError('Nom kiriting');
    if (!branchId) return setError('Filial tanlang');
    create.mutate();
  };

  return (
    <ModalShell
      title="Tashqi hisoblar"
      subtitle="Filial + valyuta + kassa turi bo'yicha hisoblar"
      icon={Wallet}
      onClose={onClose}
      footer={
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
          Yopish
        </button>
      }
    >
      <div className="space-y-4 px-6 py-5">
        {/* Yangi hisob */}
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Yangi hisob</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom (masalan: Bosh ofis)" className={inp} />
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inp}>
              <option value="">Filial...</option>
              {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className={inp}>
              {CURRENCIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <select value={kassaTuri} onChange={(e) => setKassa(e.target.value)} className={inp}>
              {KASSA_TURI.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <select value={userId} onChange={(e) => setUser(e.target.value)} className={`${inp} sm:col-span-2`}>
              <option value="">Foydalanuvchi (ixtiyoriy)...</option>
              {users?.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </div>
          {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
          <div className="mt-2 flex justify-end">
            <button onClick={submit} disabled={create.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
              <Plus size={15} /> Qo&apos;shish
            </button>
          </div>
        </div>

        {/* Ro'yxat */}
        <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2">Nom</th>
                <th className="px-3 py-2">Filial</th>
                <th className="px-3 py-2">Valyuta / Kassa</th>
                <th className="px-3 py-2">Foydalanuvchi</th>
                <th className="px-3 py-2 text-right">Balans</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {accounts?.length ? (
                accounts.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-700">{a.name}</td>
                    <td className="px-3 py-2 text-slate-500">{a.branch?.name ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-500">
                      {a.currency === 'USD' ? 'Dollar' : "So'm"} · {a.kassaTuri}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{a.user?.fullName ?? '—'}</td>
                    <td className="px-3 py-2 text-right font-medium text-slate-700">{som(a.balance)}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => { if (confirm("Hisob o'chirilsinmi?")) del.mutate(a.id); }} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400">Hisob yo&apos;q — yuqoridan qo&apos;shing</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ModalShell>
  );
}
