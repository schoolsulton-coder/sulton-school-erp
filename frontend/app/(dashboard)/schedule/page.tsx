'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Clock,
  Wand2,
} from 'lucide-react';
import {
  classesApi,
  type ScheduleDay,
  type ScheduleWeek,
  type Lesson,
  type Subject,
} from '@/lib/classes';
import { usersApi, type ManagedUser } from '@/lib/users';
import { TeacherPicker } from '@/components/teacher-picker';
import {
  PERIODS,
  WEEKDAYS,
  addDaysStr,
  fmtShort,
  mondayOfStr,
  normTime,
  periodIndex,
  todayStr,
  weekDays,
  weekLabel,
} from '@/lib/schedule';
import { DistributeModal } from '@/components/distribute-modal';
import { NormPanel } from '@/components/norm-panel';

const NO_SLOT = "Bo'sh soat tanlang";

const errMsg = (e: any, fallback = 'Xatolik yuz berdi'): string => {
  const m = e?.response?.data?.message;
  if (Array.isArray(m)) return m.join(', ');
  if (m) return m;
  return e?.response ? fallback : e?.message ?? fallback;
};

const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';
const btnPrimary = `${btnBase} bg-brand text-white shadow-sm hover:bg-brand-dark`;
const btnSoft = `${btnBase} border border-brand/30 bg-brand/5 text-brand hover:bg-brand/10`;
const btnOutline = `${btnBase} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`;
const btnDanger = `${btnBase} border border-rose-200 bg-white text-rose-500 hover:bg-rose-50`;
const iconBtn =
  'grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-500';

/** Darsning ustozlari — nomlar ro'yxati (bir darsda bir nechta bo'lishi mumkin) */
const lessonTeacherNames = (l: Lesson, names: Map<string, string>) =>
  (l.teachers?.length ? l.teachers.map((t) => t.fullName) : l.teacherId ? [names.get(l.teacherId) ?? ''] : [])
    .filter(Boolean)
    .join(', ');

export default function SchedulePage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Yuklanmoqda...</div>}>
      <ScheduleManager />
    </Suspense>
  );
}

