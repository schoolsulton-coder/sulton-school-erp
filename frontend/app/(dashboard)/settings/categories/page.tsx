'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Tags, Plus } from 'lucide-react';
import { financeApi } from '@/lib/finance';

export default function ExpenseCategoriesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const { data: cats, isLoading } = useQuery({
    queryKey: ['fin-cats', 'EXPENSE'],
    queryFn: () => financeApi.categories('EXPENSE'),
  });
  const add = useMutation({
    mutationFn: () => financeApi.createCategory({ name: name.trim(), type: 'EXPENSE' }),
    onSuccess: () => { setName(''); qc.invalidateQueries({ queryKey: ['fin-cats', 'EXPENSE'] }); },
  });

  return (
    <div className="min-h-full bg-slate-50/60 p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand text-white shadow-sm"><Tags size={22} /></div>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            Xarajat kategoriyalari
            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-sm font-semibold text-slate-500">{cats?.length ?? 0}</span>
          </h1>
          <p className="text-sm text-slate-400">Xarajat qatorlari uchun kategoriyalar</p>
        </div>
      </div>

      <div className="mx-auto max-w-xl space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) add.mutate(); }} className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Yangi kategoriya nomi (masalan: Marketing xarajatlari)" className="flex-1 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20" />
          <button type="submit" disabled={add.isPending || !name.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
            <Plus size={16} /> Qo&apos;shish
          </button>
        </form>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Yuklanmoqda...</div>
          ) : cats?.length ? (
            <ul className="divide-y divide-slate-50">
              {cats.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand"><Tags size={15} /></span>
                  <span className="font-medium text-slate-700">{c.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-slate-400">Kategoriya yo&apos;q — yuqoridan qo&apos;shing</div>
          )}
        </div>
      </div>
    </div>
  );
}
