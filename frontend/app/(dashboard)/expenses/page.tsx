'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TrendingDown, Plus, Search, X } from 'lucide-react';
import {
  expensesApi, money, EXPENSE_STATUS_LABEL, EXPENSE_STATUS_COLOR,
  type ExpenseFilters, type ExpenseRow, type ExpenseStatus,
} from '@/lib/expenses';
import { crmApi } from '@/lib/crm';
import { ExpenseFormModal } from '@/components/expense-form';
import { ExpenseDetail } from '@/components/expense-detail';
import { SuppliersBalance } from '@/components/suppliers-balance';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('uz-UZ');
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

type CountsLite = { all: number; open: number; unpaid: number; partial: number; excess: number; incomplete: number; closed: number };
const TABS: { key: string; label: string; countKey: keyof CountsLite }[] = [
  { key: 'all', label: 'Hammasi', countKey: 'all' },
  { key: 'open', label: 'Ochiq', countKey: 'open' },
  { key: 'unpaid', label: "To'lovsiz", countKey: 'unpaid' },
  { key: 'partial', label: 'Qisman', countKey: 'partial' },
  { key: 'excess', label: 'Ortiqcha', countKey: 'excess' },
  { key: 'incomplete', label: "Noto'liq", countKey: 'incomplete' },
  { key: 'closed', label: 'Yopilgan', countKey: 'closed' },
];

export default function ExpensesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ExpenseFilters>({});
  const [showForm, setShowForm] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [view, setView] = useState<'expenses' | 'suppliers'>('expenses');

  const query: ExpenseFilters = { status: tab, search: search || undefined, ...filters };
  const { data, isLoading } = useQuery({
    queryKey: ['expenses', query],
    queryFn: () => expensesApi.list(query),
  });
  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => expensesApi.suppliers() });

  const counts = data?.counts;
  const stats = data?.stats;
  const rows = data?.data ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ['expenses'] });
  const sel = 'rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-600 outline-none focus:border-brand focus:bg-white';

  return (
    <div className="min-h-full bg-slate-50/60 p-6">
      {/* Sarlavha */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-500 text-white shadow-sm"><TrendingDown size={22} /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Xarajatlar</h1>
            <p className="text-sm text-slate-400">{counts?.all ?? 0} ta xarajat topildi</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark">
          <Plus size={18} /> Yangi xarajat
        </button>
      </div>

      {/* View toggle */}
      <div className="mb-4 inline-flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        {([['expenses', 'Xarajatlar'], ['suppliers', "Ta'minotchilar"]] as const).map(([v, label]) => (
          <button key={v} onClick={() => setView(v)} className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${view === v ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{label}</button>
        ))}
      </div>

      {view === 'suppliers' ? <SuppliersBalance /> : (
      <>
      {/* Stat kartochkalar */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard tone="brand" label="Jami" value={stats?.jami ?? 0} />
        <StatCard tone="emerald" label="To'langan" value={stats?.tolangan ?? 0} />
        <StatCard tone="rose" label="Qarz" value={stats?.qarz ?? 0} />
        <StatCard tone="amber" label="Avans" value={stats?.avans ?? 0} />
      </div>

      {/* Status tablar */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = tab === t.key;
          const c = counts?.[t.countKey] ?? 0;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${active ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
              {t.label}
              <span className={`rounded-full px-1.5 text-xs font-semibold ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{c}</span>
            </button>
          );
        })}
      </div>

      {/* Qidiruv + filtrlar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ta'minotchi, izoh, bo'lim..." className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand focus:bg-white" />
        </div>
        <select value={filters.branchId ?? ''} onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value || undefined }))} className={sel}>
          <option value="">Barcha filiallar</option>
          {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={filters.supplierId ?? ''} onChange={(e) => setFilters((f) => ({ ...f, supplierId: e.target.value || undefined }))} className={sel}>
          <option value="">Barcha ta'minotchilar</option>
          {suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="date" value={filters.from ?? ''} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value || undefined }))} className={sel} title="Sanadan" />
        <input type="date" value={filters.to ?? ''} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value || undefined }))} className={sel} title="Sanagacha" />
        {(filters.branchId || filters.supplierId || filters.from || filters.to) && (
          <button onClick={() => setFilters({})} className="inline-flex items-center gap-1 px-2 py-2 text-sm text-slate-500 hover:text-rose-500"><X size={14} /> Tozalash</button>
        )}
      </div>

      {/* Jadval */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Sana</th>
                <th className="px-5 py-3">Ta'minotchi</th>
                <th className="px-5 py-3">Filial · Bo'lim</th>
                <th className="px-5 py-3 text-center">Holat</th>
                <th className="px-5 py-3 text-center">Items</th>
                <th className="px-5 py-3 text-right">Summa</th>
                <th className="px-5 py-3 text-right">To'langan</th>
                <th className="px-5 py-3 text-right">Qoldiq</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400">Yuklanmoqda...</td></tr>
              ) : rows.length ? (
                rows.map((e: ExpenseRow) => (
                  <tr key={e.id} onClick={() => setDetailId(e.id)} className="cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-brand/[0.03]">
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">
                      <div>{fmtDate(e.date)}</div>
                      <div className="text-xs text-slate-400">{fmtTime(e.date)} · №{e.number}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800">{e.supplier.name}</div>
                      {e.department && <div className="text-xs text-slate-400">{e.department}</div>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <div>{e.branch?.name ?? '—'}</div>
                      {e.department && <div className="text-xs text-slate-400">{e.department}</div>}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${EXPENSE_STATUS_COLOR[e.status as ExpenseStatus]}`}>{EXPENSE_STATUS_LABEL[e.status as ExpenseStatus]}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-500">{e.itemsCount}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-slate-800">{money(e.total)}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-emerald-600">{money(e.paid)}</td>
                    <td className={`whitespace-nowrap px-5 py-3.5 text-right font-medium ${e.remaining > 0 ? 'text-rose-600' : e.remaining < 0 ? 'text-indigo-600' : 'text-slate-400'}`}>{money(e.remaining)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">Xarajat topilmadi</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      </>
      )}

      {showForm && <ExpenseFormModal onClose={() => setShowForm(false)} onSaved={(id) => { setShowForm(false); refresh(); setDetailId(id); }} />}
      {detailId && <ExpenseDetail id={detailId} onClose={() => setDetailId(null)} onChanged={refresh} />}
    </div>
  );
}

const TONES: Record<string, string> = {
  brand: 'from-brand/10 to-brand/5 text-brand',
  emerald: 'from-emerald-50 to-emerald-50/40 text-emerald-600',
  rose: 'from-rose-50 to-rose-50/40 text-rose-600',
  amber: 'from-amber-50 to-amber-50/40 text-amber-600',
};
function StatCard({ tone, label, value }: { tone: keyof typeof TONES; label: string; value: number }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${TONES[tone]} p-4 shadow-sm`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1.5 text-xl font-bold">{money(value)} <span className="text-sm font-medium opacity-60">so'm</span></div>
    </div>
  );
}
