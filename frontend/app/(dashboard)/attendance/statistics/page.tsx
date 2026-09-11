'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download } from 'lucide-react';
import { attendanceApi } from '@/lib/attendance';
import { StudentDetailModal } from '@/components/student-detail';

const sel = 'w-full rounded-lg border border-slate-300 px-2.5 py-2.5 text-sm outline-none focus:border-brand sm:w-auto sm:py-1.5';
const rateColor = (v: number) => (v >= 90 ? 'text-green-600' : v >= 75 ? 'text-sky-600' : v >= 60 ? 'text-amber-600' : 'text-red-600');

export default function AttendanceStatsPage() {
  const [classId, setClassId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [detail, setDetail] = useState<{ id: string; name: string } | null>(null);

  const { data: my } = useQuery({ queryKey: ['att-my-classes'], queryFn: attendanceApi.myClasses });

  // Bitta sinf biriktirilgan bo'lsa — avtomatik tanlanadi
  useEffect(() => {
    if (my && !classId && my.classes.length === 1) setClassId(my.classes[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [my]);
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['att-stats-page', classId, from, to],
    queryFn: () => attendanceApi.classStats(classId, from || undefined, to || undefined),
    enabled: !!classId,
  });

  const dist = stats ? [
    { k: 'Bor', n: stats.present, c: 'bg-green-400' },
    { k: "Yo'q", n: stats.absent, c: 'bg-red-400' },
    { k: 'Kechikkan', n: stats.late, c: 'bg-amber-400' },
    { k: 'Sababli', n: stats.excused, c: 'bg-sky-400' },
  ] : [];
  const distMax = stats ? Math.max(1, stats.present, stats.absent, stats.late, stats.excused) : 1;

  const exportCsv = () => {
    if (!stats?.students) return;
    const rows = [['Reyting', 'Oquvchi', 'Davomat %', 'Bor', 'Jami'], ...stats.students.map((s, i) => [i + 1, s.name, s.rate, s.present, s.total])];
    const csv = rows.map((r) => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'davomat-reyting.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link href="/attendance" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand"><ArrowLeft size={15} /> Davomat</Link>
          <h1 className="text-2xl font-bold">Davomat statistikasi</h1>
        </div>
        {stats && stats.total > 0 && (
          <button onClick={exportCsv} className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 sm:self-auto sm:py-2">
            <Download size={15} /> CSV
          </button>
        )}
      </div>

      <div className="mb-5 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className={sel}>
          <option value="">Sinf</option>
          {my?.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
          <span className="text-sm text-slate-400">Sana:</span>
          <div className="flex min-w-0 items-center gap-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${sel} min-w-0 flex-1 sm:flex-none`} />
            <span className="shrink-0 text-slate-400">—</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${sel} min-w-0 flex-1 sm:flex-none`} />
          </div>
        </div>
        {(from || to) && <button onClick={() => { setFrom(''); setTo(''); }} className="self-start px-3 py-2.5 text-sm text-slate-500 hover:text-slate-700 sm:self-auto sm:px-2 sm:py-1">Tozalash</button>}
      </div>

      {!classId ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 text-center text-slate-400">Sinfni tanlang</div>
      ) : isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 text-center text-slate-400">Yuklanmoqda…</div>
      ) : isError ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-red-300 bg-red-50 px-4 text-center text-red-500">Statistikani yuklab bo‘lmadi</div>
      ) : !stats || stats.total === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 text-center text-slate-400">Davomat topilmadi</div>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="O'rtacha davomat" value={`${stats.rate}%`} valueClass={rateColor(stats.rate)} />
            <Kpi label="Kelgan" value={stats.present} />
            <Kpi label="Kelmagan" value={stats.absent} valueClass="text-red-600" />
            <Kpi label="Kechikkan" value={stats.late} valueClass="text-amber-600" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Taqsimot</h3>
              <div className="space-y-2">
                {dist.map((d) => (
                  <div key={d.k} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-sm text-slate-600">{d.k}</span>
                    <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${d.c}`} style={{ width: `${(d.n / distMax) * 100}%` }} />
                    </div>
                    <span className="w-10 shrink-0 text-right text-sm font-medium text-slate-600">{d.n}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold uppercase leading-snug tracking-wide text-slate-500 sm:px-5">Past davomat — e&apos;tibor kerak (yuqorida eng past)</div>
              <div className="max-h-72 overflow-auto">
                <table className="w-full min-w-[300px] text-sm">
                  <tbody>
                    {stats.students?.map((s, i) => (
                      <tr key={s.id} className="border-t border-slate-100 first:border-0">
                        <td className="w-10 px-3 py-2.5 text-slate-400 sm:px-4 sm:py-2">{i + 1}</td>
                        <td className="px-1 py-2.5 sm:px-4 sm:py-2"><button onClick={() => setDetail({ id: s.id, name: s.name })} className="-my-2.5 block w-full break-words py-2.5 text-left font-medium text-slate-800 hover:text-brand hover:underline sm:my-0 sm:inline sm:w-auto sm:py-0">{s.name}</button></td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-right text-slate-400 sm:px-4 sm:py-2">{s.present}/{s.total}</td>
                        <td className={`w-16 whitespace-nowrap px-3 py-2.5 text-right text-base font-bold sm:px-4 sm:py-2 ${rateColor(s.rate)}`}>{s.rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
      <div className="break-words text-xs font-medium uppercase leading-tight tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-xl font-bold sm:text-2xl ${valueClass ?? 'text-slate-800'}`}>{value}</div>
    </div>
  );
}
