'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Send, Trash2 } from 'lucide-react';
import {
  BEHAVIOR_LIMIT,
  behaviorApi,
  currentMonth,
  monthLabelOf,
  scoreBar,
  scoreTone,
  type BehaviorMonthly,
  type BehaviorRecord,
  type RankingItem,
} from '@/lib/behavior';
import { studentsApi } from '@/lib/students';
import { useMyClasses } from '@/lib/use-my-classes';
import { useAuthStore } from '@/store/auth';

// Mobilda py-2.5 (>=40px teginish nishoni) va 16px shrift — iOS'da fokusda zoom bo'lmasligi uchun
const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-brand sm:py-2';
const errText = (e: any) => { const m = e?.response?.data?.message; return Array.isArray(m) ? m[0] : (m ?? 'Xatolik yuz berdi'); };
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const QUICK = [1, 2, 3, 5, 10];

export default function BehaviorPage() {
  const qc = useQueryClient();
  const canDelete = useAuthStore((s) => s.can('behavior.delete'));
  const [fClass, setFClass] = useState('');
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');

  const { classes } = useMyClasses();
  const { data: records, isLoading } = useQuery({
    queryKey: ['behavior', fClass],
    queryFn: () => behaviorApi.list({ classId: fClass || undefined }),
  });

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 5000);
  };
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['behavior'] });
    qc.invalidateQueries({ queryKey: ['behavior-ranking'] });
    qc.invalidateQueries({ queryKey: ['behavior-summary'] });
    qc.invalidateQueries({ queryKey: ['behavior-stats'] });
    qc.invalidateQueries({ queryKey: ['sr-behavior'] });
  };
  const del = useMutation({
    mutationFn: (id: string) => behaviorApi.remove(id),
    onSuccess: () => { setErr(''); refresh(); flash("Yozuv o'chirildi — ball qaytarildi, vasiyga xabar yuboriladi"); },
    onError: (e: any) => setErr(errText(e)),
  });

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">Ahloqiy baholash</h1>
          <p className="text-sm text-slate-500">
            Har o&apos;quvchiga oyiga {BEHAVIOR_LIMIT} ball — qoidabuzarlik uchun shundan ayiriladi
          </p>
        </div>
        <Link href="/behavior/statistics" className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 sm:w-auto sm:py-2">
          <BarChart3 size={15} /> Statistika
        </Link>
      </div>

      {err && (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span className="min-w-0 break-words">{err}</span>
          <button onClick={() => setErr('')} aria-label="Yopish" className="-m-2 shrink-0 rounded p-2 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="space-y-4 sm:space-y-6 lg:col-span-2">
          <AddRecord
            onAdded={(points, monthly) => {
              refresh();
              flash(
                `−${points} ball ayirildi · ${monthly.monthLabel}: ${monthly.remaining}/${monthly.limit} qoldi · vasiyga Telegram xabar yuboriladi`,
              );
            }}
            onError={setErr}
          />

          <div>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold">So&apos;nggi yozuvlar</h2>
              <select value={fClass} onChange={(e) => setFClass(e.target.value)} className="w-full min-w-0 rounded-lg border border-slate-300 px-2.5 py-2.5 text-sm outline-none focus:border-brand sm:w-auto sm:py-1.5">
                <option value="">Barcha sinflar</option>
                {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              {records?.map((r: BehaviorRecord) => {
                const legacy = r.type === 'POSITIVE';
                return (
                  <div key={r.id} className="group flex items-start justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3">
                    <div className="min-w-0 flex-1">
                      <div className="break-words font-medium">
                        {r.student.lastName} {r.student.firstName}
                        {r.student.class && <span className="ml-2 text-xs text-slate-400">{r.student.class.name}</span>}
                      </div>
                      <div className="break-words text-sm text-slate-600">{r.description}</div>
                      <div className="break-words text-xs text-slate-400">
                        {fmtDateTime(r.createdAt ?? r.date)}
                        {r.author && ` · ${r.author.fullName}`}
                        {legacy && ' · eski ijobiy yozuv (ballga ta\'sir qilmaydi)'}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-sm font-bold sm:px-3 ${legacy ? 'bg-slate-100 text-slate-400' : 'bg-red-100 text-red-700'}`}>
                        {legacy ? `+${r.points}` : `−${r.points}`}
                      </span>
                      {canDelete && (
                        <button
                          onClick={() => {
                            if (confirm(legacy ? "Yozuvni o'chirasizmi?" : `Yozuv o'chirilsinmi? ${r.points} ball qaytariladi va vasiyga xabar boradi.`)) del.mutate(r.id);
                          }}
                          className="rounded-lg p-2 text-slate-300 transition hover:text-red-500 sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                          title="O'chirish"
                          aria-label="O'chirish"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {!records?.length && <p className="py-6 text-center text-sm text-slate-400">{isLoading ? 'Yuklanmoqda…' : 'Yozuv yo\'q'}</p>}
            </div>
          </div>
        </div>

        <ClassRanking />
      </div>

      {toast && (
        <div className="fixed bottom-[calc(1.5rem_+_env(safe-area-inset-bottom))] left-1/2 z-[60] w-[calc(100vw_-_2rem)] max-w-lg -translate-x-1/2 rounded-xl bg-slate-800 px-4 py-3 text-center text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function AddRecord({
  onAdded,
  onError,
}: {
  onAdded: (points: number, monthly: BehaviorMonthly) => void;
  onError: (m: string) => void;
}) {
  const [form, setForm] = useState({ classId: '', studentId: '', points: '5', description: '' });
  const { classes } = useMyClasses();

  // Bitta sinf biriktirilgan bo'lsa — o'sha sinf darhol tanlanadi
  useEffect(() => {
    if (classes.length === 1) setForm((f) => (f.classId ? f : { ...f, classId: classes[0].id }));
  }, [classes]);
  const { data: students } = useQuery({
    queryKey: ['behavior-students', form.classId],
    queryFn: () => studentsApi.list({ classId: form.classId || undefined, status: 'ACTIVE', limit: 500 }).then((r) => r.data),
  });
  const sorted = useMemo(() => [...(students ?? [])].sort((a: any, b: any) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`)), [students]);

  // Tanlangan o'quvchining shu oydagi bali
  const { data: summary } = useQuery({
    queryKey: ['behavior-summary', form.studentId],
    queryFn: () => behaviorApi.studentSummary(form.studentId),
    enabled: !!form.studentId,
  });
  const remaining = summary?.remaining ?? BEHAVIOR_LIMIT;
  const points = Number(form.points) || 0;
  const exhausted = !!summary && remaining === 0;
  const tooMuch = !!summary && !exhausted && points > remaining;

  const add = useMutation({
    mutationFn: () => behaviorApi.create({ studentId: form.studentId, points, description: form.description.trim() }),
    onSuccess: (res) => {
      setForm((f) => ({ ...f, description: '' }));
      onError('');
      onAdded(points, res.monthly);
    },
    onError: (e: any) => onError(errText(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentId) return onError("O'quvchini tanlang");
    if (points < 1) return onError('Ayiriladigan ballni kiriting');
    if (!form.description.trim()) return onError('Sababni yozing');
    add.mutate();
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Ball ayirish</h2>
        <span className="text-xs text-slate-400">{monthLabelOf(currentMonth())} · oyiga {BEHAVIOR_LIMIT} ball</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value, studentId: '' })} className={`${inputCls} min-w-0`}>
          <option value="">Barcha sinflar</option>
          {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className={`${inputCls} min-w-0`} required>
          <option value="">O&apos;quvchi ({sorted.length})</option>
          {sorted.map((s: any) => <option key={s.id} value={s.id}>{s.lastName} {s.firstName}</option>)}
        </select>
      </div>

      {form.studentId && (
        summary ? (
          <div className="rounded-lg bg-slate-50 px-3 py-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">{summary.monthLabel} bali</span>
              <span>
                <b className={`text-base ${scoreTone(summary.remaining)}`}>{summary.remaining}</b>
                <span className="text-xs text-slate-400">/{summary.limit}</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className={`h-full rounded-full ${scoreBar(summary.remaining)}`} style={{ width: `${(summary.remaining / summary.limit) * 100}%` }} />
            </div>
            {summary.deducted > 0 && (
              <div className="mt-1 text-xs text-slate-400">Bu oy ayirilgan: {summary.deducted} ball</div>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-400">Ball yuklanmoqda…</div>
        )
      )}

      <div>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Ayiriladigan ball</span>
        <div className="flex flex-wrap items-center gap-2">
          {QUICK.map((n) => (
            <button
              key={n}
              type="button"
              disabled={!!summary && n > remaining}
              onClick={() => setForm({ ...form, points: String(n) })}
              className={`min-w-[3rem] rounded-lg px-3 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 sm:py-2 ${
                form.points === String(n) ? 'bg-red-600 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              −{n}
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={summary ? Math.max(1, remaining) : BEHAVIOR_LIMIT}
            value={form.points}
            onChange={(e) => setForm({ ...form, points: e.target.value })}
            className="w-20 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-brand sm:py-2"
            aria-label="Ball"
          />
        </div>
        {exhausted && (
          <p className="mt-1.5 text-xs font-medium text-red-600">Bu oyda o&apos;quvchining bali 0 — boshqa ayirib bo&apos;lmaydi</p>
        )}
        {tooMuch && (
          <p className="mt-1.5 text-xs font-medium text-red-600">Bu oyda {remaining} ball qolgan — ko&apos;pi bilan {remaining} ayirish mumkin</p>
        )}
      </div>

      <textarea placeholder="Sabab (qoidabuzarlik)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputCls} h-20 resize-none`} required />
      <button type="submit" disabled={add.isPending || exhausted || tooMuch} className="w-full rounded-lg bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50 sm:py-2">
        {add.isPending ? 'Saqlanmoqda...' : `−${points || 0} ball ayirish`}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <Send size={12} /> Vasiyga Telegram orqali darhol xabar boradi
      </p>
    </form>
  );
}

function ClassRanking() {
  const [classId, setClassId] = useState('');
  const { classes } = useMyClasses();
  useEffect(() => {
    if (!classId && classes.length === 1) setClassId(classes[0].id);
  }, [classes, classId]);
  const { data: ranking, isLoading } = useQuery({
    queryKey: ['behavior-ranking', classId],
    queryFn: () => behaviorApi.classRanking(classId),
    enabled: !!classId,
  });

  const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold">Sinf reytingi</h2>
        <span className="text-xs text-slate-400">{monthLabelOf(currentMonth())}</span>
      </div>
      <select value={classId} onChange={(e) => setClassId(e.target.value)} className={`${inputCls} mb-3`}>
        <option value="">Sinf tanlang</option>
        {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      {!classId ? (
        <p className="text-sm text-slate-400">Reytingni ko&apos;rish uchun sinf tanlang</p>
      ) : (
        <div className="space-y-1">
          {ranking?.map((s: RankingItem, i: number) => (
            <div key={s.id} className="rounded-lg px-2 py-1.5 text-sm odd:bg-slate-50">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center">
                  <span className="mr-2 w-6 shrink-0 text-slate-400">{medal(i)}</span>
                  <span className="truncate">{s.lastName} {s.firstName}</span>
                </span>
                <span className="shrink-0">
                  <b className={scoreTone(s.remaining)}>{s.remaining}</b>
                  <span className="text-xs text-slate-400">/{BEHAVIOR_LIMIT}</span>
                </span>
              </div>
              <div className="ml-8 mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full rounded-full ${scoreBar(s.remaining)}`} style={{ width: `${(s.remaining / BEHAVIOR_LIMIT) * 100}%` }} />
              </div>
            </div>
          ))}
          {!ranking?.length && <p className="text-sm text-slate-400">{isLoading ? 'Yuklanmoqda…' : "O'quvchi yo'q"}</p>}
        </div>
      )}
    </div>
  );
}
