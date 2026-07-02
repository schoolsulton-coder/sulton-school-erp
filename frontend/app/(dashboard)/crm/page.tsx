'use client';

import { useMemo, useState } from 'react';
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
} from '@/lib/crm';
import { classesApi } from '@/lib/classes';
import { studentsApi } from '@/lib/students';
import { contractsApi, money, type Discount } from '@/lib/contracts';

const TABS = [
  { key: 'planned', label: 'Rejadagi tashriflar' },
  { key: 'real', label: 'Real tashriflar' },
  { key: 'funnel', label: 'Qabul' },
  { key: 'classes', label: 'Sinflar' },
  { key: 'discounts', label: 'Chegirmalar' },
  { key: 'guardians', label: 'Vasiylar' },
  { key: 'students', label: "O'quvchilar" },
  { key: 'stats', label: 'AmoCRM stats' },
  { key: 'yearly', label: 'Yillik taqqoslash' },
  { key: 'plan', label: 'Qabul rejasi' },
];

const inputCls = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';

export default function CrmHubPage() {
  const [tab, setTab] = useState('planned');
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

function FunnelPanel() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { data: stages } = useQuery({ queryKey: ['crm-board'], queryFn: crmApi.board });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['crm-board'] });

  const move = useMutation({
    mutationFn: ({ id, stageId }: { id: string; stageId: string }) => crmApi.moveStage(id, stageId),
    onSuccess: invalidate,
  });
  const convert = useMutation({ mutationFn: (id: string) => crmApi.convert(id, {}), onSuccess: invalidate });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Qabul funneli</h2>
        <button onClick={() => setShowForm(true)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">+ Yangi murojaat</button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages?.map((stage: Stage) => (
          <div key={stage.id} className="flex w-72 flex-shrink-0 flex-col rounded-xl bg-slate-100 p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{stage.name}</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">{stage.leads.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {stage.leads.map((lead: Lead) => (
                <div key={lead.id} className="rounded-lg bg-white p-3 shadow-sm">
                  <div className="font-medium">{lead.fullName}</div>
                  <div className="text-sm text-slate-500">{lead.phone}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <select value={lead.stageId} onChange={(e) => move.mutate({ id: lead.id, stageId: e.target.value })} className="flex-1 rounded border border-slate-200 px-1 py-1 text-xs">
                      {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button onClick={() => convert.mutate(lead.id)} className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200">→ O&apos;quvchi</button>
                  </div>
                </div>
              ))}
              {!stage.leads.length && <p className="py-3 text-center text-xs text-slate-400">Bo&apos;sh</p>}
            </div>
          </div>
        ))}
      </div>
      {showForm && <NewLeadModal onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); invalidate(); }} />}
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
