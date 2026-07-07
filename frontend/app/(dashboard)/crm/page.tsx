'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, RefreshCw } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  crmApi,
  WHO_OPTIONS,
  type Visit,
  type VisitStatus,
  type Stage,
  type Lead,
  type CrmStats,
  type YearlyRow,
  type GuardianRow,
  type ProgressRow,
  type AdmissionRow,
} from '@/lib/crm';
import { classesApi } from '@/lib/classes';
import { studentsApi } from '@/lib/students';
import { contractsApi, money, type Discount } from '@/lib/contracts';
import { AdmissionForm } from '@/components/admission-form';

const TABS = [
  { key: 'funnel', label: 'Qabul' },
  { key: 'guardians', label: 'Vasiylar' },
  { key: 'students', label: "O'quvchilar" },
  { key: 'classes', label: 'Sinflar' },
];

const inputCls = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';

export default function CrmHubPage() {
  const [tab, setTab] = useState('funnel');
  const qc = useQueryClient();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <span className="rounded bg-brand px-1.5 py-0.5 text-xs text-white">RS</span>
          <span className="text-slate-400">— ERP</span>
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
        {tab === 'planned' && <VisitsPanel status="PLANNED" />}
        {tab === 'real' && <VisitsPanel status="ARRIVED" />}
        {tab === 'funnel' && <FunnelPanel />}
        {tab === 'classes' && <ClassesPanel />}
        {tab === 'discounts' && <DiscountsPanel />}
        {tab === 'guardians' && <GuardiansPanel />}
        {tab === 'students' && <StudentsPanel />}
        {tab === 'stats' && <StatsPanel />}
        {tab === 'yearly' && <YearlyPanel />}
        {tab === 'plan' && <PlanPanel />}
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

function VisitsPanel({ status }: { status: VisitStatus }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filial, setFilial] = useState('');
  const [from, setFrom] = useState('');
  const [grouped, setGrouped] = useState(true);

  const { data } = useQuery({
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
      <div className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">
          {status === 'PLANNED' ? 'Tashrif belgilanganlar' : 'Real tashriflar'}
        </h1>
        <span className="text-slate-400">{data?.total ?? 0} ta</span>
        <span className="text-sm text-slate-400">· Oxirgi sync: {fmtShort(new Date().toISOString())}</span>
      </div>

      {/* Filtrlar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          placeholder="Lead nomi, telefon…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputCls} w-64`}
        />
        <select value={filial} onChange={(e) => setFilial(e.target.value)} className={inputCls}>
          <option value="">Barcha filiallar</option>
          {data?.filials.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
        <button
          onClick={() => setGrouped((v) => !v)}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${grouped ? 'bg-blue-50 text-brand' : 'border border-slate-300'}`}
        >
          Guruhlash
        </button>
      </div>
      {from && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs text-brand">
            Sana: {from} dan
            <button onClick={() => setFrom('')}>✕</button>
          </span>
        </div>
      )}

      {/* Jadval */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Belgilangan vaqt</th>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Filial</th>
              <th className="px-4 py-3">Sinf</th>
              <th className="px-4 py-3">Kim keladi</th>
              <th className="px-4 py-3">Telefon</th>
              <th className="px-4 py-3">Mas&apos;ul (CRM)</th>
              <th className="px-4 py-3 text-right">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(([key, visits]) => (
              <GroupBlock key={key} dateKey={key} visits={visits} grouped={grouped} onMark={(id, st) => mark.mutate({ id, st })} status={status} />
            ))}
            {!data?.data.length && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Tashrif topilmadi</td></tr>
            )}
          </tbody>
        </table>
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
          <td colSpan={8} className="px-4 py-2 text-sm font-semibold text-slate-600">
            {head.label} <span className="text-slate-400">({head.weekday})</span>
            {head.isToday && <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-brand">Bugun</span>}
            <span className="ml-2 font-normal text-slate-400">{visits.length} ta</span>
          </td>
        </tr>
      )}
      {visits.map((v) => (
        <tr key={v.id} className="border-t border-slate-100 hover:bg-slate-50">
          <td className="px-4 py-3">
            <div className="font-medium">{v.scheduledAt ? fmtTime(v.scheduledAt) : '—'}</div>
            <div className="text-xs text-slate-400">ERPga tushdi: {fmtShort(v.createdAt)}</div>
          </td>
          <td className="px-4 py-3">
            <div className="font-medium">{v.fullName}</div>
            <div className="text-xs text-slate-400">CRM yangilandi: {fmtShort(v.crmUpdatedAt)}</div>
          </td>
          <td className="px-4 py-3">{v.filial ?? '—'}</td>
          <td className="px-4 py-3">{v.gradeLevel ?? '—'}</td>
          <td className="px-4 py-3">{v.whoComes ?? '—'}</td>
          <td className="px-4 py-3">{v.phone}</td>
          <td className="px-4 py-3 text-slate-500">{v.manager?.fullName ?? '—'}</td>
          <td className="px-4 py-3 text-right">
            {status === 'PLANNED' ? (
              <div className="flex justify-end gap-1">
                <button onClick={() => onMark(v.id, 'ARRIVED')} className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200">Keldi</button>
                <button onClick={() => onMark(v.id, 'NO_SHOW')} className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200">Kelmadi</button>
              </div>
            ) : (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">✓ Keldi</span>
            )}
          </td>
        </tr>
      ))}
    </>
  );
}

