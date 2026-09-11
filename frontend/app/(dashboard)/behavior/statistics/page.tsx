'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download } from 'lucide-react';
import { behaviorApi } from '@/lib/behavior';
import { useMyClasses } from '@/lib/use-my-classes';

// Mobilda text-base (16px) — iOS fokusda sahifani kattalashtirib yubormasligi uchun; desktopda avvalgidek text-sm
const sel = 'rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand sm:py-2 sm:text-sm';

export default function BehaviorStatsPage() {
  const [classId, setClassId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { classes } = useMyClasses();

  // Bitta sinf biriktirilgan bo'lsa — avtomatik tanlanadi
  useEffect(() => {
    if (!classId && classes.length === 1) setClassId(classes[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes]);
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['behavior-stats', classId, from, to],
    queryFn: () => behaviorApi.classStats(classId, from || undefined, to || undefined),
    enabled: !!classId,
  });

  const maxAbs = stats ? Math.max(1, stats.posPoints, stats.negPoints) : 1;

  const exportCsv = () => {
    if (!stats) return;
    const rows = [['Reyting', 'Oquvchi', 'Ball', 'Ijobiy', 'Salbiy'], ...stats.students.map((s, i) => [i + 1, s.name, s.score, s.positive, s.negative])];
    const csv = rows.map((r) => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ahloq-reyting.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link href="/behavior" className="-m-2 -mb-1 inline-flex items-center gap-1 rounded-lg p-2 text-sm text-slate-500 hover:text-brand"><ArrowLeft size={15} /> Ahloqiy baho</Link>
          <h1 className="text-xl font-bold sm:text-2xl">Ahloqiy statistika</h1>
        </div>
        {stats && stats.total > 0 && (
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
        <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
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
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 text-center text-slate-400">Yozuv topilmadi</div>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="Sof ball" value={`${stats.net > 0 ? '+' : ''}${stats.net}`} valueClass={stats.net >= 0 ? 'text-green-600' : 'text-red-600'} />
            <Kpi label="Ijobiy ball" value={`+${stats.posPoints}`} valueClass="text-green-600" />
            <Kpi label="Salbiy ball" value={`−${stats.negPoints}`} valueClass="text-red-600" />
            <Kpi label="Yozuvlar" value={`${stats.posCount + stats.negCount}`} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Taqsimot</h3>
              <div className="space-y-2">
                {[{ k: `Ijobiy (${stats.posCount})`, n: stats.posPoints, c: 'bg-green-400' }, { k: `Salbiy (${stats.negCount})`, n: stats.negPoints, c: 'bg-red-400' }].map((d) => (
                  <div key={d.k} className="flex items-center gap-2 sm:gap-3">
                    <span className="w-20 shrink-0 text-sm text-slate-600 sm:w-24">{d.k}</span>
                    <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${d.c}`} style={{ width: `${(d.n / maxAbs) * 100}%` }} />
                    </div>
                    <span className="min-w-[2.5rem] shrink-0 text-right text-sm font-medium text-slate-600 sm:min-w-[3rem]">{d.n}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500 sm:px-5">O&apos;quvchilar reytingi</div>
              <div className="max-h-[60dvh] overflow-auto sm:max-h-72">
                <table className="w-full text-sm">
                  <tbody>
                    {stats.students.map((s, i) => (
                      <tr key={s.id} className="border-t border-slate-100 first:border-0">
                        <td className="w-8 px-3 py-2.5 text-slate-400 sm:w-10 sm:px-4 sm:py-2">{i + 1}</td>
                        <td className="px-2 py-2.5 font-medium text-slate-800 break-words sm:px-4 sm:py-2">{s.name}</td>
                        <td className="whitespace-nowrap px-1.5 py-2.5 text-right text-xs text-green-600 sm:px-3 sm:py-2">+{s.positive}</td>
                        <td className="whitespace-nowrap px-1.5 py-2.5 text-right text-xs text-red-600 sm:px-3 sm:py-2">−{s.negative}</td>
                        <td className={`w-12 whitespace-nowrap px-3 py-2.5 text-right text-base font-bold sm:w-14 sm:px-4 sm:py-2 ${s.score >= 0 ? 'text-green-600' : 'text-red-600'}`}>{s.score > 0 ? '+' : ''}{s.score}</td>
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
