'use client';

import { useQuery } from '@tanstack/react-query';
import { financeApi, money } from '@/lib/finance';

export default function CashflowPage() {
  const { data: cf } = useQuery({ queryKey: ['finance-cashflow'], queryFn: () => financeApi.cashFlow() });
  const { data: sum } = useQuery({ queryKey: ['finance-summary'], queryFn: financeApi.summary });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tashqi pul oqimi</h1>
        <p className="text-sm text-slate-500">Kirim va chiqim (joriy oy)</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card label="Umumiy balans" value={money(sum?.totalBalance ?? 0)} />
        <Card label="Jami kirim" value={money(cf?.totalIncome ?? 0)} color="text-green-600" />
        <Card label="Jami chiqim" value={money(cf?.expense ?? 0)} color="text-red-600" />
        <Card label="Sof oqim" value={money(cf?.net ?? 0)} color={(cf?.net ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Kirim tarkibi</h2>
          <Row label="🎓 Shartnoma to'lovlari" value={cf?.income.contract ?? 0} positive />
          <Row label="Boshqa kirim" value={cf?.income.other ?? 0} positive />
          <Row label="Investitsiya" value={cf?.income.investment ?? 0} positive />
          <div className="my-2 border-t border-slate-100" />
          <Row label="Jami kirim" value={cf?.totalIncome ?? 0} positive bold />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Xarajatlar (kategoriya)</h2>
          {cf && Object.keys(cf.expenseByCategory).length
            ? Object.entries(cf.expenseByCategory).map(([n, v]) => <Row key={n} label={n} value={v} />)
            : <p className="text-sm text-slate-400">Bu oyda xarajat yo&apos;q</p>}
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: string; color?: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">{label}</div><div className={`mt-1 text-lg font-bold ${color ?? ''}`}>{value}</div></div>;
}
function Row({ label, value, positive, bold }: { label: string; value: number; positive?: boolean; bold?: boolean }) {
  return <div className={`flex justify-between py-1 text-sm ${bold ? 'font-semibold' : ''}`}><span>{label}</span><span className={positive ? 'text-green-600' : 'text-red-600'}>{money(value)}</span></div>;
}
