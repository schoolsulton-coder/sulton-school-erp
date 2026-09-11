'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Coins, Minus, Plus, Trash2 } from 'lucide-react';
import { coinsApi, type CoinRecord } from '@/lib/coins';
import { studentsApi } from '@/lib/students';
import { useMyClasses } from '@/lib/use-my-classes';

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand';
const selCls = 'rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand';

export default function CoinsPage() {
  const qc = useQueryClient();
  const { classes } = useMyClasses();
  const [fClass, setFClass] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');

  // Bitta sinf biriktirilgan bo'lsa — avtomatik tanlanadi
  useEffect(() => {
    if (!fClass && classes.length === 1) setFClass(classes[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes]);

  const { data: records, isLoading } = useQuery({
    queryKey: ['coins', fClass, from, to],
    queryFn: () =>
      coinsApi.list({
        classId: fClass || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['coins'] });
    qc.invalidateQueries({ queryKey: ['coin-stats'] });
  };

  const del = useMutation({
    mutationFn: (id: string) => coinsApi.remove(id),
    onSuccess: () => { setError(''); refresh(); },
    onError: (e: any) => setError(e?.response?.data?.message ?? "O'chirib bo'lmadi"),
  });

  const total = useMemo(
    () => (records ?? []).reduce((s, r) => s + r.amount, 0),
    [records],
  );

  return (
    <div className="p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-100 text-amber-600">
            <Coins size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Coin</h1>
            <p className="text-sm text-slate-500">O&apos;quvchilarga rag&apos;bat ballari berish va ayirish</p>
          </div>
        </div>
        <Link
          href="/coins/statistics"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <BarChart3 size={16} /> Coin statistikasi
        </Link>
      </div>

      {error && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600">✕</button>
        </div>
      )}

      <AddCoin onAdded={refresh} onError={setError} />

      {/* Filtrlar */}
      <div className="mb-4 mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5">
        <select value={fClass} onChange={(e) => setFClass(e.target.value)} className={selCls}>
          <option value="">Barcha sinflar</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="text-sm text-slate-400">Sana:</span>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selCls} />
        <span className="text-slate-400">—</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selCls} />
        {(fClass || from || to) && (
          <button
            onClick={() => { setFClass(''); setFrom(''); setTo(''); }}
            className="px-2 py-1 text-sm text-slate-500 hover:text-slate-700"
          >
            Tozalash
          </button>
        )}
        <span className="ml-auto text-sm text-slate-500">
          Jami: <b className={total >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{total > 0 ? `+${total}` : total}</b> coin
        </span>
      </div>

      {/* Ro'yxat */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {(records ?? []).map((r: CoinRecord) => (
          <div key={r.id} className="group flex items-center gap-3 border-b border-slate-50 px-4 py-3 last:border-0">
            <span
              className={`w-16 shrink-0 rounded-lg px-2 py-1 text-center text-sm font-bold ${
                r.amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {r.amount > 0 ? `+${r.amount}` : r.amount}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-800">
                  {r.student.lastName} {r.student.firstName}
                </span>
                {r.student.class?.name && (
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{r.student.class.name}</span>
                )}
              </div>
              <p className="truncate text-sm text-slate-600">{r.reason}</p>
              <p className="text-xs text-slate-400">
                {new Date(r.date).toLocaleString('uz-UZ')}
                {r.author?.fullName ? ` · ${r.author.fullName}` : ''}
              </p>
            </div>
            <button
              onClick={() => { if (confirm("Coin yozuvi o'chirilsinmi?")) del.mutate(r.id); }}
              disabled={del.isPending}
              title="O'chirish"
              className="rounded p-1.5 text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {!records?.length && (
          <p className="py-10 text-center text-slate-400">
            {isLoading
              ? 'Yuklanmoqda…'
              : !classes.length
                ? "Sizga sinf biriktirilmagan — Ma'lumotlar → Sinflar bo'limida biriktirilishi kerak"
                : 'Coin yozuvi yo‘q'}
          </p>
        )}
      </div>
    </div>
  );
}

function AddCoin({ onAdded, onError }: { onAdded: () => void; onError: (m: string) => void }) {
  const { classes } = useMyClasses();
  const [form, setForm] = useState({ classId: '', studentId: '', amount: '5', reason: '' });
  const [sign, setSign] = useState<1 | -1>(1);

  useEffect(() => {
    if (classes.length === 1) setForm((f) => (f.classId ? f : { ...f, classId: classes[0].id }));
  }, [classes]);

  const { data: students } = useQuery({
    queryKey: ['coin-students', form.classId],
    queryFn: () =>
      studentsApi.list({ classId: form.classId || undefined, status: 'ACTIVE', limit: 500 }).then((r) => r.data),
    enabled: !!form.classId,
  });
  const sorted = useMemo(
    () => [...(students ?? [])].sort((a: any, b: any) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`)),
    [students],
  );

  const add = useMutation({
    mutationFn: () =>
      coinsApi.create({
        studentId: form.studentId,
        amount: sign * (Number(form.amount) || 0),
        reason: form.reason,
      }),
    onSuccess: () => {
      setForm((f) => ({ ...f, studentId: '', reason: '' }));
      onAdded();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      onError(Array.isArray(msg) ? msg.join(', ') : msg || 'Xatolik');
    },
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Yangi yozuv</div>
      <div className="grid gap-3 md:grid-cols-5">
        <select
          value={form.classId}
          onChange={(e) => setForm({ ...form, classId: e.target.value, studentId: '' })}
          className={inputCls}
        >
          <option value="">Sinf</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          value={form.studentId}
          onChange={(e) => setForm({ ...form, studentId: e.target.value })}
          disabled={!form.classId}
          className={`${inputCls} disabled:bg-slate-50 disabled:text-slate-400`}
        >
          <option value="">{form.classId ? `O'quvchi (${sorted.length})` : 'Avval sinf'}</option>
          {sorted.map((s: any) => (
            <option key={s.id} value={s.id}>{s.lastName} {s.firstName}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-slate-300">
            <button
              type="button"
              onClick={() => setSign(1)}
              title="Qo'shish"
              className={`px-2.5 py-2 ${sign === 1 ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Plus size={15} />
            </button>
            <button
              type="button"
              onClick={() => setSign(-1)}
              title="Ayirish"
              className={`px-2.5 py-2 ${sign === -1 ? 'bg-rose-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Minus size={15} />
            </button>
          </div>
          <input
            type="number"
            min={1}
            max={1000}
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className={inputCls}
            placeholder="Coin"
          />
        </div>

        <input
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          className={`${inputCls} md:col-span-1`}
          placeholder="Sabab (masalan: darsda faol qatnashdi)"
        />

        <button
          onClick={() => {
            if (!form.studentId) return onError("O'quvchini tanlang");
            if (!form.reason.trim()) return onError('Sababni yozing');
            add.mutate();
          }}
          disabled={add.isPending}
          className={`rounded-lg px-4 py-2 font-semibold text-white disabled:opacity-60 ${
            sign === 1 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
          }`}
        >
          {add.isPending ? 'Saqlanmoqda...' : sign === 1 ? 'Coin qo‘shish' : 'Coin ayirish'}
        </button>
      </div>
    </div>
  );
}
