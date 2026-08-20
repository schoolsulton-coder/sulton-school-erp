'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, Trash2, Pencil } from 'lucide-react';
import { counterpartiesApi, som, MONTHS, type OpRow } from '@/lib/counterparties';
import { StatCard, Panel } from '@/components/flow-ui';
import { NewTransactionModal } from '@/components/counterparty-modals';
import { NewTransferModal, NewInvestmentModal } from '@/components/investor-modals';
import { EntryDetailPanel, TransferDetailPanel } from '@/components/detail-panels';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('uz-UZ');

function TypeBadge({ type }: { type: OpRow['type'] }) {
  const map = {
    TRANZAKSIYA: 'bg-slate-100 text-slate-600',
    TRANSFER: 'bg-indigo-50 text-indigo-600',
    INVESTITSIYA: 'bg-violet-50 text-violet-600',
  };
  const label = { TRANZAKSIYA: 'Tranzaksiya', TRANSFER: 'Transfer', INVESTITSIYA: 'Investitsiya' };
  return <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${map[type]}`}>{label[type]}</span>;
}
function DirBadge({ dir }: { dir: 'IN' | 'OUT' }) {
  return dir === 'IN' ? (
    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">Kirim</span>
  ) : (
    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">Chiqim</span>
  );
}

export default function EntityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: d, isLoading } = useQuery({ queryKey: ['entity-detail', id], queryFn: () => counterpartiesApi.detail(id) });
  const [modal, setModal] = useState<null | 'tx' | 'transfer' | 'investment'>(null);
  const [entryPanelId, setEntryPanelId] = useState<string | null>(null);
  const [transferPanelId, setTransferPanelId] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ['entity-detail', id] });
  const delEntry = useMutation({ mutationFn: (eid: string) => counterpartiesApi.removeEntry(eid), onSuccess: refresh });
  const delTransfer = useMutation({ mutationFn: (pid: string) => counterpartiesApi.removeTransfer(pid), onSuccess: refresh });
  const delEntity = useMutation({ mutationFn: () => counterpartiesApi.remove(id), onSuccess: () => router.push('/cashflow') });

  if (isLoading) return <div className="p-6 text-slate-400">Yuklanmoqda...</div>;
  if (!d) return null;
  const isInv = d.category === 'INVESTOR';
  const t = d.totals;

  const openOp = (op: OpRow) => {
    if (op.type === 'TRANSFER' && op.transferPairId) setTransferPanelId(op.transferPairId);
    else setEntryPanelId(op.id);
  };
  const delOp = (op: OpRow, e: React.MouseEvent) => {
    e.stopPropagation();
    if (op.type === 'TRANSFER' && op.transferPairId) {
      if (confirm("Transfer o'chirilsinmi?")) delTransfer.mutate(op.transferPairId);
    } else if (confirm("Yozuv o'chirilsinmi?")) delEntry.mutate(op.id);
  };

  const btn = 'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold shadow-sm transition';

  return (
    <div className="min-h-full bg-slate-50/60 p-6">
      <button onClick={() => router.push('/cashflow')} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ChevronLeft size={16} /> {isInv ? 'Investorlar' : 'Oldi-berdichilar'} ro&apos;yxati
      </button>

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">{d.name}</h1>
            {d.filiallararo && <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-600">Filiallararo</span>}
          </div>
          <div className="text-sm text-slate-400">{isInv ? d.branches.join(', ') : d.branch}</div>
          {d.filiallararo && d.pairName && (
            <div className="text-sm text-slate-500">Juftlik: <span className="font-medium">{d.pairName}</span>{d.pairBranch ? ` (${d.pairBranch})` : ''}</div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isInv ? (
            <>
              <button onClick={() => setModal('investment')} className={`${btn} bg-emerald-500 text-white hover:bg-emerald-600`}><Plus size={16} /> Kirim</button>
              <button onClick={() => setModal('investment')} className={`${btn} bg-amber-500 text-white hover:bg-amber-600`}><Plus size={16} /> Chiqim (dividend)</button>
            </>
          ) : d.filiallararo ? (
            <button onClick={() => setModal('transfer')} className={`${btn} bg-brand text-white hover:bg-brand-dark`}><Plus size={16} /> Transfer</button>
          ) : (
            <button onClick={() => setModal('tx')} className={`${btn} bg-brand text-white hover:bg-brand-dark`}><Plus size={16} /> Tranzaksiya</button>
          )}
          <button className={`${btn} border border-slate-200 bg-white text-slate-500`} disabled title="Tez orada"><Pencil size={15} /> Tahrirlash</button>
          <button onClick={() => { if (confirm("O'chirilsinmi?")) delEntity.mutate(); }} className={`${btn} border border-rose-200 bg-white text-rose-500 hover:bg-rose-50`}><Trash2 size={15} /> O&apos;chirish</button>
        </div>
      </div>

      {/* Stat kartalar */}
      {isInv ? (
        <>
          <div className="mb-3 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard tone="sky" label="Operatsiyalar" value={`${t.operatsiyalar}`} icon={Plus} />
            <StatCard tone="emerald" label="Kirim" value={som(t.kirim)} icon={Plus} />
            <StatCard tone="amber" label="Chiqim" value={som(t.chiqim)} icon={Plus} />
            <StatCard tone="violet" label="Capex" value={som(t.capex)} icon={Plus} />
            <StatCard tone="rose" label="Operation" value={som(t.operation)} icon={Plus} />
          </div>
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-emerald-600">Qoldiq (Kirim − Chiqim)</div>
              <div className="mt-1 text-xl font-bold text-emerald-700">{som(t.balans)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Filiallar</div>
              <div className="mt-1 text-sm font-medium text-slate-700">{d.branches.join(', ') || '—'}</div>
            </div>
          </div>
        </>
      ) : (
        <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard tone="sky" label="Operatsiyalar" value={`${t.operatsiyalar} (${t.tranzaksiya}+${t.transfer}+${t.sotuv})`} icon={Plus} />
          <StatCard tone="emerald" label="Kirim" value={som(t.kirim)} icon={Plus} />
          <StatCard tone="amber" label="Chiqim" value={som(t.chiqim)} icon={Plus} />
          <div className={`flex flex-col justify-center rounded-2xl border p-4 shadow-sm ${t.balans >= 0 ? 'border-emerald-100 bg-emerald-50/40' : 'border-rose-100 bg-rose-50/40'}`}>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Balans</div>
            <div className={`mt-1 text-xl font-bold ${t.balans >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{som(t.balans)}</div>
            <div className="text-xs text-slate-400">{t.balans > 0 ? 'Bu hisob qarzdor' : t.balans < 0 ? 'Biz qarzdormiz' : ''}</div>
          </div>
        </div>
      )}

      {/* Operatsiyalar */}
      <Panel title={`Operatsiyalar (${t.operatsiyalar})`} hint="Xronologik tartib · Balans = har bir operatsiyadan keyingi qoldiq">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Sana</th>
                {!isInv && <th className="px-5 py-3">Tur</th>}
                <th className="px-5 py-3">Yo&apos;nalish</th>
                <th className="px-5 py-3">{isInv ? 'Investitsiya turi / Izoh' : 'Sabab / Nom'}</th>
                {isInv && <th className="px-5 py-3 text-right">Capex / Op</th>}
                {!isInv && <th className="px-5 py-3">Izoh</th>}
                <th className="px-5 py-3 text-right">Summa</th>
                {!isInv && <th className="px-5 py-3 text-right">Balans</th>}
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {d.operations.length ? (
                d.operations.map((op) => (
                  <tr key={op.id} onClick={() => openOp(op)} className="cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-brand/[0.03]">
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{fmtDate(op.date)}</td>
                    {!isInv && <td className="px-5 py-3.5"><TypeBadge type={op.type} /></td>}
                    <td className="px-5 py-3.5"><DirBadge dir={op.direction} /></td>
                    <td className="px-5 py-3.5">
                      {isInv ? (
                        <>
                          {op.investType && <div className="text-slate-700">{op.investType}</div>}
                          {op.academicYear && <div className="text-xs text-slate-400">O&apos;quv yili: {op.academicYear}</div>}
                          {op.note && <div className="text-xs text-slate-400">{op.note}</div>}
                        </>
                      ) : (
                        <>
                          <div className="text-slate-700">{op.sabab ?? (op.type === 'TRANSFER' ? 'Transfer' : '—')}</div>
                          {op.note && <div className="text-xs text-slate-400">{op.note}</div>}
                        </>
                      )}
                    </td>
                    {isInv && (
                      <td className="whitespace-nowrap px-5 py-3.5 text-right text-xs text-slate-500">
                        K: {som(op.capex ?? 0)}<br />O: {som(op.operation ?? 0)}
                      </td>
                    )}
                    {!isInv && <td className="px-5 py-3.5 text-slate-500">{op.hisob ?? '—'}</td>}
                    <td className={`whitespace-nowrap px-5 py-3.5 text-right font-semibold ${op.direction === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {op.direction === 'IN' ? '+' : '−'}{som(op.amount)}
                    </td>
                    {!isInv && <td className="whitespace-nowrap px-5 py-3.5 text-right text-slate-600">{som(op.balans)}</td>}
                    <td className="px-5 py-3.5">
                      <button onClick={(e) => delOp(op, e)} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">Operatsiya yo&apos;q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {modal === 'tx' && <NewTransactionModal onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
      {modal === 'transfer' && <NewTransferModal onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
      {modal === 'investment' && <NewInvestmentModal onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
      {entryPanelId && <EntryDetailPanel id={entryPanelId} onClose={() => setEntryPanelId(null)} onChanged={refresh} />}
      {transferPanelId && <TransferDetailPanel pairId={transferPanelId} onClose={() => setTransferPanelId(null)} onChanged={refresh} />}
    </div>
  );
}
