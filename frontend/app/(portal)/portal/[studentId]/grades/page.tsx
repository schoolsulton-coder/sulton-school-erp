'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { GraduationCap } from 'lucide-react';
import { dec, fmtDay, gradeTone, portalApi, TONE, type GradeRow } from '@/lib/portal';
import { Badge, Bar, Card, Empty, PageTitle, Ring, Skeleton } from '@/components/portal/ui';

export default function PortalGradesPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [period, setPeriod] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['portal-grades', studentId, period, subjectId],
    queryFn: () => portalApi.grades(studentId, { period: period || undefined, subjectId: subjectId || undefined }),
    placeholderData: keepPreviousData,
  });

  if (isLoading && !data) return <Skeleton rows={3} />;
  if (!data) return null;

  const scale = data.scale;
  // Sana bo'yicha guruhlash
  const groups = data.list.reduce<Record<string, GradeRow[]>>((acc, g) => {
    (acc[g.date] ??= []).push(g);
    return acc;
  }, {});

  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition ${active ? 'bg-brand text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`;

  return (
    <div className="space-y-4">
      <PageTitle title="Baholar" sub={`${data.count} ta baho · ${scale} ballik tizim`} />

      {/* Chorak filtri */}
      {data.periods.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <button type="button" onClick={() => setPeriod('')} className={chip(!period)}>Hammasi</button>
          {data.periods.map((p) => (
            <button key={p} type="button" onClick={() => setPeriod(p)} className={chip(period === p)}>{p}</button>
          ))}
        </div>
      )}

      <Card>
        <div className="flex items-center gap-4">
          <Ring
            value={data.average}
            max={scale}
            tone={gradeTone(data.average, scale)}
            label={data.count ? dec(data.average) : '—'}
            sub={`/ ${scale}`}
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm text-slate-500">O&apos;rtacha baho</div>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Fanlar</span><b>{data.subjects.length}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Eng yuqori</span><b className="text-emerald-700">{data.subjects.length ? dec(Math.max(...data.subjects.map((s) => s.best))) : '—'}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Eng past</span><b className="text-rose-700">{data.subjects.length ? dec(Math.min(...data.subjects.map((s) => s.worst))) : '—'}</b></div>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Fanlar bo'yicha" icon={GraduationCap} tone="violet">
        {data.subjects.length ? (
          <div className="space-y-2.5">
            {data.subjects.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSubjectId(subjectId === s.id ? '' : s.id)}
                className={`block w-full rounded-2xl px-2 py-1.5 text-left transition ${subjectId === s.id ? 'bg-slate-50 ring-1 ring-slate-200' : ''}`}
              >
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate text-slate-700">{s.name}</span>
                  <span className={`shrink-0 font-bold ${TONE[gradeTone(s.average, scale)].text}`}>
                    {dec(s.average)} <span className="text-xs font-normal text-slate-400">({s.count})</span>
                  </span>
                </div>
                <div className="mt-1"><Bar value={s.average} max={scale} tone={gradeTone(s.average, scale)} /></div>
              </button>
            ))}
            {subjectId && (
              <button type="button" onClick={() => setSubjectId('')} className="w-full py-1 text-center text-xs font-medium text-slate-500">
                Fan filtrini olib tashlash
              </button>
            )}
          </div>
        ) : (
          <Empty text="Bu davrda baho qo'yilmagan" icon={GraduationCap} />
        )}
      </Card>

      <Card title="Baholar tarixi">
        {Object.keys(groups).length ? (
          <div className="space-y-4">
            {Object.entries(groups).slice(0, 30).map(([date, rows]) => (
              <div key={date}>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{fmtDay(date)}</div>
                <div className="space-y-1.5">
                  {rows.map((g) => (
                    <div key={g.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${TONE[gradeTone(g.value, scale)].soft}`}>
                        {g.value}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-800">{g.subject}</div>
                        <div className="truncate text-xs text-slate-400">
                          {g.typeLabel}
                          {g.period ? ` · ${g.period}` : ''}
                          {g.teacher ? ` · ${g.teacher}` : ''}
                        </div>
                        {g.comment && <div className="mt-0.5 truncate text-xs text-slate-500">{g.comment}</div>}
                      </div>
                      {g.type !== 'DAILY' && <Badge tone="slate">{g.typeLabel}</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="Baho yo'q" icon={GraduationCap} />
        )}
      </Card>
    </div>
  );
}
