'use client';

import { useQuery } from '@tanstack/react-query';
import { contractsApi, money, type PaymentRow } from '@/lib/contracts';

export default function PaymentsPage() {
  const { data } = useQuery({ queryKey: ['all-payments'], queryFn: contractsApi.recentPayments });
  const total = (data ?? []).reduce((s, p) => s + p.amount, 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">To&apos;lovlar</h1>
        <p className="text-sm text-slate-500">Jami qabul qilingan: <b className="text-green-600">{money(total)}</b></p>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Sana</th>
              <th className="px-4 py-3">O&apos;quvchi</th>
              <th className="px-4 py-3">Shartnoma</th>
              <th className="px-4 py-3">Usul</th>
              <th className="px-4 py-3 text-right">Summa</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((p: PaymentRow) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-500">{new Date(p.paidAt).toLocaleDateString('uz-UZ')}</td>
                <td className="px-4 py-2">{p.student ? `${p.student.lastName} ${p.student.firstName}` : '—'}</td>
                <td className="px-4 py-2 text-brand">{p.contract?.number ?? '—'}</td>
                <td className="px-4 py-2">{p.method}</td>
                <td className="px-4 py-2 text-right font-medium text-green-600">{money(p.amount)}</td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">To&apos;lov yo&apos;q</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
