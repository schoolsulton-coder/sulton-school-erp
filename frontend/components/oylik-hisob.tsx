'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Calculator, ListChecks, CheckCircle2, XCircle, Search } from 'lucide-react';
import { crmApi } from '@/lib/crm';
import { hrApi, SALARY_LABEL, type OylikRow, type OylikDetail, type OylikPreviewRow } from '@/lib/hr';

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
  const [showJamoa, setShowJamoa] = useState(false);
  const period = `${year}-${String(month).padStart(2, '0')}`;

  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data, isLoading } = useQuery({ queryKey: ['oylik', period, branchId, search], queryFn: () => hrApi.oylikList({ period, branchId: branchId || undefined, search: search || undefined }) });
  const t = data?.totals;
  const rows = data?.data ?? [];

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
        <button onClick={() => setShowJamoa(true)} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"><Calculator size={16} /> Jamoaga oylik hisoblash</button>
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
      {showJamoa && <JamoaHisoblashModal year={year} month={month} branchId={branchId} onClose={() => setShowJamoa(false)} onDone={() => { setShowJamoa(false); qc.invalidateQueries({ queryKey: ['oylik'] }); }} />}
    </>
  );
}

/* ===== Jamoaga oylik hisoblash ===== */
function JamoaHisoblashModal({ year: y0, month: m0, branchId: b0, onClose, onDone }: { year: number; month: number; branchId: string; onClose: () => void; onDone: () => void }) {
  const [year, setYear] = useState(y0);
  const [month, setMonth] = useState(m0);
  const [branchId, setBranchId] = useState(b0);
  const [departmentId, setDepartmentId] = useState('');
  const [ishKuni, setIshKuni] = useState('');
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const period = `${year}-${String(month).padStart(2, '0')}`;

  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data: depts } = useQuery({ queryKey: ['hr-departments'], queryFn: hrApi.departments });
  const { data: prev } = useQuery({
    queryKey: ['oylik-preview', period, branchId, departmentId],
    queryFn: () => hrApi.oylikPreview({ period, branchId: branchId || undefined, departmentId: departmentId || undefined }),
  });

  // default: barcha hali yozuvi yo'q xodimlar tanlangan
  const available = (prev?.data ?? []).filter((d) => !d.exists);
  const shown = available.filter((d) => !search || d.fio.toLowerCase().includes(search.toLowerCase()) || (d.position ?? '').toLowerCase().includes(search.toLowerCase()));
  const allSelected = shown.length > 0 && shown.every((d) => sel.has(d.id));
  const effectiveSel = sel.size ? sel : new Set(available.map((d) => d.id));

  const toggle = (id: string) => { const n = new Set(effectiveSel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
  const toggleAll = () => { if (allSelected) setSel(new Set()); else setSel(new Set(shown.map((d) => d.id))); };

  const save = useMutation({
    mutationFn: () => hrApi.oylikHisoblash({ period, ishchiKunlar: ishKuni ? Number(ishKuni) : undefined, employeeIds: Array.from(effectiveSel) }),
    onSuccess: onDone,
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  const count = effectiveSel.size;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="mt-8 w-full max-w-3xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div><h2 className="text-lg font-bold text-slate-800">Jamoaga oylik hisoblash</h2><p className="text-xs text-slate-400">Tanlangan filial/bo&apos;lim uchun bir oyga jamoa hisoblari yaratiladi.</p></div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selCls}>{YEARS.map((yr) => <option key={yr} value={yr}>{yr}</option>)}</select>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={selCls}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
            <select value={branchId} onChange={(e) => { setBranchId(e.target.value); setSel(new Set()); }} className={selCls}><option value="">Barcha filiallar</option>{branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
            <select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setSel(new Set()); }} className={selCls}><option value="">Hammasi</option>{depts?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Ish kuni (oyda)</label>
              <input value={ishKuni} onChange={(e) => setIshKuni(e.target.value)} placeholder={`${prev?.ishchiKunlar ?? 27}`} className={`w-full ${selCls}`} />
              <p className="mt-1 text-xs text-slate-400">Bo&apos;sh qoldirsangiz — {prev?.ishchiKunlar ?? 27} (avto).</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-sky-50 p-3 text-center"><div className="text-[11px] uppercase text-sky-600">Yaratiladi</div><div className="text-2xl font-bold text-sky-700">{count}</div></div>
              <div className="rounded-xl bg-slate-100 p-3 text-center"><div className="text-[11px] uppercase text-slate-500">Allaqachon bor</div><div className="text-2xl font-bold text-slate-600">{prev?.allaqachonBor ?? 0}</div></div>
            </div>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ism yoki lavozim bo'yicha qidirish..." className={`w-full py-2.5 pl-9 ${selCls}`} />
          </div>
          <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
            <label className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-slate-300" /> Hammasini tanlash ({shown.length})
            </label>
            {shown.map((d: OylikPreviewRow) => (
              <label key={d.id} className="flex items-center gap-3 border-b border-slate-50 px-3 py-2 text-sm last:border-0 hover:bg-slate-50">
                <input type="checkbox" checked={effectiveSel.has(d.id)} onChange={() => toggle(d.id)} className="h-4 w-4 rounded border-slate-300" />
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">{d.fio.split(' ').slice(0, 2).map((w) => w[0]).join('')}</span>
                <span className="flex-1"><span className="font-medium text-slate-800">{d.fio}</span><span className="ml-2 text-xs text-slate-400">{d.position ?? ''} {d.hisobKitob ? `· ${SALARY_LABEL[d.hisobKitob]}` : ''}</span></span>
                {d.stavka != null && <span className="text-xs text-slate-500">{numFmt(d.stavka)}</span>}
              </label>
            ))}
            {!shown.length && <div className="px-3 py-6 text-center text-sm text-slate-400">Yangi hisob uchun xodim yo&apos;q</div>}
          </div>
          {error && <p className="text-sm font-medium text-rose-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Bekor</button>
          <button onClick={() => save.mutate()} disabled={save.isPending || count === 0} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">{save.isPending ? 'Yaratilmoqda...' : `${count} ta yaratish`}</button>
        </div>
      </div>
    </div>
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
