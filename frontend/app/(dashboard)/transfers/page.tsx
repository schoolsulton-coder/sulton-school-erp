'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  ListOrdered,
  Repeat2,
  Copy,
} from 'lucide-react';
import { financeApi, money, type Transaction } from '@/lib/finance';
import { TransferFormModal, type TransferInitial } from '@/components/transfer-form';
import {
  Badge,
  DateRangePicker,
  InfoRow,
  Panel,
  RowMenu,
  StatCard,
  StatusPill,
  dayRange,
  fmtDate,
  fmtTime,
  monthRange,
  rangeParams,
  sel,
  todayIso,
  type Range,
} from '@/components/flow-ui';

/** Backend har o'tkazma uchun 2 ta yozuv yaratadi: `→ Qabul qiluvchi` va `← Yuboruvchi` */
interface Leg {
  id: string;
  date: string;
  direction: 'in' | 'out';
  from: string;
  to: string;
  note: string | null;
  amount: number;
}

function parseLeg(t: Transaction): Leg {
  const m = (t.description ?? '').match(/^\s*([→←])\s*(.*?)\s*(?:\((.*)\))?\s*$/);
  const own = t.account?.name ?? '—';
  const other = m?.[2]?.trim() || '—';
  const note = m?.[3]?.trim() || null;
  const direction = m?.[1] === '←' ? 'in' : 'out';
  return {
    id: t.id,
    date: t.date,
    amount: t.amount,
    direction,
    note,
    from: direction === 'in' ? other : own,
    to: direction === 'in' ? own : other,
  };
}