/* ============================ QABUL (funnel) ============================ */

const stageBadge = (name: string) => {
  if (/yiqildi/i.test(name)) return 'bg-red-100 text-red-700';
  if (/shartnoma tuzildi/i.test(name)) return 'bg-green-100 text-green-700';
  if (/ota-ona/i.test(name)) return 'bg-purple-100 text-purple-700';
  if (/suhbat/i.test(name)) return 'bg-blue-100 text-brand';
  if (/test/i.test(name)) return 'bg-indigo-100 text-indigo-700';
  if (/shartnoma/i.test(name)) return 'bg-teal-100 text-teal-700';
  if (/qayta/i.test(name)) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
};
const kanbanTop = (name: string) => {
  if (/yiqildi/i.test(name)) return 'border-t-red-400';
  if (/qayta/i.test(name)) return 'border-t-amber-400';
  if (/shartnoma tuzildi/i.test(name)) return 'border-t-green-400';
  return 'border-t-blue-300';
};

function FunnelPanel() {
  const qc = useQueryClient();
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const [year, setYear] = useState('');
  const [showForm, setShowForm] = useState(false);

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

  const move = useMutation({
    mutationFn: ({ id, stageId }: { id: string; stageId: string }) => crmApi.moveStage(id, stageId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admissions'] }),
  });

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
                      <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
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
                    <div key={r.id} className="rounded-lg bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-medium">{oquvchi(r)}</div>
                        {r._count.activities > 0 && <span className="text-xs text-slate-400">💬{r._count.activities}</span>}
                      </div>
                      <div className="text-xs text-slate-500">{r.class ? `${r.class.name} (${r.class.language ?? '—'})` : '—'} · {r.branch?.name ?? '—'}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {r.manager && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-brand">{r.manager.fullName}</span>}
                        {r.psychologist && <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[11px] text-purple-700">{r.psychologist.fullName}</span>}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-1 text-[11px] text-slate-400">
                        <span>Qabul {fmtShort(r.createdAt)}</span>
                        <select value={r.stageId} onChange={(e) => move.mutate({ id: r.id, stageId: e.target.value })} className="max-w-[110px] rounded border border-slate-200 px-1 text-[11px]">
                          {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
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
    </div>
  );
}

function NewLeadModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [f, setF] = useState({ fullName: '', phone: '', filial: '', gradeLevel: '', whoComes: '', scheduledAt: '' });
  const create = useMutation({
    mutationFn: () => crmApi.createLead({
      fullName: f.fullName, phone: f.phone,
      filial: f.filial || undefined,
      gradeLevel: f.gradeLevel ? Number(f.gradeLevel) : undefined,
      whoComes: f.whoComes || undefined,
      scheduledAt: f.scheduledAt ? new Date(f.scheduledAt).toISOString() : undefined,
    }),
    onSuccess: onCreated,
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold">Yangi murojaat / tashrif</h2>
        <input placeholder="F.I.SH" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} className={`${inputCls} w-full`} required />
        <input placeholder="Telefon" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={`${inputCls} w-full`} required />
        <div className="flex gap-2">
          <input placeholder="Filial" value={f.filial} onChange={(e) => setF({ ...f, filial: e.target.value })} className={`${inputCls} w-1/2`} />
          <input type="number" min={0} max={11} placeholder="Sinf" value={f.gradeLevel} onChange={(e) => setF({ ...f, gradeLevel: e.target.value })} className={`${inputCls} w-1/2`} />
        </div>
        <select value={f.whoComes} onChange={(e) => setF({ ...f, whoComes: e.target.value })} className={`${inputCls} w-full`}>
          <option value="">Kim keladi</option>
          {WHO_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
        <label className="block text-xs text-slate-500">Tashrif vaqti</label>
        <input type="datetime-local" value={f.scheduledAt} onChange={(e) => setF({ ...f, scheduledAt: e.target.value })} className={`${inputCls} w-full`} />
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-300 py-2">Bekor</button>
          <button type="submit" disabled={create.isPending} className="flex-1 rounded-lg bg-brand py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">Saqlash</button>
        </div>
      </form>
    </div>
  );
}

/* ============================ SODDA TABLAR ============================ */

function ClassesPanel() {
  const { data } = useQuery({ queryKey: ['classes'], queryFn: () => classesApi.list() });
  return (
    <SimpleTable
      title="Sinflar"
      head={['Sinf', 'Daraja', "O'quv yili", "O'quvchi", "Sig'im"]}
      rows={(data ?? []).map((c) => [c.name, `${c.gradeLevel}-sinf`, c.academicYear, String(c.studentCount), `${c.fillPercent}%`])}
    />
  );
}

function StudentsPanel() {
  const { data } = useQuery({ queryKey: ['students', 'crm'], queryFn: () => studentsApi.list({ page: 1 }) });
  return (
    <SimpleTable
      title={`O'quvchilar (${data?.total ?? 0})`}
      head={['F.I.SH', 'Sinf', 'Holat']}
      rows={(data?.data ?? []).map((s) => [`${s.lastName} ${s.firstName}`, s.class?.name ?? '—', s.status])}
    />
  );
}

function GuardiansPanel() {
  const { data } = useQuery({ queryKey: ['crm-guardians'], queryFn: crmApi.guardians });
  return (
    <SimpleTable
      title="Vasiylar"
      head={['F.I.SH', 'Telefon', 'Farzandlar', 'Login']}
      rows={(data ?? []).map((g: GuardianRow) => [
        g.fullName,
        g.phone,
        g.students.map((s) => `${s.student.lastName} ${s.student.firstName}`).join(', ') || '—',
        g.user ? '✓' : '—',
      ])}
    />
  );
}

function SimpleTable({ title, head, rows }: { title: string; head: string[]; rows: string[][] }) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>{head.map((h) => <th key={h} className="px-4 py-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-100">
                {r.map((c, j) => <td key={j} className="px-4 py-2">{c}</td>)}
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={head.length} className="px-4 py-8 text-center text-slate-400">Ma&apos;lumot yo&apos;q</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================ CHEGIRMALAR ============================ */

function DiscountsPanel() {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: '', type: 'PERCENT', value: '' });
  const { data } = useQuery({ queryKey: ['discounts'], queryFn: contractsApi.discounts });
  const create = useMutation({
    mutationFn: () => contractsApi.createDiscount({ name: f.name, type: f.type as 'PERCENT' | 'FIXED', value: Number(f.value) }),
    onSuccess: () => { setF({ name: '', type: 'PERCENT', value: '' }); qc.invalidateQueries({ queryKey: ['discounts'] }); },
  });
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">Chegirmalar</h2>
      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="mb-4 flex flex-wrap items-end gap-2">
        <input placeholder="Nom" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} required />
        <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={inputCls}>
          <option value="PERCENT">Foiz (%)</option>
          <option value="FIXED">So&apos;m</option>
        </select>
        <input type="number" placeholder="Qiymat" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} className={inputCls} required />
        <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">+ Qo&apos;shish</button>
      </form>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-4 py-2">Nom</th><th className="px-4 py-2">Turi</th><th className="px-4 py-2 text-right">Qiymat</th></tr></thead>
          <tbody>
            {(data ?? []).map((d: Discount) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{d.name}</td>
                <td className="px-4 py-2">{d.type === 'PERCENT' ? 'Foiz' : 'Fiks'}</td>
                <td className="px-4 py-2 text-right">{d.type === 'PERCENT' ? `${d.value}%` : money(d.value)}</td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">Chegirma yo&apos;q</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================ STATS ============================ */

function StatsPanel() {
  const { data } = useQuery({ queryKey: ['crm-stats'], queryFn: crmApi.stats });
  if (!data) return <p className="text-slate-400">Yuklanmoqda...</p>;
  const s = data as CrmStats;
  const maxFunnel = Math.max(...s.funnel.map((f) => f.count), 1);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card label="Jami lead" value={s.total} />
        <Card label="Konversiya" value={`${s.conversionRate}%`} />
        <Card label="O'quvchiga aylangan" value={s.converted} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Funnel (bosqichlar)">
          {s.funnel.map((f) => (
            <Bar key={f.stage} label={f.stage} value={f.count} max={maxFunnel} />
          ))}
        </Panel>
        <Panel title="Filial bo'yicha">
          {s.byFilial.map((f) => <Bar key={f.name} label={f.name} value={f.count} max={Math.max(...s.byFilial.map((x) => x.count), 1)} />)}
        </Panel>
        <Panel title="Manba bo'yicha">
          {s.bySource.map((f) => <Bar key={f.name} label={f.name} value={f.count} max={Math.max(...s.bySource.map((x) => x.count), 1)} />)}
        </Panel>
        <Panel title="Menejer bo'yicha">
          {s.byManager.map((f) => <Bar key={f.name} label={f.name} value={f.count} max={Math.max(...s.byManager.map((x) => x.count), 1)} />)}
        </Panel>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-2xl font-bold text-brand">{value}</div></div>;
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="mb-3 font-semibold">{title}</h3><div className="space-y-2">{children}</div></div>;
}
function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm"><span>{label}</span><span className="font-medium">{value}</span></div>
      <div className="mt-1 h-2 w-full rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand" style={{ width: `${(value / max) * 100}%` }} /></div>
    </div>
  );
}

/* ============================ YILLIK ============================ */

function YearlyPanel() {
  const { data } = useQuery({ queryKey: ['crm-yearly'], queryFn: crmApi.yearly });
  const max = Math.max(...(data ?? []).map((y) => y.leads), 1);
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">Yillik taqqoslash</h2>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-4 py-2">Yil</th><th className="px-4 py-2">Lead</th><th className="px-4 py-2">Aylangan</th><th className="px-4 py-2">Konversiya</th><th className="px-4 py-2">Grafik</th></tr></thead>
          <tbody>
            {(data ?? []).map((y: YearlyRow) => (
              <tr key={y.year} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium">{y.year}</td>
                <td className="px-4 py-2">{y.leads}</td>
                <td className="px-4 py-2 text-green-600">{y.converted}</td>
                <td className="px-4 py-2">{y.conversionRate}%</td>
                <td className="px-4 py-2"><div className="h-2 w-40 rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand" style={{ width: `${(y.leads / max) * 100}%` }} /></div></td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Ma&apos;lumot yo&apos;q</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================ QABUL REJASI ============================ */

function PlanPanel() {
  const qc = useQueryClient();
  const year = '2025-2026';
  const [f, setF] = useState({ gradeLevel: '', plannedCount: '', filial: '' });
  const { data } = useQuery({ queryKey: ['crm-progress', year], queryFn: () => crmApi.progress(year) });
  const create = useMutation({
    mutationFn: () => crmApi.createPlan({ academicYear: year, gradeLevel: Number(f.gradeLevel), plannedCount: Number(f.plannedCount), filial: f.filial || undefined }),
    onSuccess: () => { setF({ gradeLevel: '', plannedCount: '', filial: '' }); qc.invalidateQueries({ queryKey: ['crm-progress'] }); },
  });
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-lg font-semibold">Qabul rejasi</h2>
        <span className="text-sm text-slate-400">{year}</span>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="mb-4 flex flex-wrap items-end gap-2">
        <input type="number" min={0} max={11} placeholder="Sinf darajasi" value={f.gradeLevel} onChange={(e) => setF({ ...f, gradeLevel: e.target.value })} className={inputCls} required />
        <input type="number" placeholder="Reja (soni)" value={f.plannedCount} onChange={(e) => setF({ ...f, plannedCount: e.target.value })} className={inputCls} required />
        <input placeholder="Filial (ixtiyoriy)" value={f.filial} onChange={(e) => setF({ ...f, filial: e.target.value })} className={inputCls} />
        <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">+ Reja qo&apos;shish</button>
      </form>
      <div className="space-y-3">
        {(data ?? []).map((p: ProgressRow) => (
          <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{p.gradeLevel}-sinf {p.filial ? `· ${p.filial}` : ''}</span>
              <span><b>{p.actual}</b> / {p.plannedCount} ({p.percent}%)</span>
            </div>
            <div className="mt-2 h-2.5 w-full rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${p.percent >= 100 ? 'bg-green-500' : p.percent >= 70 ? 'bg-brand' : 'bg-amber-500'}`} style={{ width: `${Math.min(p.percent, 100)}%` }} />
            </div>
          </div>
        ))}
        {!data?.length && <p className="text-sm text-slate-400">Reja kiritilmagan</p>}
      </div>
    </div>
  );
}
