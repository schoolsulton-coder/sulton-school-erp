'use client';

import { Fragment, useMemo, useState } from 'react';
import { Bell, RefreshCw, Clock, CalendarClock, Search, Download, Plus, BarChart3 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  crmApi,
  type Visit,
  type VisitStatus,
  type AdmissionRow,
} from '@/lib/crm';
import { AdmissionForm } from '@/components/admission-form';
import { AdmissionDetailBody } from '@/components/admission-detail';

const TABS = [
  { key: 'funnel', label: 'Qabul' },
  { key: 'planned', label: 'Rejadagi tashriflar' },
  { key: 'real', label: 'Real tashriflar' },
];

const inputCls = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';
const filterCls =
  'rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-600 outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20';

export default function CrmHubPage() {
  const [tab, setTab] = useState('funnel');
  const qc = useQueryClient();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <span className="rounded bg-brand px-1.5 py-0.5 text-xs text-white">SS</span>
          <span>Sulton School <span className="font-normal text-slate-400">ERP</span></span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="relative">
            <Bell size={18} className="text-slate-500" />
            <span className="absolute -right-2 -top-2 rounded-full bg-red-500 px-1 text-[10px] text-white">99+</span>
          </div>
          <span className="text-slate-400">Yangiliklar</span>
          <button
            onClick={() => qc.invalidateQueries()}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-slate-500 hover:bg-slate-50"
          >
            <RefreshCw size={14} /> Yangilash
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-t-lg px-4 py-3 text-sm font-medium transition ${
              tab === t.key
                ? 'border-b-2 border-brand bg-blue-50 text-brand'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === 'funnel' && <FunnelPanel />}
        {tab === 'planned' && <VisitsPanel status="PLANNED" />}
        {tab === 'real' && <RealVisitsDashboard />}
      </div>
    </div>
  );
}

/* ============================ TASHRIFLAR ============================ */

