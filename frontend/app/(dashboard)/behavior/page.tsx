'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { behaviorApi, type BehaviorRecord, type RankingItem } from '@/lib/behavior';
import { studentsApi } from '@/lib/students';
import { classesApi } from '@/lib/classes';

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2';

export default function BehaviorPage() {
  const qc = useQueryClient();
  const { data: records } = useQuery({ queryKey: ['behavior'], queryFn: () => behaviorApi.list() });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Ahloqiy baholash</h1>
        <p className="text-sm text-slate-500">Xulq ballari, intizom va rag&apos;batlantirish</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Qayd etish + lenta */}
        <div className="lg:col-span-2 space-y-6">
          <AddRecord onAdded={() => qc.invalidateQueries({ queryKey: ['behavior'] })} />

          <div>
            <h2 className="mb-3 text-lg font-semibold">So&apos;nggi yozuvlar</h2>
            <div className="space-y-2">
              {records?.map((r: BehaviorRecord) => (
                <div key={r.id} className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-3">
                  <div>
                    <div className="font-medium">
                      {r.student.lastName} {r.student.firstName}
                    </div>
                    <div className="text-sm text-slate-500">{r.description}</div>
                    <div className="text-xs text-slate-400">
                      {new Date(r.date).toLocaleDateString('uz-UZ')}
                      {r.author && ` · ${r.author.fullName}`}
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${
                    r.type === 'POSITIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {r.type === 'POSITIVE' ? '+' : '−'}{r.points}
                  </span>
                </div>
              ))}
              {!records?.length && <p className="text-sm text-slate-400">Yozuv yo&apos;q</p>}
            </div>
          </div>
        </div>

        {/* Sinf reytingi */}
        <ClassRanking />
      </div>
    </div>
  );
}

function AddRecord({ onAdded }: { onAdded: () => void }) {
  const [form, setForm] = useState({ studentId: '', type: 'POSITIVE', points: '5', description: '' });
  const { data: students } = useQuery({
    queryKey: ['students-mini'],
    queryFn: () => studentsApi.list({ page: 1 }).then((r) => r.data),
  });

  const add = useMutation({
    mutationFn: () => behaviorApi.create({
      studentId: form.studentId,
      type: form.type as 'POSITIVE' | 'NEGATIVE',
      points: Number(form.points),
      description: form.description,
    }),
    onSuccess: () => {
      setForm({ ...form, description: '' });
      onAdded();
    },
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); add.mutate(); }}
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <h2 className="font-semibold">Yangi yozuv</h2>
      <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className={inputCls} required>
        <option value="">O&apos;quvchini tanlang</option>
        {students?.map((s: any) => (
          <option key={s.id} value={s.id}>{s.lastName} {s.firstName}</option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setForm({ ...form, type: 'POSITIVE' })}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold ${form.type === 'POSITIVE' ? 'bg-green-600 text-white' : 'border border-slate-300'}`}
        >
          👍 Ijobiy
        </button>
        <button
          type="button"
          onClick={() => setForm({ ...form, type: 'NEGATIVE' })}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold ${form.type === 'NEGATIVE' ? 'bg-red-600 text-white' : 'border border-slate-300'}`}
        >
          👎 Salbiy
        </button>
      </div>
      <input type="number" min={1} max={100} placeholder="Ball" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} className={inputCls} required />
      <textarea placeholder="Hodisa / izoh" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputCls} h-20`} required />
      <button type="submit" disabled={add.isPending} className="w-full rounded-lg bg-brand py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
        {add.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
      </button>
    </form>
  );
}

function ClassRanking() {
  const [classId, setClassId] = useState('');
  const { data: classes } = useQuery({ queryKey: ['classes-mini'], queryFn: () => classesApi.list() });
  const { data: ranking } = useQuery({
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
              <span>
                <span className="mr-2 w-6 text-slate-400">{medal(i)}</span>
                {s.lastName} {s.firstName}
              </span>
              <span className={`font-bold ${s.score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {s.score > 0 ? '+' : ''}{s.score}
              </span>
            </div>
          ))}
          {!ranking?.length && <p className="text-sm text-slate-400">O&apos;quvchi yo&apos;q</p>}
        </div>
      )}
    </div>
  );
}
