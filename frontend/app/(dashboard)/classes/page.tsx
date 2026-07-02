'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { classesApi, type ClassRow } from '@/lib/classes';

export default function ClassesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { data: classes, isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesApi.list(),
  });

  if (isLoading) return <div className="p-8">Yuklanmoqda...</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sinflar va Guruhlar</h1>
          <p className="text-sm text-slate-500">Sinflar, sig&apos;im va o&apos;qituvchilar</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark"
        >
          + Yangi sinf
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes?.map((c: ClassRow) => (
          <Link
            key={c.id}
            href={`/classes/${c.id}`}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{c.name}</h2>
              <span className="text-xs text-slate-400">{c.academicYear}</span>
            </div>
            <p className="text-sm text-slate-500">
              {c.gradeLevel}-sinf {c.room ? `· ${c.room}` : ''}
            </p>

            {/* Sig'im indikatori */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-500">
                <span>
                  {c.studentCount} / {c.capacity} o&apos;quvchi
                </span>
                <span>{c.fillPercent}%</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${
                    c.fillPercent >= 100
                      ? 'bg-red-500'
                      : c.fillPercent >= 80
                        ? 'bg-amber-500'
                        : 'bg-brand'
                  }`}
                  style={{ width: `${Math.min(c.fillPercent, 100)}%` }}
                />
              </div>
            </div>

            {c.teachers.length > 0 && (
              <p className="mt-3 text-xs text-slate-500">
                {c.teachers
                  .map(
                    (t) =>
                      `${t.teacher.fullName}${t.isCurator ? ' (kurator)' : ''}`,
                  )
                  .join(', ')}
              </p>
            )}
          </Link>
        ))}
      </div>

      {showForm && (
        <NewClassModal
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ['classes'] });
          }}
        />
      )}
    </div>
  );
}

function NewClassModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    gradeLevel: '1',
    academicYear: '2025-2026',
    capacity: '30',
    room: '',
  });
  const create = useMutation({
    mutationFn: () =>
      classesApi.create({
        name: form.name,
        gradeLevel: Number(form.gradeLevel),
        academicYear: form.academicYear,
        capacity: Number(form.capacity),
        room: form.room || undefined,
      }),
    onSuccess: onCreated,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
        className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold">Yangi sinf</h2>
        <input
          placeholder="Nom (5-A)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          required
        />
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            max={11}
            placeholder="Sinf darajasi"
            value={form.gradeLevel}
            onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })}
            className="w-1/2 rounded-lg border border-slate-300 px-3 py-2"
            required
          />
          <input
            type="number"
            min={1}
            placeholder="Sig'im"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            className="w-1/2 rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <input
          placeholder="O'quv yili (2025-2026)"
          value={form.academicYear}
          onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          required
        />
        <input
          placeholder="Xona (ixtiyoriy)"
          value={form.room}
          onChange={(e) => setForm({ ...form, room: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 py-2"
          >
            Bekor
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className="flex-1 rounded-lg bg-brand py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {create.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </form>
    </div>
  );
}
