'use client';

import { useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { teacherLabel, type ManagedUser } from '@/lib/users';

/**
 * Bir dars soatiga bir nechta ustoz tanlash.
 * Tanlanganlar tepada belgi bo'lib turadi, pastda qidiruvli ro'yxat.
 */
export function TeacherPicker({
  teachers,
  value,
  onChange,
  busyIds,
  emptyHint,
}: {
  teachers: ManagedUser[];
  value: string[];
  onChange: (ids: string[]) => void;
  /** Shu vaqtda band ustozlar — faqat ogohlantirish (tanlash mumkin) */
  busyIds?: Set<string>;
  emptyHint?: string;
}) {
  const [q, setQ] = useState('');
  const selected = useMemo(() => value.map((id) => teachers.find((t) => t.id === id)).filter(Boolean) as ManagedUser[], [value, teachers]);
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const rows = term ? teachers.filter((t) => t.fullName.toLowerCase().includes(term)) : teachers;
    // Tanlanganlar tepada
    return [...rows].sort((a, b) => Number(value.includes(b.id)) - Number(value.includes(a.id)));
  }, [teachers, q, value]);

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  if (!teachers.length) {
    return <span className="mt-1 block text-xs text-slate-400">{emptyHint ?? "Ustoz yo'q"}</span>;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-slate-200 p-2">
          {selected.map((t) => (
            <span key={t.id} className="inline-flex items-center gap-1 rounded-full bg-brand/10 py-1 pl-2.5 pr-1 text-xs font-medium text-brand">
              {teacherLabel(t)}
              <button
                type="button"
                onClick={() => toggle(t.id)}
                aria-label={`${t.fullName} — olib tashlash`}
                className="grid h-5 w-5 place-items-center rounded-full hover:bg-brand/15"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      {teachers.length > 6 && (
        <div className="relative border-b border-slate-200">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ustoz qidirish..."
            className="w-full bg-transparent py-2 pl-8 pr-2 text-sm outline-none"
          />
        </div>
      )}
      <div className="max-h-44 overflow-y-auto p-1">
        {list.map((t) => {
          const on = value.includes(t.id);
          const busy = busyIds?.has(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              aria-pressed={on}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${on ? 'bg-brand/10 text-brand' : 'text-slate-700 hover:bg-white'}`}
            >
              <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white'}`}>
                {on && <Check size={11} />}
              </span>
              <span className="min-w-0 flex-1 truncate">{teacherLabel(t)}</span>
              {busy && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">band</span>}
            </button>
          );
        })}
        {!list.length && <div className="py-3 text-center text-xs text-slate-400">Topilmadi</div>}
      </div>
    </div>
  );
}
