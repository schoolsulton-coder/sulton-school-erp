'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Calculator, ListChecks, CheckCircle2, XCircle } from 'lucide-react';
import { crmApi } from '@/lib/crm';
import { hrApi, type OylikRow, type OylikDetail } from '@/lib/hr';

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const numFmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0));
const now = new Date();
const YEARS = [2024, 2025, 2026, 2027];
const selCls = 'rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-brand focus:bg-white';

function Stat({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${tone ?? ''}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-800">{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function OylikHisobTab() {
  const qc = useQueryClient();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [branchId, setBranchId] = useState('');
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const period = `${year}-${String(month).padStart(2, '0')}`;

  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data, isLoading } = useQuery({ queryKey: ['oylik', period, branchId, search], queryFn: () => hrApi.oylikList({ period, branchId: branchId || undefined, search: search || undefined }) });
  const t = data?.totals;
  const rows = data?.data ?? [];

  const hisobla = useMutation({
    mutationFn: () => hrApi.oylikHisoblash(period, branchId || undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['oylik'] }),
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selCls}>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={selCls}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={selCls}><option value="">Barcha filiallar</option>{branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Xodim..." className={`min-w-[180px] flex-1 ${selCls}`} />
      </div>
      <div className="mb-4 flex justify-end gap-2">
        <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"><ListChecks size={16} /> Oylik to&apos;ldirish</button>
        <button onClick={() => hisobla.mutate()} disabled={hisobla.isPending} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"><Calculator size={16} /> {hisobla.isPending ? 'Hisoblanmoqda...' : 'Jamoaga oylik hisoblash'}</button>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Jami hisoblar" value={t?.jamiHisoblar ?? 0} />
        <Stat label="Jami summa" value={numFmt(t?.jamiSumma ?? 0)} sub={`Karta: ${numFmt(t?.karta ?? 0)} · Naqd: ${numFmt(t?.naqd ?? 0)}`} />
        <Stat label="Berilgan" value={numFmt(t?.berilgan ?? 0)} tone="bg-emerald-50/40" />
        <Stat label="Ortiqcha" value={numFmt(t?.ortiqcha ?? 0)} tone="bg-amber-50/40" />
        <Stat label="Ovqat ushlanma" value={numFmt(t?.ovqatUshlanma ?? 0)} tone="bg-sky-50/40" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Xodim</th><th className="px-5 py-3">Lavozim</th><th className="px-5 py-3">Filial / Bo&apos;lim</th><th className="px-5 py-3 text-center">Ishlagan</th><th className="px-5 py-3 text-right">Bonus/Jarima</th><th className="px-5 py-3 text-right">Ovqat</th><th className="px-5 py-3 text-right">Jami</th><th className="px-5 py-3 text-right">Berildi</th><th className="px-5 py-3 text-right">Qoldiq</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-slate-400">Yuklanmoqda...</td></tr>
              ) : rows.length ? rows.map((r: OylikRow) => (
                <tr key={r.id} onClick={() => setDetailId(r.id)} className="cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-brand/[0.03]">
                  <td className="px-5 py-3.5"><div className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${r.confirmed ? 'bg-emerald-500' : 'bg-slate-300'}`} /><span className="font-semibold text-slate-800">{r.xodim}</span></div></td>
                  <td className="px-5 py-3.5 text-slate-500">{r.position ?? '—'}</td>
                  <td className="px-5 py-3.5"><div className="text-slate-600">{r.branch ?? '—'}</div><div className="text-xs text-slate-400">{r.department ?? ''}</div></td>
                  <td className="px-5 py-3.5 text-center text-slate-500">{r.ishlagan}</td>
                  <td className={`px-5 py-3.5 text-right ${r.bonusJarima < 0 ? 'text-rose-500' : 'text-slate-500'}`}>{r.bonusJarima ? numFmt(r.bonusJarima) : '—'}</td>
                  <td className={`px-5 py-3.5 text-right ${r.ovqat ? 'text-rose-500' : 'text-slate-300'}`}>{r.ovqat ? numFmt(r.ovqat) : '—'}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-slate-800">{numFmt(r.jami)}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-emerald-600">{numFmt(r.berildi)}</td>
                  <td className={`whitespace-nowrap px-5 py-3.5 text-right font-medium ${r.qoldiq > 0 ? 'text-rose-600' : r.qoldiq < 0 ? 'text-amber-600' : 'text-slate-400'}`}>{numFmt(r.qoldiq)}</td>
                </tr>
              )) : (<tr><td colSpan={9} className="px-5 py-12 text-center text-slate-400">Yozuv yo&apos;q — «Jamoaga oylik hisoblash» bilan yarating</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {detailId && <OylikDetailPanel id={detailId} onClose={() => setDetailId(null)} onChanged={() => qc.invalidateQueries({ queryKey: ['oylik'] })} />}
    </>
  );
}

/* ===== Oylik hisob detali ===== */
function KV({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`text-sm font-semibold ${tone ?? 'text-slate-800'}`}>{value}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 rounded-xl border border-slate-200 p-4">
      <div className="mb-3 text-sm font-bold text-slate-700">{title}</div>
      {children}
    </div>
  );
}

function OylikDetailPanel({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const { data: d } = useQuery({ queryKey: ['oylik-detail', id], queryFn: () => hrApi.oylikDetail(id) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['oylik-detail', id] }); onChanged(); };
  const conf = useMutation({ mutationFn: (c: boolean) => hrApi.oylikConfirm(id, c), onSuccess: refresh });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-slate-50 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
          <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><X size={16} /> Yopish</button>
          <span className="text-sm font-semibold text-slate-700">Oylik hisob</span>
        </div>
        {d && (
          <div className="p-5">
            {/* Sarlavha */}
            <div className="mb-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Oylik hisob · {d.period}</div>
              <div className="text-lg font-bold text-slate-800">{d.xodim}</div>
              <div className="text-xs text-slate-400">{d.position} · {d.branch} {d.department ? `· ${d.department}` : ''}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {d.confirmed && <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">Tasdiqlandi</span>}
                <button onClick={() => conf.mutate(!d.confirmed)} disabled={conf.isPending} className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${d.confirmed ? 'border-amber-200 text-amber-600' : 'border-emerald-200 text-emerald-600'}`}>
                  {d.confirmed ? <><XCircle size={12} /> Tasdiqni bekor qilish</> : <><CheckCircle2 size={12} /> Tasdiqlash</>}
                </button>
              </div>
            </div>

            <Section title="Hisob-kitob">
              <div className="grid grid-cols-3 gap-4">
                <KV label="Ishchi kunlar" value={d.ishchiKunlar} />
                <KV label="Ishlagan kun" value={d.ishlaganKun} />
                <KV label="Ishlagan soat" value={d.ishlaganSoat || '—'} />
                <KV label="Asosiy oylik" value={numFmt(d.asosiyOylik)} />
                <KV label="Kunlik" value={numFmt(d.kunlik)} />
                <KV label="Soatlik narx" value={numFmt(d.soatlikNarx)} />
                <KV label="Asosiy hisob" value={numFmt(d.asosiyHisob)} />
                <KV label="Soatlik hisob" value={numFmt(d.soatlikHisob)} />
                <KV label="Rasmiy hisob" value={numFmt(d.rasmiyHisob)} />
                <KV label="Soliqni kim to'laydi" value={d.soliqKim ?? '—'} />
              </div>
            </Section>

            <Section title="Qo'shimcha">
              <div className="grid grid-cols-3 gap-4">
                <KV label="KPI" value={numFmt(d.kpi)} />
                <KV label="Bonus" value={numFmt(d.bonus)} tone="text-emerald-600" />
                <KV label="Ovqat puli" value={numFmt(d.ovqatPuli)} />
                <KV label="Ta'til — kartaga" value={numFmt(d.tatilKartaga)} tone="text-emerald-600" />
                <KV label="Ta'til — naqd" value={numFmt(d.tatilNaqd)} tone="text-emerald-600" />
                <KV label="Ijara" value={numFmt(d.ijara)} />
                <KV label="Transport" value={numFmt(d.transport)} />
                <KV label="Jarima" value={numFmt(d.jarima)} tone="text-rose-500" />
                <KV label="Soliq" value={numFmt(d.soliq)} tone="text-rose-500" />
              </div>
            </Section>

            <Section title="Taqsimot">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-emerald-50 p-3"><div className="text-[11px] uppercase text-emerald-600">Naqd</div><div className="text-lg font-bold text-emerald-700">{numFmt(d.naqd)}</div></div>
                <div className="rounded-lg bg-amber-50 p-3"><div className="text-[11px] uppercase text-amber-600">Karta</div><div className="text-lg font-bold text-amber-700">{numFmt(d.karta)}</div></div>
                <div className="rounded-lg bg-sky-50 p-3"><div className="text-[11px] uppercase text-sky-600">Jami</div><div className="text-lg font-bold text-sky-700">{numFmt(d.hisoblangan)}</div></div>
              </div>
            </Section>

            <Section title="To'lov holati">
              <div className="mb-3 grid grid-cols-3 gap-3">
                <KV label="Hisoblangan" value={numFmt(d.hisoblangan)} />
                <KV label="To'langan" value={numFmt(d.berildi)} tone="text-emerald-600" />
                <KV label="Bu oy balansi" value={numFmt(d.buOyBalansi)} tone={d.buOyBalansi > 0 ? 'text-rose-600' : 'text-slate-700'} />
                <KV label="Avvalgi oydan qoldiq" value={numFmt(d.avvalgiQoldiq)} tone={d.avvalgiQoldiq < 0 ? 'text-amber-600' : 'text-slate-700'} />
                <KV label="Oy yakuni balans" value={numFmt(d.oyYakuniBalans)} tone={d.oyYakuniBalans < 0 ? 'text-amber-600' : d.oyYakuniBalans > 0 ? 'text-rose-600' : 'text-slate-700'} />
              </div>
              <div className="rounded-lg border border-slate-100">
                {d.payments.length ? d.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border-b border-slate-50 px-3 py-2 text-sm last:border-0">
                    <span className="text-slate-500">{new Date(p.date).toLocaleDateString('uz-UZ')}</span>
                    <span className="font-medium text-slate-700">{numFmt(p.amount)}</span>
                  </div>
                )) : <div className="px-3 py-3 text-center text-sm text-slate-400">To&apos;lov yo&apos;q</div>}
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}
