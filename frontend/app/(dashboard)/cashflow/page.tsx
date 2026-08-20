'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Users, ArrowDownLeft, ArrowUpRight, Scale, Wallet, ListOrdered, AlertTriangle, Trash2, Pencil } from 'lucide-react';
import { crmApi } from '@/lib/crm';
import { counterpartiesApi, som, CP_TABS, type CpCategory } from '@/lib/counterparties';
import { StatCard } from '@/components/flow-ui';
import { NewCounterpartyModal, NewTransactionModal, CounterpartyDetailModal } from '@/components/counterparty-modals';
import { NewTransferModal, NewInvestorModal, NewInvestmentModal } from '@/components/investor-modals';
import { FlowAccountsModal } from '@/components/flow-accounts-modal';
import { EntriesTable, TransfersTable } from '@/components/cashflow-views';

const ADD_LABEL: Record<CpCategory, string> = {
  OLDI_BERDICHI: 'Yangi oldi-berdichi',
  OLDI_BERDI: 'Qo\'shish',
  TRANSFER: 'Qo\'shish',
  INVESTOR: 'Yangi investor',
  INVESTITSIYA: 'Qo\'shish',
};

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const last30 = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: iso(from), to: iso(to) };
};

export default function CashflowPage() {
  const qc = useQueryClient();
  const [category, setCategory] = useState<CpCategory>('OLDI_BERDICHI');
  const [subFil, setSubFil] = useState<'false' | 'true'>('false');
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const [modal, setModal] = useState<null | 'cp' | 'tx' | 'transfer' | 'investor' | 'investment'>(null);
  const [showAccounts, setShowAccounts] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const isOB = category === 'OLDI_BERDICHI';
  const isCp = category === 'OLDI_BERDICHI' || category === 'INVESTOR';
  const isEntries = category === 'OLDI_BERDI' || category === 'INVESTITSIYA';
  const isTransfer = category === 'TRANSFER';
  const isInvestitsiya = category === 'INVESTITSIYA';
  const range = useMemo(last30, []);
  const rp = { from: `${range.from}T00:00:00`, to: `${range.to}T23:59:59.999` };

  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });

  const cpQuery = useQuery({
    queryKey: ['counterparties', category, isOB ? subFil : '', branchId, search],
    queryFn: () => counterpartiesApi.list({ category, branchId: branchId || undefined, search: search || undefined, filiallararo: isOB ? subFil : undefined }),
    enabled: isCp,
  });
  const entriesQuery = useQuery({
    queryKey: ['cp-entries', category, branchId, search, range],
    queryFn: () => counterpartiesApi.entriesList({ scope: isInvestitsiya ? 'INVESTITSIYA' : 'OLDI_BERDI', ...rp, search: search || undefined, branchId: branchId || undefined }),
    enabled: isEntries,
  });
  const transfersQuery = useQuery({
    queryKey: ['cp-transfers', branchId, search, range],
    queryFn: () => counterpartiesApi.transfersList({ ...rp, search: search || undefined, branchId: branchId || undefined }),
    enabled: isTransfer,
  });

  const del = useMutation({
    mutationFn: (id: string) => counterpartiesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['counterparties'] }),
  });

  const refresh = () => qc.invalidateQueries();

  const onAdd = () => {
    if (category === 'OLDI_BERDICHI') setModal('cp');
    else if (category === 'OLDI_BERDI') setModal('tx');
    else if (category === 'TRANSFER') setModal('transfer');
    else if (category === 'INVESTOR') setModal('investor');
    else setModal('investment');
  };

  const cpTotals = cpQuery.data?.totals;
  const cpRows = cpQuery.data?.data ?? [];
  const enTotals = entriesQuery.data?.totals;
  const trTotals = transfersQuery.data?.totals;

  const count = isCp ? cpTotals?.shaxslar ?? 0 : isEntries ? enTotals?.count ?? 0 : isTransfer ? trTotals?.count ?? 0 : 0;
  const subtitle = isCp
    ? `${count} ta ${category === 'INVESTOR' ? 'investor' : 'oldi-berdichi'}`
    : category === 'OLDI_BERDI'
    ? `${count} ta tranzaksiya`
    : isTransfer
    ? `${count} ta transfer`
    : `${count} ta investitsiya`;

  return (
    <div className="min-h-full bg-slate-50/60 p-6">
      {/* Sarlavha */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tashqi pul-oqimi</h1>
          <p className="text-sm text-slate-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAccounts(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50">
            <Wallet size={18} /> Hisoblar
          </button>
          <button onClick={onAdd} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark">
            <Plus size={18} /> {ADD_LABEL[category]}
          </button>
        </div>
      </div>

      {/* Tab'lar */}
      <div className="mb-3">
        <div className="inline-flex flex-wrap gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
          {CP_TABS.map((t) => (
            <button key={t.key} onClick={() => setCategory(t.key)} className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${category === t.key ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ost-tab'lar (Oldi-berdichilar) — alohida qatorda */}
      {isOB && (
        <div className="mb-4">
          <div className="inline-flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
            {([['false', 'Qarz oldi-berdi'], ['true', 'Filiallararo']] as const).map(([v, label]) => (
              <button key={v} onClick={() => setSubFil(v)} className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${subFil === v ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stat kartalar */}
      {isCp && (
        <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard tone="sky" label={category === 'INVESTOR' ? 'Investorlar' : 'Shaxslar'} value={`${cpTotals?.shaxslar ?? 0}`} icon={Users} />
          <StatCard tone="emerald" label="Jami kirim" value={som(cpTotals?.jamiKirim ?? 0)} icon={ArrowDownLeft} />
          <StatCard tone="amber" label="Jami chiqim" value={som(cpTotals?.jamiChiqim ?? 0)} icon={ArrowUpRight} />
          <StatCard tone="rose" label={category === 'INVESTOR' ? 'Balans (qoldiq)' : 'Balans'} value={som(cpTotals?.balans ?? 0)} icon={Scale} />
        </div>
      )}
      {isEntries && (
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard tone="emerald" label="Kirim (filtr)" value={som(enTotals?.kirim ?? 0)} icon={ArrowDownLeft} />
          <StatCard tone="amber" label="Chiqim (filtr)" value={som(enTotals?.chiqim ?? 0)} icon={ArrowUpRight} />
          <StatCard tone="rose" label="Balans" value={som(enTotals?.balans ?? 0)} icon={Scale} />
        </div>
      )}
      {isTransfer && (
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard tone="sky" label="Transferlar" value={`${trTotals?.count ?? 0}`} icon={ListOrdered} />
          <StatCard tone="emerald" label="Jami summa" value={som(trTotals?.jami ?? 0)} icon={Scale} />
          <StatCard tone="rose" label="Nosoz" value={`${trTotals?.nosoz ?? 0}`} icon={AlertTriangle} />
        </div>
      )}

      {/* Qidiruv + filial */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={isEntries || isTransfer ? 'Ism, izoh, sabab...' : "Ism bo'yicha izlash..."} className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand focus:bg-white" />
        </div>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="min-w-[220px] flex-1 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-brand focus:bg-white">
          <option value="">Barcha filiallar</option>
          {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {(isEntries || isTransfer) && (
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-500">Sana: Oxirgi 30 kun</span>
        )}
      </div>

      {/* View — tab'ga qarab */}
      {isCp && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Ism</th>
                  <th className="px-5 py-3">{category === 'INVESTOR' ? 'Filiallar' : 'Filial'}</th>
                  <th className="px-5 py-3 text-center">{category === 'INVESTOR' ? 'Investitsiya' : 'Tranzaksiya'}</th>
                  <th className="px-5 py-3 text-right">Kirim</th>
                  <th className="px-5 py-3 text-right">Chiqim</th>
                  <th className="px-5 py-3 text-right">Balans</th>
                  {category === 'INVESTOR' && <th className="px-5 py-3" />}
                </tr>
              </thead>
              <tbody>
                {cpQuery.isLoading ? (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">Yuklanmoqda...</td></tr>
                ) : cpRows.length ? (
                  cpRows.map((c) => (
                    <tr key={c.id} onClick={() => setDetailId(c.id)} className="cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-brand/[0.03]">
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{c.name}</td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {category === 'INVESTOR' ? (c.branches.length ? c.branches.map((b) => b.name).join(', ') : '—') : c.branch?.name ?? '—'}
                      </td>
                      <td className="px-5 py-3.5 text-center text-slate-500">{c.tranzaksiya}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-emerald-600">{som(c.kirim)}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-amber-600">{som(c.chiqim)}</td>
                      <td className={`whitespace-nowrap px-5 py-3.5 text-right font-semibold ${c.balans >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{som(c.balans)}</td>
                      {category === 'INVESTOR' && (
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setDetailId(c.id)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><Pencil size={14} /></button>
                            <button onClick={() => { if (confirm("Investor o'chirilsinmi?")) del.mutate(c.id); }} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">Yozuv yo&apos;q — «{ADD_LABEL[category]}» bilan qo&apos;shing</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {isEntries && <EntriesTable rows={entriesQuery.data?.data ?? []} isInvestor={isInvestitsiya} loading={entriesQuery.isLoading} />}
      {isTransfer && <TransfersTable rows={transfersQuery.data?.data ?? []} loading={transfersQuery.isLoading} />}

      {modal === 'cp' && <NewCounterpartyModal category={category} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
      {modal === 'tx' && <NewTransactionModal onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
      {modal === 'transfer' && <NewTransferModal onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
      {modal === 'investor' && <NewInvestorModal onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
      {modal === 'investment' && <NewInvestmentModal onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
      {showAccounts && <FlowAccountsModal onClose={() => setShowAccounts(false)} />}
      {detailId && <CounterpartyDetailModal id={detailId} onClose={() => setDetailId(null)} onChanged={refresh} />}
    </div>
  );
}
