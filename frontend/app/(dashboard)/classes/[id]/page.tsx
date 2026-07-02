'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { classesApi, type ScheduleDay, type Subject } from '@/lib/classes';

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: cls } = useQuery({
    queryKey: ['class', id],
    queryFn: () => classesApi.get(id),
  });
  const { data: schedule } = useQuery({
    queryKey: ['class-schedule', id],
    queryFn: () => classesApi.schedule(id),
  });
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: classesApi.subjects,
  });

  const removeLesson = useMutation({
    mutationFn: (lessonId: string) => classesApi.removeLesson(lessonId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['class-schedule', id] }),
  });

  if (!cls) return <div className="p-8">Yuklanmoqda...</div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{cls.name}</h1>
        <p className="text-sm text-slate-500">
          {cls.gradeLevel}-sinf · {cls.academicYear} ·{' '}
          {cls.students?.length ?? 0}/{cls.capacity} o&apos;quvchi
        </p>
      </div>

      {/* Haftalik jadval */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Dars jadvali</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {schedule?.map((day: ScheduleDay) => (
            <div key={day.weekday} className="rounded-xl bg-slate-100 p-3">
              <h3 className="mb-2 text-sm font-semibold">{day.label}</h3>
              <div className="space-y-2">
                {day.lessons.map((l) => (
                  <div
                    key={l.id}
                    className="group rounded-lg bg-white p-2 text-sm shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{l.subject.name}</span>
                      <button
                        onClick={() => removeLesson.mutate(l.id)}
                        className="text-xs text-red-400 opacity-0 group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="text-xs text-slate-500">
                      {l.startTime}–{l.endTime}
                      {l.room ? ` · ${l.room}` : ''}
                    </div>
                  </div>
                ))}
                {day.lessons.length === 0 && (
                  <p className="text-xs text-slate-400">—</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <AddLessonForm
          classId={id}
          subjects={subjects ?? []}
          onAdded={() =>
            qc.invalidateQueries({ queryKey: ['class-schedule', id] })
          }
        />
      </section>

      {/* O'quvchilar */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          O&apos;quvchilar ({cls.students?.length ?? 0})
        </h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {cls.students?.length ? (
            cls.students.map((s: any, i: number) => (
              <div
                key={s.id}
                className={`flex items-center justify-between px-4 py-2 text-sm ${
                  i % 2 ? 'bg-slate-50' : ''
                }`}
              >
                <span>
                  {s.lastName} {s.firstName}
                </span>
                <span className="text-xs text-slate-400">{s.status}</span>
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-center text-sm text-slate-400">
              Hali o&apos;quvchi biriktirilmagan
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function AddLessonForm({
  classId,
  subjects,
  onAdded,
}: {
  classId: string;
  subjects: Subject[];
  onAdded: () => void;
}) {
  const [form, setForm] = useState({
    subjectId: '',
    weekday: '1',
    startTime: '08:30',
    endTime: '09:15',
    room: '',
  });
  const [error, setError] = useState('');

  const add = useMutation({
    mutationFn: () =>
      classesApi.addLesson({
        classId,
        subjectId: form.subjectId,
        weekday: Number(form.weekday),
        startTime: form.startTime,
        endTime: form.endTime,
        room: form.room || undefined,
      }),
    onSuccess: () => {
      setError('');
      onAdded();
    },
    onError: (e: any) =>
      setError(e?.response?.data?.message ?? 'Xatolik yuz berdi'),
  });

  const days = [
    'Dushanba',
    'Seshanba',
    'Chorshanba',
    'Payshanba',
    'Juma',
    'Shanba',
    'Yakshanba',
  ];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        add.mutate();
      }}
      className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-slate-300 p-3"
    >
      <select
        value={form.subjectId}
        onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        required
      >
        <option value="">Fan tanlang</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <select
        value={form.weekday}
        onChange={(e) => setForm({ ...form, weekday: e.target.value })}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        {days.map((d, i) => (
          <option key={i} value={i + 1}>
            {d}
          </option>
        ))}
      </select>
      <input
        type="time"
        value={form.startTime}
        onChange={(e) => setForm({ ...form, startTime: e.target.value })}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        type="time"
        value={form.endTime}
        onChange={(e) => setForm({ ...form, endTime: e.target.value })}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        placeholder="Xona"
        value={form.room}
        onChange={(e) => setForm({ ...form, room: e.target.value })}
        className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={add.isPending}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        + Dars
      </button>
      {error && <p className="w-full text-sm text-red-500">{error}</p>}
    </form>
  );
}
