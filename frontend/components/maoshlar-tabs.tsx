'use client';

import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, ShieldCheck } from 'lucide-react';
import { crmApi } from '@/lib/crm';
import { hrApi, GENDER_LABEL, SALARY_LABEL, EMP_STATUS, CONTRACT_STATUS, type XodimRow, type LavozimRow, type ShartnomaRow, type SalaryType } from '@/lib/hr';

const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const numFmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0));
const stavkaFmt = (type: SalaryType | null, v: number | null) => {
  if (v == null) return '—';
  if (type === 'HOURLY') return `${numFmt(v)} /soat`;
  if (type === 'PER_LESSON') return `${numFmt(v)} /dars`;
  return numFmt(v);
};

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${tone ?? ''}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-800">{value}</div>
    </div>
  );
}
const inputCls = 'w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand focus:bg-white';
const selCls = 'rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-brand focus:bg-white';

/* ===== Xodimlar ===== */
export function XodimlarTab() {
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data, isLoading } = useQuery({ queryKey: ['xodimlar', search, branchId], queryFn: () => hrApi.xodimlar({ search: search || undefined, branchId: branchId || undefined }) });
  const t = data?.totals;
  const rows = data?.data ?? [];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="F.I.O, telefon, ID..." className={inputCls} />
        </div>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={`min-w-[220px] ${selCls}`}>
          <option value="">Barcha filiallar</option>
          {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      <div className="mb-4 flex justify-end gap-2">
        <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"><ShieldCheck size={16} /> Nomlarni tekshirish</button>
        <button className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"><Plus size={18} /> Yangi xodim</button>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Xodimlar" value={t?.xodimlar ?? 0} />
        <Stat label="Lavozimlar" value={t?.lavozimlar ?? 0} />
        <Stat label="Telefon bor" value={t?.telefonBor ?? 0} tone="bg-emerald-50/40" />
        <Stat label="Karta bor" value={t?.kartaBor ?? 0} tone="bg-sky-50/40" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">F.I.O</th><th className="px-5 py-3">Jinsi</th><th className="px-5 py-3">Telefon</th><th className="px-5 py-3">Filial(lar)</th><th className="px-5 py-3">Karta</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">Yuklanmoqda...</td></tr>
              ) : rows.length ? rows.map((e: XodimRow) => (
                <tr key={e.id} className="border-b border-slate-50 transition last:border-0 hover:bg-brand/[0.03]">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">{initials(e.fio)}</div>
                      <div><div className="font-semibold text-slate-800">{e.fio}</div>{e.position && <div className="text-xs text-slate-400">{e.position}</div>}</div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{e.gender ? GENDER_LABEL[e.gender] : '—'}</td>
                  <td className="px-5 py-3.5 text-slate-600">{e.phone || '—'}</td>
                  <td className="px-5 py-3.5">{e.branch ? <span className="inline-flex rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-600">{e.branch}</span> : <span className="text-slate-300">—</span>}</td>
                  <td className="px-5 py-3.5 text-slate-500">{e.card ?? <span className="text-slate-300">—</span>}</td>
                </tr>
              )) : (<tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">Xodim topilmadi</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ===== Lavozimlar (bo'lim bo'yicha) ===== */
export function LavozimlarTab() {
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data: depts } = useQuery({ queryKey: ['hr-departments'], queryFn: hrApi.departments });
  const { data, isLoading } = useQuery({
    queryKey: ['lavozimlar', search, branchId, departmentId, status],
    queryFn: () => hrApi.lavozimlar({ search: search || undefined, branchId: branchId || undefined, departmentId: departmentId || undefined, status: status || undefined }),
  });
  const t = data?.totals;
  const rows = data?.data ?? [];

  const groups = useMemo(() => {
    const m = new Map<string, LavozimRow[]>();
    rows.forEach((r) => { const k = r.department || 'Boshqa'; if (!m.has(k)) m.set(k, []); m.get(k)!.push(r); });
    return Array.from(m.entries());
  }, [rows]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Xodim, lavozim..." className={inputCls} />
        </div>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={selCls}><option value="">Barcha filiallar</option>{branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={selCls}><option value="">Barcha bo&apos;limlar</option>{depts?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selCls}><option value="ACTIVE">Faol</option><option value="TERMINATED">Bo&apos;shagan</option><option value="">Hammasi</option></select>
      </div>
      <div className="mb-4 flex justify-end">
        <button className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"><Plus size={18} /> Yangi lavozim</button>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Jami lavozimlar" value={t?.jamiLavozimlar ?? 0} />
        <Stat label="Faol lavozimlar" value={t?.faolLavozimlar ?? 0} tone="bg-emerald-50/40" />
        <Stat label="Faol xodimlar" value={t?.faolXodimlar ?? 0} tone="bg-sky-50/40" />
        <Stat label="Bo'shagan" value={t?.boshagan ?? 0} tone="bg-rose-50/40" />
        <Stat label="Asosiy hisob-kitob" value={t?.asosiyHisobKitob ?? 0} />
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Holat</th><th className="px-5 py-3">Xodim</th><th className="px-5 py-3">Lavozim</th><th className="px-5 py-3">Filial / Bo&apos;lim</th><th className="px-5 py-3">Hisob-kitob</th><th className="px-5 py-3 text-right">Stavka</th><th className="px-5 py-3 text-center">Rasmiylik</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">Yuklanmoqda...</td></tr>
              ) : groups.length ? groups.map(([dep, list]) => (
                <Fragment key={dep}>
                  <tr className="bg-slate-50/60"><td colSpan={7} className="px-5 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">{dep} <span className="ml-2 font-normal text-slate-400">{list.length} ta</span></td></tr>
                  {list.map((e) => (
                    <tr key={e.id} className="border-b border-slate-50 transition last:border-0 hover:bg-brand/[0.03]">
                      <td className="px-5 py-3.5"><span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${EMP_STATUS[e.status].cls}`}>{EMP_STATUS[e.status].label}</span></td>
                      <td className="px-5 py-3.5"><div className="font-semibold text-slate-800">{e.fio}</div><div className="text-xs text-slate-400">{e.phone || '—'}</div></td>
                      <td className="px-5 py-3.5 text-slate-600">{e.position ?? '—'}</td>
                      <td className="px-5 py-3.5"><div className="text-slate-600">{e.branch ?? '—'}</div><div className="text-xs text-slate-400">{e.department}</div></td>
                      <td className="px-5 py-3.5 text-slate-600">{e.hisobKitob ? SALARY_LABEL[e.hisobKitob] : '—'}</td>
                      <td className="px-5 py-3.5 text-right font-medium text-slate-700">{stavkaFmt(e.hisobKitob, e.stavka)}</td>
                      <td className="px-5 py-3.5 text-center"><span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${e.formal ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{e.formal ? 'Rasmiy' : 'Norasmiy'}</span></td>
                    </tr>
                  ))}
                </Fragment>
              )) : (<tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">Topilmadi</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ===== Shartnomalar ===== */
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('uz-UZ');

export function ShartnomalarTab() {
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data, isLoading } = useQuery({
    queryKey: ['shartnomalar', search, branchId],
    queryFn: () => hrApi.shartnomalar({ search: search || undefined, branchId: branchId || undefined }),
  });
  const t = data?.totals;
  const rows = data?.data ?? [];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Xodim, shartnoma raqami..." className={inputCls} />
        </div>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={selCls}><option value="">Barcha filiallar</option>{branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
      </div>
      <div className="mb-4 flex justify-end">
        <button className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"><Plus size={18} /> Yangi shartnoma</button>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Jami shartnomalar" value={t?.jami ?? 0} />
        <Stat label="Yaratilgan" value={t?.yaratilgan ?? 0} tone="bg-emerald-50/40" />
        <Stat label="O'zgartirilgan" value={t?.ozgartirilgan ?? 0} tone="bg-amber-50/40" />
        <Stat label="Bekor qilingan" value={t?.bekor ?? 0} tone="bg-rose-50/40" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Sana</th><th className="px-5 py-3">Raqam</th><th className="px-5 py-3">Xodim</th><th className="px-5 py-3">Shartnoma turi</th><th className="px-5 py-3">Bandlik</th><th className="px-5 py-3 text-right">Stavka</th><th className="px-5 py-3">Filial</th><th className="px-5 py-3 text-center">Holat</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400">Yuklanmoqda...</td></tr>
              ) : rows.length ? rows.map((c: ShartnomaRow) => (
                <tr key={c.id} className="border-b border-slate-50 transition last:border-0 hover:bg-brand/[0.03]">
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">{fmtDate(c.date)}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-700">{c.number}</td>
                  <td className="px-5 py-3.5"><div className="font-semibold text-slate-800">{c.xodim}</div>{c.position && <div className="text-xs text-slate-400">{c.position}</div>}</td>
                  <td className="px-5 py-3.5 text-slate-600">{c.type}</td>
                  <td className="px-5 py-3.5 text-slate-500">{c.employment ?? '—'}</td>
                  <td className="px-5 py-3.5 text-right text-slate-600">{c.stavka != null ? numFmt(c.stavka) : '—'}</td>
                  <td className="px-5 py-3.5 text-slate-500">{c.branch ?? '—'}</td>
                  <td className="px-5 py-3.5 text-center"><span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${(CONTRACT_STATUS[c.status] ?? CONTRACT_STATUS.YARATILGAN).cls}`}>{(CONTRACT_STATUS[c.status] ?? { label: c.status }).label}</span></td>
                </tr>
              )) : (<tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">Shartnoma topilmadi</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
