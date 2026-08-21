'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Trash2, CheckCircle2, XCircle, Pencil } from 'lucide-react';
import { som } from '@/lib/counterparties';
import { internalTransfersApi, usd, type ItDetail } from '@/lib/internal-transfers';

const numFmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0));
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('uz-UZ');
const fmtDT = (iso: string) => new Date(iso).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function Field({ label, value, link }: { label: string; value: React.ReactNode; link?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-50 py-2.5 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className={`text-right ${link ? 'font-medium text-brand' : 'font-medium text-slate-800'}`}>{value ?? '—'}</span>
    </div>
  );
}

export function InternalDetailPanel({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const { data: d } = useQuery({ queryKey: ['it-detail', id], queryFn: () => internalTransfersApi.detail(id) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['it-detail', id] }); onChanged(); };
  const conf = useMutation({ mutationFn: (c: boolean) => internalTransfersApi.confirm(id, c), onSuccess: refresh });
  const del = useMutation({ mutationFn: () => internalTransfersApi.remove(id), onSuccess: () => { onChanged(); onClose(); } });

  const kindTitle: Record<string, string> = { SOM: "So'm o'tkazma", DOLLAR: "Dollar o'tkazma", VALYUTA: 'Valyuta ayirboshlash', PUL: 'Pul ayirboshlash' };
  const isSimple = d?.kind === 'SOM' || d?.kind === 'DOLLAR';

  // Valyuta yo'nalishi
  const buy = d?.toCur === 'USD';
  const dollarHisob = d ? (d.fromCur === 'USD' ? d.from : d.to) : null;
  const dollarKassa = d ? (d.fromCur === 'USD' ? d.fromKassa : d.toKassa) : null;
  const somHisob = d ? (d.fromCur === 'SOM' ? d.from : d.to) : null;
  const somKassa = d ? (d.fromCur === 'SOM' ? d.fromKassa : d.toKassa) : null;
  // Pul
  const pulUsd = (d?.dollarAmount ?? 0) > 0;
  const pulAmt = pulUsd ? d?.dollarAmount ?? 0 : d?.somAmount ?? 0;
  const pulFmt = (n: number) => (pulUsd ? usd(n) : som(n));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
          <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><X size={16} /> Yopish</button>
          <span className="text-sm text-slate-400">To&apos;liq sahifa →</span>
        </div>

        {d && (
          <div className="px-6 pb-8">
            {/* Sarlavha + amallar */}
            <div className="flex items-start justify-between gap-3 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-800">{kindTitle[d.kind]}</h2>
                  {isSimple && d.confirmed && <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600 ring-1 ring-emerald-100">Tasdiqlandi</span>}
                </div>
                <div className="mt-0.5 text-xs text-slate-400">ID: {d.id}</div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {isSimple && (
                  <button onClick={() => conf.mutate(!d.confirmed)} disabled={conf.isPending} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${d.confirmed ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                    {d.confirmed ? <><XCircle size={14} /> Tasdiqni bekor qilish</> : <><CheckCircle2 size={14} /> Tasdiqlash</>}
                  </button>
                )}
                <button title="Tez orada" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-500"><Pencil size={14} /> Tahrirlash</button>
                <button onClick={() => { if (confirm("O'chirilsinmi? Balanslar qaytariladi.")) del.mutate(); }} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-500 hover:bg-rose-50"><Trash2 size={14} /> O&apos;chirish</button>
              </div>
            </div>

            {/* SUMMA */}
            {d.kind === 'SOM' && (
              <div className="mb-4 rounded-xl border border-sky-100 bg-sky-50/40 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Summa</div>
                <div className="mt-1 text-2xl font-bold text-sky-700">{numFmt(d.somAmount)} <span className="text-base font-medium text-slate-400">so&apos;m</span></div>
              </div>
            )}
            {d.kind === 'DOLLAR' && (
              <div className="mb-4 rounded-xl border border-sky-100 bg-sky-50/40 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Summa</div>
                <div className="mt-1 text-2xl font-bold text-sky-700">{usd(d.dollarAmount)}</div>
                {d.dollarRate > 0 && <div className="text-xs text-slate-500">Kurs: {numFmt(d.dollarRate)} — ≈ {som(d.dollarAmount * d.dollarRate)}</div>}
              </div>
            )}
            {d.kind === 'VALYUTA' && (
              <div className="mb-4 flex items-center justify-between rounded-xl border border-sky-100 bg-sky-50/40 p-4">
                <div>
                  <div className="text-xs font-medium uppercase text-emerald-600">Dollar {buy ? 'olamiz' : 'sotamiz'}</div>
                  <div className="mt-1 text-2xl font-bold text-emerald-600">{buy ? '+' : '−'}{usd(d.dollarAmount)} <span className="text-xs font-medium text-slate-400">Kirim</span></div>
                  <div className="text-xs text-slate-500">Kurs: {numFmt(d.dollarRate)}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-amber-600">{buy ? '−' : '+'}{numFmt(d.somAmount)} <span className="text-base font-medium text-slate-400">so&apos;m</span></div>
                  <div className="text-xs text-slate-400">Chiqim</div>
                </div>
              </div>
            )}
            {d.kind === 'PUL' && (
              <div className="mb-4 rounded-xl border border-sky-100 bg-sky-50/40 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Pul ayirboshlash · {pulUsd ? 'Dollar' : "So'm"}</div>
                <div className="mt-1 text-2xl font-bold text-sky-700">{pulFmt(pulAmt)}</div>
              </div>
            )}

            {/* Maydonlar */}
            <div className="rounded-xl border border-slate-200 px-4">
              <Field label="Sana" value={fmtDate(d.date)} />
              {isSimple && <Field label="Kassa turi" value={d.kassaTuri} />}
              <Field label="Filial" value={d.branch} />
              {isSimple && <><Field label="Jo'natuvchi hisob" value={d.from} link /><Field label="Qabul qiluvchi hisob" value={d.to} link /></>}
              {d.kind === 'VALYUTA' && (
                <>
                  <Field label="Dollar kassa turi" value={dollarKassa} />
                  <Field label="Dollar hisob" value={dollarHisob} link />
                  <Field label="So'm kassa turi" value={somKassa} />
                  <Field label="So'm hisob" value={somHisob} link />
                </>
              )}
              {d.kind === 'PUL' && (
                <>
                  <Field label="Valyuta" value={pulUsd ? 'Dollar' : "So'm"} />
                  <Field label="Manba kassa turi" value={d.fromKassa} />
                  <Field label="Manba hisob" value={d.from} link />
                  <Field label={`Manba summasi (${pulUsd ? '$' : "so'm"})`} value={numFmt(pulAmt)} />
                  <Field label="Maqsad kassa turi" value={d.toKassa} />
                  <Field label="Maqsad hisob" value={d.to} link />
                  <Field label={`Maqsadga yetib boradi (${pulUsd ? '$' : "so'm"})`} value={numFmt(pulAmt - d.loss)} />
                </>
              )}
              <Field label="Izoh" value={d.note} />
            </div>

            {/* Audit */}
            <div className="mt-3 rounded-xl border border-slate-200 px-4">
              <Field label="Yaratildi" value={`${fmtDT(d.createdAt)}${d.createdBy ? ` · ${d.createdBy}` : ''}`} />
              <Field label="Tahrirlandi" value={`${fmtDT(d.updatedAt)}${d.updatedBy ? ` · ${d.updatedBy}` : ''}`} />
              {isSimple && d.confirmed && <Field label="Tasdiqladi" value={d.confirmedBy ?? '—'} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
