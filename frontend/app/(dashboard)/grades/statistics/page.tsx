'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download } from 'lucide-react';
import { gradesApi, GRADE_TYPES, CHORAK_OPTIONS, gradeColor, gradeBg } from '@/lib/grades';
import { StudentDetailModal } from '@/components/student-detail';

const sel = 'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand sm:w-auto sm:py-2';
// Sana inputlari: mobilda ikkitasi bitta qatorga sig'ishi uchun paddingi kichikroq
const dateSel = 'min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-2.5 text-sm outline-none focus:border-brand sm:w-auto sm:flex-none sm:px-3 sm:py-2';

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

  // Bitta sinf/fan biriktirilgan bo'lsa — avtomatik tanlanadi
  useEffect(() => {
    if (!my) return;
    if (!classId && my.classes.length === 1) setClassId(my.classes[0].id);
    if (!subjectId && my.subjects.length === 1) setSubjectId(my.subjects[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [my]);
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
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link href="/grades" className="mb-0.5 inline-flex items-center gap-1 py-2.5 text-sm text-slate-500 hover:text-brand sm:mb-1 sm:py-1"><ArrowLeft size={15} /> Jurnal</Link>
          <h1 className="text-xl font-bold sm:text-2xl">Baho statistikasi</h1>
        </div>
        {stats && stats.count > 0 && (
          <button onClick={exportCsv} className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 sm:self-auto sm:py-2">
            <Download size={15} /> CSV
          </button>
        )}
      </div>

      {/* Filtrlar */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 sm:mb-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
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
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <span className="shrink-0 text-sm text-slate-400">Sana:</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={dateSel} />
            <span className="shrink-0 text-slate-400">—</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={dateSel} />
          </div>
          {(from || to || subjectId || type || period) && (
            <button onClick={() => { setSubjectId(''); setType(''); setPeriod(''); setFrom(''); setTo(''); }} className="w-full rounded-lg px-2 py-2.5 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 sm:w-auto sm:py-1">Tozalash</button>
          )}
        </div>
      </div>

      {!classId ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 text-center text-sm text-slate-400 sm:text-base">Sinfni tanlang</div>
      ) : isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 text-center text-sm text-slate-400 sm:text-base">Yuklanmoqda…</div>
      ) : isError ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-red-300 bg-red-50 px-4 text-center text-sm text-red-500 sm:text-base">Statistikani yuklab bo‘lmadi</div>
      ) : !stats || stats.count === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 text-center text-sm text-slate-400 sm:text-base">Baho topilmadi</div>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {/* KPI kartalar */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="O'rtacha ball" value={stats.average || '—'} valueClass={gradeColor(stats.average)} />
            <Kpi label="Jami baho" value={stats.count} />
            <Kpi label="A'lo baho ulushi (5)" value={`${stats.excellentPct}%`} valueClass="text-green-600" />
            <Kpi label="Past baho ulushi (3<)" value={`${stats.failPct}%`} valueClass="text-red-600" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
            {/* Taqsimot */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Baholar taqsimoti</h3>
              <div className="space-y-2">
                {['5', '4', '3', '2', '1'].map((k) => {
                  const n = stats.distribution[k] ?? 0;
                  return (
                    <div key={k} className="flex items-center gap-2 sm:gap-3">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded font-bold ${gradeBg(Number(k))}`}>{k}</span>
                      <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-brand/70" style={{ width: `${(n / distMax) * 100}%` }} />
                      </div>
                      <span className="w-10 shrink-0 text-right text-sm font-medium text-slate-600">{n}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fanlar bo'yicha o'rtacha */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Fanlar bo&apos;yicha o&apos;rtacha</h3>
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {stats.bySubject.map((s) => (
                  <div key={s.name} className="flex items-center gap-2 sm:gap-3">
                    <span className="w-20 shrink-0 truncate text-sm text-slate-600 sm:w-28" title={s.name}>{s.name}</span>
                    <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-sky-400" style={{ width: `${(s.average / subjMax) * 100}%` }} />
                    </div>
                    <span className={`w-10 shrink-0 text-right text-sm font-bold ${gradeColor(s.average)}`}>{s.average}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* O'quvchilar reytingi */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500 sm:px-5">O&apos;quvchilar reytingi</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="w-10 px-3 py-2 sm:w-12 sm:px-4">#</th>
                    <th className="px-3 py-2 sm:px-4">O&apos;quvchi</th>
                    <th className="w-16 px-2 py-2 text-center sm:w-24 sm:px-4">Baholar</th>
                    <th className="w-16 px-2 py-2 text-center sm:w-24 sm:px-4">O&apos;rtacha</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.students.map((s, i) => (
                    <tr key={s.id} className="border-t border-slate-100">
                      <td className="px-3 py-2.5 text-slate-400 sm:px-4 sm:py-2">{i + 1}</td>
                      <td className="px-3 py-2.5 sm:px-4 sm:py-2"><button onClick={() => setDetail({ id: s.id, name: s.name })} className="break-words text-left font-medium text-slate-800 hover:text-brand hover:underline">{s.name}</button></td>
                      <td className="px-2 py-2.5 text-center text-slate-500 sm:px-4 sm:py-2">{s.count}</td>
                      <td className={`px-2 py-2.5 text-center text-base font-bold sm:px-4 sm:py-2 ${gradeColor(s.average)}`}>{s.average}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {detail && <StudentDetailModal studentId={detail.id} name={detail.name} onClose={() => setDetail(null)} />}
    </div>
  );
}

function Kpi({ label, value, valueClass }: { label: string; value: string | number; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <div className="text-xs font-medium uppercase leading-tight tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-xl font-bold sm:text-2xl ${valueClass ?? 'text-slate-800'}`}>{value}</div>
    </div>
  );
}
