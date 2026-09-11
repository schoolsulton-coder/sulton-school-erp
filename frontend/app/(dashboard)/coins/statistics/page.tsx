'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Coins } from 'lucide-react';
import { coinsApi } from '@/lib/coins';
import { useMyClasses } from '@/lib/use-my-classes';

const sel = 'rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand';

export default function CoinStatsPage() {
  const { classes } = useMyClasses();
  const [classId, setClassId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Bitta sinf biriktirilgan bo'lsa — avtomatik tanlanadi
  useEffect(() => {
    if (!classId && classes.length === 1) setClassId(classes[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['coin-stats', classId, from, to],
    queryFn: () => coinsApi.classStats(classId, from || undefined, to || undefined),
    enabled: !!classId,
  });

  return (
    <div className="p-6">
      <Link href="/coins" className="mb-4 inline-flex items-center gap-1 text-sm text-brand hover:underline">
        <ArrowLeft size={16} /> Coin sahifasiga qaytish
      </Link>

      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-100 text-amber-600">
          <Coins size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Coin statistikasi</h1>
          <p className="text-sm text-slate-500">Sinf bo&apos;yicha yig&apos;ilgan coinlar va reyting</p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5">
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className={sel}>
          <option value="">Sinfni tanlang</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="text-sm text-slate-400">Sana:</span>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={sel} />
        <span className="text-slate-400">—</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={sel} />
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo(''); }} className="px-2 py-1 text-sm text-slate-500 hover:text-slate-700">
            Tozalash
          </button>
        )}
      </div>

      {!classId ? (
        <p className="py-16 text-center text-slate-400">
          {classes.length ? 'Sinfni tanlang' : "Sizga sinf biriktirilmagan — Ma'lumotlar → Sinflar bo'limida biriktirilishi kerak"}
        </p>
      ) : isLoading ? (
        <p className="py-16 text-center text-slate-400">Yuklanmoqda…</p>
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Umumiy balans" value={stats?.balance ?? 0} tone={(stats?.balance ?? 0) >= 0 ? 'green' : 'rose'} />
            <Stat label="Qo'shilgan" value={stats?.earned ?? 0} tone="green" />
            <Stat label="Ayirilgan" value={stats?.spent ?? 0} tone="rose" />
            <Stat label="O'rtacha (o'quvchiga)" value={stats?.average ?? 0} tone="slate" />
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-center">#</th>
                  <th className="px-4 py-3">O&apos;quvchi</th>
                  <th className="px-4 py-3 text-center">Qo&apos;shilgan</th>
                  <th className="px-4 py-3 text-center">Ayirilgan</th>
                  <th className="px-4 py-3 text-center">Yozuvlar</th>
                  <th className="px-4 py-3 text-center">Balans</th>
                </tr>
              </thead>
              <tbody>
                {stats?.ranking.map((r, i) => (
                  <tr key={r.id} className="border-t border-slate-50">
                    <td className="px-4 py-2.5 text-center text-slate-400">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{r.name}</td>
                    <td className="px-4 py-2.5 text-center text-emerald-600">{r.earned ? `+${r.earned}` : '—'}</td>
                    <td className="px-4 py-2.5 text-center text-rose-500">{r.spent ? `-${r.spent}` : '—'}</td>
                    <td className="px-4 py-2.5 text-center text-slate-400">{r.count}</td>
                    <td className={`px-4 py-2.5 text-center font-bold ${r.balance >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                      {r.balance}
                    </td>
                  </tr>
                ))}
                {!stats?.ranking.length && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Ma&apos;lumot yo&apos;q</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'green' | 'rose' | 'slate' }) {
  const color =
    tone === 'green' ? 'text-emerald-600' : tone === 'rose' ? 'text-rose-600' : 'text-slate-800';
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
