'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Trash2 } from 'lucide-react';
import { behaviorApi, type BehaviorRecord, type RankingItem } from '@/lib/behavior';
import { studentsApi } from '@/lib/students';
import { classesApi } from '@/lib/classes';
import { useAuthStore } from '@/store/auth';

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand';
const errText = (e: any) => { const m = e?.response?.data?.message; return Array.isArray(m) ? m[0] : (m ?? 'Xatolik yuz berdi'); };
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function BehaviorPage() {
  const qc = useQueryClient();
  const canDelete = useAuthStore((s) => s.can('behavior.delete'));
  const [fClass, setFClass] = useState('');
  const [fType, setFType] = useState('');
  const [err, setErr] = useState('');

  const { data: classes } = useQuery({ queryKey: ['classes-mini'], queryFn: () => classesApi.list() });
  const { data: records, isLoading } = useQuery({
    queryKey: ['behavior', fClass, fType],
    queryFn: () => behaviorApi.list({ classId: fClass || undefined, type: fType || undefined }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['behavior'] });
  const del = useMutation({
    mutationFn: (id: string) => behaviorApi.remove(id),
    onSuccess: () => { setErr(''); refresh(); },
    onError: (e: any) => setErr(errText(e)),
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ahloqiy baholash</h1>
          <p className="text-sm text-slate-500">Xulq ballari, intizom va rag&apos;batlantirish</p>
        </div>
        <Link href="/behavior/statistics" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          <BarChart3 size={15} /> Statistika
        </Link>
      </div>

      {err && (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{err}</span>
          <button onClick={() => setErr('')} className="shrink-0 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <AddRecord onAdded={refresh} onError={setErr} />

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">So&apos;nggi yozuvlar</h2>
              <div className="flex gap-2">
                <select value={fClass} onChange={(e) => setFClass(e.target.value)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand">
                  <option value="">Barcha sinflar</option>
                  {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={fType} onChange={(e) => setFType(e.target.value)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand">
                  <option value="">Barchasi</option>
                  <option value="POSITIVE">Ijobiy</option>
                  <option value="NEGATIVE">Salbiy</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              {records?.map((r: BehaviorRecord) => (
                <div key={r.id} className="group flex items-start justify-between rounded-xl border border-slate-200 bg-white p-3">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {r.student.lastName} {r.student.firstName}
                      {r.student.class && <span className="ml-2 text-xs text-slate-400">{r.student.class.name}</span>}
                    </div>
                    <div className="text-sm text-slate-600">{r.description}</div>
                    <div className="text-xs text-slate-400">
                      {fmtDateTime(r.createdAt ?? r.date)}
                      {r.author && ` · ${r.author.fullName}`}
                    </div>
                  </div>
                  <div className="ml-2 flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-sm font-bold ${r.type === 'POSITIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {r.type === 'POSITIVE' ? '+' : '−'}{r.points}
                    </span>
                    {canDelete && (
                      <button onClick={() => { if (confirm("Yozuvni o'chirasizmi?")) del.mutate(r.id); }} className="text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-red-500" title="O'chirish">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!records?.length && <p className="py-6 text-center text-sm text-slate-400">{isLoading ? 'Yuklanmoqda…' : 'Yozuv yo\'q'}</p>}
            </div>
          </div>
        </div>

        <ClassRanking />
      </div>
    </div>
  );
}

function AddRecord({ onAdded, onError }: { onAdded: () => void; onError: (m: string) => void }) {
  const [form, setForm] = useState({ classId: '', studentId: '', type: 'POSITIVE', points: '5', description: '' });
  const { data: classes } = useQuery({ queryKey: ['classes-mini'], queryFn: () => classesApi.list() });
  const { data: students } = useQuery({
    queryKey: ['behavior-students', form.classId],
    queryFn: () => studentsApi.list({ classId: form.classId || undefined, status: 'ACTIVE', limit: 500 }).then((r) => r.data),
  });
  const sorted = useMemo(() => [...(students ?? [])].sort((a: any, b: any) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`)), [students]);

  const add = useMutation({
    mutationFn: () => behaviorApi.create({
      studentId: form.studentId,
      type: form.type as 'POSITIVE' | 'NEGATIVE',
      points: Number(form.points),
      description: form.description,
    }),
    onSuccess: () => { setForm({ ...form, description: '' }); onError(''); onAdded(); },
    onError: (e: any) => onError(errText(e)),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!form.studentId) { onError("O'quvchini tanlang"); return; } add.mutate(); }} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">Yangi yozuv</h2>
      <div className="flex gap-2">
        <select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value, studentId: '' })} className={inputCls}>
          <option value="">Barcha sinflar</option>
          {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className={inputCls} required>
          <option value="">O&apos;quvchi ({sorted.length})</option>
          {sorted.map((s: any) => <option key={s.id} value={s.id}>{s.lastName} {s.firstName}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setForm({ ...form, type: 'POSITIVE' })} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${form.type === 'POSITIVE' ? 'bg-green-600 text-white' : 'border border-slate-300'}`}>👍 Ijobiy</button>
        <button type="button" onClick={() => setForm({ ...form, type: 'NEGATIVE' })} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${form.type === 'NEGATIVE' ? 'bg-red-600 text-white' : 'border border-slate-300'}`}>👎 Salbiy</button>
      </div>
      <input type="number" min={1} max={100} placeholder="Ball" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} className={inputCls} required />
      <textarea placeholder="Hodisa / izoh" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputCls} h-20 resize-none`} required />
      <button type="submit" disabled={add.isPending} className="w-full rounded-lg bg-brand py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
        {add.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
      </button>
    </form>
  );
}

function ClassRanking() {
  const [classId, setClassId] = useState('');
  const { data: classes } = useQuery({ queryKey: ['classes-mini'], queryFn: () => classesApi.list() });
  const { data: ranking, isLoading } = useQuery({
    queryKey: ['behavior-ranking', classId],
    queryFn: () => behaviorApi.classRanking(classId),
    enabled: !!classId,
  });

  const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 font-semibold">Sinf reytingi</h2>
      <select value={classId} onChange={(e) => setClassId(e.target.value)} className={`${inputCls} mb-3`}>
        <option value="">Sinf tanlang</option>
        {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      {!classId ? (
        <p className="text-sm text-slate-400">Reytingni ko&apos;rish uchun sinf tanlang</p>
      ) : (
        <div className="space-y-1">
          {ranking?.map((s: RankingItem, i: number) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm odd:bg-slate-50">
              <span><span className="mr-2 w-6 text-slate-400">{medal(i)}</span>{s.lastName} {s.firstName}</span>
              <span className={`font-bold ${s.score >= 0 ? 'text-green-600' : 'text-red-600'}`}>{s.score > 0 ? '+' : ''}{s.score}</span>
            </div>
          ))}
          {!ranking?.length && <p className="text-sm text-slate-400">{isLoading ? 'Yuklanmoqda…' : "O'quvchi yo'q"}</p>}
        </div>
      )}
    </div>
  );
}
