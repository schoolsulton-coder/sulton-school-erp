'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, ShieldCheck } from 'lucide-react';
import { crmApi } from '@/lib/crm';
import { hrApi, GENDER_LABEL, type XodimRow } from '@/lib/hr';

const TABS = ['Umumiy', 'Xodimlar', 'Lavozimlar', 'Oylik hisob', '10 oylik', "To'lovlar", 'Shartnomalar'] as const;
type Tab = (typeof TABS)[number];

const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${tone ?? ''}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-800">{value}</div>
    </div>
  );
}

export default function MaoshlarPage() {
  const [tab, setTab] = useState<Tab>('Xodimlar');
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');

  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data, isLoading } = useQuery({
    queryKey: ['xodimlar', search, branchId],
    queryFn: () => hrApi.xodimlar({ search: search || undefined, branchId: branchId || undefined }),
    enabled: tab === 'Xodimlar',
  });
  const t = data?.totals;
  const rows = data?.data ?? [];

  return (
    <div className="min-h-full bg-slate-50/60 p-6">
      <div className="mb-3 text-sm text-slate-400">Moliya · <span className="font-semibold text-slate-700">Maoshlar</span></div>

      {/* Tab'lar */}
      <div className="mb-4">
        <div className="inline-flex flex-wrap gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
          {TABS.map((tb) => (
            <button key={tb} onClick={() => setTab(tb)} className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${tab === tb ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {tb}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Xodimlar' ? (
        <>
          {/* Qidiruv + filial */}
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="relative min-w-[240px] flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="F.I.O, telefon, ID..." className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand focus:bg-white" />
            </div>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="min-w-[220px] rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-brand focus:bg-white">
              <option value="">Barcha filiallar</option>
              {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Amallar */}
          <div className="mb-4 flex justify-end gap-2">
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"><ShieldCheck size={16} /> Nomlarni tekshirish</button>
            <button className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"><Plus size={18} /> Yangi xodim</button>
          </div>

          {/* Stat kartalar */}
          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Xodimlar" value={t?.xodimlar ?? 0} />
            <Stat label="Lavozimlar" value={t?.lavozimlar ?? 0} />
            <Stat label="Telefon bor" value={t?.telefonBor ?? 0} tone="bg-emerald-50/40" />
            <Stat label="Karta bor" value={t?.kartaBor ?? 0} tone="bg-sky-50/40" />
          </div>

          {/* Jadval */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3">F.I.O</th>
                    <th className="px-5 py-3">Jinsi</th>
                    <th className="px-5 py-3">Telefon</th>
                    <th className="px-5 py-3">Filial(lar)</th>
                    <th className="px-5 py-3">Karta</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">Yuklanmoqda...</td></tr>
                  ) : rows.length ? (
                    rows.map((e: XodimRow) => (
                      <tr key={e.id} className="border-b border-slate-50 transition last:border-0 hover:bg-brand/[0.03]">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">{initials(e.fio)}</div>
                            <div>
                              <div className="font-semibold text-slate-800">{e.fio}</div>
                              {e.position && <div className="text-xs text-slate-400">{e.position}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">{e.gender ? GENDER_LABEL[e.gender] : '—'}</td>
                        <td className="px-5 py-3.5 text-slate-600">{e.phone || '—'}</td>
                        <td className="px-5 py-3.5">{e.branch ? <span className="inline-flex rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-600">{e.branch}</span> : <span className="text-slate-300">—</span>}</td>
                        <td className="px-5 py-3.5 text-slate-500">{e.card ?? <span className="text-slate-300">—</span>}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">Xodim topilmadi</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm">
          «{tab}» — keyingi bosqichda tayyor bo&apos;ladi
        </div>
      )}
    </div>
  );
}
