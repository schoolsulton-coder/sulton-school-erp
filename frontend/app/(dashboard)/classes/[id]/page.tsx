'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Pencil,
  Armchair,
  Users,
  Gauge,
  CalendarDays,
  MapPin,
  Send,
} from 'lucide-react';
import { classesApi, type ClassRow } from '@/lib/classes';
import { usersApi } from '@/lib/users';
import { ClassFormModal } from '@/components/class-form';
import { NormPanel } from '@/components/norm-panel';
import { normTime, periodIndex, WEEKDAYS } from '@/lib/schedule';

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [editing, setEditing] = useState(false);

  const { data: cls } = useQuery({
    queryKey: ['class', id],
    queryFn: () => classesApi.get(id),
  });
  const { data: schedule } = useQuery({
    queryKey: ['class-schedule', id],
    queryFn: () => classesApi.schedule(id),
  });
  const { data: allUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  });
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: classesApi.subjects,
  });
  const teacherMap = useMemo(
    () =>
      new Map(
        (allUsers ?? [])
          .filter((u) => u.role.slug === 'teacher')
          .map((t) => [t.id, t.fullName]),
      ),
    [allUsers],
  );

  if (!cls) return <div className="p-8 text-slate-400">Yuklanmoqda...</div>;

  const studentCount = cls.students?.length ?? 0;
  const capacity = cls.capacity ?? 0;
  const free = Math.max(capacity - studentCount, 0);
  const pct = capacity ? Math.round((studentCount / capacity) * 100) : 0;
  const barColor =
    pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="min-h-full bg-slate-50/60 p-6">
      <Link
        href="/classes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand"
      >
        <ArrowLeft size={16} /> Sinflarga qaytish
      </Link>

      {/* Sarlavha kartochkasi */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-xl font-bold text-white shadow-sm">
            {cls.gradeLevel}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{cls.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {cls.branch?.name && <Chip icon={MapPin}>{cls.branch.name}</Chip>}
              <Chip>{cls.academicYear}</Chip>
              {cls.language && <Chip>{cls.language}</Chip>}
              {cls.room && <Chip>Xona: {cls.room}</Chip>}
              <StatusChip status={cls.status ?? 'Faol'} />
              {cls.telegramGroup && (
                <a
                  href={cls.telegramGroup}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-600 ring-1 ring-sky-200 hover:bg-sky-100"
                >
                  <Send size={12} /> Telegram
                </a>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          <Pencil size={16} /> Tahrirlash
        </button>
      </div>

      {/* To'liqlik kartochkalari */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard icon={Armchair} tone="indigo" label="Joy sig'imi" value={capacity} />
        <MetricCard icon={Users} tone="emerald" label="O'quvchi (band)" value={studentCount} />
        <MetricCard icon={Armchair} tone="amber" label="Bo'sh joy" value={free} />
        <MetricCard icon={Gauge} tone="violet" label="To'liqlik" value={`${pct}%`} />
      </div>

      {/* Umumiy to'liqlik progress */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-600">Umumiy to&apos;liqlik</span>
          <span className="text-slate-400">
            {studentCount} / {capacity} · {pct}%
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </div>

      {/* Haftalik fan normasi */}
      <NormPanel classId={id} subjects={subjects ?? []} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* O'quvchilar */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Users size={18} className="text-brand" />
            O&apos;quvchilar
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-500">
              {studentCount}
            </span>
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {studentCount ? (
              cls.students.map((s: any, i: number) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between border-b border-slate-50 px-4 py-2.5 text-sm last:border-0 hover:bg-slate-50/60"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                      {i + 1}
                    </div>
                    <span className="text-slate-700">
                      {s.lastName} {s.firstName}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{s.status}</span>
                </div>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-sm text-slate-400">
                Hali o&apos;quvchi biriktirilmagan
              </p>
            )}
          </div>
        </section>

        {/* Dars jadvali (read-only + boshqarish linki) */}
        <section className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <CalendarDays size={18} className="text-brand" />
              Dars jadvali
            </h2>
            <Link
              href={`/schedule?class=${id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-brand hover:text-brand"
            >
              <Pencil size={14} /> Jadvalni tahrirlash
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {WEEKDAYS.map((wd) => {
              const day = schedule?.find((d) => d.weekday === wd.n);
              const lessons = day?.lessons ?? [];
              return (
                <div key={wd.n} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <h3 className="mb-2 text-sm font-semibold text-slate-600">{wd.label}</h3>
                  <div className="space-y-2">
                    {lessons.map((l) => (
                      <div key={l.id} className="flex items-center gap-2.5 rounded-lg bg-slate-50 p-2">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-xs font-bold text-brand">
                          {periodIndex(l.startTime) || '·'}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-700">{l.subject.name}</div>
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
                      </div>
                    ))}
                    {lessons.length === 0 && <p className="py-1 text-xs text-slate-300">—</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {editing && (
        <ClassFormModal
          editing={cls as unknown as ClassRow}
          onClose={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      )}
    </div>
  );
}

function Chip({
  icon: Icon,
  children,
}: {
  icon?: typeof MapPin;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
      {Icon && <Icon size={12} />}
      {children}
    </span>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    Faol: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
    Nofaol: 'bg-slate-100 text-slate-500 ring-slate-200',
    Arxiv: 'bg-amber-50 text-amber-600 ring-amber-200',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${map[status] ?? map.Faol}`}>
      {status}
    </span>
  );
}

const TONES: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-500',
  emerald: 'bg-emerald-50 text-emerald-500',
  amber: 'bg-amber-50 text-amber-500',
  violet: 'bg-violet-50 text-violet-500',
};

function MetricCard({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof Users;
  tone: keyof typeof TONES;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </span>
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${TONES[tone]}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-800">{value}</div>
    </div>
  );
}
