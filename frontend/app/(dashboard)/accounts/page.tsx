'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronRight } from 'lucide-react';
import { registersApi, cur, type RegisterItem } from '@/lib/registers';
import { crmApi } from '@/lib/crm';

const sel = 'rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand';

export default function AccountsPage() {
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [branchId, setBranchId] = useState('');
  const [active, setActive] = useState('');

  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data, isLoading } = useQuery({
    queryKey: ['registers', type, branchId, active],
    queryFn: () => registersApi.list({ type: type || undefined, branchId: branchId || undefined, active: active || undefined }),
  });

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.registers ?? []).filter((r) => !s || r.name.toLowerCase().includes(s) || (r.branch ?? '').toLowerCase().includes(s));
  }, [data, q]);

  return (
    <div className="p-6">
      <div className="mb-1"><h1 className="text-2xl font-bold">Hisoblar — Balans</h1></div>
      <p className="mb-5 text-sm text-slate-500">Har kassa va bank hisobi bo&apos;yicha hozirgi qoldiq</p>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nomi, filial..." className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand" />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} className={sel}>
          <option value="">Barcha turlar</option>
          <option value="ACCOUNT">Moliya kassa</option>
          <option value="FLOW">Pul oqimi kassa</option>
        </select>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={sel}>
          <option value="">Barcha filiallar</option>
          {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={active} onChange={(e) => setActive(e.target.value)} className={sel}>
          <option value="">Hammasi</option>
          <option value="true">Faol</option>
          <option value="false">Nofaol</option>
        </select>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Kpi label="Jami so'm" value={cur(data?.totals.somBalance ?? 0, 'SOM')} cls="text-emerald-600" />
        <Kpi label="Jami dollar" value={cur(data?.totals.usdBalance ?? 0, 'USD')} cls="text-sky-600" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3">Hisob</th>
                <th className="px-5 py-3">Filial</th>
                <th className="px-5 py-3">Kassa turi</th>
                <th className="px-5 py-3 text-right">Qoldiq</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">Yuklanmoqda…</td></tr>
              ) : rows.length ? rows.map((r: RegisterItem) => (
                <tr key={`${r.type}-${r.id}`} className="border-b border-slate-50 last:border-0 hover:bg-brand/[0.03]">
                  <td className="px-5 py-3.5">
                    <Link href={`/accounts/${r.type}/${r.id}`} className="font-semibold text-slate-800 hover:text-brand">{r.name}</Link>
                    <div className="text-xs text-slate-400">{r.type === 'FLOW' ? 'Pul oqimi' : 'Moliya'}{!r.active ? ' · nofaol' : ''}</div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{r.branch ?? '—'}</td>
                  <td className="px-5 py-3.5"><span className="text-slate-600">{r.kassaTuri ?? '—'}</span> <span className="text-[11px] text-slate-400">{r.currency}</span></td>
                  <td className={`px-5 py-3.5 text-right font-bold ${r.storedBalance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>{cur(r.storedBalance, r.currency)}</td>
                  <td className="px-5 py-3.5 text-right"><Link href={`/accounts/${r.type}/${r.id}`} className="text-slate-300 hover:text-brand"><ChevronRight size={16} /></Link></td>
                </tr>
              )) : (<tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">Kassa topilmadi</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${cls ?? 'text-slate-800'}`}>{value}</div>
    </div>
  );
}
