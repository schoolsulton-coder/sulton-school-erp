'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { counterpartiesApi, som, MONTHS } from '@/lib/counterparties';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('uz-UZ');
const fmtDT = (iso: string) => new Date(iso).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function Shell({ title, badge, sub, actions, onClose, children }: {
  title: string; badge?: React.ReactNode; sub?: string; actions?: React.ReactNode; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
          <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><X size={16} /> Yopish</button>
        </div>
        <div className="flex items-start justify-between gap-3 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800">{title}</h2>
              {badge}
            </div>
            {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
          </div>
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        </div>
        <div className="px-6 pb-8">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-50 py-2.5 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className={`text-right ${strong ? 'font-semibold text-slate-800' : 'text-slate-700'}`}>{value ?? '—'}</span>
    </div>
  );
}

function DirBadge({ dir }: { dir: 'IN' | 'OUT' }) {
  return dir === 'IN' ? (
    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">Kirim</span>
  ) : (
    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">Chiqim</span>
  );
}

const DelBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-500 hover:bg-rose-50">
    <Trash2 size={14} /> O&apos;chirish
  </button>
);

/* ===== Yozuv detali (Oldi-berdi / Investitsiya) ===== */
export function EntryDetailPanel({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { data: d } = useQuery({ queryKey: ['entry-detail', id], queryFn: () => counterpartiesApi.entryDetail(id) });
  const del = useMutation({
    mutationFn: () => counterpartiesApi.removeEntry(id),
    onSuccess: () => { onChanged(); onClose(); },
  });
  const isInv = !!d?.counterparty.isInvestor;

  return (
    <Shell
      title={d?.title ?? '...'}
      badge={d && <DirBadge dir={d.direction} />}
      sub={d ? `ID: ${d.id}` : undefined}
      actions={<DelBtn onClick={() => { if (confirm("Yozuv o'chirilsinmi? Hisob balansi qaytariladi.")) del.mutate(); }} />}
      onClose={onClose}
    >
      {d && (
        <>
          <div className={`mb-4 rounded-xl border p-4 ${d.direction === 'IN' ? 'border-emerald-100 bg-emerald-50/50' : 'border-amber-100 bg-amber-50/50'}`}>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Jami</div>
            <div className={`mt-1 text-2xl font-bold ${d.direction === 'IN' ? 'text-emerald-600' : 'text-amber-600'}`}>
              {d.direction === 'IN' ? '+' : '−'}{som(d.amount)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 px-4">
            <Field label="Sana" value={fmtDate(d.date)} />
            <Field label={isInv ? 'Investor' : 'Oldi-berdichi'} value={<span className="font-medium text-brand">{d.counterparty.name}</span>} />
            <Field label="Filial" value={d.branch} />
            {isInv ? (
              <>
                <Field label="Investitsiya turi" value={d.investType} />
                <Field label="O'quv yili" value={d.academicYear} />
                {d.periodMonth && d.periodYear && <Field label="Hisobot davri" value={`${d.periodYear}, ${MONTHS[d.periodMonth - 1]}`} />}
              </>
            ) : (
              <Field label="Sabab" value={d.sabab} />
            )}
            {d.somAmount ? <Field label="So'm summasi" value={`${som(d.somAmount)}`} /> : null}
            {d.kassaTuri && <Field label="Kassa turi (So'm)" value={d.kassaTuri} />}
            {d.somHisob && <Field label="Hisob (So'm)" value={d.somHisob} />}
            {d.dollarAmount ? <Field label="Dollar" value={`$${d.dollarAmount} × ${d.dollarRate ?? 0}`} /> : null}
            {d.dollarHisob && <Field label="Hisob (USD)" value={d.dollarHisob} />}
            {!isInv && d.periodMonth && d.periodYear && <Field label="Yil · Oy" value={`${d.periodYear}, ${MONTHS[d.periodMonth - 1]}`} />}
            {d.capex != null && d.capex > 0 && <Field label="Capex" value={som(d.capex)} />}
            {d.operation != null && d.operation > 0 && <Field label="Operation" value={som(d.operation)} />}
            <Field label="Izoh" value={d.note} />
          </div>
          <div className="mt-3 rounded-xl border border-slate-200 px-4">
            <Field label="Yaratildi" value={`${fmtDT(d.createdAt)}${d.createdBy ? ` · ${d.createdBy}` : ''}`} />
            <Field label="Tahrirlandi" value={`${fmtDT(d.updatedAt)}${d.updatedBy ? ` · ${d.updatedBy}` : ''}`} />
          </div>
        </>
      )}
    </Shell>
  );
}

/* ===== Transfer detali ===== */
export function TransferDetailPanel({ pairId, onClose, onChanged }: { pairId: string; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const { data: d } = useQuery({ queryKey: ['transfer-detail', pairId], queryFn: () => counterpartiesApi.transferDetail(pairId) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['transfer-detail', pairId] }); onChanged(); };
  const confirmed = !!d?.confirmedAt;

  const conf = useMutation({ mutationFn: () => counterpartiesApi.confirmTransfer(pairId, !confirmed), onSuccess: refresh });
  const del = useMutation({ mutationFn: () => counterpartiesApi.removeTransfer(pairId), onSuccess: () => { onChanged(); onClose(); } });

  return (
    <Shell
      title="Transfer"
      sub={d ? `ID: ${d.id}` : undefined}
      actions={
        <>
          <button onClick={() => conf.mutate()} disabled={conf.isPending} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${confirmed ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
            {confirmed ? <><XCircle size={14} /> Tasdiqni bekor qilish</> : <><CheckCircle2 size={14} /> Tasdiqlash</>}
          </button>
          <DelBtn onClick={() => { if (confirm("Transfer o'chirilsinmi? Balanslar qaytariladi.")) del.mutate(); }} />
        </>
      }
      onClose={onClose}
    >
      {d && (
        <>
          <div className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Jami</div>
            <div className="mt-1 text-2xl font-bold text-indigo-600">{som(d.amount)}</div>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
              <div className="text-xs font-medium uppercase text-amber-600">Chiqim</div>
              <div className="mt-0.5 text-sm font-semibold text-slate-800">{d.from?.name ?? '—'}</div>
              <div className="text-xs text-slate-400">{d.fromBranch ?? ''}</div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
              <div className="text-xs font-medium uppercase text-emerald-600">Kirim</div>
              <div className="mt-0.5 text-sm font-semibold text-slate-800">{d.to?.name ?? '—'}</div>
              <div className="text-xs text-slate-400">{d.toBranch ?? ''}</div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 px-4">
            <Field label="Sana" value={fmtDate(d.date)} />
            <Field label="Chiqim tomoni" value={<span className="font-medium text-brand">{d.from?.name}</span>} />
            <Field label="Chiqim filiali" value={d.fromBranch} />
            <Field label="Kirim tomoni" value={<span className="font-medium text-brand">{d.to?.name}</span>} />
            <Field label="Kirim filiali" value={d.toBranch} />
            {d.somAmount ? <Field label="So'm summasi" value={som(d.somAmount)} /> : null}
            {d.fromSomKassa && <Field label="Chiqim kassa turi (So'm)" value={d.fromSomKassa} />}
            {d.fromSomHisob && <Field label="Chiqim hisobi (S)" value={d.fromSomHisob} />}
            {d.toSomKassa && <Field label="Kirim kassa turi (So'm)" value={d.toSomKassa} />}
            {d.toSomHisob && <Field label="Kirim hisobi (S)" value={d.toSomHisob} />}
            {d.dollarAmount ? <Field label="Dollar" value={`$${d.dollarAmount} × ${d.dollarRate ?? 0}`} /> : null}
            {d.fromDollarHisob && <Field label="Chiqim hisobi ($)" value={d.fromDollarHisob} />}
            {d.toDollarHisob && <Field label="Kirim hisobi ($)" value={d.toDollarHisob} />}
            <Field label="Izoh" value={d.note} />
            <Field label="Tasdiq" value={confirmed ? <span className="text-emerald-600">Tasdiqlandi{d.confirmedBy ? ` · ${d.confirmedBy}` : ''}</span> : <span className="text-amber-600">Tasdiqlanmagan</span>} />
          </div>
          <div className="mt-3 rounded-xl border border-slate-200 px-4">
            <Field label="Yaratildi" value={`${fmtDT(d.createdAt)}${d.createdBy ? ` · ${d.createdBy}` : ''}`} />
            <Field label="Tahrirlandi" value={`${fmtDT(d.updatedAt)}${d.updatedBy ? ` · ${d.updatedBy}` : ''}`} />
          </div>
        </>
      )}
    </Shell>
  );
}
