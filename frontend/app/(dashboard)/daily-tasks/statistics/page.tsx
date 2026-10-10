'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, School, Users } from 'lucide-react';
import {
  dailyTasksApi,
  doneTone,
  fmtDay,
  schoolToday,
  shiftDay,
  type DailyStats,
} from '@/lib/daily-tasks';
import { useMyClasses } from '@/lib/use-my-classes';

const RANGES = [
  { key: '7', label: '7 kun', days: 7 },
  { key: '30', label: '30 kun', days: 30 },
  { key: '90', label: 'Chorak', days: 90 },
] as const;

export default function DailyTasksStatsPage() {
  const { classes } = useMyClasses();
  const [classId, setClassId] = useState('');
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('7');

  useEffect(() => {
    if (!classId && classes.length) setClassId(classes[0].id);
  }, [classes, classId]);

  const to = schoolToday();
  const days = RANGES.find((r) => r.key === range)!.days;
  const from = shiftDay(to, -(days - 1));

  const { data, isLoading } = useQuery({
    queryKey: ['daily-stats', classId, from, to],
    queryFn: () => dailyTasksApi.stats(classId, from, to),
    enabled: !!classId,
  });

  const sel =
    'min-w-0 rounded-lg border border-slate-300 px-2.5 py-2.5 text-base outline-none focus:border-brand sm:py-1.5 sm:text-sm';
  const percent = data?.totals.possible
    ? Math.round((data.totals.done / data.totals.possible) * 100)
    : 0;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-3 flex items-start justify-between gap-3 sm:mb-5">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold sm:text-2xl">Kunlik vazifalar statistikasi</h1>
          <p className="hidden text-sm text-slate-500 sm:block">
            {fmtDay(from)} — {fmtDay(to)} oralig&apos;i
          </p>
        </div>
        <Link
          href="/daily-tasks"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 sm:py-2"
        >
          <ArrowLeft size={15} /> <span className="hidden sm:inline">Belgilash</span>
        </Link>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2">
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className={`${sel} flex-1 sm:max-w-xs`}>
          <option value="">Sinf</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex shrink-0 gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition sm:py-1.5 ${
                range === r.key ? 'bg-brand text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {!classId ? (
        <Empty text={classes.length ? 'Sinfni tanlang' : 'Sizga sinf biriktirilmagan'} />
      ) : isLoading && !data ? (
        <Empty text="Yuklanmoqda…" />
      ) : !data ? (
        <Empty text="Ma'lumot yo'q" />
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <Stat label="Bajarildi" value={`${percent}%`} sub={`${data.totals.done} / ${data.totals.possible}`} tone="emerald" />
            <Stat label="Yig'ilgan coin" value={`+${data.totals.coins}`} sub={`${data.days.length} kun`} tone="amber" />
            <Stat label="O'quvchi" value={data.totals.students} sub="faol" tone="brand" />
            <Stat label="Vazifa" value={data.totals.tasks} sub="kunlik" tone="indigo" />
          </div>

          {/* Kunlar bo'yicha ustunlar */}
          <section className="mb-3 rounded-xl border border-slate-200 bg-white p-3">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Kunlar bo&apos;yicha</h2>
            <DayChart data={data} />
          </section>

          <div className="grid gap-3 lg:grid-cols-2">
            {/* Vazifalar reytingi */}
            <section className="rounded-xl border border-slate-200 bg-white p-3">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Qaysi vazifa qanchalik bajarilgan</h2>
              <ul className="space-y-2.5">
                {data.tasks.map((t) => (
                  <li key={t.id}>
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className={t.scope === 'school' ? 'text-brand' : 'text-indigo-500'}>
                          {t.scope === 'school' ? <School size={13} /> : <Users size={13} />}
                        </span>
                        <span className="truncate text-slate-700">{t.title}</span>
                      </span>
                      <span className={`shrink-0 font-semibold ${doneTone(t.percent).text}`}>{t.percent}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${doneTone(t.percent).bar}`} style={{ width: `${t.percent}%` }} />
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {t.done} marta · +{t.coins} coin
                      {!t.active && ' · yopilgan'}
                    </div>
                  </li>
                ))}
                {!data.tasks.length && <li className="py-6 text-center text-sm text-slate-400">Vazifa yo&apos;q</li>}
              </ul>
            </section>

            {/* O'quvchilar reytingi */}
            <section className="rounded-xl border border-slate-200 bg-white p-3">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">O&apos;quvchilar reytingi</h2>
              <ul className="divide-y divide-slate-100">
                {[...data.students]
                  .sort((a, b) => b.coins - a.coins || b.done - a.done)
                  .map((s, i) => (
                    <li key={s.id} className="flex items-center gap-3 py-2">
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                          i === 0 ? 'bg-amber-100 text-amber-700' : i < 3 ? 'bg-slate-100 text-slate-600' : 'text-slate-400'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-slate-800">{s.name}</span>
                        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <span className={`block h-full rounded-full ${doneTone(s.percent).bar}`} style={{ width: `${s.percent}%` }} />
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-bold text-amber-600">+{s.coins}</span>
                        <span className="block text-[11px] text-slate-400">{s.percent}%</span>
                      </span>
                    </li>
                  ))}
                {!data.students.length && <li className="py-6 text-center text-sm text-slate-400">O&apos;quvchi yo&apos;q</li>}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function DayChart({ data }: { data: DailyStats }) {
  const max = Math.max(1, ...data.daily.map((d) => d.done));
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-full items-end justify-center gap-1.5">
        {data.daily.map((d) => {
          const h = Math.round((d.done / max) * 100);
          return (
            <div
              key={d.date}
              className="flex min-w-[1.5rem] max-w-[3rem] flex-1 flex-col items-center gap-1"
              title={`${fmtDay(d.date)} · ${d.done} vazifa · +${d.coins} coin`}
            >
              <span className="text-[10px] font-medium text-slate-400">{d.done || ''}</span>
              {/* Foizli balandlik aniq balandlikdagi idish ichida ishlaydi */}
              <div className="flex h-24 w-full items-end">
                <div
                  className={`w-full rounded-t transition-all ${d.done ? 'bg-brand' : 'bg-slate-100'}`}
                  style={{ height: `${Math.max(h, 3)}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400">{d.date.slice(8, 10)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub: string;
  tone: 'emerald' | 'amber' | 'brand' | 'indigo';
}) {
  const TONES = {
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    brand: 'text-brand',
    indigo: 'text-indigo-600',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-xl font-bold ${TONES[tone]}`}>{value}</div>
      <div className="text-[11px] text-slate-400">{sub}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex min-h-[10rem] items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400 sm:px-6 sm:text-base">
      {text}
    </div>
  );
}
