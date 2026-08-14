'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpDown, Plus } from 'lucide-react';
import { financeApi, money } from '@/lib/finance';
import { ModalShell, inp, lbl, todayIso } from './flow-ui';

export type TxType = 'INCOME' | 'EXPENSE' | 'INVESTMENT';

const TYPES: { key: TxType; label: string; active: string }[] = [
  { key: 'INCOME', label: 'Kirim', active: 'bg-emerald-500 text-white shadow-sm' },
  { key: 'EXPENSE', label: 'Chiqim', active: 'bg-rose-500 text-white shadow-sm' },
  { key: 'INVESTMENT', label: 'Investitsiya', active: 'bg-violet-500 text-white shadow-sm' },
];

export interface CashflowInitial {
  type?: TxType;
  accountId?: string;
  categoryId?: string;
  amount?: number;
  description?: string;
}

export function CashflowFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: CashflowInitial;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [type, setType] = useState<TxType>(initial?.type ?? 'INCOME');
  const [accountId, setAccountId] = useState(initial?.accountId ?? '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : '');
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState(initial?.description ?? '');
  const [error, setError] = useState('');
  const [newCat, setNewCat] = useState('');
  const [addingCat, setAddingCat] = useState(false);

  const { data: accounts } = useQuery({ queryKey: ['fin-accounts'], queryFn: financeApi.accounts });
  const { data: categories } = useQuery({
    queryKey: ['fin-cats', type],
    queryFn: () => financeApi.categories(type),
  });

  const acc = accounts?.find((a) => a.id === accountId);
  const sum = Number(amount) || 0;

  const createCategory = useMutation({
    mutationFn: () => financeApi.createCategory({ name: newCat.trim(), type }),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['fin-cats'] });
      setCategoryId(c.id);
      setNewCat('');
      setAddingCat(false);
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? "Kategoriya qo'shilmadi"),
  });

  const save = useMutation({
    mutationFn: () =>
      financeApi.createTransaction({
        type,
        accountId,
        categoryId: categoryId || undefined,
        amount: sum,
        date: `${date}T${new Date().toTimeString().slice(0, 8)}`,
        description: description || undefined,
      }),
    onSuccess: onSaved,
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik yuz berdi'),
  });

  const submit = () => {
    setError('');
    if (!accountId) return setError('Kassani tanlang');
    if (sum < 1) return setError("Summa noto'g'ri");
    save.mutate();
  };

  return (
    <ModalShell
      title="Yangi pul oqimi yozuvi"
      subtitle="Tashqi kirim, chiqim yoki investitsiya"
      icon={ArrowUpDown}
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
            {save.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </>
      }
    >
      <div className="space-y-4 px-6 py-5">
        {/* Tur */}
        <div>
          <label className={lbl}>Turi</label>
          <div className="inline-flex w-full rounded-xl bg-slate-100 p-1">
            {TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setType(t.key);
                  setCategoryId('');
                }}
                className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  type === t.key ? t.active : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl}>
              Kassa <span className="text-rose-500">*</span>
            </label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inp}>
              <option value="">Tanlang...</option>
              {accounts?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {money(a.balance)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={lbl}>Kategoriya</label>
            {addingCat ? (
              <div className="flex gap-1.5">
                <input
                  autoFocus
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  placeholder="Yangi kategoriya nomi"
                  className={inp}
                />
                <button
                  type="button"
                  onClick={() => newCat.trim() && createCategory.mutate()}
                  disabled={createCategory.isPending}
                  className="shrink-0 rounded-lg bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setAddingCat(false)}
                  className="shrink-0 rounded-lg px-2 text-sm text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inp}>
                  <option value="">Kategoriyasiz</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setAddingCat(true)}
                  title="Yangi kategoriya"
                  className="shrink-0 rounded-lg border border-slate-200 px-2.5 text-brand hover:bg-brand/5"
                >
                  <Plus size={16} />
                </button>
              </div>
            )}
          </div>

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
            placeholder="Ixtiyoriy — masalan 'Kanselyariya xaridi'"
            className={inp}
          />
        </div>

        {/* Yozuvdan keyingi qoldiq */}
        {acc && sum > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
            <span className="text-slate-500">
              {acc.name} — yozuvdan keyin
            </span>
            <span
              className={`font-semibold ${
                type === 'EXPENSE'
                  ? acc.balance - sum < 0
                    ? 'text-rose-600'
                    : 'text-slate-700'
                  : 'text-emerald-600'
              }`}
            >
              {money(type === 'EXPENSE' ? acc.balance - sum : acc.balance + sum)}
            </span>
          </div>
        )}

        {error && <p className="text-sm font-medium text-rose-500">{error}</p>}
      </div>
    </ModalShell>
  );
}
