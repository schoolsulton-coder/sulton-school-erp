'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contractsApi, money, type ContractListItem } from '@/lib/contracts';
import { api } from '@/lib/api';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Qoralama',
  ACTIVE: 'Faol',
  COMPLETED: 'Yakunlangan',
  CANCELLED: 'Bekor qilingan',
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  ACTIVE: 'bg-blue-100 text-brand',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function ContractsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => contractsApi.list(),
  });

  if (isLoading) return <div className="p-8">Yuklanmoqda...</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shartnomalar</h1>
          <p className="text-sm text-slate-500">To&apos;lov jadvali va qarzdorlik</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark"
        >
          + Yangi shartnoma
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">№</th>
              <th className="px-4 py-3">O&apos;quvchi</th>
              <th className="px-4 py-3">Holat</th>
              <th className="px-4 py-3 text-right">Jami</th>
              <th className="px-4 py-3 text-right">To&apos;langan</th>
              <th className="px-4 py-3 text-right">Qarz</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((c: ContractListItem) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/contracts/${c.id}`} className="font-medium text-brand">
                    {c.number}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {c.student.lastName} {c.student.firstName}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[c.status]}`}>
                    {STATUS_LABEL[c.status]}
                  </span>
                  {c.overdueCount > 0 && (
                    <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                      {c.overdueCount} muddati o&apos;tgan
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">{money(c.total)}</td>
                <td className="px-4 py-3 text-right text-green-600">{money(c.paid)}</td>
                <td className="px-4 py-3 text-right font-medium text-red-600">
                  {money(c.debt)}
                </td>
              </tr>
            ))}
            {!data?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Hali shartnoma yo&apos;q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <NewContractModal
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ['contracts'] });
          }}
        />
      )}
    </div>
  );
}

function NewContractModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    studentId: '',
    startDate: '',
    months: '9',
    monthlyAmount: '',
    discountId: '',
    dueDay: '5',
  });

  const { data: students } = useQuery({
    queryKey: ['students-mini'],
    queryFn: () => api.get('/students', { params: { limit: 100 } }).then((r) => r.data.data),
  });
  const { data: discounts } = useQuery({
    queryKey: ['discounts'],
    queryFn: contractsApi.discounts,
  });

  const create = useMutation({
    mutationFn: () =>
      contractsApi.create({
        studentId: form.studentId,
        startDate: form.startDate,
        months: Number(form.months),
        monthlyAmount: Number(form.monthlyAmount),
        discountId: form.discountId || undefined,
        dueDay: Number(form.dueDay),
      }),
    onSuccess: onCreated,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
        className="w-full max-w-md space-y-3 rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold">Yangi shartnoma</h2>

        <select
          value={form.studentId}
          onChange={(e) => setForm({ ...form, studentId: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          required
        >
          <option value="">O&apos;quvchini tanlang</option>
          {students?.map((s: any) => (
            <option key={s.id} value={s.id}>
              {s.lastName} {s.firstName}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            className="w-1/2 rounded-lg border border-slate-300 px-3 py-2"
            required
          />
          <input
            type="number"
            min={1}
            max={24}
            placeholder="Oy soni"
            value={form.months}
            onChange={(e) => setForm({ ...form, months: e.target.value })}
            className="w-1/2 rounded-lg border border-slate-300 px-3 py-2"
            required
          />
        </div>

        <input
          type="number"
          placeholder="Oylik to'lov (so'm)"
          value={form.monthlyAmount}
          onChange={(e) => setForm({ ...form, monthlyAmount: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          required
        />

        <div className="flex gap-2">
          <select
            value={form.discountId}
            onChange={(e) => setForm({ ...form, discountId: e.target.value })}
            className="w-2/3 rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">Chegirmasiz</option>
            {discounts?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.type === 'PERCENT' ? `${d.value}%` : money(d.value)})
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={28}
            placeholder="To'lov kuni"
            value={form.dueDay}
            onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
            className="w-1/3 rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 py-2"
          >
            Bekor
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className="flex-1 rounded-lg bg-brand py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {create.isPending ? 'Yaratilmoqda...' : 'Yaratish'}
          </button>
        </div>
      </form>
    </div>
  );
}
