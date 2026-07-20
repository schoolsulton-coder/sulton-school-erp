'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Clock,
  Target,
} from 'lucide-react';
import {
  classesApi,
  type ScheduleDay,
  type Lesson,
  type Subject,
  type SubjectNormRow,
} from '@/lib/classes';
import { usersApi, type ManagedUser } from '@/lib/users';
import { PERIODS, WEEKDAYS, normTime, periodIndex } from '@/lib/schedule';

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
  const [modal, setModal] = useState<{ weekday: number; lesson?: Lesson } | null>(
    null,
  );

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesApi.list(),
  });
  const { data: schedule } = useQuery({
    queryKey: ['class-schedule', classId],
    queryFn: () => classesApi.schedule(classId),
    enabled: !!classId,
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

  const removeLesson = useMutation({
    mutationFn: (id: string) => classesApi.removeLesson(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['class-schedule', classId] }),
  });

  const selectedClass = classes?.find((c) => c.id === classId);
  const days = (schedule ?? []).filter((d) => d.weekday <= 6);
  const lessonCount = days.reduce((s, d) => s + d.lessons.length, 0);

  return (
    <div className="min-h-full bg-slate-50/60 p-6">
      {/* Sarlavha */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand text-white shadow-sm">
            <CalendarDays size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dars jadvali</h1>
            <p className="text-sm text-slate-400">
              Sinf bo&apos;yicha haftalik jadval — qo&apos;shish va tahrirlash
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
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
      </div>

      {!classId ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
          Jadvalni ko&apos;rish uchun sinf tanlang
        </div>
      ) : (
        <>
          {/* Info panel */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-sm font-bold text-brand">
                {selectedClass?.gradeLevel}
              </div>
              <div>
                <div className="font-bold text-slate-800">{selectedClass?.name}</div>
                <div className="text-xs text-slate-400">
                  {selectedClass?.branch?.name ?? '—'} · {lessonCount} ta dars
                </div>
              </div>
            </div>
            <button
              onClick={() => setModal({ weekday: 1 })}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
            >
              <Plus size={18} /> Dars qo&apos;shish
            </button>
          </div>

          {/* Haftalik norma (soat reja) */}
          <NormPanel classId={classId} subjects={subjects ?? []} />

          {/* Haftalik grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {WEEKDAYS.map((wd) => {
              const day = days.find((d) => d.weekday === wd.n);
              const lessons = day?.lessons ?? [];
              return (
                <div
                  key={wd.n}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-700">{wd.label}</h3>
                    <button
                      onClick={() => setModal({ weekday: wd.n })}
                      className="grid h-7 w-7 place-items-center rounded-lg text-brand transition hover:bg-brand/10"
                      title="Dars qo'shish"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {lessons.length === 0 && (
                      <p className="py-3 text-center text-xs text-slate-300">
                        Dars yo&apos;q
                      </p>
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
                          {l.teacherId && teacherMap.get(l.teacherId) && (
                            <div className="truncate text-xs font-medium text-brand/80">
                              👤 {teacherMap.get(l.teacherId)}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                          <button
                            onClick={() => setModal({ weekday: wd.n, lesson: l })}
                            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-brand"
                            title="Tahrirlash"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => removeLesson.mutate(l.id)}
                            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-rose-500"
                            title="O'chirish"
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

      {modal && classId && (
        <LessonModal
          classId={classId}
          schedule={schedule ?? []}
          subjects={subjects ?? []}
          teachers={teachers}
          initWeekday={modal.weekday}
          editing={modal.lesson}
          onClose={() => setModal(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['class-schedule', classId] });
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function LessonModal({
  classId,
  schedule,
  subjects,
  teachers,
  initWeekday,
  editing,
  onClose,
  onSaved,
}: {
  classId: string;
  schedule: ScheduleDay[];
  subjects: Subject[];
  teachers: ManagedUser[];
  initWeekday: number;
  editing?: Lesson;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [weekday, setWeekday] = useState(initWeekday);
  const [subjectId, setSubjectId] = useState(editing?.subject.id ?? '');
  const [teacherId, setTeacherId] = useState(editing?.teacherId ?? '');
  const [slot, setSlot] = useState(
    editing ? normTime(editing.startTime) : '',
  );
  const [room, setRoom] = useState(editing?.room ?? '');
  const [error, setError] = useState('');

  // Tanlangan kunda band bo'lgan soatlar (tahrirlanayotgan darsdan tashqari)
  const freePeriods = useMemo(() => {
    const dayLessons =
      schedule.find((d) => d.weekday === weekday)?.lessons ?? [];
    const occupied = new Set(
      dayLessons
        .filter((l) => l.id !== editing?.id)
        .map((l) => normTime(l.startTime)),
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
      if (!period) throw new Error('Bo‘sh soat tanlang');
      const payload = {
        subjectId,
        weekday,
        startTime: period.start,
        endTime: period.end,
        room: room || undefined,
        teacherId: teacherId || undefined,
      };
      return editing
        ? classesApi.updateLesson(editing.id, payload)
        : classesApi.addLesson({ classId, ...payload });
    },
    onSuccess: onSaved,
    onError: (e: any) =>
      setError(
        e?.message === 'Bo‘sh soat tanlang'
          ? e.message
          : Array.isArray(e?.response?.data?.message)
            ? e.response.data.message.join(', ')
            : e?.response?.data?.message ?? 'Xatolik yuz berdi',
      ),
  });

  const inputCls =
    'w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!subjectId) return setError('Fan tanlang');
          if (!slot) return setError('Bo‘sh soat tanlang');
          save.mutate();
        }}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand">
              <CalendarDays size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {editing ? 'Darsni tahrirlash' : 'Dars qo‘shish'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Kun
            </span>
            <select
              value={weekday}
              onChange={(e) => {
                setWeekday(Number(e.target.value));
                setSlot('');
              }}
              className={inputCls + ' cursor-pointer'}
            >
              {WEEKDAYS.map((wd) => (
                <option key={wd.n} value={wd.n}>
                  {wd.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Fan <span className="text-rose-500">*</span>
            </span>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className={inputCls + ' cursor-pointer'}
            >
              <option value="">Fan tanlang...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Ustoz
            </span>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className={inputCls + ' cursor-pointer'}
            >
              <option value="">Biriktirilmagan</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
            {teachers.length === 0 && (
              <span className="mt-1 block text-xs text-slate-400">
                Ustoz yo&apos;q — Sozlamalar → Foydalanuvchilar&apos;dan &quot;Ustoz&quot; roli bilan qo&apos;shing
              </span>
            )}
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Soat (bo&apos;sh) <span className="text-rose-500">*</span>
              </span>
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                className={inputCls + ' cursor-pointer'}
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
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Xona
              </span>
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className={inputCls}
                placeholder="101"
              />
            </label>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
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
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
          >
            <Save size={16} />
            {save.isPending ? 'Saqlanmoqda...' : editing ? 'Saqlash' : 'Qo‘shish'}
          </button>
        </div>
      </form>
    </div>
  );
}

function NormPanel({
  classId,
  subjects,
}: {
  classId: string;
  subjects: Subject[];
}) {
  const qc = useQueryClient();
  const { data: norms } = useQuery({
    queryKey: ['norms', classId],
    queryFn: () => classesApi.norms(classId),
    enabled: !!classId,
  });
  const [addSubject, setAddSubject] = useState('');
  const [addHours, setAddHours] = useState('2');

  const setNorm = useMutation({
    mutationFn: (data: { subjectId: string; weeklyHours: number }) =>
      classesApi.setNorm(classId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['norms', classId] }),
  });
  const removeNorm = useMutation({
    mutationFn: (id: string) => classesApi.removeNorm(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['norms', classId] }),
  });

  const usedIds = new Set((norms ?? []).map((n) => n.subjectId));
  const available = subjects.filter((s) => !usedIds.has(s.id));
  const totalPlan = (norms ?? []).reduce((s, n) => s + n.weeklyHours, 0);
  const totalPlaced = (norms ?? []).reduce((s, n) => s + n.placed, 0);

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold text-slate-700">
          <Target size={18} className="text-brand" />
          Haftalik norma (soat)
          <span className="text-xs font-normal text-slate-400">
            reja {totalPlan} · qo&apos;yilgan {totalPlaced}
          </span>
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={addSubject}
            onChange={(e) => setAddSubject(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1.5 text-sm outline-none focus:border-brand focus:bg-white"
          >
            <option value="">Fan...</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            max={40}
            value={addHours}
            onChange={(e) => setAddHours(e.target.value)}
            className="w-16 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1.5 text-sm outline-none focus:border-brand focus:bg-white"
            placeholder="soat"
          />
          <button
            onClick={() => {
              if (!addSubject) return;
              setNorm.mutate({ subjectId: addSubject, weeklyHours: Number(addHours) || 0 });
              setAddSubject('');
              setAddHours('2');
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
          >
            <Plus size={14} /> Qo&apos;shish
          </button>
        </div>
      </div>

      {(norms?.length ?? 0) === 0 ? (
        <p className="py-3 text-center text-sm text-slate-400">
          Norma kiritilmagan — yuqoridan fan va soatni qo&apos;shing
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-3">Fan</th>
                <th className="px-3 py-2 text-center">Reja</th>
                <th className="px-3 py-2 text-center">Qo&apos;yilgan</th>
                <th className="px-3 py-2 text-center">Qolgan</th>
                <th className="px-3 py-2">Bajarilishi</th>
                <th className="py-2 pl-3"></th>
              </tr>
            </thead>
            <tbody>
              {norms!.map((n) => (
                <NormRow
                  key={n.id}
                  norm={n}
                  onSet={(h) => setNorm.mutate({ subjectId: n.subjectId, weeklyHours: h })}
                  onRemove={() => removeNorm.mutate(n.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NormRow({
  norm,
  onSet,
  onRemove,
}: {
  norm: SubjectNormRow;
  onSet: (h: number) => void;
  onRemove: () => void;
}) {
  const [hours, setHours] = useState(String(norm.weeklyHours));
  const remaining = norm.weeklyHours - norm.placed;
  const pct = norm.weeklyHours
    ? Math.min(Math.round((norm.placed / norm.weeklyHours) * 100), 100)
    : 0;
  const barColor =
    norm.placed > norm.weeklyHours
      ? 'bg-rose-500'
      : norm.placed === norm.weeklyHours
        ? 'bg-emerald-500'
        : 'bg-brand';
  const remColor =
    remaining < 0 ? 'text-rose-500' : remaining === 0 ? 'text-emerald-600' : 'text-amber-600';

  const commit = () => {
    const h = Number(hours);
    if (!Number.isNaN(h) && h !== norm.weeklyHours) onSet(h);
  };

  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="py-2 pr-3 font-medium text-slate-700">{norm.subjectName}</td>
      <td className="px-3 py-2 text-center">
        <input
          type="number"
          min={0}
          max={40}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className="w-14 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1 text-center text-sm outline-none focus:border-brand focus:bg-white"
        />
      </td>
      <td className="px-3 py-2 text-center font-semibold text-slate-800">{norm.placed}</td>
      <td className={`px-3 py-2 text-center font-medium ${remColor}`}>{remaining}</td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-slate-400">{norm.placed}/{norm.weeklyHours}</span>
        </div>
      </td>
      <td className="py-2 pl-3 text-right">
        <button
          onClick={onRemove}
          className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-rose-500"
          title="O'chirish"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}
