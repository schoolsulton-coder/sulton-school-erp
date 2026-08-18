'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, ArrowDown } from 'lucide-react';
import { financeApi, money } from '@/lib/finance';
import { ModalShell, inp, lbl, todayIso } from './flow-ui';

export interface TransferInitial {
  fromAccountId?: string;
  toAccountId?: string;
  amount?: number;
  description?: string;
}

export function TransferFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: TransferInitial;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fromAccountId, setFrom] = useState(initial?.fromAccountId ?? '');
  const [toAccountId, setTo] = useState(initial?.toAccountId ?? '');
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : '');
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState(initial?.description ?? '');
  const [error, setError] = useState('');

  const { data: accounts } = useQuery({ queryKey: ['fin-accounts'], queryFn: financeApi.accounts });
  const fromAcc = accounts?.find((a) => a.id === fromAccountId);
  const toAcc = accounts?.find((a) => a.id === toAccountId);
  const sum = Number(amount) || 0;

  const save = useMutation({
    mutationFn: () =>
      financeApi.transfer({
        fromAccountId,
        toAccountId,
        amount: sum,
        date: `${date}T${new Date().toTimeString().slice(0, 8)}`,
        description: description || undefined,
      }),
    onSuccess: onSaved,
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik yuz berdi'),
  });

  const submit = () => {
    setError('');
    if (!fromAccountId) return setError('Yuboruvchi kassani tanlang');
    if (!toAccountId) return setError('Qabul qiluvchi kassani tanlang');
    if (fromAccountId === toAccountId) return setError('Bir xil kassa tanlandi');
    if (sum < 1) return setError("Summa noto'g'ri");
    if (fromAcc && fromAcc.balance < sum) return setError("Yuboruvchi kassada mablag' yetarli emas");
    save.mutate();
  };

  const swap = () => {
    setFrom(toAccountId);
    setTo(fromAccountId);
  };

  return (
    <ModalShell
      title="Ichki o'tkazma"
      subtitle="Kassalar orasida pul ko'chirish"
      icon={ArrowLeftRight}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
            Bekor
          </button>
          <button
            onClick={submit}
            disabled={save.isPending}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {save.isPending ? 'Saqlanmoqda...' : "Qo'shish"}
          </button>
        </>
      }
    >
      <div className="space-y-4 px-6 py-5">
        <div>
          <label className={lbl}>
            Qaysi kassadan <span className="text-rose-500">*</span>
          </label>
          <select value={fromAccountId} onChange={(e) => setFrom(e.target.value)} className={inp}>
            <option value="">Tanlang...</option>
            {accounts?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {money(a.balance)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={swap}
            title="Almashtirish"
            className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-brand hover:text-brand"
          >
            <ArrowDown size={16} />
          </button>
        </div>

        <div>
          <label className={lbl}>
            Qaysi kassaga <span className="text-rose-500">*</span>
          </label>
          <select value={toAccountId} onChange={(e) => setTo(e.target.value)} className={inp}>
            <option value="">Tanlang...</option>
            {accounts
              ?.filter((a) => a.id !== fromAccountId)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {money(a.balance)}
                </option>
              ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl}>
              Summa <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>
              Sana <span className="text-rose-500">*</span>
            </label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
          </div>
        </div>

        <div>
          <label className={lbl}>Izoh</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ixtiyoriy — masalan 'Bankka inkassatsiya'"
            className={inp}
          />
        </div>

        {/* O'tkazmadan keyingi qoldiq */}
        {fromAcc && toAcc && sum > 0 && (
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
            <div>
              <div className="text-xs text-slate-400">{fromAcc.name}</div>
              <div className={`font-semibold ${fromAcc.balance - sum < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                {money(fromAcc.balance - sum)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">{toAcc.name}</div>
              <div className="font-semibold text-emerald-600">{money(toAcc.balance + sum)}</div>
            </div>
          </div>
        )}

        {error && <p className="text-sm font-medium text-rose-500">{error}</p>}
      </div>
    </ModalShell>
  );
}
