'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Coins,
  CreditCard,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import {
  ATT,
  behaviorTone,
  dec,
  dueLabel,
  fmtDate,
  fmtDay,
  gradeTone,
  money,
  portalApi,
  rateTone,
  type SummaryData,
} from '@/lib/portal';
import { Badge, Bar, Card, Empty, Ring, Skeleton, Stat } from '@/components/portal/ui';

export default function PortalDashboard() {
  const { studentId } = useParams<{ studentId: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal-summary', studentId],
    queryFn: () => portalApi.summary(studentId),
  });

  if (isLoading) return <Skeleton rows={4} />;
  if (isError || !data) return <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">Ma&apos;lumotni yuklab bo&apos;lmadi</div>;

  const d: SummaryData = data;
  const base = `/portal/${studentId}`;
  const day = d.schedule.today ?? d.schedule.next;
  const todayAtt = d.attendance.todayStatus ? ATT[d.attendance.todayStatus] : null;

  return (
    <div className="space-y-4">
      {/* Bugun */}
      <Card
        title={d.schedule.today ? 'Bugungi darslar' : day ? `Keyingi dars kuni — ${day.label}` : 'Dars jadvali'}
        icon={CalendarDays}
        tone="sky"
        href={`${base}/schedule`}
        action={todayAtt ? <Badge tone={todayAtt.tone}>Bugun: {todayAtt.label}</Badge> : undefined}
      >
        {day?.lessons.length ? (
          <ol className="space-y-1.5">
            {day.lessons.map((l, i) => (
              <li key={l.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-xs font-bold text-slate-500 shadow-sm">{i + 1}</span>
                <span className="w-[86px] shrink-0 font-mono text-xs text-slate-500">{l.startTime}–{l.endTime}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{l.subject}</span>
                {l.room && <span className="shrink-0 text-xs text-slate-400">{l.room}</span>}
              </li>
            ))}
          </ol>
        ) : (
          <Empty text="Bugun dars yo'q" icon={CalendarDays} />
        )}
      </Card>

      {/* Vazifa */}
      <Card title="Uy vazifalari" icon={BookOpen} tone="amber" href={`${base}/homework`}>
        <div className="grid grid-cols-2 gap-2">
          <Stat value={d.homework.pending} label="Bajarilishi kerak" tone={d.homework.pending ? 'amber' : 'slate'} />
          <Stat value={d.homework.overdue} label="Muddati o'tgan" tone={d.homework.overdue ? 'rose' : 'slate'} />
        </div>
        {d.homework.next ? (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-800">{d.homework.next.title}</div>
              <div className="truncate text-xs text-slate-400">{d.homework.next.subject} · {fmtDay(d.homework.next.dueDate)}</div>
            </div>
            <Badge tone={d.homework.next.overdue ? 'rose' : 'amber'}>{dueLabel(d.homework.next.dueDate, d.today)}</Badge>
          </div>
        ) : (
          <p className="mt-3 text-center text-sm text-emerald-600">Bajarilmagan vazifa yo&apos;q 🎉</p>
        )}
      </Card>

      {/* Baho */}
      <Card title="Baholar" icon={GraduationCap} tone="violet" href={`${base}/grades`}>
        <div className="flex items-center gap-4">
          <Ring
            value={d.grades.average}
            max={d.grades.scale}
            tone={gradeTone(d.grades.average, d.grades.scale)}
            label={d.grades.count ? dec(d.grades.average) : '—'}
            sub={`/ ${d.grades.scale}`}
            size={104}
          />
          <div className="min-w-0 flex-1 space-y-2">
            {d.grades.subjects.length ? (
              d.grades.subjects.slice(0, 3).map((s) => (
                <div key={s.id}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate text-slate-700">{s.name}</span>
                    <span className={`shrink-0 font-semibold ${gradeTone(s.average, d.grades.scale) === 'slate' ? 'text-slate-500' : ''}`}>{dec(s.average)}</span>
                  </div>
                  <div className="mt-1"><Bar value={s.average} max={d.grades.scale} tone={gradeTone(s.average, d.grades.scale)} /></div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">Hozircha baho qo&apos;yilmagan</p>
            )}
          </div>
        </div>
      </Card>

      {/* Davomat */}
      <Card title="Davomat" icon={CalendarCheck} tone="emerald" href={`${base}/attendance`} action={<span className="text-xs text-slate-400">{d.attendance.monthLabel}</span>}>
        <div className="flex items-center gap-4">
          <Ring
            value={d.attendance.rate}
            tone={rateTone(d.attendance.rate)}
            label={d.attendance.rate === null ? '—' : `${d.attendance.rate}%`}
            sub={d.attendance.total ? `${d.attendance.total} kun` : 'belgilanmagan'}
            size={104}
          />
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
            <Stat value={d.attendance.present} label="Bor" tone="emerald" />
            <Stat value={d.attendance.absent} label="Yo'q" tone={d.attendance.absent ? 'rose' : 'slate'} />
            <Stat value={d.attendance.late} label="Kechikdi" tone={d.attendance.late ? 'amber' : 'slate'} />
            <Stat value={d.attendance.excused} label="Sababli" tone="sky" />
          </div>
        </div>
      </Card>

      {/* Ahloq + coin */}
      <Card title="Ahloqiy ball" icon={Sparkles} tone="violet" href={`${base}/behavior`} action={<span className="text-xs text-slate-400">{d.behavior.monthLabel}</span>}>
        <div className="flex items-center gap-4">
          <Ring
            value={d.behavior.remaining}
            max={d.behavior.limit}
            tone={behaviorTone(d.behavior.remaining, d.behavior.limit)}
            label={d.behavior.remaining}
            sub={`/ ${d.behavior.limit}`}
            size={104}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm">
              {d.behavior.deducted ? (
                <>
                  <span className="text-slate-500">Bu oy ayirilgan:</span> <b className="text-rose-600">−{d.behavior.deducted}</b>
                  <div className="text-xs text-slate-400">{d.behavior.records} ta yozuv</div>
                </>
              ) : (
                <span className="text-emerald-600">Bu oy ball ayirilmagan 👍</span>
              )}
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <Coins size={16} /> Coin: <b>{d.behavior.coins}</b>
            </div>
          </div>
        </div>
      </Card>

      {/* To'lov */}
      <Card title="To'lovlar" icon={CreditCard} tone={d.payments.overdue ? 'rose' : 'slate'} href={`${base}/payments`}>
        {d.payments.debt ? (
          <div className="grid grid-cols-2 gap-2">
            <Stat value={money(d.payments.debt)} label="Jami qoldiq" tone="slate" />
            <Stat value={money(d.payments.overdue)} label="Muddati o'tgan" tone={d.payments.overdue ? 'rose' : 'slate'} />
          </div>
        ) : (
          <p className="text-center text-sm text-emerald-600">Qarzdorlik yo&apos;q ✅</p>
        )}
        {d.payments.next && (
          <p className="mt-3 text-center text-sm text-slate-500">
            Keyingi to&apos;lov: <b className="text-slate-700">{fmtDate(d.payments.next.dueDate)}</b> · {money(d.payments.next.amount)}
          </p>
        )}
      </Card>

      <p className="pb-2 text-center text-xs text-slate-400">
        Savollar bo&apos;yicha maktab ma&apos;muriyatiga murojaat qiling ·{' '}
        <Link href="/portal" className="underline">Farzandlar ro&apos;yxati</Link>
      </p>
    </div>
  );
}
