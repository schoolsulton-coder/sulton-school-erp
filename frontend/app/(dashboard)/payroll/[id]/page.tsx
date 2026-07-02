'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { payrollApi, PAYROLL_STATUS, type PayrollItem } from '@/lib/payroll';
import { money } from '@/lib/finance';

export default function PayrollRunPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['payroll-run', id] });

  const { data: run } = useQuery({ queryKey: ['payroll-run', id], queryFn: () => payrollApi.getRun(id) });

  const approve = useMutation({ mutationFn: () => payrollApi.approve(id), onSuccess: refresh });
  const pay = useMutation({ mutationFn: () => payrollApi.pay(id), onSuccess: refresh });

  if (!run) return <div className="p-8">Yuklanmoqda...</div>;

  const editable = run.status === 'DRAFT';

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Oylik · {run.period}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <span className={`rounded-full px-2 py-0.5 text-xs ${PAYROLL_STATUS[run.status].cls}`}>
              {PAYROLL_STATUS[run.status].label}
            </span>
            <span className="text-slate-500">Jami: <b>{money(run.totalSum)}</b></span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => payrollApi.openVedomost(id, run.period)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">
            📄 Vedomost
          </button>
          {run.status === 'DRAFT' && (
            <button onClick={() => approve.mutate()} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
              Tasdiqlash
            </button>
          )}
          {run.status === 'APPROVED' && (
            <button onClick={() => pay.mutate()} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
              To&apos;langan deb belgilash
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">F.I.SH</th>
              <th className="px-4 py-2 text-right">Asosiy</th>
              <th className="px-4 py-2 text-right">Bonus</th>
              <th className="px-4 py-2 text-right">Jarima</th>
              <th className="px-4 py-2 text-right">Jami</th>
            </tr>
          </thead>
          <tbody>
            {run.items.map((item: PayrollItem) => (
              <ItemRow key={item.id} item={item} editable={editable} onSaved={refresh} />
            ))}
          </tbody>
        </table>
      </div>
      {editable && (
        <p className="mt-2 text-xs text-slate-400">
          Bonus/jarima qiymatini o&apos;zgartirib, qatordagi “Saqlash” tugmasini bosing. Tasdiqlangach o&apos;zgartirib bo&apos;lmaydi.
        </p>
      )}
    </div>
  );
}

function ItemRow({
  item,
  editable,
  onSaved,
}: {
  item: PayrollItem;
  editable: boolean;
  onSaved: () => void;
}) {
  const [bonus, setBonus] = useState(String(item.bonus));
  const [penalty, setPenalty] = useState(String(item.penalty));
  const dirty = Number(bonus) !== item.bonus || Number(penalty) !== item.penalty;

  const save = useMutation({
    mutationFn: () => payrollApi.updateItem(item.id, { bonus: Number(bonus), penalty: Number(penalty) }),
    onSuccess: onSaved,
  });

  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-2">
        {item.employee.user.fullName}
        {item.employee.position && <span className="ml-1 text-xs text-slate-400">({item.employee.position.name})</span>}
      </td>
      <td className="px-4 py-2 text-right">{money(item.base)}</td>
      <td className="px-4 py-2 text-right">
        {editable ? (
          <input type="number" value={bonus} onChange={(e) => setBonus(e.target.value)} className="w-24 rounded border border-slate-200 px-2 py-1 text-right" />
        ) : (
          money(item.bonus)
        )}
      </td>
      <td className="px-4 py-2 text-right">
        {editable ? (
          <input type="number" value={penalty} onChange={(e) => setPenalty(e.target.value)} className="w-24 rounded border border-slate-200 px-2 py-1 text-right" />
        ) : (
          money(item.penalty)
        )}
      </td>
      <td className="px-4 py-2 text-right font-medium">
        {editable && dirty ? (
          <button onClick={() => save.mutate()} className="rounded bg-brand px-2 py-1 text-xs text-white">Saqlash</button>
        ) : (
          money(item.total)
        )}
      </td>
    </tr>
  );
}
