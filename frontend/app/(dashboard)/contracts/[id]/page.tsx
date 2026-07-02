'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contractsApi, money, type Installment } from '@/lib/contracts';

const INST_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Kutilmoqda', cls: 'bg-slate-100 text-slate-600' },
  PARTIAL: { label: 'Qisman', cls: 'bg-amber-100 text-amber-700' },
  PAID: { label: "To'langan", cls: 'bg-green-100 text-green-700' },
  OVERDUE: { label: "Muddati o'tgan", cls: 'bg-red-100 text-red-700' },
};

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: c } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => contractsApi.get(id),
  });

  if (!c) return <div className="p-8">Yuklanmoqda...</div>;

  const total = c.installments.reduce((s: number, i: Installment) => s + i.amount, 0);
  const paid = c.installments.reduce(
    (s: number, i: Installment) => s + i.paidAmount,
    0,
  );

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Shartnoma {c.number}</h1>
          <p className="text-sm text-slate-500">
            {c.student.lastName} {c.student.firstName} · Oylik:{' '}
            {money(c.monthlyAmount)}
            {c.discount &&
              ` · Chegirma: ${c.discount.type === 'PERCENT' ? `${c.discount.value}%` : money(c.discount.value)}`}
          </p>
        </div>
        <button
          onClick={() => contractsApi.openPdf(id, c.number)}
          className="rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark"
        >
          📄 PDF yuklab olish
        </button>
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <SummaryCard label="Jami" value={money(total)} />
        <SummaryCard label="To'langan" value={money(paid)} color="text-green-600" />
        <SummaryCard label="Qarz" value={money(total - paid)} color="text-red-600" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Oyma-oy jadval */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold">To&apos;lov jadvali</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2">№</th>
                  <th className="px-4 py-2">Sana</th>
                  <th className="px-4 py-2 text-right">Summa</th>
                  <th className="px-4 py-2 text-right">To&apos;langan</th>
                  <th className="px-4 py-2">Holat</th>
                </tr>
              </thead>
              <tbody>
                {c.installments.map((i: Installment, idx: number) => (
                  <tr key={i.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">{idx + 1}</td>
                    <td className="px-4 py-2">
                      {new Date(i.dueDate).toLocaleDateString('uz-UZ')}
                    </td>
                    <td className="px-4 py-2 text-right">{money(i.amount)}</td>
                    <td className="px-4 py-2 text-right">{money(i.paidAmount)}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${INST_STATUS[i.status].cls}`}>
                        {INST_STATUS[i.status].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* To'lov qabul qilish + tarix */}
        <div>
          <h2 className="mb-3 text-lg font-semibold">To&apos;lov qabul qilish</h2>
          <PaymentForm
            contractId={id}
            onPaid={() => qc.invalidateQueries({ queryKey: ['contract', id] })}
          />

          <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-600">
            To&apos;lov tarixi
          </h3>
          <div className="space-y-2">
            {c.payments?.map((p: any) => (
              <div
                key={p.id}
                className="flex justify-between rounded-lg bg-white p-2 text-sm shadow-sm"
              >
                <span>
                  {money(p.amount)}{' '}
                  <span className="text-xs text-slate-400">({p.method})</span>
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(p.paidAt).toLocaleDateString('uz-UZ')}
                </span>
              </div>
            ))}
            {!c.payments?.length && (
              <p className="text-sm text-slate-400">Hali to&apos;lov yo&apos;q</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-bold ${color ?? ''}`}>{value}</div>
    </div>
  );
}

function PaymentForm({
  contractId,
  onPaid,
}: {
  contractId: string;
  onPaid: () => void;
}) {
  const [form, setForm] = useState({ amount: '', method: 'naqd', note: '' });

  const pay = useMutation({
    mutationFn: () =>
      contractsApi.addPayment(contractId, {
        amount: Number(form.amount),
        method: form.method,
        note: form.note || undefined,
      }),
    onSuccess: () => {
      setForm({ amount: '', method: 'naqd', note: '' });
      onPaid();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        pay.mutate();
      }}
      className="space-y-2 rounded-xl border border-slate-200 bg-white p-4"
    >
      <input
        type="number"
        placeholder="Summa (so'm)"
        value={form.amount}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
        required
      />
      <select
        value={form.method}
        onChange={(e) => setForm({ ...form, method: e.target.value })}
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
      >
        <option value="naqd">Naqd</option>
        <option value="plastik">Plastik karta</option>
        <option value="click">Click</option>
        <option value="payme">Payme</option>
      </select>
      <input
        placeholder="Izoh (ixtiyoriy)"
        value={form.note}
        onChange={(e) => setForm({ ...form, note: e.target.value })}
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
      />
      <button
        type="submit"
        disabled={pay.isPending}
        className="w-full rounded-lg bg-brand py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pay.isPending ? 'Saqlanmoqda...' : "To'lovni saqlash"}
      </button>
    </form>
  );
}
