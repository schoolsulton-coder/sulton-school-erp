'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Pencil } from 'lucide-react';
import { hrApi, SALARY_LABEL, type LavozimDetail, type LavozimKelishuv, type KelishuvForm } from '@/lib/hr';
import { money } from '@/lib/finance';
import { KelishuvFields, validateKelishuv } from '@/components/kelishuv-fields';

const UZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const periodLabel = (p: string) => { const [y, m] = p.split('-').map(Number); return `${UZ_MONTHS[m - 1]} ${y}`; };
const fmtDate = (iso?: string | null) => { if (!iso) return '—'; const s = new Date(iso).toLocaleDateString('en-CA'); const [y, m, d] = s.split('-'); return `${d}.${m}.${y}`; };
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export function LavozimDetailPanel({ employeeId, onClose, onChanged }: { employeeId: string; onClose: () => void; onChanged?: () => void }) {
  const qc = useQueryClient();
  const [editKelishuv, setEditKelishuv] = useState(false);
  const { data: d, isLoading } = useQuery({ queryKey: ['lavozim-detail', employeeId], queryFn: () => hrApi.lavozimDetail(employeeId) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['lavozim-detail', employeeId] }); onChanged?.(); };

  const k = d?.kelishuv;
  const isHourly = k?.hisobKitob === 'Soatbay';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-3xl overflow-y-auto bg-slate-50 shadow-2xl">
        {isLoading || !d ? (
          <div className="p-10 text-center text-slate-400">Yuklanmoqda…</div>
        ) : (
          <>
            {/* Sarlavha */}
            <div className="sticky top-0 z-10 flex items-start gap-4 border-b border-slate-200 bg-white px-6 py-4">
              <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-lg font-bold text-slate-600">{initials(d.fio)}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Lavozim</div>
                <h2 className="truncate text-xl font-bold text-slate-800">{d.fio}</h2>
                <div className="text-sm text-slate-500">{d.position ?? '—'}</div>
                <div className="text-xs text-slate-400">{d.branch ?? '—'}{d.department ? ` · ${d.department}` : ''}</div>
              </div>
              <button onClick={() => setEditKelishuv(true)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Tahrirlash</button>
              <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
            </div>

            <div className="space-y-4 p-6">
              {/* Kartalar */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <Card label="Hisob-kitob" value={k?.hisobKitob ?? '—'} sub={d.formal ? 'Rasmiy' : 'Norasmiy'} />
                <Card label="Stavka" value={money(d.cards.stavka)} />
                <Card label="Jami hisob" value={money(d.cards.jamiHisob)} sub={`${d.cards.oyCount} oy`} />
                <Card label="Jami berilgan" value={money(d.cards.jamiBerilgan)} sub={`${d.cards.tolovCount} to'lov`} valueClass="text-emerald-600" />
                <Card label="Qoldiq balans" value={money(d.cards.qoldiqBalans)} sub={d.cards.qoldiqBalans === 0 ? 'teng' : d.cards.qoldiqBalans > 0 ? 'haqdor' : 'qarzdor'} valueClass={d.cards.qoldiqBalans === 0 ? 'text-slate-800' : d.cards.qoldiqBalans > 0 ? 'text-amber-600' : 'text-rose-600'} />
              </div>

              {/* Tafsilotlar */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Tafsilotlar</h3>
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                  <Row label="Rasmiylik" value={d.formal ? 'Rasmiy' : 'Norasmiy'} />
                  <Row label="Soliqni kim to'laydi" value={k?.soliqKim ?? '—'} />
                  <Row label="Hisob-kitob turi" value={k?.hisobKitob ?? '—'} />
                  <Row label="Bandlik" value={d.employment ?? '—'} />
                  <Row label={isHourly ? 'Soatbay narxi' : "O'zgarmas oylik"} value={k ? money(k.baseRate) : '—'} />
                  <Row label="Rasmiy oyligi" value={k?.rasmiyOyligi != null ? money(k.rasmiyOyligi) : '—'} />
                  <Row label="Kim ishlaydi" value={d.kimIshlaydi ?? '—'} />
                  <Row label="Kelishuv davri" value={k?.startDate ? `${fmtDate(k.startDate)} — ${k.endDate ? fmtDate(k.endDate) : 'joriy'}` : '—'} />
                </div>
              </div>

              {/* Oylik xulosa */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between px-5 py-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Oylik xulosa ({d.oylar.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="border-y border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-5 py-2.5">Oy</th>
                        <th className="px-5 py-2.5 text-right">Hisoblangan</th>
                        <th className="px-5 py-2.5 text-right">Berilgan</th>
                        <th className="px-5 py-2.5 text-right">Qoldiq</th>
                        <th className="px-5 py-2.5 text-right">Davr balansi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.oylar.map((o) => (
                        <tr key={o.id} className="border-b border-slate-50 last:border-0">
                          <td className="px-5 py-3">
                            <span className="font-medium text-slate-700">{periodLabel(o.period)}</span>
                            <span className={`ml-2 rounded px-1.5 py-0.5 text-[11px] font-medium ${o.confirmed ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{o.confirmed ? 'Tasdiqlandi' : 'Tasdiqlashga'}</span>
                          </td>
                          <td className="px-5 py-3 text-right text-slate-700">{money(o.hisoblangan)}</td>
                          <td className="px-5 py-3 text-right text-emerald-600">{money(o.berilgan)}</td>
                          <td className={`px-5 py-3 text-right ${o.qoldiq === 0 ? 'text-slate-400' : o.qoldiq > 0 ? 'text-amber-600' : 'text-rose-600'}`}>{money(o.qoldiq)}</td>
                          <td className="px-5 py-3 text-right text-slate-500">{money(o.davrBalansi)}</td>
                        </tr>
                      ))}
                      {!d.oylar.length && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Hali oylik hisoblanmagan</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Kelishuvlar */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Kelishuvlar {k ? '(1)' : '(0)'}</h3>
                </div>
                {k ? (
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-slate-700">{k.startDate ? `${fmtDate(k.startDate)} — ${k.endDate ? fmtDate(k.endDate) : 'joriy'}` : 'Sanasiz'}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5">{d.formal ? 'Rasmiy' : 'Norasmiy'}</span>
                        <span>{k.hisobKitob ?? '—'}</span>
                        <span className="font-medium text-slate-700">{money(k.baseRate)}</span>
                      </div>
                    </div>
                    <button onClick={() => setEditKelishuv(true)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"><Pencil size={13} /> Tahrirlash</button>
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-slate-400">Kelishuv yo&apos;q — Tahrirlash orqali qo&apos;shing</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {editKelishuv && d && (
        <KelishuvModal employeeId={employeeId} kelishuv={d.kelishuv} onClose={() => setEditKelishuv(false)} onSaved={() => { setEditKelishuv(false); refresh(); }} />
      )}
    </div>
  );
}

function Card({ label, value, sub, valueClass }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-0.5 truncate text-lg font-bold ${valueClass ?? 'text-slate-800'}`} title={value}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm text-slate-700">{value}</div>
    </div>
  );
}

export function KelishuvModal({ employeeId, kelishuv, onClose, onSaved }: { employeeId: string; kelishuv: LavozimKelishuv | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<KelishuvForm>({
    startDate: kelishuv?.startDate ? kelishuv.startDate.slice(0, 10) : '',
    endDate: kelishuv?.endDate ? kelishuv.endDate.slice(0, 10) : '',
    formal: kelishuv?.formal ?? false,
    hisobKitob: kelishuv?.hisobKitob ?? 'Kunbay',
    baseRate: kelishuv?.baseRate != null ? String(kelishuv.baseRate) : '',
    rasmiyOyligi: kelishuv?.rasmiyOyligi != null ? String(kelishuv.rasmiyOyligi) : '',
    soliqKim: kelishuv?.soliqKim ?? '',
    note: kelishuv?.note ?? '',
  });
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: () => hrApi.updateKelishuv(employeeId, {
      startDate: f.startDate || undefined, endDate: f.endDate || undefined, formal: f.formal,
      hisobKitob: f.hisobKitob, baseRate: f.baseRate || undefined,
      rasmiyOyligi: f.rasmiyOyligi || undefined, soliqKim: f.soliqKim || undefined, note: f.note || undefined,
    }),
    onSuccess: onSaved,
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });
  const submit = () => { setError(''); const err = validateKelishuv(f); if (err) return setError(err); save.mutate(); };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="mt-10 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-800">Kelishuvni tahrirlash</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <KelishuvFields value={f} onChange={setF} />
          {error && <p className="mt-3 text-sm font-medium text-rose-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Bekor</button>
          <button onClick={submit} disabled={save.isPending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">{save.isPending ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </div>
      </div>
    </div>
  );
}
