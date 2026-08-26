'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download } from 'lucide-react';
import { gradesApi, GRADE_TYPES, CHORAK_OPTIONS, gradeColor, gradeBg } from '@/lib/grades';
import { StudentDetailModal } from '@/components/student-detail';

const sel = 'rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand';

export default function GradeStatsPage() {
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [type, setType] = useState('');
  const [period, setPeriod] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [detail, setDetail] = useState<{ id: string; name: string } | null>(null);
  const isPeriodType = type === 'QUARTER' || type === 'YEAR';

  const { data: my } = useQuery({ queryKey: ['grades-my-subjects'], queryFn: gradesApi.mySubjects });
  const subjectOptions = useMemo(() => {
    if (!my) return [];
    if (my.canGradeAll || !classId) return my.subjects;
    const s = my.assignments.filter((a) => a.classId === classId).map((a) => ({ id: a.subjectId, name: a.subjectName }));
    return s.length ? s : my.subjects;
  }, [my, classId]);

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['grade-stats', classId, subjectId, type, from, to, period],
    queryFn: () =>
      gradesApi.classStats(classId, {
        subjectId: subjectId || undefined,
        type: type || undefined,
        from: from || undefined,
        to: to || undefined,
        period: isPeriodType ? period || undefined : undefined,
      }),
    enabled: !!classId,
  });

  const distMax = stats ? Math.max(1, ...Object.values(stats.distribution)) : 1;
  const subjMax = stats ? Math.max(1, ...stats.bySubject.map((s) => s.average)) : 5;

  const exportCsv = () => {
    if (!stats) return;
    const rows = [
      ['Reyting', 'Oquvchi', 'Ortacha', 'Baholar soni'],
      ...stats.students.map((s, i) => [i + 1, s.name, s.average, s.count]),
    ];
    const csv = rows.map((r) => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'baho-reyting.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/grades" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand"><ArrowLeft size={15} /> Jurnal</Link>
          <h1 className="text-2xl font-bold">Baho statistikasi</h1>
        </div>
        {stats && stats.count > 0 && (
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Download size={15} /> CSV
          </button>
        )}
      </div>

      {/* Filtrlar */}
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <select value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectId(''); }} className={sel}>
          <option value="">Sinf</option>
          {my?.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={sel}>
          <option value="">Barcha fanlar</option>
          {subjectOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={type} onChange={(e) => { setType(e.target.value); setPeriod(''); }} className={sel}>
          <option value="">Barcha turlar</option>
          {GRADE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        {isPeriodType && (
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className={sel}>
            <option value="">Barcha choraklar</option>
            {CHORAK_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <span className="text-sm text-slate-400">Sana:</span>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={sel} />
        <span className="text-slate-400">—</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={sel} />
        {(from || to || subjectId || type || period) && (
          <button onClick={() => { setSubjectId(''); setType(''); setPeriod(''); setFrom(''); setTo(''); }} className="px-2 py-1 text-sm text-slate-500 hover:text-slate-700">Tozalash</button>
        )}
      </div>

      {!classId ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400">Sinfni tanlang</div>
      ) : isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400">Yuklanmoqda…</div>
      ) : isError ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-red-300 bg-red-50 text-red-500">Statistikani yuklab bo‘lmadi</div>
      ) : !stats || stats.count === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400">Baho topilmadi</div>
      ) : (
        <div className="space-y-5">
          {/* KPI kartalar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="O'rtacha ball" value={stats.average || '—'} valueClass={gradeColor(stats.average)} />
            <Kpi label="Jami baho" value={stats.count} />
            <Kpi label="A'lo baho ulushi (5)" value={`${stats.excellentPct}%`} valueClass="text-green-600" />
            <Kpi label="Past baho ulushi (3<)" value={`${stats.failPct}%`} valueClass="text-red-600" />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Taqsimot */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Baholar taqsimoti</h3>
              <div className="space-y-2">
                {['5', '4', '3', '2', '1'].map((k) => {
                  const n = stats.distribution[k] ?? 0;
                  return (
                    <div key={k} className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 items-center justify-center rounded font-bold ${gradeBg(Number(k))}`}>{k}</span>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-brand/70" style={{ width: `${(n / distMax) * 100}%` }} />
                      </div>
                      <span className="w-10 text-right text-sm font-medium text-slate-600">{n}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fanlar bo'yicha o'rtacha */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Fanlar bo&apos;yicha o&apos;rtacha</h3>
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {stats.bySubject.map((s) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="w-28 truncate text-sm text-slate-600" title={s.name}>{s.name}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-sky-400" style={{ width: `${(s.average / subjMax) * 100}%` }} />
                    </div>
                    <span className={`w-10 text-right text-sm font-bold ${gradeColor(s.average)}`}>{s.average}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* O'quvchilar reytingi */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500">O&apos;quvchilar reytingi</div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="w-12 px-4 py-2">#</th>
                  <th className="px-4 py-2">O&apos;quvchi</th>
                  <th className="w-24 px-4 py-2 text-center">Baholar</th>
                  <th className="w-24 px-4 py-2 text-center">O&apos;rtacha</th>
                </tr>
              </thead>
              <tbody>
                {stats.students.map((s, i) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-2"><button onClick={() => setDetail({ id: s.id, name: s.name })} className="font-medium text-slate-800 hover:text-brand hover:underline">{s.name}</button></td>
                    <td className="px-4 py-2 text-center text-slate-500">{s.count}</td>
                    <td className={`px-4 py-2 text-center text-base font-bold ${gradeColor(s.average)}`}>{s.average}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {detail && <StudentDetailModal studentId={detail.id} name={detail.name} onClose={() => setDetail(null)} />}
    </div>
  );
}

function Kpi({ label, value, valueClass }: { label: string; value: string | number; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${valueClass ?? 'text-slate-800'}`}>{value}</div>
    </div>
  );
}
