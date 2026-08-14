'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  ListOrdered,
  Plus,
  Repeat2,
  Copy,
} from 'lucide-react';
import { financeApi, money, type Transaction } from '@/lib/finance';
import { CashflowFormModal, type CashflowInitial, type TxType } from '@/components/cashflow-form';
import {
  Badge,
  DateRangePicker,
  InfoRow,
  Panel,
  RowMenu,
  StatCard,
  StatusPill,
  fmtDate,
  fmtTime,
  monthRange,
  rangeParams,
  sel,
  todayIso,
  type Range,
} from '@/components/flow-ui';

const TYPE_LABEL: Record<TxType, string> = {
  INCOME: 'Kirim',
  EXPENSE: 'Chiqim',
  INVESTMENT: 'Investitsiya',
};
const TYPE_TONE: Record<TxType, 'emerald' | 'rose' | 'indigo'> = {
  INCOME: 'emerald',
  EXPENSE: 'rose',
  INVESTMENT: 'indigo',
};

export default function CashflowPage() {
  const qc = useQueryClient();
  const [range, setRange] = useState<Range>(monthRange);
  const [accountId, setAccountId] = useState('');
  const [type, setType] = useState('');
  const [form, setForm] = useState<null | CashflowInitial>(null);

  const { data: accounts } = useQuery({ queryKey: ['fin-accounts'], queryFn: financeApi.accounts });
  const { data: cf } = useQuery({
    queryKey: ['finance-cashflow', range],
    queryFn: () => {
      const p = rangeParams(range);
      return financeApi.cashFlow(p.from, p.to);
    },
  });
  const { data, isLoading } = useQuery({
    queryKey: ['finance-txns', range, accountId, type],
    queryFn: () =>
      financeApi.transactions({
        ...rangeParams(range),
        accountId: accountId || undefined,
        type: type || undefined,
      }),
  });

  // TRANSFER — ichki oqim, bu yerda ko'rsatilmaydi
  const rows = useMemo(() => (data ?? []).filter((t) => t.type !== 'TRANSFER'), [data]);

  const totalBalance = (accounts ?? []).reduce((s, a) => s + a.balance, 0);
  const net = cf?.net ?? 0;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['finance-txns'] });
    qc.invalidateQueries({ queryKey: ['finance-cashflow'] });
    qc.invalidateQueries({ queryKey: ['finance-summary'] });
    qc.invalidateQueries({ queryKey: ['fin-accounts'] });
  };

  const amountOf = (t: Transaction) => ({
    income: t.type === 'EXPENSE' ? 0 : t.amount,
    expense: t.type === 'EXPENSE' ? t.amount : 0,
  });

  return (
    <div className="min-h-full bg-slate-50/60 p-6">
      {/* Sarlavha */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tashqi pul oqimi</h1>
          <p className="text-sm text-slate-400">Tashqaridan kirim va tashqariga chiqim</p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Filtrlar + amal */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={sel}>
          <option value="">Barcha kassalar</option>
          {accounts?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className={sel}>
          <option value="">Barcha turlar</option>
          <option value="INCOME">Kirim</option>
          <option value="EXPENSE">Chiqim</option>
          <option value="INVESTMENT">Investitsiya</option>
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
          <Plus size={16} /> Yangi yozuv
        </button>
        {(accountId || type) && (
          <button
            onClick={() => {
              setAccountId('');
              setType('');
            }}
            className="px-2 py-2 text-sm text-slate-500 hover:text-brand"
          >
            Tozalash
          </button>
        )}
      </div>

      {/* Statistika — davr bo'yicha (shartnoma to'lovlari bilan birga) */}
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard tone="emerald" label="Jami kirim" value={money(cf?.totalIncome ?? 0)} icon={ArrowDownLeft} />
        <StatCard tone="rose" label="Jami chiqim" value={money(cf?.expense ?? 0)} icon={ArrowUpRight} />
        <StatCard tone="violet" label="Sof oqim" value={money(net)} icon={Scale} />
        <StatCard tone="amber" label="Jami operatsiyalar" value={`${rows.length} ta`} icon={ListOrdered} />
      </div>

      {/* Operatsiyalar */}
      <div className="mb-5">
        <Panel
          title="Pul oqimi operatsiyalari"
          hint="Shartnoma to'lovlari alohida qayd etiladi — yuqoridagi kartalarda hisobga olingan"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Sana</th>
                  <th className="px-5 py-3">Vaqt</th>
                  <th className="px-5 py-3">Kassa</th>
                  <th className="px-5 py-3">Turi</th>
                  <th className="px-5 py-3">Kategoriya</th>
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
                    <td colSpan={11} className="px-5 py-10 text-center text-slate-400">
                      Yuklanmoqda...
                    </td>
                  </tr>
                ) : rows.length ? (
                  rows.map((t) => {
                    const a = amountOf(t);
                    const tt = t.type as TxType;
                    return (
                      <tr key={t.id} className="border-b border-slate-50 transition last:border-0 hover:bg-brand/[0.03]">
                        <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{fmtDate(t.date)}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-slate-400">{fmtTime(t.date)}</td>
                        <td className="px-5 py-3.5">
                          <Badge name={t.account?.name ?? '—'} />
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge name={TYPE_LABEL[tt] ?? t.type} tone={TYPE_TONE[tt] ?? 'slate'} />
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{t.category?.name ?? '—'}</td>
                        <td className="px-5 py-3.5 text-slate-500">{t.description ?? '—'}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-emerald-600">
                          {a.income ? money(a.income) : <span className="text-slate-300">−</span>}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-rose-600">
                          {a.expense ? money(a.expense) : <span className="text-slate-300">−</span>}
                        </td>
                        <td
                          className={`whitespace-nowrap px-5 py-3.5 text-right font-semibold ${
                            a.income ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {a.income ? money(a.income) : `−${money(a.expense)}`}
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
                                    type: tt,
                                    accountId: t.account?.id,
                                    categoryId: t.category?.id,
                                    amount: t.amount,
                                    description: t.description ?? undefined,
                                  }),
                              },
                              {
                                label: 'ID nusxalash',
                                icon: Copy,
                                onClick: () => navigator.clipboard?.writeText(t.id),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="px-5 py-12 text-center text-slate-400">
                      Bu davrda yozuv yo&apos;q
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

        <Panel title="Tezkor statistika" hint="Tanlangan davr kesimida">
          <InfoRow label="Bugungi sana" value={todayIso()} />
          <InfoRow label="🎓 Shartnoma to'lovlari" value={money(cf?.income.contract ?? 0)} tone="text-emerald-600" />
          <InfoRow label="Boshqa kirim" value={money(cf?.income.other ?? 0)} tone="text-emerald-600" />
          <InfoRow label="Investitsiya" value={money(cf?.income.investment ?? 0)} tone="text-indigo-600" />
          <InfoRow label="Xarajatlar" value={money(cf?.expense ?? 0)} tone="text-rose-600" />
          <InfoRow
            label="Sof oqim"
            value={money(net)}
            tone={net >= 0 ? 'text-emerald-600' : 'text-rose-600'}
          />
        </Panel>
      </div>

      {form && (
        <CashflowFormModal
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