function ScheduleManager() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const [classId, setClassId] = useState(searchParams.get('class') ?? '');
  const [weekId, setWeekId] = useState(searchParams.get('week') ?? '');
  const [modal, setModal] = useState<{ weekday: number; lesson?: Lesson } | null>(null);
  const [distribute, setDistribute] = useState<{ subjectId?: string; hours?: number } | null>(null);
  const [weekModal, setWeekModal] = useState(false);
  const [toast, setToast] = useState('');

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  };

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesApi.list(),
  });
  const { data: weeksData, isLoading: weeksLoading } = useQuery({
    queryKey: ['schedule-weeks'],
    queryFn: classesApi.weeks,
  });
  const weeks = useMemo(() => weeksData?.weeks ?? [], [weeksData]);
  // Navigatsiya uchun eski → yangi tartib
  const weeksAsc = useMemo(
    () => [...weeks].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [weeks],
  );
  const week = weeks.find((w) => w.id === weekId);
  const weekIdx = weeksAsc.findIndex((w) => w.id === weekId);
  const prevWeek = weekIdx > 0 ? weeksAsc[weekIdx - 1] : null;
  const nextWeek = weekIdx >= 0 && weekIdx < weeksAsc.length - 1 ? weeksAsc[weekIdx + 1] : null;
  const dayCount = week ? weekDays(week) : 6;
  const today = weeksData?.today ?? todayStr();

  // Hafta tanlanmagan (yoki o'chirilgan) bo'lsa — joriy haftani tanlaymiz
  useEffect(() => {
    if (!weeksData) return;
    if (!weekId || !weeksData.weeks.some((w) => w.id === weekId)) {
      setWeekId(weeksData.activeWeekId ?? weeksData.weeks[0]?.id ?? '');
    }
  }, [weeksData, weekId]);

  const { data: schedule } = useQuery({
    queryKey: ['class-schedule', classId, weekId],
    queryFn: () => classesApi.schedule(classId, weekId),
    enabled: !!classId && !!week,
  });
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: classesApi.subjects,
  });
  const { data: allUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  });
  const teachers = useMemo(
    () => (allUsers ?? []).filter((u) => u.role.slug === 'teacher'),
    [allUsers],
  );
  const teacherMap = useMemo(
    () => new Map(teachers.map((t) => [t.id, t.fullName])),
    [teachers],
  );

  // Sinf tanlanmagan bo'lsa — birinchi sinfni tanlaymiz
  useEffect(() => {
    if (!classId && classes?.length) setClassId(classes[0].id);
  }, [classes, classId]);

  const invalidateLessons = () => {
    qc.invalidateQueries({ queryKey: ['class-schedule'] });
    qc.invalidateQueries({ queryKey: ['norms'] });
    qc.invalidateQueries({ queryKey: ['availability'] });
  };
  const refreshAll = () => {
    invalidateLessons();
    qc.invalidateQueries({ queryKey: ['schedule-weeks'] }); // haftadagi darslar soni
  };
  // Yangi haftaga o'tishdan oldin ro'yxat yangilanadi (aks holda tanlov "yo'q hafta" deb qaytariladi)
  const selectWeekFresh = async (id: string) => {
    await qc.refetchQueries({ queryKey: ['schedule-weeks'] });
    setWeekId(id);
    invalidateLessons();
  };

  const removeLesson = useMutation({
    mutationFn: (id: string) => classesApi.removeLesson(id),
    onSuccess: refreshAll,
    onError: (e) => flash(errMsg(e, "Darsni o'chirib bo'lmadi")),
  });

  // Bir tugma: tanlangan hafta jadvalini keyingi haftaga ko'chirish (butun maktab)
  const copyNext = useMutation({
    mutationFn: async () => {
      if (!week) return null;
      const targetStart = addDaysStr(week.startDate, 7);
      const target = weeks.find((w) => w.startDate === targetStart);
      if (target && target.lessons > 0) {
        const ok = confirm(
          `${weekLabel(target)} haftasida allaqachon ${target.lessons} ta dars bor.\n\n` +
            `Ular o'chirilib, ${weekLabel(week)} jadvali bilan almashtirilsinmi?`,
        );
        if (!ok) return null;
        return classesApi.copyWeek(week.id, { targetWeekId: target.id, replace: true });
      }
      return classesApi.copyWeek(
        week.id,
        target ? { targetWeekId: target.id } : { targetStartDate: targetStart },
      );
    },
    onSuccess: async (res) => {
      if (!res) return;
      await selectWeekFresh(res.targetWeekId);
      flash(`${weekLabel(res)} haftasiga ${res.copied} ta dars ko'chirildi`);
    },
    onError: (e) => flash(errMsg(e, "Ko'chirib bo'lmadi")),
  });

  const removeWeek = useMutation({
    mutationFn: (w: ScheduleWeek) => classesApi.removeWeek(w.id),
    onSuccess: (res, w) => {
      const idx = weeksAsc.findIndex((x) => x.id === w.id);
      const neighbor = weeksAsc[idx - 1] ?? weeksAsc[idx + 1];
      setWeekId(neighbor?.id ?? '');
      refreshAll();
      flash(`${weekLabel(w)} haftasi o'chirildi (${res.removedLessons} ta dars)`);
    },
    onError: (e) => flash(errMsg(e, "Haftani o'chirib bo'lmadi")),
  });

  const selectedClass = classes?.find((c) => c.id === classId);
  const days = (schedule ?? []).filter((d) => d.weekday <= 6);
  const lessonCount = days.reduce((s, d) => s + d.lessons.length, 0);

  return (
    <div className="min-h-full bg-slate-50/60 p-4 sm:p-6">
      {/* Sarlavha */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-sm">
            <CalendarDays size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Dars jadvali</h1>
            <p className="text-sm text-slate-400">
              Haftalik jadval — har hafta alohida saqlanadi
            </p>
          </div>
        </div>
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 sm:w-auto"
        >
          <option value="">Sinf tanlang...</option>
          {classes?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.branch?.name ? ` · ${c.branch.name}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Hafta paneli */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        {weeksLoading ? (
          <p className="py-1 text-sm text-slate-400">Haftalar yuklanmoqda…</p>
        ) : weeks.length === 0 ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold text-slate-700">Hali hafta yaratilmagan</div>
              <p className="text-sm text-slate-400">
                Jadval kiritish uchun avval haftani yarating (masalan 14.09 – 19.09).
              </p>
            </div>
            <button onClick={() => setWeekModal(true)} className={btnPrimary}>
              <CalendarPlus size={18} /> Hafta yaratish
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <button
                onClick={() => prevWeek && setWeekId(prevWeek.id)}
                disabled={!prevWeek}
                className={iconBtn}
                title="Oldingi hafta"
                aria-label="Oldingi hafta"
              >
                <ChevronLeft size={18} />
              </button>
              {/* Ko'rinadigan yorliq (telefonda kesilmasin) + ustida shaffof native select */}
              <div className="relative min-w-0 flex-1 rounded-xl border border-slate-200 bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 lg:w-80 lg:flex-none">
                <div className="pointer-events-none flex h-[38px] items-center gap-1.5 pl-3 pr-8 text-sm">
                  {week?.isCurrent && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                  )}
                  <span className="truncate font-semibold text-slate-700">
                    {week ? weekLabel(week) : 'Hafta tanlang'}
                  </span>
                  {week && (
                    <span className="shrink-0 text-xs font-medium text-slate-400">· {week.lessons} dars</span>
                  )}
                  <ChevronDown size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <select
                  value={weekId}
                  onChange={(e) => setWeekId(e.target.value)}
                  aria-label="Hafta"
                  className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
                >
                  {weeksAsc.map((w) => (
                    <option key={w.id} value={w.id}>
                      {weekLabel(w)} · {w.lessons} dars{w.isCurrent ? ' · joriy' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => nextWeek && setWeekId(nextWeek.id)}
                disabled={!nextWeek}
                className={iconBtn}
                title="Keyingi hafta"
                aria-label="Keyingi hafta"
              >
                <ChevronRight size={18} />
              </button>
              {week?.isCurrent && (
                <span className="hidden shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-200 sm:inline">
                  Joriy hafta
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
              <button
                onClick={() => {
                  if (!week) return;
                  if (week.lessons === 0) {
                    flash("Bu haftada dars yo'q — ko'chiradigan narsa yo'q");
                    return;
                  }
                  copyNext.mutate();
                }}
                disabled={!week || copyNext.isPending}
                className={btnSoft}
                title={
                  week
                    ? `${weekLabel(week)} jadvalini ${fmtShort(addDaysStr(week.startDate, 7))} haftasiga ko'chirish`
                    : undefined
                }
              >
                <Copy size={16} />
                {copyNext.isPending ? (
                  "Ko'chirilmoqda…"
                ) : (
                  <>
                    <span className="sm:hidden">Ko&apos;chirish</span>
                    <span className="hidden sm:inline">Keyingi haftaga ko&apos;chirish</span>
                  </>
                )}
              </button>
              <button onClick={() => setWeekModal(true)} className={btnOutline}>
                <CalendarPlus size={16} /> Yangi hafta
              </button>
              {week && (
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `${weekLabel(week)} haftasi va undagi ${week.lessons} ta dars butunlay o'chirilsinmi?`,
                      )
                    )
                      removeWeek.mutate(week);
                  }}
                  disabled={removeWeek.isPending}
                  className={`${btnDanger} col-span-2 sm:col-span-1 sm:px-3`}
                  title="Haftani o'chirish"
                  aria-label="Haftani o'chirish"
                >
                  <Trash2 size={16} />
                  <span className="sm:hidden">Haftani o&apos;chirish</span>
                </button>
              )}
            </div>
          </div>
        )}
        {week?.note && <p className="mt-2 text-xs text-slate-500">📝 {week.note}</p>}
      </div>

      {!classId ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
          Jadvalni ko&apos;rish uchun sinf tanlang
        </div>
      ) : !week ? (
        !weeksLoading && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
            Avval hafta yarating — so&apos;ng shu hafta uchun darslarni kiriting
          </div>
        )
      ) : (
        <>
          {/* Info panel */}
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-sm font-bold text-brand">
                {selectedClass?.gradeLevel}
              </div>
              <div className="min-w-0">
                <div className="truncate font-bold text-slate-800">{selectedClass?.name}</div>
                <div className="truncate text-xs text-slate-400">
                  {selectedClass?.branch?.name ?? '—'} · {weekLabel(week)} · {lessonCount} ta dars
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button onClick={() => setDistribute({})} className={btnSoft}>
                <Wand2 size={18} /> <span className="truncate">Fanni taqsimlash</span>
              </button>
              <button onClick={() => setModal({ weekday: 1 })} className={btnPrimary}>
                <Plus size={18} /> Dars qo&apos;shish
              </button>
            </div>
          </div>

          {/* Haftalik norma (soat reja) — tanlangan hafta bo'yicha */}
          <NormPanel
            classId={classId}
            weekId={week.id}
            subjects={subjects ?? []}
            onDistribute={(subjectId, hours) => setDistribute({ subjectId, hours })}
          />

          {/* Haftalik grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {WEEKDAYS.map((wd) => {
              const day = days.find((d) => d.weekday === wd.n);
              const lessons = day?.lessons ?? [];
              const date = addDaysStr(week.startDate, wd.n - 1);
              const inWeek = wd.n <= dayCount;
              const isToday = date === today;
              return (
                <div
                  key={wd.n}
                  className={`flex flex-col rounded-2xl border bg-white p-4 shadow-sm ${
                    isToday ? 'border-brand/40 ring-2 ring-brand/15' : 'border-slate-200'
                  } ${inWeek ? '' : 'opacity-60'}`}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                      <h3 className="font-semibold text-slate-700">{wd.label}</h3>
                      <span className="text-xs font-medium text-slate-400">{fmtShort(date)}</span>
                      {isToday && (
                        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                          Bugun
                        </span>
                      )}
                    </div>
                    {inWeek ? (
                      <button
                        onClick={() => setModal({ weekday: wd.n })}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-brand transition hover:bg-brand/10"
                        title="Dars qo'shish"
                        aria-label="Dars qo'shish"
                      >
                        <Plus size={16} />
                      </button>
                    ) : (
                      <span className="shrink-0 text-[11px] font-medium text-slate-400">
                        hafta oralig&apos;ida emas
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {lessons.length === 0 && (
                      <p className="py-3 text-center text-xs text-slate-300">Dars yo&apos;q</p>
                    )}
                    {lessons.map((l) => (
                      <div
                        key={l.id}
                        className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5"
                      >
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-xs font-bold text-brand">
                          {periodIndex(l.startTime) || <Clock size={14} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-800">
                            {l.subject.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            {normTime(l.startTime)}–{normTime(l.endTime)}
                            {l.room ? ` · ${l.room}` : ''}
                          </div>
                          {lessonTeacherNames(l, teacherMap) && (
                            <div className="truncate text-xs font-medium text-brand/80">
                              👤 {lessonTeacherNames(l, teacherMap)}
                            </div>
                          )}
                        </div>
                        {/* Telefonda doim ko'rinadi (hover yo'q), kompyuterda — ustiga borganda */}
                        <div className="flex shrink-0 items-center gap-1 transition sm:opacity-0 sm:group-hover:opacity-100">
                          <button
                            onClick={() => setModal({ weekday: wd.n, lesson: l })}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-brand"
                            title="Tahrirlash"
                            aria-label="Tahrirlash"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`"${l.subject.name}" darsi o'chirilsinmi?`)) removeLesson.mutate(l.id);
                            }}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-rose-500"
                            title="O'chirish"
                            aria-label="O'chirish"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {modal && classId && week && (
        <LessonModal
          classId={classId}
          week={week}
          schedule={schedule ?? []}
          subjects={subjects ?? []}
          teachers={teachers}
          initWeekday={modal.lesson ? modal.weekday : Math.min(modal.weekday, dayCount)}
          editing={modal.lesson}
          onClose={() => setModal(null)}
          onSaved={() => {
            refreshAll();
            setModal(null);
          }}
        />
      )}

      {distribute && classId && week && (
        <DistributeModal
          classId={classId}
          className={selectedClass?.name ?? ''}
          subjects={subjects ?? []}
          teachers={teachers}
          initialSubjectId={distribute.subjectId}
          initialHours={distribute.hours}
          weekId={week.id}
          days={dayCount}
          onClose={() => setDistribute(null)}
          onSaved={(created, skipped, deleted) => {
            setDistribute(null);
            qc.invalidateQueries({ queryKey: ['schedule-weeks'] });
            const parts: string[] = [];
            if (created) parts.push(`${created} ta dars joylandi`);
            if (deleted) parts.push(`${deleted} ta o'chirildi`);
            if (skipped) parts.push(`${skipped} ta o'tkazib yuborildi`);
            flash(parts.length ? parts.join(' · ') : "Jadval o'zgarmadi");
          }}
        />
      )}

      {weekModal && (
        <WeekModal
          weeks={weeks}
          onClose={() => setWeekModal(false)}
          onCreated={async (res) => {
            setWeekModal(false);
            await selectWeekFresh(res.id);
            flash(
              res.copied
                ? `${weekLabel(res)} haftasi yaratildi — ${res.copied} ta dars ko'chirildi`
                : `${weekLabel(res)} haftasi yaratildi`,
            );
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-[calc(1.5rem_+_env(safe-area-inset-bottom))] left-1/2 z-[60] w-[calc(100vw_-_2rem)] max-w-md -translate-x-1/2 rounded-xl bg-slate-800 px-5 py-3 text-center text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function WeekModal({
  weeks,
  onClose,
  onCreated,
}: {
  weeks: ScheduleWeek[];
  onClose: () => void;
  onCreated: (res: { id: string; startDate: string; endDate: string; copied: number }) => void;
}) {
  // Standart: eng oxirgi haftadan keyingi hafta (hafta yo'q bo'lsa — joriy hafta)
  const latest = weeks.reduce<ScheduleWeek | null>(
    (a, w) => (!a || w.startDate > a.startDate ? w : a),
    null,
  );
  const initialStart = latest ? addDaysStr(latest.startDate, 7) : mondayOfStr(todayStr());
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(addDaysStr(initialStart, 5));
  const [copyFrom, setCopyFrom] = useState(latest && latest.lessons > 0 ? latest.id : '');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const create = useMutation({
    mutationFn: () =>
      classesApi.createWeek({
        startDate: start,
        endDate: end,
        note: note.trim() || undefined,
        copyFromWeekId: copyFrom || undefined,
      }),
    onSuccess: (res) => onCreated(res),
    onError: (e) => setError(errMsg(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!start || !end) return setError('Sanalarni kiriting');
    if (end < start) return setError("Tugash sanasi boshlanishidan oldin bo'lmasin");
    if (end > addDaysStr(start, 6)) return setError("Hafta 7 kundan uzun bo'lmasin");
    if (weeks.some((w) => w.startDate === start)) {
      return setError(
        `${weekLabel({ startDate: start, endDate: end })} haftasi allaqachon bor — ro'yxatdan tanlang`,
      );
    }
    create.mutate();
  };

  const inputCls =
    'w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20';
  const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand">
              <CalendarPlus size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Yangi hafta</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Yopish"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelCls}>Boshlanish</span>
              <input
                type="date"
                value={start}
                onChange={(e) => {
                  if (!e.target.value) return;
                  // Hafta doim Dushanbadan boshlanadi
                  const monday = mondayOfStr(e.target.value);
                  setStart(monday);
                  setEnd(addDaysStr(monday, 5));
                }}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Tugash</span>
              <input
                type="date"
                value={end}
                min={start}
                max={addDaysStr(start, 6)}
                onChange={(e) => setEnd(e.target.value)}
                className={inputCls}
              />
            </label>
          </div>
          <div className="rounded-xl bg-brand/5 px-3 py-2.5 text-sm text-slate-600">
            <span className="font-semibold text-brand">{weekLabel({ startDate: start, endDate: end })}</span>
            {' · '}
            {weekDays({ startDate: start, endDate: end })} kun
            <p className="mt-0.5 text-xs text-slate-400">
              Hafta Dushanbadan boshlanadi. Bayram sabab qisqa hafta bo&apos;lsa, tugash sanasini o&apos;zgartiring.
            </p>
          </div>

          <label className="block">
            <span className={labelCls}>Darslar</span>
            <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className={`${inputCls} cursor-pointer`}>
              <option value="">Bo&apos;sh hafta (darslarsiz)</option>
              {weeks.map((w) => (
                <option key={w.id} value={w.id}>
                  {weekLabel(w)} jadvalidan ko&apos;chirish · {w.lessons} dars
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelCls}>Izoh (ixtiyoriy)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="Masalan: bayram haftasi"
              className={inputCls}
            />
          </label>

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6 sm:pb-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Bekor
          </button>
          <button type="submit" disabled={create.isPending} className={btnPrimary}>
            <CalendarPlus size={16} />
            {create.isPending ? 'Yaratilmoqda...' : 'Haftani yaratish'}
          </button>
        </div>
      </form>
    </div>
  );
}

function LessonModal({
  classId,
  week,
  schedule,
  subjects,
  teachers,
  initWeekday,
  editing,
  onClose,
  onSaved,
}: {
  classId: string;
  week: ScheduleWeek;
  schedule: ScheduleDay[];
  subjects: Subject[];
  teachers: ManagedUser[];
  initWeekday: number;
  editing?: Lesson;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dayCount = weekDays(week);
  const dayOptions = WEEKDAYS.filter((wd) => wd.n <= dayCount || wd.n === editing?.weekday);
  const [weekday, setWeekday] = useState(initWeekday);
  const [subjectId, setSubjectId] = useState(editing?.subject.id ?? '');
  const [teacherIds, setTeacherIds] = useState<string[]>(
    editing?.teachers?.length ? editing.teachers.map((t) => t.id) : editing?.teacherId ? [editing.teacherId] : [],
  );
  const [slot, setSlot] = useState(editing ? normTime(editing.startTime) : '');
  const [room, setRoom] = useState(editing?.room ?? '');
  const [error, setError] = useState('');

  // Tanlangan kunda band bo'lgan soatlar (tahrirlanayotgan darsdan tashqari)
  const freePeriods = useMemo(() => {
    const dayLessons = schedule.find((d) => d.weekday === weekday)?.lessons ?? [];
    const occupied = new Set(
      dayLessons.filter((l) => l.id !== editing?.id).map((l) => normTime(l.startTime)),
    );
    const list = PERIODS.filter((p) => !occupied.has(p.start));
    // Tahrirlashda joriy vaqt standart para bo'lmasa ham ro'yxatda bo'lsin
    if (editing) {
      const cur = normTime(editing.startTime);
      if (!list.some((p) => p.start === cur)) {
        list.unshift({ start: cur, end: normTime(editing.endTime) });
      }
    }
    return list;
  }, [schedule, weekday, editing]);

  const save = useMutation({
    mutationFn: () => {
      const period = freePeriods.find((p) => p.start === slot);
      if (!period) throw new Error(NO_SLOT);
      const payload = {
        subjectId,
        weekday,
        startTime: period.start,
        endTime: period.end,
        room: room || undefined,
        teacherIds,
      };
      return editing
        ? classesApi.updateLesson(editing.id, payload)
        : classesApi.addLesson({ classId, weekId: week.id, ...payload });
    },
    onSuccess: onSaved,
    onError: (e: any) => setError(e?.message === NO_SLOT ? NO_SLOT : errMsg(e)),
  });

  const inputCls =
    'w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20';
  const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!subjectId) return setError('Fan tanlang');
          if (!slot) return setError(NO_SLOT);
          save.mutate();
        }}
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
              <CalendarDays size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-800">
                {editing ? 'Darsni tahrirlash' : "Dars qo'shish"}
              </h2>
              <p className="truncate text-xs text-slate-400">{weekLabel(week)} haftasi</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Yopish"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <label className="block">
            <span className={labelCls}>Kun</span>
            <select
              value={weekday}
              onChange={(e) => {
                setWeekday(Number(e.target.value));
                setSlot('');
              }}
              className={`${inputCls} cursor-pointer`}
            >
              {dayOptions.map((wd) => (
                <option key={wd.n} value={wd.n}>
                  {wd.label} · {fmtShort(addDaysStr(week.startDate, wd.n - 1))}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelCls}>
              Fan <span className="text-rose-500">*</span>
            </span>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className={`${inputCls} cursor-pointer`}
            >
              <option value="">Fan tanlang...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <div className="block">
            <span className={labelCls}>
              Ustoz(lar){' '}
              <span className="font-normal normal-case tracking-normal text-slate-400">
                — bir nechtasini tanlash mumkin
              </span>
            </span>
            <TeacherPicker
              teachers={teachers}
              value={teacherIds}
              onChange={setTeacherIds}
              emptyHint="Ustoz yo'q — Sozlamalar → Foydalanuvchilar'dan &quot;Ustoz&quot; roli bilan qo'shing"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className={labelCls}>
                Soat (bo&apos;sh) <span className="text-rose-500">*</span>
              </span>
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                className={`${inputCls} cursor-pointer`}
              >
                <option value="">Tanlang...</option>
                {freePeriods.map((p, i) => (
                  <option key={p.start} value={p.start}>
                    {periodIndex(p.start) || i + 1}-para · {p.start}–{p.end}
                  </option>
                ))}
              </select>
              {freePeriods.length === 0 && (
                <span className="mt-1 block text-xs text-amber-500">
                  Bu kun to&apos;lgan — bo&apos;sh soat yo&apos;q
                </span>
              )}
            </label>
            <label className="block">
              <span className={labelCls}>Xona</span>
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className={inputCls}
                placeholder="101"
              />
            </label>
          </div>

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6 sm:pb-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Bekor
          </button>
          <button
            type="submit"
            disabled={save.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
          >
            <Save size={16} />
            {save.isPending ? 'Saqlanmoqda...' : editing ? 'Saqlash' : "Qo'shish"}
          </button>
        </div>
      </form>
    </div>
  );
}
