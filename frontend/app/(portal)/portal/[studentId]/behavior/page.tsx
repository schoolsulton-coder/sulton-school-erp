'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Coins, Sparkles } from 'lucide-react';
import { behaviorTone, fmtDay, portalApi, TONE, todayStr } from '@/lib/portal';
import { Card, Empty, PageTitle, Ring, Skeleton, Switcher } from '@/components/portal/ui';

const shiftMonth = (ym: string, delta: number) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

export default function PortalBehaviorPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const { data, isLoading } = useQuery({
    queryKey: ['portal-behavior', studentId, month],
    queryFn: () => portalApi.behavior(studentId, month),
    placeholderData: keepPreviousData,
  });

  if (isLoading && !data) return <Skeleton rows={3} />;
  if (!data) return null;
  const tone = behaviorTone(data.remaining, data.limit);
  const maxHist = Math.max(data.limit, ...data.history.map((h) => h.remaining));

  return (
    <div className="space-y-4">
      <PageTitle title="Ahloqiy ball" sub={`Har oyga ${data.limit} ball beriladi, qoidabuzarlik uchun ayiriladi`} />

      <Switcher
        label={data.monthLabel}
        onPrev={() => setMonth(shiftMonth(month, -1))}
        onNext={() => setMonth(shiftMonth(month, 1))}
        disabledNext={month >= todayStr().slice(0, 7)}
      />

      <Card>
        <div className="flex items-center gap-4">
          <Ring value={data.remaining} max={data.limit} tone={tone} label={data.remaining} sub={`/ ${data.limit}`} />
          <div className="min-w-0 flex-1 space-y-2 text-sm">
            <div className="flex justify-between rounded-2xl bg-slate-50 px-3 py-2">
              <span className="text-slate-500">Ayirilgan</span>
              <b className={data.deducted ? 'text-rose-600' : 'text-slate-700'}>{data.deducted ? `−${data.deducted}` : '0'}</b>
            </div>
            <div className="flex justify-between rounded-2xl bg-slate-50 px-3 py-2">
              <span className="text-slate-500">Yozuvlar</span>
              <b className="text-slate-700">{data.records.length}</b>
            </div>
            {!data.deducted && <p className="text-center text-emerald-600">Bu oy ball ayirilmagan 👍</p>}
          </div>
        </div>
      </Card>

      <Card title="Oy yozuvlari" icon={Sparkles} tone="violet">
        {data.records.length ? (
          <div className="space-y-1.5">
            {data.records.map((r) => (
              <div key={r.id} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                <span className={`mt-0.5 grid h-8 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold ${r.type === 'POSITIVE' ? TONE.emerald.soft : TONE.rose.soft}`}>
                  {r.type === 'POSITIVE' ? '+' : '−'}{r.points}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-slate-800">{r.description}</div>
                  <div className="text-xs text-slate-400">{fmtDay(r.date)}{r.author ? ` · ${r.author}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="Bu oyda yozuv yo'q" icon={Sparkles} />
        )}
      </Card>

      <Card title="Oxirgi 6 oy">
        <div className="flex h-32 items-end gap-2">
          {data.history.map((h) => {
            const t = behaviorTone(h.remaining, data.limit);
            return (
              <button
                key={h.month}
                type="button"
                onClick={() => setMonth(h.month)}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                title={`${h.label}: ${h.remaining}/${data.limit}`}
              >
                <span className={`text-[11px] font-semibold ${TONE[t].text}`}>{h.remaining}</span>
                <span className={`w-full rounded-t-lg ${TONE[t].bg} ${h.month === data.month ? 'ring-2 ring-slate-300' : ''}`} style={{ height: `${(h.remaining / maxHist) * 100}%`, minHeight: 4 }} />
                <span className="truncate text-[10px] text-slate-400">{h.label.slice(0, 3)}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card title="Coin (rag'bat ballari)" icon={Coins} tone="amber">
        <div className="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-center">
          <div className="text-3xl font-bold text-amber-700">{data.coins.balance}</div>
          <div className="text-xs uppercase tracking-wide text-amber-700/70">jami coin</div>
        </div>
        {data.coins.records.length ? (
          <div className="space-y-1.5">
            {data.coins.records.slice(0, 10).map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                <span className={`grid h-8 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold ${c.amount > 0 ? TONE.emerald.soft : TONE.rose.soft}`}>
                  {c.amount > 0 ? '+' : ''}{c.amount}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-slate-800">{c.reason}</div>
                  <div className="text-xs text-slate-400">{fmtDay(c.date)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="Coin yozuvlari yo'q" icon={Coins} />
        )}
      </Card>
    </div>
  );
}
