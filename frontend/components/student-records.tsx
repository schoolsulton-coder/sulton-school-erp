'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { X, ChevronRight } from 'lucide-react';
import { gradesApi, gradeColor, gradeBg } from '@/lib/grades';
import { attendanceApi, ATT_STATUS, type AttStatus } from '@/lib/attendance';
import { behaviorApi } from '@/lib/behavior';
import { homeworkApi } from '@/lib/homework';

const TABS = [
  { key: 'att', label: 'Davomat' },
  { key: 'grade', label: 'Baholar' },
  { key: 'behavior', label: 'Ahloqiy' },
  { key: 'hw', label: 'Vazifalar' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

type Detail = { title: string; rows: [string, string][] };

function fmt(iso: string) {
  const s = new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
  const [y, m, d] = s.split('-');
  return `${d}.${m}.${y}`;
}
const attBadge = (st: AttStatus) =>
  st === 'PRESENT' ? 'bg-green-100 text-green-700'
    : st === 'ABSENT' ? 'bg-red-100 text-red-700'
    : st === 'LATE' ? 'bg-amber-100 text-amber-700'
    : 'bg-sky-100 text-sky-700';

export function StudentRecords({ studentId }: { studentId: string }) {
  const [tab, setTab] = useState<TabKey>('att');
  const [detail, setDetail] = useState<Detail | null>(null);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 pt-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">O&apos;quvchi faoliyati</h2>
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`rounded-t-lg px-3 py-2 text-sm font-medium transition ${tab === t.key ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5">
        {tab === 'att' && <AttTab studentId={studentId} onDetail={setDetail} />}
        {tab === 'grade' && <GradeTab studentId={studentId} onDetail={setDetail} />}
        {tab === 'behavior' && <BehaviorTab studentId={studentId} onDetail={setDetail} />}
        {tab === 'hw' && <HwTab studentId={studentId} />}
      </div>
      {detail && <RecordDetailModal detail={detail} onClose={() => setDetail(null)} />}
    </section>
  );
}

function Loading() { return <p className="py-6 text-center text-sm text-slate-400">Yuklanmoqda…</p>; }
function Empty({ text }: { text: string }) { return <p className="py-6 text-center text-sm text-slate-400">{text}</p>; }

function AttTab({ studentId, onDetail }: { studentId: string; onDetail: (d: Detail) => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['sr-att', studentId], queryFn: () => attendanceApi.studentReport(studentId) });
  if (isLoading) return <Loading />;
  if (!data || !data.total) return <Empty text="Davomat belgilanmagan" />;
  return (
    <div>
      <div className="mb-3 grid grid-cols-4 gap-2 text-center">
        <Mini label="Bor" value={data.present} cls="text-green-600" />
        <Mini label="Yo'q" value={data.absent} cls="text-red-600" />
        <Mini label="Kech" value={data.late} cls="text-amber-600" />
        <Mini label="Sabab" value={data.excused} cls="text-sky-600" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {data.records?.map((r, i) => (
          <button key={i} onClick={() => onDetail({ title: 'Davomat', rows: [['Sana', fmt(r.date)], ['Holat', ATT_STATUS[r.status].label], ['Izoh', r.note || '—']] })}
            className={`rounded px-2 py-0.5 text-xs font-medium ${attBadge(r.status)}`}>
            {fmt(r.date)}
          </button>
        ))}
      </div>
    </div>
  );
}

function GradeTab({ studentId, onDetail }: { studentId: string; onDetail: (d: Detail) => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['sr-grade', studentId], queryFn: () => gradesApi.studentReport(studentId) });
  if (isLoading) return <Loading />;
  if (!data || !data.subjects.length) return <Empty text="Baho yo'q" />;
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
        O&apos;rtacha <span className={`rounded-lg px-2 py-0.5 text-base font-bold ${gradeBg(data.overall)}`}>{data.overall || '—'}</span>
      </div>
      <div className="space-y-2">
        {data.subjects.map((s) => {
          const recent = data.progress.filter((p) => p.subject === s.subject.name).slice(-10);
          return (
            <div key={s.subject.id} className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{s.subject.name}</span>
                <span className={`text-base font-bold ${gradeColor(s.average)}`}>{s.average}</span>
              </div>
              {recent.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {recent.map((p, i) => (
                    <button key={i} onClick={() => onDetail({ title: 'Baho', rows: [['Fan', s.subject.name], ['Ball', String(p.value)], ['Sana', fmt(p.date)]] })}
                      className={`h-6 min-w-6 rounded px-1 text-center text-xs font-bold ${gradeBg(p.value)}`}>
                      {p.value}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BehaviorTab({ studentId, onDetail }: { studentId: string; onDetail: (d: Detail) => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['sr-behavior', studentId], queryFn: () => behaviorApi.list({ studentId }) });
  if (isLoading) return <Loading />;
  if (!data || !data.length) return <Empty text="Ahloqiy baho yo'q" />;
  return (
    <ul className="space-y-2">
      {data.map((b) => (
        <li key={b.id}>
          <button onClick={() => onDetail({ title: 'Ahloqiy baho', rows: [['Turi', b.type === 'POSITIVE' ? 'Ijobiy' : 'Salbiy'], ['Ball', String(b.points)], ['Tavsif', b.description], ['Sana', fmt(b.date)], ['Kim', b.author?.fullName || '—']] })}
            className="flex w-full items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 text-left hover:bg-slate-50">
            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${b.type === 'POSITIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {b.type === 'POSITIVE' ? `+${b.points}` : b.points}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{b.description}</span>
            <span className="shrink-0 text-xs text-slate-400">{fmt(b.date)}</span>
            <ChevronRight size={15} className="shrink-0 text-slate-300" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function HwTab({ studentId }: { studentId: string }) {
  const { data, isLoading } = useQuery({ queryKey: ['sr-hw', studentId], queryFn: () => homeworkApi.list({ studentId }) });
  if (isLoading) return <Loading />;
  if (!data || !data.length) return <Empty text="Vazifa yo'q" />;
  return (
    <ul className="space-y-2">
      {data.map((h) => (
        <li key={h.id}>
          <Link href={`/homework/${h.id}`} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-800">{h.title}</div>
              <div className="text-xs text-slate-400">{h.type} · {h.subject.name} · {fmt(h.dueDate)}</div>
            </div>
            {h.done
              ? <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">✓</span>
              : <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{h.checked}/{h.total}</span>}
            <ChevronRight size={15} className="shrink-0 text-slate-300" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Mini({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="rounded-lg bg-slate-50 py-2">
      <div className={`text-xl font-bold ${cls}`}>{value}</div>
      <div className="text-[11px] text-slate-400">{label}</div>
    </div>
  );
}

function RecordDetailModal({ detail, onClose }: { detail: Detail; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="font-bold text-slate-800">{detail.title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <dl className="divide-y divide-slate-50 p-5">
          {detail.rows.map(([k, v], i) => (
            <div key={i} className="flex gap-3 py-1.5">
              <dt className="w-24 shrink-0 text-sm text-slate-400">{k}</dt>
              <dd className="text-sm font-medium text-slate-700">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
