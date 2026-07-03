'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { contractsApi, money, type ContractListItem } from '@/lib/contracts';

export default function DebtorsPage() {
  const { data } = useQuery({ queryKey: ['contracts'], queryFn: () => contractsApi.list() });
  const debtors = (data ?? []).filter((c) => c.debt > 0);
  const totalDebt = debtors.reduce((s, c) => s + c.debt, 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Qarzdorlar</h1>
        <p className="text-sm text-slate-500">
          {debtors.length} ta shartnoma · Umumiy qarz: <b className="text-red-600">{money(totalDebt)}</b>
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Shartnoma</th>
              <th className="px-4 py-3">O&apos;quvchi</th>
              <th className="px-4 py-3 text-right">Jami</th>
              <th className="px-4 py-3 text-right">To&apos;langan</th>
              <th className="px-4 py-3 text-right">Qarz</th>
              <th className="px-4 py-3 text-center">Muddati o&apos;tgan</th>
            </tr>
          </thead>
          <tbody>
            {debtors.map((c: ContractListItem) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link href={`/contracts/${c.id}`} className="font-medium text-brand">{c.number}</Link>
                </td>
                <td className="px-4 py-2">{c.student.lastName} {c.student.firstName}</td>
                <td className="px-4 py-2 text-right">{money(c.total)}</td>
                <td className="px-4 py-2 text-right text-green-600">{money(c.paid)}</td>
                <td className="px-4 py-2 text-right font-semibold text-red-600">{money(c.debt)}</td>
                <td className="px-4 py-2 text-center">
                  {c.overdueCount > 0 ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">{c.overdueCount}</span> : '—'}
                </td>
              </tr>
            ))}
            {!debtors.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Qarzdor yo&apos;q 🎉</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
