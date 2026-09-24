'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CalendarCheck } from 'lucide-react';
import { ATT, fmtDay, portalApi, rateTone, TONE, todayStr } from '@/lib/portal';
import { Badge, Card, Empty, PageTitle, Ring, Skeleton, Stat, Switcher } from '@/components/portal/ui';

const shiftMonth = (ym: string, delta: number) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const WD = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

export default function PortalAttendancePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const { data, isLoading } = useQuery({
    queryKey: ['portal-attendance', studentId, month],
    queryFn: () => portalApi.attendance(studentId, month),
    placeholderData: keepPreviousData,
  });

  if (isLoading && !data) return <Skeleton rows={3} />;
  if (!data) return null;

  // Taqvim: oy boshidagi bo'sh kataklar (Dushanbadan boshlab)
  const first = new Date(`${data.days[0]?.date ?? `${month}-01`}T00:00:00Z`);
  const lead = (first.getUTCDay() + 6) % 7;

  return (
    <div className="space-y-4">
      <PageTitle title="Davomat" sub={data.total ? `${data.total} kun belgilangan` : 'Bu oyda davomat belgilanmagan'} />

      <Switcher
        label={data.monthLabel}
        onPrev={() => setMonth(shiftMonth(month, -1))}
        onNext={() => setMonth(shiftMonth(month, 1))}
        disabledNext={month >= todayStr().slice(0, 7)}
      />

      <Card>
        <div className="flex items-center gap-4">
          <Ring
            value={data.rate}
            tone={rateTone(data.rate)}
            label={data.rate === null ? '—' : `${data.rate}%`}
            sub={data.rate === null ? 'belgilanmagan' : 'davomat'}
          />
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
            <Stat value={data.present} label="Bor" tone="emerald" />
            <Stat value={data.absent} label="Yo'q" tone={data.absent ? 'rose' : 'slate'} />
            <Stat value={data.late} label="Kechikdi" tone={data.late ? 'amber' : 'slate'} />
            <Stat value={data.excused} label="Sababli" tone="sky" />
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">Foiz sababli kunlarsiz hisoblanadi</p>
      </Card>

      <Card title="Oylik taqvim" icon={CalendarCheck} tone="emerald">
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400">
          {WD.map((w) => <div key={w}>{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} />)}
          {data.days.map((d) => {
            const st = d.status ? ATT[d.status] : null;
            const day = Number(d.date.slice(8));
            return (
              <div
                key={d.date}
                title={`${fmtDay(d.date)}${st ? ` — ${st.label}` : ''}`}
                className={`grid aspect-square place-items-center rounded-xl text-sm font-medium ${
                  st ? `${TONE[st.tone].soft} font-bold` : d.isFuture ? 'text-slate-300' : 'bg-slate-50 text-slate-400'
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {Object.entries(ATT).map(([k, v]) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <span className={`h-2.5 w-2.5 rounded-full ${TONE[v.tone].bg}`} /> {v.label}
            </span>
          ))}
        </div>
      </Card>

      <Card title="E'tibor talab qiladigan kunlar">
        {data.issues.length ? (
          <div className="space-y-1.5">
            {data.issues.map((r) => {
              const st = ATT[r.status];
              return (
                <div key={r.date} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800">{fmtDay(r.date)}</div>
                    {r.note && <div className="truncate text-xs text-slate-400">{r.note}</div>}
                  </div>
                  <Badge tone={st?.tone ?? 'slate'}>{st?.label ?? r.status}</Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty text={data.total ? "Bu oy hamma darsga qatnashgan 👏" : 'Ma’lumot yo’q'} icon={CalendarCheck} />
        )}
      </Card>
    </div>
  );
}
