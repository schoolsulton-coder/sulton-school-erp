'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  Coins,
  CreditCard,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import {
  ATT,
  dec,
  dueLabel,
  fmtDate,
  fmtDay,
  fmtLongDay,
  gradeTone,
  gradeWord,
  money,
  portalApi,
  rateTone,
  rateWord,
  TONE,
  type SummaryData,
} from '@/lib/portal';
import { Badge, Bar, Card, DotStrip, Empty, Hint, Progress, Skeleton, StackBar } from '@/components/portal/ui';

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
  const a = d.attendance;
  const marked = a.recentDays.filter((x) => x.status).length;
  const wasPresent = a.recentDays.filter((x) => x.status === 'PRESENT' || x.status === 'LATE').length;
  const hwDone = d.homework.done;
  const hwTotal = d.homework.total;

  return (
    <div className="space-y-4">
      {/* ===== BUGUN ===== */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Bugun</div>
            <div className="text-lg font-bold text-slate-900">{fmtLongDay(d.today)}</div>
          </div>
          {todayAtt ? (
            <Badge tone={todayAtt.tone}>
              {todayAtt.label === 'Bor' ? 'Darsda ✅' : todayAtt.label === "Yo'q" ? 'Kelmagan ❌' : todayAtt.label}
            </Badge>
          ) : (
            <Badge tone="slate">Davomat belgilanmagan</Badge>
          )}
        </div>

        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">
              {d.schedule.today ? 'Bugungi darslar' : day ? `Keyingi dars kuni — ${day.label}` : 'Dars jadvali'}
            </span>
            <Link href={`${base}/schedule`} className="inline-flex items-center gap-0.5 text-sm font-medium text-brand">
              Jadval <ChevronRight size={15} />
            </Link>
          </div>
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
        </div>
      </div>

      {/* ===== DAVOMAT ===== */}
      <Card title="Davomat" icon={CalendarCheck} tone="emerald" href={`${base}/attendance`}>
        <p className="text-[15px] leading-relaxed text-slate-700">
          Oxirgi 2 haftada <b>{marked}</b> kun davomat belgilangan, shundan <b className="text-emerald-700">{wasPresent}</b> kun darsda bo&apos;ldi
          {a.absent > 0 && <>, <b className="text-rose-600">{a.absent}</b> kun kelmadi</>}.
        </p>

        <div className="mt-3">
          <DotStrip
            days={a.recentDays}
            colorOf={(st) => (st ? TONE[ATT[st]?.tone ?? 'slate'].bg : 'bg-slate-100')}
            titleOf={(x) => `${fmtDay(x.date)} — ${x.status ? ATT[x.status]?.label ?? x.status : 'belgilanmagan'}`}
          />
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-3">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm text-slate-500">{a.monthLabel}</span>
            <span className={`text-lg font-bold ${TONE[rateTone(a.rate)].text}`}>
              {a.rate === null ? '—' : `${a.rate}%`}{' '}
              <span className="text-xs font-normal text-slate-400">· {rateWord(a.rate)}</span>
            </span>
          </div>
          <StackBar
            parts={[
              { value: a.present, cls: 'bg-emerald-500', label: 'Bor' },
              { value: a.late, cls: 'bg-amber-500', label: 'Kechikdi' },
              { value: a.absent, cls: 'bg-rose-500', label: "Yo'q" },
              { value: a.excused, cls: 'bg-sky-500', label: 'Sababli' },
            ]}
          />
        </div>
        <Hint>Foiz — sababsiz kunlar bo&apos;yicha: kelgan kunlar ÷ (jami − sababli).</Hint>
      </Card>

      {/* ===== BAHO ===== */}
      <Card title="Baholar" icon={GraduationCap} tone="violet" href={`${base}/grades`}>
        {d.grades.count ? (
          <>
            <p className="text-[15px] leading-relaxed text-slate-700">
              O&apos;rtacha baho{' '}
              <b className={TONE[gradeTone(d.grades.average, d.grades.scale)].text}>
                {dec(d.grades.average)} / {d.grades.scale}
              </b>{' '}
              — {gradeWord(d.grades.average, d.grades.scale)}. Jami <b>{d.grades.count}</b> ta baho.
            </p>

            {d.grades.recent.length > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Oxirgi baholar</div>
                <div className="flex flex-wrap gap-1.5">
                  {d.grades.recent.map((g) => (
                    <span key={g.id} className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm ${TONE[gradeTone(g.value, d.grades.scale)].soft}`}>
                      <b>{g.value}</b>
                      <span className="max-w-[110px] truncate text-xs opacity-80">{g.subject}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {d.grades.subjects.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Fanlar bo&apos;yicha</div>
                {d.grades.subjects.slice(0, 3).map((s) => (
                  <div key={s.id}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate text-slate-700">{s.name}</span>
                      <span className={`shrink-0 font-semibold ${TONE[gradeTone(s.average, d.grades.scale)].text}`}>{dec(s.average)}</span>
                    </div>
                    <div className="mt-1"><Bar value={s.average} max={d.grades.scale} tone={gradeTone(s.average, d.grades.scale)} /></div>
                  </div>
                ))}
              </div>
            )}
            <Hint>Baho {d.grades.scale} ballik tizimda. Chiziq qancha to&apos;la bo&apos;lsa, natija shuncha yuqori.</Hint>
          </>
        ) : (
          <Empty text="Hozircha baho qo'yilmagan" icon={GraduationCap} />
        )}
      </Card>

      {/* ===== AHLOQ ===== */}
      <Card title="Ahloqiy ball" icon={Sparkles} tone="violet" href={`${base}/behavior`} action={<span className="text-xs text-slate-400">{d.behavior.monthLabel}</span>}>
        <p className="text-[15px] leading-relaxed text-slate-700">
          {d.behavior.deducted ? (
            <>
              Bu oy <b>{d.behavior.limit}</b> balldan <b className="text-rose-600">{d.behavior.deducted}</b> tasi ayirilgan,{' '}
              <b className="text-emerald-700">{d.behavior.remaining}</b> ball qoldi.
            </>
          ) : (
            <>Bu oy ball ayirilmagan — <b className="text-emerald-700">{d.behavior.remaining} / {d.behavior.limit}</b> 👍</>
          )}
        </p>

        <div className="mt-3">
          <Progress
            value={d.behavior.remaining}
            max={d.behavior.limit}
            tone={d.behavior.remaining >= 80 ? 'emerald' : d.behavior.remaining >= 50 ? 'amber' : 'rose'}
            left="Qolgan ball"
            right={`${d.behavior.remaining} / ${d.behavior.limit}`}
          />
        </div>

        {d.behavior.last.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {d.behavior.last.map((r, i) => (
              <div key={i} className="flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                <span className={`shrink-0 font-bold ${r.type === 'POSITIVE' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {r.type === 'POSITIVE' ? '+' : '−'}{r.points}
                </span>
                <span className="min-w-0 flex-1 truncate text-slate-700">{r.description}</span>
                <span className="shrink-0 text-xs text-slate-400">{fmtDay(r.date)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <Coins size={16} /> Rag&apos;bat coinlari: <b>{d.behavior.coins}</b>
        </div>
        <Hint>Har oy boshida {d.behavior.limit} ball beriladi; qoidabuzarlik uchun ball ayiriladi.</Hint>
      </Card>

      {/* ===== VAZIFA ===== */}
      <Card title="Uy vazifalari" icon={BookOpen} tone="amber" href={`${base}/homework`}>
        <p className="text-[15px] leading-relaxed text-slate-700">
          {hwTotal ? (
            <>
              Jami <b>{hwTotal}</b> ta vazifadan <b className="text-emerald-700">{hwDone}</b> tasi topshirilgan
              {d.homework.overdue > 0 && <>, <b className="text-rose-600">{d.homework.overdue}</b> tasining muddati o&apos;tgan</>}.
            </>
          ) : (
            'Hozircha vazifa berilmagan.'
          )}
        </p>

        {hwTotal > 0 && (
          <div className="mt-3">
            <Progress value={hwDone} max={hwTotal} tone={d.homework.overdue ? 'rose' : 'emerald'} left="Bajarilgan" right={`${hwDone} / ${hwTotal}`} />
          </div>
        )}

        {d.homework.next ? (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-800">{d.homework.next.title}</div>
              <div className="truncate text-xs text-slate-400">{d.homework.next.subject} · {fmtDay(d.homework.next.dueDate)}</div>
            </div>
            <Badge tone={d.homework.next.overdue ? 'rose' : 'amber'}>{dueLabel(d.homework.next.dueDate, d.today)}</Badge>
          </div>
        ) : (
          hwTotal > 0 && <p className="mt-3 text-center text-sm text-emerald-600">Bajarilmagan vazifa yo&apos;q 🎉</p>
        )}
      </Card>

      {/* ===== TO'LOV ===== */}
      <Card title="To'lovlar" icon={CreditCard} tone={d.payments.overdue ? 'rose' : 'slate'} href={`${base}/payments`}>
        <p className="text-[15px] leading-relaxed text-slate-700">
          {d.payments.overdue ? (
            <>Muddati o&apos;tgan to&apos;lov: <b className="text-rose-600">{money(d.payments.overdue)}</b>.</>
          ) : d.payments.debt ? (
            <>Muddati o&apos;tgan qarz yo&apos;q. Kelgusi oylar uchun qoldiq: <b>{money(d.payments.debt)}</b>.</>
          ) : (
            <>Qarzdorlik yo&apos;q ✅</>
          )}
        </p>
        {d.payments.next && (
          <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
            Keyingi to&apos;lov: <b className="text-slate-800">{fmtDate(d.payments.next.dueDate)}</b> · {money(d.payments.next.amount)}
          </div>
        )}
      </Card>

      <p className="pb-2 text-center text-xs text-slate-400">
        Savollar bo&apos;yicha maktab ma&apos;muriyatiga murojaat qiling ·{' '}
        <Link href="/portal" className="underline">Farzandlar ro&apos;yxati</Link>
      </p>
    </div>
  );
}
