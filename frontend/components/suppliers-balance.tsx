'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, Building2 } from 'lucide-react';
import { expensesApi, money } from '@/lib/expenses';
import { crmApi } from '@/lib/crm';

export function SuppliersBalance() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-balances', search, branchId],
    queryFn: () => expensesApi.supplierBalances({ search: search || undefined, branchId: branchId || undefined }),
  });
  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });

  const stats = data?.stats;
  const rows = data?.data ?? [];
  const sel = 'rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-600 outline-none focus:border-brand focus:bg-white';

  return (
    <div>
      {/* Stat kartochkalar */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat tone="slate" label="Ta'minotchilar" value={stats?.count ?? 0} isCount />
        <Stat tone="brand" label="Jami xarid" value={stats?.jamiXarid ?? 0} />
        <Stat tone="emerald" label="Jami to'lov" value={stats?.jamiTolov ?? 0} />
        <Stat tone="rose" label="Qarz" value={stats?.qarz ?? 0} />
        <Stat tone="amber" label="Avans" value={stats?.avans ?? 0} />
      </div>

      {/* Filtrlar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ta'minotchi nomi..." className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand focus:bg-white" />
        </div>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={sel}>
          <option value="">Barcha filiallar</option>
          {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Jadval */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Nomi</th>
                <th className="px-5 py-3">Filial</th>
                <th className="px-5 py-3 text-center">Xaridlar</th>
                <th className="px-5 py-3 text-right">Jami xarid</th>
                <th className="px-5 py-3 text-right">Jami to'lov</th>
                <th className="px-5 py-3 text-right">Qoldiq</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">Yuklanmoqda...</td></tr>
              ) : rows.length ? (
                rows.map((s) => (
                  <tr key={s.id} onClick={() => router.push(`/expenses/suppliers/${s.id}`)} className="cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-brand/[0.03]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand"><Building2 size={15} /></span>
                        <span className="font-semibold text-slate-800">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{s.branch ?? '—'}</td>
                    <td className="px-5 py-3.5 text-center text-slate-500">{s.expensesCount}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-slate-700">{money(s.totalPurchase)}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-emerald-600">{money(s.totalPaid)}</td>
                    <td className={`whitespace-nowrap px-5 py-3.5 text-right font-semibold ${s.remaining > 0 ? 'text-rose-600' : s.remaining < 0 ? 'text-indigo-600' : 'text-slate-400'}`}>{money(s.remaining)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Ta'minotchi topilmadi</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const TONES: Record<string, string> = {
  slate: 'from-slate-100 to-slate-50 text-slate-600',
  brand: 'from-brand/10 to-brand/5 text-brand',
  emerald: 'from-emerald-50 to-emerald-50/40 text-emerald-600',
  rose: 'from-rose-50 to-rose-50/40 text-rose-600',
  amber: 'from-amber-50 to-amber-50/40 text-amber-600',
};
function Stat({ tone, label, value, isCount }: { tone: keyof typeof TONES; label: string; value: number; isCount?: boolean }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${TONES[tone]} p-4 shadow-sm`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1.5 text-xl font-bold">{money(value)}{!isCount && <span className="text-sm font-medium opacity-60"> so&apos;m</span>}</div>
    </div>
  );
}
