'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  gradesApi,
  GRADE_TYPE_LABEL,
  gradeColor,
  type GradebookRow,
  type GradeType,
} from '@/lib/grades';
import { classesApi } from '@/lib/classes';

export default function GradesPage() {
  const qc = useQueryClient();
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [type, setType] = useState<GradeType>('DAILY');
  const [period, setPeriod] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});

  const { data: classes } = useQuery({ queryKey: ['classes-mini'], queryFn: () => classesApi.list() });
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: classesApi.subjects });
  const { data: gradebook } = useQuery({
    queryKey: ['gradebook', classId, subjectId],
    queryFn: () => gradesApi.gradebook(classId, subjectId),
    enabled: !!classId && !!subjectId,
  });

  const save = useMutation({
    mutationFn: () =>
      gradesApi.bulk({
        subjectId,
        type,
        period: period || undefined,
        items: Object.entries(values)
          .filter(([, v]) => v !== '')
          .map(([studentId, v]) => ({ studentId, value: Number(v) })),
      }),
    onSuccess: () => {
      setValues({});
      qc.invalidateQueries({ queryKey: ['gradebook', classId, subjectId] });
    },
  });

  const enteredCount = Object.values(values).filter((v) => v !== '').length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Baholash</h1>
        <p className="text-sm text-slate-500">Sinf jurnali va o&apos;rtacha ball</p>
      </div>

      {/* Tanlovlar */}
      <div className="mb-4 flex flex-wrap gap-2">
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Sinf</option>
          {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Fan</option>
          {subjects?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value as GradeType)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          {Object.entries(GRADE_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input placeholder="Davr (1-chorak)" value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>

      {!classId || !subjectId ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400">
          Sinf va fanni tanlang
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2">O&apos;quvchi</th>
                  <th className="px-4 py-2">So&apos;nggi baholar</th>
                  <th className="px-4 py-2 text-center">O&apos;rtacha</th>
                  <th className="px-4 py-2 text-center">Yangi baho</th>
                </tr>
              </thead>
              <tbody>
                {gradebook?.map((s: GradebookRow) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium">{s.lastName} {s.firstName}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {s.grades.slice(0, 8).map((g) => (
                          <span key={g.id} className={`rounded bg-slate-100 px-1.5 text-xs font-medium ${gradeColor(g.value)}`}>
                            {g.value}
                          </span>
                        ))}
                        {!s.grades.length && <span className="text-xs text-slate-400">—</span>}
                      </div>
                    </td>
                    <td className={`px-4 py-2 text-center font-bold ${gradeColor(s.average)}`}>
                      {s.average || '—'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={values[s.id] ?? ''}
                        onChange={(e) => setValues({ ...values, [s.id]: e.target.value })}
                        className="w-16 rounded border border-slate-200 px-2 py-1 text-center"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => save.mutate()}
              disabled={!enteredCount || save.isPending}
              className="rounded-lg bg-brand px-5 py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {save.isPending ? 'Saqlanmoqda...' : `Baholarni saqlash (${enteredCount})`}
            </button>
            {save.isSuccess && <span className="text-sm text-green-600">✓ Saqlandi</span>}
          </div>
        </>
      )}
    </div>
  );
}
