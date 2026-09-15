'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download } from 'lucide-react';
import { behaviorApi, currentMonth, scoreBar, scoreTone } from '@/lib/behavior';
import { useMyClasses } from '@/lib/use-my-classes';

// Mobilda text-base (16px) — iOS fokusda sahifani kattalashtirib yubormasligi uchun; desktopda avvalgidek text-sm
const sel = 'rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand sm:py-2 sm:text-sm';

export default function BehaviorStatsPage() {
  const [classId, setClassId] = useState('');
  const [month, setMonth] = useState(currentMonth());

  const { classes } = useMyClasses();

  // Bitta sinf biriktirilgan bo'lsa — avtomatik tanlanadi
  useEffect(() => {
    if (!classId && classes.length === 1) setClassId(classes[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes]);
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['behavior-stats', classId, month],
    queryFn: () => behaviorApi.classStats(classId, month || undefined),
    enabled: !!classId,
  });

  const exportCsv = () => {
    if (!stats) return;
    const rows = [
      ['Reyting', 'Oquvchi', 'Ayirilgan', 'Qoldiq', 'Yozuvlar'],
      ...stats.ranking.map((s, i) => [i + 1, s.name, s.deducted, s.remaining, s.records]),
    ];
    const csv = rows.map((r) => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ahloq-${stats.month}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const buckets = stats
    ? [
        { k: `${stats.limit} (toza)`, n: stats.buckets.full, c: 'bg-emerald-500' },
        { k: '80–99', n: stats.buckets.good, c: 'bg-emerald-300' },
        { k: '50–79', n: stats.buckets.mid, c: 'bg-amber-400' },
        { k: '0–49', n: stats.buckets.low, c: 'bg-red-400' },
      ]
    : [];
  const maxBucket = Math.max(1, ...buckets.map((b) => b.n));

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link href="/behavior" className="-m-2 -mb-1 inline-flex items-center gap-1 rounded-lg p-2 text-sm text-slate-500 hover:text-brand"><ArrowLeft size={15} /> Ahloqiy baho</Link>
          <h1 className="text-xl font-bold sm:text-2xl">Ahloqiy statistika</h1>
          <p className="text-sm text-slate-500">
            {stats ? `${stats.monthLabel} · ` : ''}har o&apos;quvchiga oyiga 100 ball
          </p>
        </div>
        {stats && stats.students > 0 && (
          <button onClick={exportCsv} className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 sm:self-auto sm:py-2">
            <Download size={15} /> CSV
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:mb-5 sm:flex-row sm:flex-wrap sm:items-center">
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className={`${sel} w-full sm:w-auto`}>
          <option value="">Sinf</option>
          {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
          <span className="shrink-0 text-sm text-slate-400">Oy:</span>
          <input
            type="month"
            value={month}
            max={currentMonth()}
            onChange={(e) => setMonth(e.target.value || currentMonth())}
            className={`${sel} min-w-0 flex-1 sm:flex-none`}
          />
        </div>
        {month !== currentMonth() && (
          <button onClick={() => setMonth(currentMonth())} className="self-start px-3 py-2.5 text-sm text-slate-500 hover:text-slate-700 sm:self-auto sm:px-2 sm:py-1">Joriy oy</button>
        )}
      </div>

      {!classId ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 text-center text-slate-400">Sinfni tanlang</div>
      ) : isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 text-center text-slate-400">Yuklanmoqda…</div>
      ) : isError ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-red-300 bg-red-50 px-4 text-center text-red-500">Statistikani yuklab bo‘lmadi</div>
      ) : !stats || stats.students === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 text-center text-slate-400">Sinfda faol o&apos;quvchi yo&apos;q</div>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="O'rtacha ball" value={`${stats.averageRemaining}/${stats.limit}`} valueClass={scoreTone(stats.averageRemaining)} />
            <Kpi label="Ayirilgan ball" value={stats.totalDeducted ? `−${stats.totalDeducted}` : '0'} valueClass={stats.totalDeducted ? 'text-red-600' : 'text-slate-800'} />
            <Kpi label="Ball ayirilganlar" value={`${stats.withDeductions}/${stats.students}`} />
            <Kpi label="Yozuvlar" value={`${stats.records}`} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Ball bo&apos;yicha taqsimot</h3>
              <div className="space-y-2">
                {buckets.map((d) => (
                  <div key={d.k} className="flex items-center gap-2 sm:gap-3">
                    <span className="w-20 shrink-0 text-sm text-slate-600 sm:w-24">{d.k}</span>
                    <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${d.c}`} style={{ width: `${(d.n / maxBucket) * 100}%` }} />
                    </div>
                    <span className="min-w-[2.5rem] shrink-0 text-right text-sm font-medium text-slate-600 sm:min-w-[3rem]">{d.n}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500 sm:px-5">O&apos;quvchilar reytingi</div>
              <div className="max-h-[60dvh] overflow-auto sm:max-h-80">
                <table className="w-full text-sm">
                  <tbody>
                    {stats.ranking.map((s, i) => (
                      <tr key={s.id} className="border-t border-slate-100 first:border-0">
                        <td className="w-8 px-3 py-2.5 text-slate-400 sm:w-10 sm:px-4 sm:py-2">{i + 1}</td>
                        <td className="px-2 py-2.5 font-medium text-slate-800 break-words sm:px-4 sm:py-2">
                          {s.name}
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div className={`h-full rounded-full ${scoreBar(s.remaining)}`} style={{ width: `${(s.remaining / stats.limit) * 100}%` }} />
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-1.5 py-2.5 text-right text-xs text-red-600 sm:px-3 sm:py-2">{s.deducted ? `−${s.deducted}` : ''}</td>
                        <td className={`w-16 whitespace-nowrap px-3 py-2.5 text-right text-base font-bold sm:px-4 sm:py-2 ${scoreTone(s.remaining)}`}>
                          {s.remaining}<span className="text-xs font-normal text-slate-400">/{stats.limit}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, valueClass }: { label: string; value: string | number; valueClass?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <div className="truncate text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 truncate text-xl font-bold sm:text-2xl ${valueClass ?? 'text-slate-800'}`}>{value}</div>
    </div>
  );
}
