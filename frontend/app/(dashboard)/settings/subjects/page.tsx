'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Pencil, Trash2, X, Search, CalendarDays, Target } from 'lucide-react';
import { classesApi, type Subject } from '@/lib/classes';

export default function SubjectsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Subject | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState('');

  const { data: subjects, isLoading } = useQuery({ queryKey: ['subjects'], queryFn: classesApi.subjects });

  const remove = useMutation({
    mutationFn: (id: string) => classesApi.removeSubject(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subjects'] }); flash("Fan o'chirildi"); },
    onError: (e: any) => flash(e?.response?.data?.message ?? 'Xatolik'),
  });

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const filtered = useMemo(
    () => (subjects ?? []).filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || (s.code ?? '').toLowerCase().includes(search.toLowerCase())),
    [subjects, search],
  );

  return (
    <div className="min-h-full bg-slate-50/60 p-6">
      {/* Sarlavha */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand text-white shadow-sm"><BookOpen size={22} /></div>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
              Fanlar
              <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-sm font-semibold text-slate-500">{subjects?.length ?? 0} ta</span>
            </h1>
            <p className="text-sm text-slate-400">Maktab fanlari — dars jadvali va normalar shu ro&apos;yxatdan tanlanadi</p>
          </div>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark">
          <Plus size={18} /> Yangi fan
        </button>
      </div>

      {/* Qidiruv */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Fan nomi yoki kodi..." className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20" />
        </div>
      </div>

      {/* Ro'yxat */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Fan nomi</th>
                <th className="px-5 py-3">Kodi</th>
                <th className="px-5 py-3 text-center">Darslarda</th>
                <th className="px-5 py-3 text-center">Normalarda</th>
                <th className="px-5 py-3 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">Yuklanmoqda...</td></tr>
              ) : filtered.length ? (
                filtered.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 transition last:border-0 hover:bg-brand/[0.03]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand"><BookOpen size={16} /></div>
                        <span className="font-semibold text-slate-800">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">{s.code ? <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{s.code}</span> : <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 text-slate-500"><CalendarDays size={13} className="text-slate-400" />{s._count?.schedules ?? 0}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 text-slate-500"><Target size={13} className="text-slate-400" />{s._count?.norms ?? 0}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditing(s); setShowForm(true); }} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand" title="Tahrirlash"><Pencil size={15} /></button>
                        <button onClick={() => { if (confirm(`"${s.name}" fanini o'chirasizmi?`)) remove.mutate(s.id); }} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-rose-500" title="O'chirish"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">{search ? 'Topilmadi' : "Fan yo'q — «Yangi fan» tugmasi bilan qo'shing"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && <SubjectFormModal subject={editing} onClose={() => setShowForm(false)} onSaved={(m) => { setShowForm(false); qc.invalidateQueries({ queryKey: ['subjects'] }); flash(m); }} />}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>
      )}
    </div>
  );
}

function SubjectFormModal({ subject, onClose, onSaved }: { subject: Subject | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const [name, setName] = useState(subject?.name ?? '');
  const [code, setCode] = useState(subject?.code ?? '');
  const [error, setError] = useState('');
  const inp = 'w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20';

  const save = useMutation({
    mutationFn: () => {
      const data = { name: name.trim(), code: code.trim() || undefined };
      return subject ? classesApi.updateSubject(subject.id, data) : classesApi.createSubject(data);
    },
    onSuccess: () => onSaved(subject ? 'Fan yangilandi' : "Fan qo'shildi"),
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return setError('Fan nomi kerak'); setError(''); save.mutate(); }} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{subject ? 'Fanni tahrirlash' : 'Yangi fan'}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Fan nomi <span className="text-rose-500">*</span></label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Matematika" className={inp} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Kodi <span className="text-slate-300">— ixtiyoriy</span></label>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="MAT" className={inp} />
          </div>
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Bekor qilish</button>
            <button type="submit" disabled={save.isPending || !name.trim()} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
              {save.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