const WEEKDAYS = ['Yak', 'Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha'];
function fmtDateKey(key: string) {
  const d = new Date(key + 'T00:00:00');
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const label = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  return { label, weekday: WEEKDAYS[d.getDay()], isToday };
}
function fmtTime(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function fmtShort(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${fmtTime(iso)}`;
}
// To'liq: 08.07.2026 12:46 (Kanban kartochka va detail uchun)
function fmtFull(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${fmtTime(iso)}`;
}

function VisitsPanel({ status }: { status: VisitStatus }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filial, setFilial] = useState('');
  const [from, setFrom] = useState('');
  const [grouped, setGrouped] = useState(true);

  const { data, dataUpdatedAt } = useQuery({
    queryKey: ['visits', status, search, filial, from],
    queryFn: () => crmApi.visits({ status, search: search || undefined, filial: filial || undefined, from: from || undefined }),
  });

  const mark = useMutation({
    mutationFn: ({ id, st }: { id: string; st: VisitStatus }) => crmApi.markVisit(id, st),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visits'] }),
  });

  const groups = useMemo(() => {
    const visits = data?.data ?? [];
    if (!grouped) return [['all', visits]] as [string, Visit[]][];
    const g: Record<string, Visit[]> = {};
    for (const v of visits) {
      const key = v.scheduledAt ? v.scheduledAt.slice(0, 10) : '0000';
      (g[key] ??= []).push(v);
    }
    return Object.entries(g).sort((a, b) => a[0].localeCompare(b[0]));
  }, [data, grouped]);

  return (
    <div>
      {/* Sarlavha */}
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand text-white shadow-sm">
          <CalendarClock size={22} />
        </div>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            {status === 'PLANNED' ? 'Rejadagi tashriflar' : 'Real tashriflar'}
            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-sm font-semibold text-slate-500">
              {data?.total ?? 0} ta
            </span>
          </h1>
          <p className="text-sm text-slate-400">
            Oxirgi sync: {dataUpdatedAt ? fmtShort(new Date(dataUpdatedAt).toISOString()) : '—'}
          </p>
        </div>
      </div>

      {/* Filtrlar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Lead nomi, telefon…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <select value={filial} onChange={(e) => setFilial(e.target.value)} className={filterCls}>
          <option value="">Barcha filiallar</option>
          {data?.filials.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={filterCls} />
        <button
          onClick={() => setGrouped((v) => !v)}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${grouped ? 'bg-brand/10 text-brand' : 'border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
        >
          Guruhlash
        </button>
      </div>
      {from && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
            Sana: {from} dan
            <button onClick={() => setFrom('')} className="hover:text-brand-dark">✕</button>
          </span>
        </div>
      )}

      {/* Jadval */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Belgilangan vaqt</th>
                <th className="px-5 py-3">Lead</th>
                <th className="px-5 py-3">Filial</th>
                <th className="px-5 py-3 text-center">Sinf</th>
                <th className="px-5 py-3">Kim keladi</th>
                <th className="px-5 py-3">Telefon</th>
                <th className="px-5 py-3">Mas&apos;ul (CRM)</th>
                <th className="px-5 py-3 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(([key, visits]) => (
                <GroupBlock key={key} dateKey={key} visits={visits} grouped={grouped} onMark={(id, st) => mark.mutate({ id, st })} status={status} />
              ))}
              {!data?.data.length && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">Tashrif topilmadi</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GroupBlock({
  dateKey, visits, grouped, onMark, status,
}: {
  dateKey: string; visits: Visit[]; grouped: boolean;
  onMark: (id: string, st: VisitStatus) => void; status: VisitStatus;
}) {
  const head = grouped && dateKey !== '0000' && dateKey !== 'all' ? fmtDateKey(dateKey) : null;
  return (
    <>
      {head && (
        <tr className="bg-slate-50/60">
          <td colSpan={8} className="px-5 py-2.5 text-sm font-semibold text-slate-600">
            {head.label} <span className="text-slate-400">({head.weekday})</span>
            {head.isToday && <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">Bugun</span>}
            <span className="ml-2 font-normal text-slate-400">{visits.length} ta</span>
          </td>
        </tr>
      )}
      {visits.map((v) => (
        <tr key={v.id} className="border-b border-slate-50 transition last:border-0 hover:bg-brand/[0.03]">
          <td className="px-5 py-3.5">
            <div className="font-semibold text-slate-800">{v.scheduledAt ? fmtTime(v.scheduledAt) : '—'}</div>
            <div className="text-xs text-slate-400">ERPga tushdi: {fmtShort(v.createdAt)}</div>
          </td>
          <td className="px-5 py-3.5">
            <div className="font-medium text-slate-700">{v.fullName}</div>
            <div className="text-xs text-slate-400">CRM yangilandi: {fmtShort(v.crmUpdatedAt)}</div>
          </td>
          <td className="px-5 py-3.5 text-slate-600">{v.filial ?? '—'}</td>
          <td className="px-5 py-3.5 text-center">
            {v.gradeLevel != null ? (
              <span className="inline-grid h-7 w-7 place-items-center rounded-lg bg-brand/10 text-xs font-bold text-brand">{v.gradeLevel}</span>
            ) : (
              <span className="text-slate-300">—</span>
            )}
          </td>
          <td className="px-5 py-3.5 text-slate-600">{v.whoComes ?? '—'}</td>
          <td className="px-5 py-3.5 text-slate-600">{v.phone}</td>
          <td className="px-5 py-3.5 text-slate-500">{v.manager?.fullName ?? '—'}</td>
          <td className="px-5 py-3.5 text-right">
            {status === 'PLANNED' ? (
              <div className="flex justify-end gap-1.5">
                <button onClick={() => onMark(v.id, 'ARRIVED')} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-200 transition hover:bg-emerald-100">Keldi</button>
                <button onClick={() => onMark(v.id, 'NO_SHOW')} className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-100">Kelmadi</button>
              </div>
            ) : (
              <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600 ring-1 ring-emerald-200">✓ Keldi</span>
            )}
          </td>
        </tr>
      ))}
    </>
  );
}

/* ============================ QABUL (funnel) ============================ */

const stageBadge = (name: string) => {
  if (/tuzmadi|yiqildi|rad etil/i.test(name)) return 'bg-red-100 text-red-700';   // Shartnoma tuzmadi
  if (/tuzdi|tuzildi/i.test(name)) return 'bg-green-100 text-green-700';           // Shartnoma tuzdi
  if (/shartnoma/i.test(name)) return 'bg-teal-100 text-teal-700';                 // Shartnoma tuzishga
  if (/suhbat/i.test(name)) return 'bg-blue-100 text-brand';                       // Suhbatga chaqirildi
  if (/yangi/i.test(name)) return 'bg-slate-100 text-slate-600';                   // Yangi
  return 'bg-slate-100 text-slate-600';
};
const kanbanTop = (name: string) => {
  if (/tuzmadi|yiqildi|rad etil/i.test(name)) return 'border-t-red-400';
  if (/tuzdi|tuzildi/i.test(name)) return 'border-t-green-400';
  if (/shartnoma/i.test(name)) return 'border-t-teal-400';
  if (/suhbat/i.test(name)) return 'border-t-blue-400';
  return 'border-t-slate-300';
};

function FunnelPanel() {
  const qc = useQueryClient();
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const [year, setYear] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<AdmissionRow | null>(null);

  const { data: adm } = useQuery({
    queryKey: ['admissions', search, branchId, year],
    queryFn: () =>
      crmApi.admissionsList({
        search: search || undefined,
        branchId: branchId || undefined,
        academicYear: year || undefined,
      }),
  });
  const { data: stages } = useQuery({ queryKey: ['crm-stages'], queryFn: crmApi.stages });
  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data: years } = useQuery({ queryKey: ['academic-years'], queryFn: crmApi.academicYears });

  const rows = adm?.data ?? [];
  const oquvchi = (r: AdmissionRow) =>
    r.student ? `${r.student.lastName} ${r.student.firstName}` : r.fullName;

  const byDate = useMemo(() => {
    const g: Record<string, AdmissionRow[]> = {};
    for (const r of rows) {
      const k = r.createdAt.slice(0, 10);
      (g[k] ??= []).push(r);
    }
    return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  const clear = () => { setSearch(''); setBranchId(''); setYear(''); };
  const refresh = () => qc.invalidateQueries({ queryKey: ['admissions'] });

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-bold">Qabul</h2>
          <span className="text-slate-400">{adm?.total ?? 0} ta</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 p-0.5">
            <button onClick={() => setView('list')} className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === 'list' ? 'bg-brand-dark text-white' : 'text-slate-500'}`}>☰ Ro&apos;yxat</button>
            <button onClick={() => setView('kanban')} className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === 'kanban' ? 'bg-brand-dark text-white' : 'text-slate-500'}`}>▤ Kanban</button>
          </div>
          <button onClick={() => setShowForm(true)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">+ Yangi qabul</button>
        </div>
      </div>

      {/* Filtrlar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
        <input placeholder="Ism, gaplashgan, psixolog, izoh…" value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputCls} min-w-[220px] flex-1`} />
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inputCls}>
          <option value="">Barcha filiallar</option>
          {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} className={inputCls}>
          <option value="">Barcha yillar</option>
          {years?.map((y) => <option key={y.id} value={y.name}>{y.name}</option>)}
        </select>
        <button onClick={clear} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700">Tozalash</button>
      </div>

      {view === 'list' ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Qabul sanasi</th>
                <th className="px-4 py-3">O&apos;quvchi</th>
                <th className="px-4 py-3">Filial</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Bosqich vaqti</th>
                <th className="px-4 py-3">Sinf</th>
                <th className="px-4 py-3">Gaplashgan</th>
                <th className="px-4 py-3">Psixolog</th>
                <th className="px-4 py-3">Teg</th>
                <th className="px-4 py-3 text-right">Izoh</th>
              </tr>
            </thead>
            <tbody>
              {byDate.map(([date, list]) => {
                const h = fmtDateKey(date);
                return (
                  <Fragment key={date}>
                    <tr className="bg-slate-50/60">
                      <td colSpan={10} className="px-4 py-2 text-sm font-semibold text-slate-600">
                        {h.label} <span className="text-slate-400">({h.weekday})</span>
                        {h.isToday && <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-brand">Bugun</span>}
                        <span className="ml-2 font-normal text-slate-400">{list.length} ta</span>
                      </td>
                    </tr>
                    {list.map((r) => (
                      <tr key={r.id} onClick={() => setDetail(r)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-2 text-slate-500">{fmtShort(r.createdAt)}</td>
                        <td className="px-4 py-2">
                          <div className="font-medium">{oquvchi(r)}</div>
                          {(r.student?._count?.contracts ?? 0) > 0 && <div className="text-xs text-green-600">Shartnoma ochilgan</div>}
                        </td>
                        <td className="px-4 py-2">{r.branch?.name ?? '—'}</td>
                        <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${stageBadge(r.stage?.name ?? '')}`}>{r.stage?.name ?? '—'}</span></td>
                        <td className="whitespace-nowrap px-4 py-2 text-slate-500">{r.crmUpdatedAt ? fmtShort(r.crmUpdatedAt) : '—'}</td>
                        <td className="whitespace-nowrap px-4 py-2">{r.class ? `${r.class.name} (${r.class.language ?? '—'})` : '—'}</td>
                        <td className="px-4 py-2">{r.manager?.fullName ?? '—'}</td>
                        <td className="px-4 py-2">{r.psychologist?.fullName ?? '—'}</td>
                        <td className="px-4 py-2">{r.tags?.length ? r.tags.join(', ') : '—'}</td>
                        <td className="px-4 py-2 text-right">{r._count.activities}</td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
              {!rows.length && <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-400">Qabul topilmadi</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages?.map((stage) => {
            const cards = rows.filter((r) => r.stageId === stage.id);
            return (
              <div key={stage.id} className={`flex w-72 flex-shrink-0 flex-col rounded-xl border-t-2 bg-slate-50 p-3 ${kanbanTop(stage.name)}`}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{stage.name}</h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">{cards.length}</span>
                </div>
                <div className="flex max-h-[62vh] flex-col gap-2 overflow-y-auto">
                  {cards.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setDetail(r)}
                      className="cursor-pointer rounded-lg bg-white p-3 shadow-sm transition hover:shadow-md hover:ring-1 hover:ring-brand/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-semibold">{oquvchi(r)}</div>
                        <Clock size={14} className="mt-0.5 flex-shrink-0 text-slate-300" />
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">{r.class ? `${r.class.name} (${r.class.language ?? '—'})` : '—'} · {r.branch?.name ?? '—'}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {r.manager && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-brand">{r.manager.fullName}</span>}
                        {r.psychologist && <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[11px] text-purple-700">{r.psychologist.fullName}</span>}
                      </div>
                      <div className="mt-2 space-y-0.5 border-t border-slate-100 pt-2 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Bosqich</span>
                          <span className="font-medium text-slate-600">{fmtFull(r.crmUpdatedAt ?? r.createdAt)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Qabul</span>
                          <span className="text-slate-400">{fmtFull(r.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!cards.length && <p className="py-3 text-center text-xs text-slate-300">Bo&apos;sh</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && <AdmissionForm onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); refresh(); }} />}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setDetail(null)}>
          <div onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-2xl overflow-y-auto bg-slate-50 p-6 shadow-2xl">
            <AdmissionDetailBody id={detail.id} onClose={() => setDetail(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================ REAL TASHRIFLAR (dashboard) ============================ */

function RealVisitsDashboard() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<AdmissionRow | null>(null);

  const { data: stats } = useQuery({ queryKey: ['crm-stats'], queryFn: crmApi.stats });
  const { data: cohort } = useQuery({ queryKey: ['crm-cohort'], queryFn: crmApi.cohort });
  const { data: stages } = useQuery({ queryKey: ['crm-stages'], queryFn: crmApi.stages });
  const { data: adm } = useQuery({
    queryKey: ['admissions-all', search],
    queryFn: () => crmApi.admissionsList({ search: search || undefined }),
  });

  const rows = adm?.data ?? [];
  const total = stats?.total ?? adm?.total ?? 0;
  const oquvchi = (r: AdmissionRow) => (r.student ? `${r.student.lastName} ${r.student.firstName}` : r.fullName);
  const filtered = stageFilter ? rows.filter((r) => r.stage?.name === stageFilter) : rows;
  const sources = (stats?.bySource ?? []).slice().sort((a, b) => b.count - a.count).slice(0, 4);

  const exportCsv = () => {
    const header = ['Ism', 'Telefon', 'Bosqich', 'Filial', 'Sinf', 'Sana'];
    const lines = rows.map((r) => [oquvchi(r), r.phone, r.stage?.name ?? '', r.branch?.name ?? '', r.class?.name ?? '', new Date(r.createdAt).toLocaleDateString('uz-UZ')]);
    const csv = [header, ...lines].map((row) => row.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tashriflar.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-bold">Tashriflar</h2>
          <span className="text-slate-400">{total} ta</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-100"><Download size={15} /> Excel</button>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"><Plus size={16} /> Yangi tashrif</button>
        </div>
      </div>

      {/* Qidiruv */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ism, telefon..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
      </div>

      {/* Manba kartochkalari */}
      {sources.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {sources.map((s) => (
            <div key={s.name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{s.name}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-800">{s.count}</span>
                <span className="text-xs text-slate-400">{total ? Math.round((s.count / total) * 100) : 0}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status chiplari */}
      <div className="mb-4 flex flex-wrap gap-2">
        <StatusChip active={stageFilter === ''} onClick={() => setStageFilter('')} label="Barchasi" count={total} />
        {stats?.funnel.map((f) => (
          <StatusChip key={f.stage} active={stageFilter === f.stage} onClick={() => setStageFilter(f.stage)} label={f.stage} count={f.count} />
        ))}
      </div>

      {/* Konversiya analitikasi */}
      {cohort && (
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-700"><BarChart3 size={18} className="text-brand" /> Konversiya vaqti</div>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <CohortCard tone="brand" label="Jami tashrif" value={cohort.total} />
            <CohortCard tone="indigo" label="Konversiya" value={cohort.converted} sub={`${cohort.convertedPct}%`} />
            <CohortCard tone="emerald" label="Hozir faol" value={cohort.active} sub={`${cohort.activePct}%`} />
            <CohortCard tone="rose" label="Bekor / nofaol" value={cohort.inactive} sub={`${cohort.inactivePct}%`} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cohort.buckets.map((b) => (
              <div key={b.days}>
                <div className="mb-1 flex justify-between text-xs"><span className="font-medium text-slate-600">{b.days} kun</span><span className="text-slate-400">{b.pct}%</span></div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(b.pct, 100)}%` }} /></div>
                <div className="mt-0.5 text-[11px] text-slate-400">{b.count} ta</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kanban doskasi */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages?.map((stage) => {
          const cards = filtered.filter((r) => r.stageId === stage.id);
          return (
            <div key={stage.id} className={`flex w-72 flex-shrink-0 flex-col rounded-xl border-t-2 bg-slate-50 p-3 ${kanbanTop(stage.name)}`}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{stage.name}</h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">{cards.length}</span>
              </div>
              <div className="flex max-h-[62vh] flex-col gap-2 overflow-y-auto">
                {cards.map((r) => (
                  <div key={r.id} onClick={() => setDetail(r)} className="cursor-pointer rounded-lg bg-white p-3 shadow-sm transition hover:shadow-md hover:ring-1 hover:ring-brand/30">
                    <div className="text-sm font-semibold">{oquvchi(r)}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{r.phone}</div>
                    <div className="mt-1 text-xs text-slate-400">{r.branch?.name ?? '—'}{r.class ? ` · ${r.class.name}` : ''}</div>
                    {r.manager && <div className="mt-1"><span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-brand">{r.manager.fullName}</span></div>}
                  </div>
                ))}
                {!cards.length && <p className="py-3 text-center text-xs text-slate-300">Bo&apos;sh</p>}
              </div>
            </div>
          );
        })}
      </div>

      {showForm && <AdmissionForm onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['admissions-all'] }); qc.invalidateQueries({ queryKey: ['crm-stats'] }); qc.invalidateQueries({ queryKey: ['crm-cohort'] }); }} />}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setDetail(null)}>
          <div onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-2xl overflow-y-auto bg-slate-50 p-6 shadow-2xl">
            <AdmissionDetailBody id={detail.id} onClose={() => setDetail(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

function StatusChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${active ? 'bg-brand text-white ring-brand' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'}`}>
      {label} <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-white/20' : 'bg-slate-100'}`}>{count}</span>
    </button>
  );
}

const COHORT_TONES: Record<string, string> = {
  brand: 'bg-brand/5 text-brand',
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  rose: 'bg-rose-50 text-rose-600',
};
function CohortCard({ tone, label, value, sub }: { tone: keyof typeof COHORT_TONES; label: string; value: number; sub?: string }) {
  return (
    <div className={`rounded-xl p-4 ${COHORT_TONES[tone]}`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 flex items-baseline gap-2"><span className="text-2xl font-bold">{value}</span>{sub && <span className="text-xs opacity-70">{sub}</span>}</div>
    </div>
  );
}
