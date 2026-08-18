'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Users, ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react';
import { crmApi } from '@/lib/crm';
import { counterpartiesApi, som, CP_TABS, type CpCategory } from '@/lib/counterparties';
import { StatCard } from '@/components/flow-ui';
import { NewCounterpartyModal, NewTransactionModal, CounterpartyDetailModal } from '@/components/counterparty-modals';
import { NewTransferModal, NewInvestorModal, NewInvestmentModal } from '@/components/investor-modals';

const ADD_LABEL: Record<CpCategory, string> = {
  OLDI_BERDICHI: 'Yangi oldi-berdichi',
  OLDI_BERDI: 'Yangi tranzaksiya',
  TRANSFER: 'Yangi transfer',
  SOTUV: 'Yangi sotuv',
  INVESTOR: 'Yangi investor',
  INVESTITSIYA: 'Yangi investitsiya',
};

export default function CashflowPage() {
  const qc = useQueryClient();
  const [category, setCategory] = useState<CpCategory>('OLDI_BERDICHI');
  const [subFil, setSubFil] = useState<'false' | 'true'>('false'); // Qarz oldi-berdi / Filiallararo
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const [modal, setModal] = useState<null | 'cp' | 'tx' | 'transfer' | 'investor' | 'investment'>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const isOB = category === 'OLDI_BERDICHI';

  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data, isLoading } = useQuery({
    queryKey: ['counterparties', category, isOB ? subFil : '', branchId, search],
    queryFn: () =>
      counterpartiesApi.list({
        category,
        branchId: branchId || undefined,
        search: search || undefined,
        filiallararo: isOB ? subFil : undefined,
      }),
  });

  const totals = data?.totals;
  const rows = data?.data ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ['counterparties'] });

  const onAdd = () => {
    if (category === 'OLDI_BERDICHI') setModal('cp');
    else if (category === 'OLDI_BERDI') setModal('tx');
    else if (category === 'TRANSFER') setModal('transfer');
    else if (category === 'INVESTOR') setModal('investor');
    else if (category === 'INVESTITSIYA') setModal('investment');
    else alert('Sotuvlar formasi keyinroq qo\'shiladi.');
  };

  return (
    <div className="min-h-full bg-slate-50/60 p-6">
      {/* Sarlavha */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tashqi pul-oqimi</h1>
          <p className="text-sm text-slate-400">{totals?.shaxslar ?? 0} ta oldi-berdichi</p>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          <Plus size={18} /> {ADD_LABEL[category]}
        </button>
      </div>

      {/* Tab'lar */}
      <div className="mb-3 inline-flex flex-wrap gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        {CP_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setCategory(t.key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              category === t.key ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Ost-tab'lar (faqat Oldi-berdichilar) */}
      {isOB && (
        <div className="mb-4 inline-flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
          {([['false', 'Qarz oldi-berdi'], ['true', 'Filiallararo']] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setSubFil(v)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                subFil === v ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Stat kartalar */}
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard tone="sky" label="Shaxslar" value={`${totals?.shaxslar ?? 0}`} icon={Users} />
        <StatCard tone="emerald" label="Jami kirim" value={som(totals?.jamiKirim ?? 0)} icon={ArrowDownLeft} />
        <StatCard tone="amber" label="Jami chiqim" value={som(totals?.jamiChiqim ?? 0)} icon={ArrowUpRight} />
        <StatCard tone="rose" label="Balans" value={som(totals?.balans ?? 0)} icon={Scale} />
      </div>

      {/* Qidiruv + filial */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ism bo'yicha izlash..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand focus:bg-white"
          />
        </div>
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="min-w-[220px] flex-1 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-brand focus:bg-white"
        >
          <option value="">Barcha filiallar</option>
          {branches?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Jadval */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Ism</th>
                <th className="px-5 py-3">Filial</th>
                <th className="px-5 py-3 text-center">Tranzaksiya</th>
                <th className="px-5 py-3 text-right">Kirim</th>
                <th className="px-5 py-3 text-right">Chiqim</th>
                <th className="px-5 py-3 text-right">Balans</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setDetailId(c.id)}
                    className="cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-brand/[0.03]"
                  >
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{c.name}</td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {category === 'INVESTOR'
                        ? c.branches.length
                          ? c.branches.map((b) => b.name).join(', ')
                          : '—'
                        : c.branch?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-500">{c.tranzaksiya}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-emerald-600">{som(c.kirim)}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-amber-600">{som(c.chiqim)}</td>
                    <td
                      className={`whitespace-nowrap px-5 py-3.5 text-right font-semibold ${
                        c.balans >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {som(c.balans)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    Yozuv yo&apos;q — «{ADD_LABEL[category]}» bilan qo&apos;shing
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'cp' && (
        <NewCounterpartyModal
          category={category}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            refresh();
          }}
        />
      )}
      {modal === 'tx' && (
        <NewTransactionModal
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            refresh();
          }}
        />
      )}
      {modal === 'transfer' && (
        <NewTransferModal onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />
      )}
      {modal === 'investor' && (
        <NewInvestorModal onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />
      )}
      {modal === 'investment' && (
        <NewInvestmentModal onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />
      )}
      {detailId && <CounterpartyDetailModal id={detailId} onClose={() => setDetailId(null)} onChanged={refresh} />}
    </div>
  );
}
