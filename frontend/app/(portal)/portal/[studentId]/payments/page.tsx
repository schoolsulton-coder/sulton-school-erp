'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Receipt } from 'lucide-react';
import { fmtDate, money, portalApi, TONE } from '@/lib/portal';
import { Badge, Card, Empty, PageTitle, Skeleton, Stat } from '@/components/portal/ui';

const INST: Record<string, { label: string; tone: 'emerald' | 'amber' | 'rose' | 'slate' }> = {
  PAID: { label: "To'langan", tone: 'emerald' },
  PARTIAL: { label: 'Qisman', tone: 'amber' },
  OVERDUE: { label: "Muddati o'tgan", tone: 'rose' },
  PENDING: { label: 'Kutilmoqda', tone: 'slate' },
};

export default function PortalPaymentsPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['portal-payments', studentId],
    queryFn: () => portalApi.payments(studentId),
  });

  if (isLoading && !data) return <Skeleton rows={3} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <PageTitle title="To'lovlar" sub="Shartnoma bo'yicha oylik to'lovlar va tarix" />

      <Card>
        <div className="grid grid-cols-2 gap-2">
          <Stat value={money(data.debt)} label="Jami qoldiq" tone={data.debt ? 'slate' : 'emerald'} />
          <Stat value={money(data.overdue)} label="Muddati o'tgan" tone={data.overdue ? 'rose' : 'emerald'} />
        </div>
        {data.next ? (
          <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-center text-sm text-slate-600">
            Keyingi to&apos;lov: <b className="text-slate-800">{fmtDate(data.next.dueDate)}</b> · {money(data.next.amount)}
          </p>
        ) : (
          !data.debt && <p className="mt-3 text-center text-sm text-emerald-600">Qarzdorlik yo&apos;q ✅</p>
        )}
      </Card>

      {data.contracts.map((c) => (
        <Card key={c.id} title={`Shartnoma ${c.number}`} icon={CreditCard} tone="slate">
          <div className="space-y-1.5">
            {c.installments.map((i) => {
              const st = i.remaining <= 0 ? INST.PAID : i.overdue ? INST.OVERDUE : i.paidAmount > 0 ? INST.PARTIAL : INST.PENDING;
              return (
                <div key={i.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800">{fmtDate(i.dueDate)}</div>
                    <div className="text-xs text-slate-400">
                      {money(i.amount)}
                      {i.paidAmount > 0 && i.remaining > 0 ? ` · to'langan ${money(i.paidAmount)}` : ''}
                    </div>
                  </div>
                  {i.remaining > 0 && <span className={`shrink-0 text-sm font-semibold ${TONE[st.tone].text}`}>{money(i.remaining)}</span>}
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      <Card title="To'lov tarixi" icon={Receipt} tone="emerald">
        {data.payments.length ? (
          <div className="space-y-1.5">
            {data.payments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-800">{money(p.amount)}</div>
                  <div className="text-xs text-slate-400">{fmtDate(p.date)} · {p.method}</div>
                </div>
                {!p.confirmed && <Badge tone="amber">Tasdiq kutmoqda</Badge>}
              </div>
            ))}
          </div>
        ) : (
          <Empty text="To'lov qilinmagan" icon={Receipt} />
        )}
      </Card>
    </div>
  );
}
