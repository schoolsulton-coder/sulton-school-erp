'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock, MapPin, User } from 'lucide-react';
import { fmtDate, portalApi } from '@/lib/portal';
import { Card, Empty, PageTitle, Skeleton, Switcher } from '@/components/portal/ui';

export default function PortalSchedulePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [weekId, setWeekId] = useState<string | undefined>(undefined);
  const { data, isLoading } = useQuery({
    queryKey: ['portal-schedule', studentId, weekId ?? ''],
    queryFn: () => portalApi.schedule(studentId, weekId),
    placeholderData: keepPreviousData,
  });

  if (isLoading && !data) return <Skeleton rows={3} />;
  if (!data) return null;

  // Haftalar ro'yxati yangidan eskiga — oldingi/keyingi uchun tartiblab olamiz
  const weeks = [...data.weeks].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const idx = weeks.findIndex((w) => w.id === data.week?.id);
  const go = (delta: number) => {
    const next = weeks[idx + delta];
    if (next) setWeekId(next.id);
  };
  const lessonCount = data.days.reduce((s, d) => s + d.lessons.length, 0);

  return (
    <div className="space-y-4">
      <PageTitle title="Dars jadvali" sub={data.className ? `${data.className} · ${lessonCount} ta dars` : "Sinf biriktirilmagan"} />

      {data.week ? (
        <Switcher
          label={
            <span>
              {fmtDate(data.week.startDate)} – {fmtDate(data.week.endDate)}
              {data.week.isCurrent && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">joriy hafta</span>}
            </span>
          }
          onPrev={() => go(-1)}
          onNext={() => go(1)}
          disabledNext={idx < 0 || idx >= weeks.length - 1}
        />
      ) : null}

      {!data.days.length || !lessonCount ? (
        <Card>
          <Empty text={data.className ? "Bu haftaga jadval kiritilmagan" : "Sinf biriktirilmagani uchun jadval yo'q"} icon={CalendarDays} />
        </Card>
      ) : (
        <div className="space-y-3">
          {data.days.map((d) => (
            // Darssiz kun — bitta ixcham qator
            !d.lessons.length ? (
              <div
                key={d.weekday}
                className={`flex items-center justify-between gap-2 rounded-2xl border px-4 py-2.5 text-sm ${d.isToday ? 'border-brand/40 bg-white text-brand' : 'border-slate-200/70 bg-white/60 text-slate-400'}`}
              >
                <span className="font-medium">
                  {d.label}
                  {d.isToday && <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">bugun</span>}
                </span>
                <span className="text-xs">{d.date ? fmtDate(d.date) : ''} · dars yo&apos;q</span>
              </div>
            ) : (
            <div
              key={d.weekday}
              className={`rounded-3xl border bg-white p-4 shadow-sm ${d.isToday ? 'border-brand/40 ring-2 ring-brand/10' : 'border-slate-200/80'}`}
            >
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h2 className={`font-semibold ${d.isToday ? 'text-brand' : 'text-slate-800'}`}>
                  {d.label}
                  {d.isToday && <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">bugun</span>}
                </h2>
                {d.date && <span className="text-xs text-slate-400">{fmtDate(d.date)}</span>}
              </div>

              <ol className="space-y-1.5">
                  {d.lessons.map((l, i) => (
                    <li key={l.id} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-xs font-bold text-slate-500 shadow-sm">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-800">{l.subject}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1"><Clock size={12} /> {l.startTime}–{l.endTime}</span>
                          {l.room && <span className="inline-flex items-center gap-1"><MapPin size={12} /> {l.room}</span>}
                          {l.teachers.length > 0 && <span className="inline-flex min-w-0 items-center gap-1"><User size={12} /> <span className="truncate">{l.teachers.join(', ')}</span></span>}
                        </div>
                      </div>
                    </li>
                  ))}
              </ol>
            </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
