'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Target, Plus, Trash2, Wand2 } from 'lucide-react';
import { classesApi, type Subject, type SubjectNormRow } from '@/lib/classes';

/** Sinf bo'yicha haftalik fan normasi (reja soati). Schedule va sinf detali sahifalarida ishlatiladi. */
export function NormPanel({
  classId,
  subjects,
  onDistribute,
}: {
  classId: string;
  subjects: Subject[];
  /** berilsa — har normaga "Jadvalga joylash" tugmasi chiqadi (subjectId, qolgan soat) */
  onDistribute?: (subjectId: string, hours: number) => void;
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

      {subjects.length === 0 ? (
        <p className="py-3 text-center text-sm text-slate-400">
          Fan yo&apos;q — Sozlamalar → Fanlar&apos;dan qo&apos;shing
        </p>
      ) : (norms?.length ?? 0) === 0 ? (
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
                  onDistribute={onDistribute}
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
  onDistribute,
}: {
  norm: SubjectNormRow;
  onSet: (h: number) => void;
  onRemove: () => void;
  onDistribute?: (subjectId: string, hours: number) => void;
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
        <div className="flex items-center justify-end gap-1">
          {onDistribute && (
            <button
              onClick={() => onDistribute(norm.subjectId, remaining > 0 ? remaining : norm.weeklyHours)}
              className="inline-flex items-center gap-1 rounded-lg bg-brand/10 px-2 py-1 text-xs font-medium text-brand hover:bg-brand/20"
              title="Jadvalga joylash"
            >
              <Wand2 size={13} /> Joylash
            </button>
          )}
          <button
            onClick={onRemove}
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-rose-500"
            title="O'chirish"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}
