'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeftRight } from 'lucide-react';
import { financeApi, money } from '@/lib/finance';
import { ModalShell, inp, lbl, todayIso } from './flow-ui';

export interface TransferInitial {
  fromAccountId?: string;
  toAccountId?: string;
  amount?: number; // so'm
  description?: string;
}

const numFmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0));

export function TransferFormModal({
  initial,
  title = "Ichki o'tkazma",
  subtitle = "Kassalar orasida pul ko'chirish",
  onClose,
  onSaved,
}: {
  initial?: TransferInitial;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(todayIso());
  const [fromAccountId, setFrom] = useState(initial?.fromAccountId ?? '');
  const [toAccountId, setTo] = useState(initial?.toAccountId ?? '');
  const [som, setSom] = useState(initial?.amount ? String(initial.amount) : '');
  const [usd, setUsd] = useState('');
  const [rate, setRate] = useState('');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [error, setError] = useState('');

  const { data: accounts } = useQuery({ queryKey: ['fin-accounts'], queryFn: financeApi.accounts });
  const fromAcc = accounts?.find((a) => a.id === fromAccountId);
  const toAcc = accounts?.find((a) => a.id === toAccountId);

  const somN = Number(som) || 0;
  const usdN = Number(usd) || 0;
  const rateN = Number(rate) || 0;
  const usdSom = usdN * rateN; // dollar qismining so'mdagi ekvivalenti
  const total = somN + usdSom; // umumiy summa (so'm)

  const save = useMutation({
    mutationFn: () => {
      const detail = usdN > 0 ? `$${numFmt(usdN)} × ${numFmt(rateN)}` : '';
      const note = [description.trim(), detail ? `[${detail}]` : ''].filter(Boolean).join(' ');
      return financeApi.transfer({
        fromAccountId,
        toAccountId,
        amount: total,
        date: `${date}T${new Date().toTimeString().slice(0, 8)}`,
        description: note || undefined,
      });
    },
    onSuccess: onSaved,
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik yuz berdi'),
  });

  const submit = () => {
    setError('');
    if (!fromAccountId) return setError('Yuboruvchi hisobni tanlang');
    if (!toAccountId) return setError('Qabul qiluvchi hisobni tanlang');
    if (fromAccountId === toAccountId) return setError('Bir xil hisob tanlandi');
    if (usdN > 0 && rateN <= 0) return setError('Dollar kursini kiriting');
    if (total < 1) return setError("Summa noto'g'ri");
    if (fromAcc && fromAcc.balance < total) return setError("Yuboruvchi hisobda mablag' yetarli emas");
    save.mutate();
  };

  return (
    <ModalShell
      title={title}
      subtitle={subtitle}
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
        {/* 1. Sana */}
        <div>
          <label className={lbl}>
            Sana <span className="text-rose-500">*</span>
          </label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
        </div>

        {/* 2. Yuboruvchi hisob */}
        <div>
          <label className={lbl}>
            Yuboruvchi hisob <span className="text-rose-500">*</span>
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

        {/* 3. Summa: So'm + Dollar (+ kurs) */}
        <div>
          <label className={lbl}>
            Summa <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <input
                type="number"
                min={0}
                value={som}
                onChange={(e) => setSom(e.target.value)}
                placeholder="So'm"
                className={`${inp} pr-12`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">so&apos;m</span>
            </div>
            <div className="relative">
              <input
                type="number"
                min={0}
                value={usd}
                onChange={(e) => setUsd(e.target.value)}
                placeholder="Dollar"
                className={`${inp} pr-8`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
            </div>
          </div>

          {/* Dollar kiritilsa — kurs maydoni */}
          {usdN > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="Dollar kursi"
                  className={`${inp} pr-12`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">so&apos;m</span>
              </div>
              <div className="flex items-center px-1 text-sm text-slate-500">
                ≈ {money(usdSom)}
              </div>
            </div>
          )}

          {somN > 0 && usdN > 0 && (
            <div className="mt-1.5 text-xs text-slate-400">
              Jami: <span className="font-semibold text-slate-600">{money(total)}</span>
            </div>
          )}
        </div>

        {/* 4. Qabul qiluvchi hisob */}
        <div>
          <label className={lbl}>
            Qabul qiluvchi hisob <span className="text-rose-500">*</span>
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

        {/* 5. Izoh */}
        <div>
          <label className={lbl}>Izoh</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ixtiyoriy — masalan 'Bankka inkassatsiya'"
            className={inp}
          />
        </div>

        {/* Yozuvdan keyingi qoldiq */}
        {fromAcc && toAcc && total > 0 && (
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
            <div>
              <div className="text-xs text-slate-400">{fromAcc.name}</div>
              <div className={`font-semibold ${fromAcc.balance - total < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                {money(fromAcc.balance - total)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">{toAcc.name}</div>
              <div className="font-semibold text-emerald-600">{money(toAcc.balance + total)}</div>
            </div>
          </div>
        )}

        {error && <p className="text-sm font-medium text-rose-500">{error}</p>}
      </div>
    </ModalShell>
  );
}
