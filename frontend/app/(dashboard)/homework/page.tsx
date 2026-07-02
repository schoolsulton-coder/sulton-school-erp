'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { homeworkApi, type HomeworkListItem } from '@/lib/homework';
import { classesApi } from '@/lib/classes';

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2';

export default function HomeworkPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { data: list } = useQuery({ queryKey: ['homework'], queryFn: () => homeworkApi.list() });

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vazifalar</h1>
          <p className="text-sm text-slate-500">Uy vazifasi berish va tekshirish</p>
        </div>
        <button onClick={() => setShowForm(true)} className="rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark">
          + Yangi vazifa
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list?.map((h: HomeworkListItem) => {
          const overdue = new Date(h.dueDate) < new Date();
          return (
            <Link key={h.id} href={`/homework/${h.id}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
              <div className="flex items-start justify-between">
                <h2 className="font-semibold">{h.title}</h2>
                <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-brand">{h.subject.name}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{h.className}</p>
              <p className={`mt-1 text-xs ${overdue ? 'text-red-500' : 'text-slate-400'}`}>
                Muddat: {new Date(h.dueDate).toLocaleString('uz-UZ')}
              </p>
              <div className="mt-3 flex gap-3 text-xs">
                <span className="text-slate-500">Topshirgan: <b>{h.submitted}/{h.total}</b></span>
                <span className="text-green-600">Tekshirilgan: <b>{h.checked}</b></span>
              </div>
            </Link>
          );
        })}
        {!list?.length && (
          <p className="col-span-full py-8 text-center text-slate-400">Vazifa yo&apos;q</p>
        )}
      </div>

      {showForm && (
        <NewHomeworkModal
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['homework'] }); }}
        />
      )}
    </div>
  );
}

function NewHomeworkModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ classId: '', subjectId: '', title: '', description: '', dueDate: '' });
  const { data: classes } = useQuery({ queryKey: ['classes-mini'], queryFn: () => classesApi.list() });
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: classesApi.subjects });

  const create = useMutation({
    mutationFn: () => homeworkApi.create({
      classId: form.classId, subjectId: form.subjectId, title: form.title,
      description: form.description || undefined, dueDate: new Date(form.dueDate).toISOString(),
    }),
    onSuccess: onCreated,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="w-full max-w-md space-y-3 rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold">Yangi vazifa</h2>
        <div className="flex gap-2">
          <select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className={inputCls} required>
            <option value="">Sinf</option>
            {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} className={inputCls} required>
            <option value="">Fan</option>
            {subjects?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <input placeholder="Sarlavha" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} required />
        <textarea placeholder="Tavsif" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputCls} h-24`} />
        <label className="block text-sm text-slate-500">Topshirish muddati</label>
        <input type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inputCls} required />
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-300 py-2">Bekor</button>
          <button type="submit" disabled={create.isPending} className="flex-1 rounded-lg bg-brand py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
            {create.isPending ? 'Saqlanmoqda...' : 'Yaratish'}
          </button>
        </div>
      </form>
    </div>
  );
}
