'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download } from 'lucide-react';
import { behaviorApi } from '@/lib/behavior';
import { classesApi } from '@/lib/classes';

const sel = 'rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand';

export default function BehaviorStatsPage() {
  const [classId, setClassId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: classes } = useQuery({ queryKey: ['classes-mini'], queryFn: () => classesApi.list() });
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
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/behavior" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand"><ArrowLeft size={15} /> Ahloqiy baho</Link>
          <h1 className="text-2xl font-bold">Ahloqiy statistika</h1>
        </div>
        {stats && stats.total > 0 && (
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Download size={15} /> CSV
          </button>
        )}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className={sel}>
          <option value="">Sinf</option>
          {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="text-sm text-slate-400">Sana:</span>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={sel} />
        <span className="text-slate-400">—</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={sel} />
        {(from || to) && <button onClick={() => { setFrom(''); setTo(''); }} className="px-2 py-1 text-sm text-slate-500 hover:text-slate-700">Tozalash</button>}
      </div>

      {!classId ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400">Sinfni tanlang</div>
      ) : isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400">Yuklanmoqda…</div>
      ) : isError ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-red-300 bg-red-50 text-red-500">Statistikani yuklab bo‘lmadi</div>
      ) : !stats || stats.total === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400">Yozuv topilmadi</div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="Sof ball" value={`${stats.net > 0 ? '+' : ''}${stats.net}`} valueClass={stats.net >= 0 ? 'text-green-600' : 'text-red-600'} />
            <Kpi label="Ijobiy ball" value={`+${stats.posPoints}`} valueClass="text-green-600" />
            <Kpi label="Salbiy ball" value={`−${stats.negPoints}`} valueClass="text-red-600" />
            <Kpi label="Yozuvlar" value={`${stats.posCount + stats.negCount}`} />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Taqsimot</h3>
              <div className="space-y-2">
                {[{ k: `Ijobiy (${stats.posCount})`, n: stats.posPoints, c: 'bg-green-400' }, { k: `Salbiy (${stats.negCount})`, n: stats.negPoints, c: 'bg-red-400' }].map((d) => (
                  <div key={d.k} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-slate-600">{d.k}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${d.c}`} style={{ width: `${(d.n / maxAbs) * 100}%` }} />
                    </div>
                    <span className="w-12 text-right text-sm font-medium text-slate-600">{d.n}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500">O&apos;quvchilar reytingi</div>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {stats.students.map((s, i) => (
                      <tr key={s.id} className="border-t border-slate-100 first:border-0">
                        <td className="w-10 px-4 py-2 text-slate-400">{i + 1}</td>
                        <td className="px-4 py-2 font-medium text-slate-800">{s.name}</td>
                        <td className="px-3 py-2 text-right text-xs text-green-600">+{s.positive}</td>
                        <td className="px-3 py-2 text-right text-xs text-red-600">−{s.negative}</td>
                        <td className={`w-14 px-4 py-2 text-right text-base font-bold ${s.score >= 0 ? 'text-green-600' : 'text-red-600'}`}>{s.score > 0 ? '+' : ''}{s.score}</td>
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
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${valueClass ?? 'text-slate-800'}`}>{value}</div>
    </div>
  );
}