export default function TransfersPage() {
  const qc = useQueryClient();
  const [range, setRange] = useState<Range>(monthRange);
  const [fromName, setFromName] = useState('');
  const [toName, setToName] = useState('');
  const [form, setForm] = useState<null | TransferInitial>(null);

  const { data: accounts } = useQuery({ queryKey: ['fin-accounts'], queryFn: financeApi.accounts });
  const { data, isLoading } = useQuery({
    queryKey: ['tx', 'TRANSFER', range],
    queryFn: () => financeApi.transactions({ type: 'TRANSFER', ...rangeParams(range) }),
  });
  const { data: todayTx } = useQuery({
    queryKey: ['tx', 'TRANSFER', 'today'],
    queryFn: () => financeApi.transactions({ type: 'TRANSFER', ...rangeParams(dayRange()) }),
  });

  const legs = useMemo(() => {
    const all = (data ?? []).map(parseLeg);
    return all.filter((l) => (!fromName || l.from === fromName) && (!toName || l.to === toName));
  }, [data, fromName, toName]);

  const totals = useMemo(() => {
    const income = legs.filter((l) => l.direction === 'in').reduce((s, l) => s + l.amount, 0);
    const expense = legs.filter((l) => l.direction === 'out').reduce((s, l) => s + l.amount, 0);
    return { income, expense, net: income - expense, count: legs.length };
  }, [legs]);

  const daily = useMemo(() => {
    const all = (todayTx ?? []).map(parseLeg);
    const income = all.filter((l) => l.direction === 'in').reduce((s, l) => s + l.amount, 0);
    const expense = all.filter((l) => l.direction === 'out').reduce((s, l) => s + l.amount, 0);
    return { income, expense, net: income - expense };
  }, [todayTx]);

  const idByName = useMemo(
    () => Object.fromEntries((accounts ?? []).map((a) => [a.name, a.id])),
    [accounts],
  );
  const totalBalance = (accounts ?? []).reduce((s, a) => s + a.balance, 0);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['tx', 'TRANSFER'] });
    qc.invalidateQueries({ queryKey: ['fin-accounts'] });
    qc.invalidateQueries({ queryKey: ['finance-summary'] });
    qc.invalidateQueries({ queryKey: ['finance-cashflow'] });
  };

  return (
    <div className="min-h-full bg-slate-50/60 p-6">
      {/* Sarlavha */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ichki pul oqimi</h1>
          <p className="text-sm text-slate-400">Kassalar orasida o&apos;tkazmalar</p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Filtrlar + amal */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <select value={fromName} onChange={(e) => setFromName(e.target.value)} className={sel}>
          <option value="">Qaysidan</option>
          {accounts?.map((a) => (
            <option key={a.id} value={a.name}>
              {a.name}
            </option>
          ))}
        </select>
        <select value={toName} onChange={(e) => setToName(e.target.value)} className={sel}>
          <option value="">Qaysiga</option>
          {accounts?.map((a) => (
            <option key={a.id} value={a.name}>
              {a.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={range.from}
          onChange={(e) => e.target.value && setRange({ ...range, from: e.target.value })}
          className={sel}
          title="Sanadan"
        />
        <input
          type="date"
          value={range.to}
          onChange={(e) => e.target.value && setRange({ ...range, to: e.target.value })}
          className={sel}
          title="Sanagacha"
        />
        <button
          onClick={() => setForm({})}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          <Plus size={16} /> Qo&apos;shish
        </button>
        {(fromName || toName) && (
          <button
            onClick={() => {
              setFromName('');
              setToName('');
            }}
            className="px-2 py-2 text-sm text-slate-500 hover:text-brand"
          >
            Tozalash
          </button>
        )}
      </div>

      {/* Statistika */}
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard tone="emerald" label="Jami kirim" value={money(totals.income)} icon={ArrowDownLeft} />
        <StatCard tone="rose" label="Jami chiqim" value={money(totals.expense)} icon={ArrowUpRight} />
        <StatCard
          tone="violet"
          label="Sof oqim"
          value={money(totals.net)}
          icon={Scale}
        />
        <StatCard tone="amber" label="Jami operatsiyalar" value={`${totals.count} ta`} icon={ListOrdered} />
      </div>

      {/* Operatsiyalar */}
      <div className="mb-5">
        <Panel title="Pul oqimi operatsiyalari" hint="Har bir o'tkazma ikki kassa bo'yicha yoziladi">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Sana</th>
                  <th className="px-5 py-3">Vaqt</th>
                  <th className="px-5 py-3">Qaysidan</th>
                  <th className="px-5 py-3">Qaysiga</th>
                  <th className="px-5 py-3">Tavsif</th>
                  <th className="px-5 py-3 text-right">Kirim</th>
                  <th className="px-5 py-3 text-right">Chiqim</th>
                  <th className="px-5 py-3 text-right">Sof</th>
                  <th className="px-5 py-3 text-center">Holat</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-10 text-center text-slate-400">
                      Yuklanmoqda...
                    </td>
                  </tr>
                ) : legs.length ? (
                  legs.map((l) => (
                    <tr key={l.id} className="border-b border-slate-50 transition last:border-0 hover:bg-brand/[0.03]">
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{fmtDate(l.date)}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-400">{fmtTime(l.date)}</td>
                      <td className="px-5 py-3.5">
                        <Badge name={l.from} tone="rose" />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="mr-1.5 text-slate-300">→</span>
                        <Badge name={l.to} tone="emerald" />
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{l.note ?? '—'}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-emerald-600">
                        {l.direction === 'in' ? money(l.amount) : <span className="text-slate-300">−</span>}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-rose-600">
                        {l.direction === 'out' ? money(l.amount) : <span className="text-slate-300">−</span>}
                      </td>
                      <td
                        className={`whitespace-nowrap px-5 py-3.5 text-right font-semibold ${
                          l.direction === 'in' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {l.direction === 'in' ? money(l.amount) : `−${money(l.amount)}`}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <StatusPill />
                      </td>
                      <td className="px-5 py-3.5">
                        <RowMenu
                          items={[
                            {
                              label: 'Takrorlash',
                              icon: Repeat2,
                              onClick: () =>
                                setForm({
                                  fromAccountId: idByName[l.from],
                                  toAccountId: idByName[l.to],
                                  amount: l.amount,
                                  description: l.note ?? undefined,
                                }),
                            },
                            {
                              label: 'ID nusxalash',
                              icon: Copy,
                              onClick: () => navigator.clipboard?.writeText(l.id),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-5 py-12 text-center text-slate-400">
                      Bu davrda o&apos;tkazma yo&apos;q
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Pastki panellar */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Kassalar balansi">
          {accounts?.length ? (
            <>
              {accounts.map((a) => (
                <InfoRow key={a.id} label={a.name} value={money(a.balance)} />
              ))}
              <InfoRow label="Jami" value={money(totalBalance)} tone="text-slate-900" />
            </>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-slate-400">Kassa yo&apos;q</p>
          )}
        </Panel>

        <Panel title="Tezkor statistika">
          <InfoRow label="Bugungi sana" value={todayIso()} />
          <InfoRow label="Kunlik kirim" value={money(daily.income)} tone="text-emerald-600" />
          <InfoRow label="Kunlik chiqim" value={money(daily.expense)} tone="text-rose-600" />
          <InfoRow
            label="Kunlik sof oqim"
            value={money(daily.net)}
            tone={daily.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}
          />
        </Panel>
      </div>

      {form && (
        <TransferFormModal
          initial={form}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
