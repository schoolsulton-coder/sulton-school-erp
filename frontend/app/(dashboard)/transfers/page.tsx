'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ArrowDownLeft, ArrowUpRight, Scale, ListOrdered, AlertTriangle } from 'lucide-react';
import { crmApi } from '@/lib/crm';
import { som } from '@/lib/counterparties';
import { internalTransfersApi, usd, IT_TABS, type ItKind } from '@/lib/internal-transfers';
import { StatCard } from '@/components/flow-ui';
import { TransferTable, ValyutaTable, PulTable } from '@/components/internal-views';
import { InternalTransferForm } from '@/components/internal-transfer-form';
import { InternalDetailPanel } from '@/components/internal-detail';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const last30 = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: iso(from), to: iso(to) };
};

export default function TransfersPage() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<ItKind>('SOM');
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const range = useMemo(last30, []);
  const rp = { from: `${range.from}T00:00:00`, to: `${range.to}T23:59:59.999` };

  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data, isLoading } = useQuery({
    queryKey: ['it', kind, branchId, search, range],
    queryFn: () => internalTransfersApi.list({ kind, ...rp, search: search || undefined, branchId: branchId || undefined }),
  });

  const t = data?.totals ?? {};
  const rows = data?.data ?? [];
  const count = t.count ?? 0;
  const subtitle = kind === 'SOM' || kind === 'DOLLAR' ? `${count} ta o'tkazma` : `${count} ta yozuv`;

  return (
    <div className="min-h-full bg-slate-50/60 p-6">
      {/* Sarlavha */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ichki pul oqimi</h1>
          <p className="text-sm text-slate-400">{subtitle}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark">
          <Plus size={18} /> Qo&apos;shish
        </button>
      </div>

      {/* Ost-tab'lar */}
      <div className="mb-4">
        <div className="inline-flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
          {IT_TABS.map((tb) => (
            <button key={tb.key} onClick={() => setKind(tb.key)} className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${kind === tb.key ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat kartalar */}
      {(kind === 'SOM' || kind === 'DOLLAR') && (
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard tone="sky" label={`Jami summa (filtr) — ${kind === 'SOM' ? "So'm" : 'Dollar'}`} value={kind === 'SOM' ? som(t.jamiSom ?? 0) : usd(t.jamiDollar ?? 0)} icon={Scale} />
          <StatCard tone="violet" label="O'tkazmalar" value={`${count}`} icon={ListOrdered} />
        </div>
      )}
      {kind === 'VALYUTA' && (
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard tone="emerald" label="Jami dollar (filtr)" value={usd(t.jamiDollar ?? 0)} icon={ArrowDownLeft} />
          <StatCard tone="sky" label="Jami so'm (filtr)" value={som(t.jamiSom ?? 0)} icon={ArrowUpRight} />
        </div>
      )}
      {kind === 'PUL' && (
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard tone="sky" label="Jami chiqim (so'm)" value={som(t.jamiChiqim ?? 0)} icon={ArrowUpRight} />
          <StatCard tone="emerald" label="Jami kirim (so'm)" value={som(t.jamiKirim ?? 0)} icon={ArrowDownLeft} />
          <StatCard tone="amber" label="Yo'qotish (so'm)" value={som(t.yoqotish ?? 0)} icon={AlertTriangle} />
        </div>
      )}

      {/* Qidiruv + filial + sana */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filial, hisob, izoh..." className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand focus:bg-white" />
        </div>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="min-w-[200px] rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-brand focus:bg-white">
          <option value="">Barcha filiallar</option>
          {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-500">Sana: Oxirgi 30 kun</span>
      </div>

      {/* Jadval */}
      {(kind === 'SOM' || kind === 'DOLLAR') && <TransferTable rows={rows} dollar={kind === 'DOLLAR'} loading={isLoading} onRow={setDetailId} />}
      {kind === 'VALYUTA' && <ValyutaTable rows={rows} loading={isLoading} onRow={setDetailId} />}
      {kind === 'PUL' && <PulTable rows={rows} loading={isLoading} onRow={setDetailId} />}

      {showForm && (
        <InternalTransferForm
          kind={kind}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['it'] }); }}
        />
      )}
      {detailId && (
        <InternalDetailPanel id={detailId} onClose={() => setDetailId(null)} onChanged={() => qc.invalidateQueries({ queryKey: ['it'] })} />
      )}
    </div>
  );
}
