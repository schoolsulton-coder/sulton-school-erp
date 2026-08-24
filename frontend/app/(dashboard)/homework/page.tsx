'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Paperclip, Users } from 'lucide-react';
import { homeworkApi, type HomeworkListItem, type HwFile } from '@/lib/homework';
import { classesApi } from '@/lib/classes';
import { studentsApi } from '@/lib/students';

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand';

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
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">{h.title}</h2>
                <span className="shrink-0 rounded bg-blue-50 px-2 py-0.5 text-xs text-brand">{h.subject.name}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{h.type}</span>
                <p className="text-sm text-slate-500">{h.className}</p>
              </div>
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
  const qc = useQueryClient();
  const [form, setForm] = useState({ classId: '', subjectId: '', title: '', description: '', dueDate: '' });
  const [type, setType] = useState('Uyga vazifa');
  const [addingType, setAddingType] = useState(false);
  const [newType, setNewType] = useState('');
  const [mode, setMode] = useState<'all' | 'some'>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [files, setFiles] = useState<HwFile[]>([]);

  const { data: classes } = useQuery({ queryKey: ['classes-mini'], queryFn: () => classesApi.list() });
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: classesApi.subjects });
  const { data: types } = useQuery({ queryKey: ['hw-types'], queryFn: homeworkApi.types });
  const { data: roster, isLoading: rosterLoading } = useQuery({
    queryKey: ['class-students', form.classId],
    queryFn: () => studentsApi.list({ classId: form.classId, status: 'ACTIVE', limit: 500 }),
    enabled: !!form.classId && mode === 'some',
  });
  const students = roster?.data ?? [];

  // Joriy tur ro'yxatda bo'lmasa ham select uni ko'rsatsin
  const typeOptions = useMemo(() => {
    const names = (types ?? []).map((t) => t.name);
    return names.includes(type) ? names : [type, ...names];
  }, [types, type]);

  const addType = useMutation({
    mutationFn: () => homeworkApi.addType(newType.trim()),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ['hw-types'] });
      setType(t.name);
      setNewType('');
      setAddingType(false);
    },
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Tur qo‘shishda xatolik'),
  });

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(e.target.files ?? []);
    chosen.forEach((f) => {
      if (f.size > 5 * 1024 * 1024) { alert(`${f.name}: fayl 5MB dan katta`); return; }
      const reader = new FileReader();
      reader.onload = () => setFiles((p) => [...p, { n: f.name, t: f.type, d: reader.result as string }]);
      reader.readAsDataURL(f);
    });
    e.target.value = '';
  };

  const toggleAll = () => setSelected((p) => (p.length === students.length ? [] : students.map((s) => s.id)));
  const toggleOne = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const create = useMutation({
    mutationFn: () => homeworkApi.create({
      classId: form.classId,
      subjectId: form.subjectId,
      title: form.title,
      type,
      description: form.description || undefined,
      dueDate: new Date(form.dueDate).toISOString(),
      attachments: files.map((f) => JSON.stringify(f)),
      studentIds: mode === 'some' ? selected : undefined,
    }),
    onSuccess: onCreated,
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Saqlashda xatolik'),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'some' && !selected.length) { alert("Kamida bitta o'quvchi tanlang"); return; }
    create.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="max-h-[92vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold">Yangi vazifa</h2>

        <div className="flex gap-2">
          <select value={form.classId} onChange={(e) => { setForm({ ...form, classId: e.target.value }); setSelected([]); }} className={inputCls} required>
            <option value="">Sinf</option>
            {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} className={inputCls} required>
            <option value="">Fan</option>
            {subjects?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Vazifa turi */}
        <div>
          <label className="mb-1 block text-sm text-slate-500">Vazifa turi</label>
          <div className="flex gap-2">
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
              {typeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <button type="button" onClick={() => setAddingType((v) => !v)} className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm text-slate-600 hover:bg-slate-50">
              <Plus size={15} /> Tur
            </button>
          </div>
          {addingType && (
            <div className="mt-2 flex gap-2">
              <input value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="Yangi tur nomi" className={inputCls}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newType.trim()) addType.mutate(); } }} />
              <button type="button" onClick={() => newType.trim() && addType.mutate()} disabled={addType.isPending || !newType.trim()}
                className="shrink-0 rounded-lg bg-brand px-3 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
                Qo&apos;shish
              </button>
            </div>
          )}
        </div>

        <input placeholder="Sarlavha" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} required />
        <textarea placeholder="Tavsif" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputCls} h-20 resize-none`} />

        {/* Kimga */}
        <div>
          <label className="mb-1 block text-sm text-slate-500">Kimga</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode('all')} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${mode === 'all' ? 'border-brand bg-brand/5 text-brand' : 'border-slate-300 text-slate-600'}`}>
              <Users size={15} className="mr-1 inline" /> Butun sinf
            </button>
            <button type="button" onClick={() => setMode('some')} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${mode === 'some' ? 'border-brand bg-brand/5 text-brand' : 'border-slate-300 text-slate-600'}`}>
              Tanlangan o&apos;quvchilar {mode === 'some' && selected.length > 0 ? `(${selected.length})` : ''}
            </button>
          </div>
          {mode === 'some' && (
            <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {!form.classId ? (
                <p className="py-3 text-center text-sm text-slate-400">Avval sinf tanlang</p>
              ) : rosterLoading ? (
                <p className="py-3 text-center text-sm text-slate-400">Yuklanmoqda…</p>
              ) : !students.length ? (
                <p className="py-3 text-center text-sm text-slate-400">Sinfda o&apos;quvchi yo&apos;q</p>
              ) : (
                <>
                  <label className="mb-1 flex items-center gap-2 border-b border-slate-100 pb-1.5 text-sm font-medium text-slate-700">
                    <input type="checkbox" checked={selected.length === students.length} onChange={toggleAll} />
                    Hammasini belgilash ({students.length})
                  </label>
                  {students.map((s: any) => (
                    <label key={s.id} className="flex items-center gap-2 py-0.5 text-sm text-slate-700">
                      <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggleOne(s.id)} />
                      {s.lastName} {s.firstName}
                    </label>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Fayl biriktirish */}
        <div>
          <label className="mb-1 block text-sm text-slate-500">Fayl biriktirish</label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">
            <Paperclip size={15} /> Fayl tanlash (rasm, PDF, hujjat — 5MB gacha)
            <input type="file" multiple onChange={onFiles} className="hidden" />
          </label>
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-sm">
                  <span className="truncate">{f.n}</span>
                  <button type="button" onClick={() => setFiles((p) => p.filter((_, x) => x !== i))} className="ml-2 text-slate-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

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
