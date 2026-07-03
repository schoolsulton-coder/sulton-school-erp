'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { financeApi, money } from '@/lib/finance';
import { crmApi } from '@/lib/crm';
import { classesApi } from '@/lib/classes';

export default function ReportsPage() {
  const can = useAuthStore((s) => s.can);
  const { data: fin } = useQuery({ queryKey: ['finance-summary'], queryFn: financeApi.summary, enabled: can('finance.view') });
  const { data: crm } = useQuery({ queryKey: ['crm-stats'], queryFn: crmApi.stats, enabled: can('crm.view') });
  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => classesApi.list(), enabled: can('classes.view') });

  const students = (classes ?? []).reduce((s, c) => s + c.studentCount, 0);
  const maxFunnel = Math.max(...(crm?.funnel.map((f) => f.count) ?? [1]), 1);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Hisobotlar</h1>
        <p className="text-sm text-slate-500">Umumiy ko&apos;rsatkichlar</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {can('finance.view') && <Stat label="Umumiy balans" value={money(fin?.totalBalance ?? 0)} />}
        {can('finance.view') && <Stat label="Oylik sof oqim" value={money(fin?.month.net ?? 0)} color={(fin?.month.net ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'} />}
        {can('crm.view') && <Stat label="Lead / konversiya" value={`${crm?.total ?? 0} · ${crm?.conversionRate ?? 0}%`} />}
        {can('classes.view') && <Stat label="Sinf / o'quvchi" value={`${classes?.length ?? 0} · ${students}`} />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {can('crm.view') && (
          <Panel title="Qabul funneli">
            {crm?.funnel.map((f) => (
              <div key={f.stage}>
                <div className="flex justify-between text-sm"><span>{f.stage}</span><span className="font-medium">{f.count}</span></div>
                <div className="mt-1 h-2 w-full rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand" style={{ width: `${(f.count / maxFunnel) * 100}%` }} /></div>
              </div>
            ))}
          </Panel>
        )}
        {can('finance.view') && (
          <Panel title="Moliya (joriy oy)">
            <Row label="Kirim" value={fin?.month.income ?? 0} positive />
            <Row label="Chiqim" value={fin?.month.expense ?? 0} />
            <div className="my-1 border-t border-slate-100" />
            <Row label="Sof" value={fin?.month.net ?? 0} positive={(fin?.month.net ?? 0) >= 0} bold />
          </Panel>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">{label}</div><div className={`mt-1 text-xl font-bold ${color ?? 'text-brand'}`}>{value}</div></div>;
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="mb-3 font-semibold">{title}</h2><div className="space-y-2">{children}</div></div>;
}
function Row({ label, value, positive, bold }: { label: string; value: number; positive?: boolean; bold?: boolean }) {
  return <div className={`flex justify-between py-1 text-sm ${bold ? 'font-semibold' : ''}`}><span>{label}</span><span className={positive ? 'text-green-600' : 'text-red-600'}>{money(value)}</span></div>;
}
