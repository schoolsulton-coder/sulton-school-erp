'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { hrApi, type EmployeeNote } from '@/lib/hr';

const fmt = (iso: string) => new Date(iso).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function IzohlarSection({ employeeId }: { employeeId: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['emp-notes', employeeId], queryFn: () => hrApi.notes(employeeId) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['emp-notes', employeeId] });
  const add = useMutation({ mutationFn: () => hrApi.addNote(employeeId, text.trim()), onSuccess: () => { setText(''); refresh(); } });
  const del = useMutation({ mutationFn: (id: string) => hrApi.deleteNote(id), onSuccess: refresh });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Izohlar ({data?.length ?? 0})</h3>
      <p className="mb-3 text-xs text-slate-400">Xodimga aloqador barcha izohlar — istalgan lavozim sahifasidan ko&apos;rinadi.</p>
      <div className="mb-3">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Yangi izoh yozing..." className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white" />
        <div className="mt-2 flex justify-end">
          <button onClick={() => text.trim() && add.mutate()} disabled={add.isPending || !text.trim()} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">Qo&apos;shish</button>
        </div>
      </div>
      {isLoading ? (
        <p className="py-3 text-center text-sm text-slate-400">Yuklanmoqda…</p>
      ) : data?.length ? (
        <ul className="space-y-2">
          {data.map((n: EmployeeNote) => (
            <li key={n.id} className="group rounded-lg border border-slate-100 px-3 py-2">
              <p className="whitespace-pre-wrap text-sm text-slate-700">{n.text}</p>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>{n.author?.fullName ?? '—'} · {fmt(n.createdAt)}</span>
                <button onClick={() => { if (confirm("Izohni o'chirasizmi?")) del.mutate(n.id); }} className="opacity-0 transition group-hover:opacity-100 hover:text-red-500"><Trash2 size={13} /></button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-3 text-center text-sm text-slate-400">Izohlar yo&apos;q</p>
      )}
    </div>
  );
}
