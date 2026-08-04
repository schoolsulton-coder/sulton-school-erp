'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Search, MessageSquare, Check } from 'lucide-react';
import {
  debtorsApi,
  buildMonthColumns,
  money,
  moneyShort,
  daysAgoLabel,
  fmtDate,
  contactTypeLabel,
  STATUS_BADGE,
  type DebtorRow,
} from '@/lib/debtors';
import { DebtorContactModal } from '@/components/debtor-contact-modal';

export default function DebtorsPage() {
  const { data, refetch } = useQuery({ queryKey: ['debtors'], queryFn: debtorsApi.list });

  const [q, setQ] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [modal, setModal] = useState<{ studentId: string; name: string } | null>(null);
  const defaulted = useRef(false);

  // Standart: eng so'nggi o'quv yili (ustunlar aralashmasin)
  useEffect(() => {
    if (!defaulted.current && data?.academicYears.length) {
      defaulted.current = true;
      setYear(data.academicYears[0]);
    }
  }, [data]);

  const rows = data?.rows ?? [];
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (branch && r.branchId !== branch) return false;
      if (year && r.academicYear !== year) return false;
      if (s) {
        const hay = `${r.lastName} ${r.firstName} ${r.number}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, q, branch, year]);

  const months = useMemo(() => buildMonthColumns(filtered), [filtered]);
  const totals = useMemo(() => {
    const byMonth: Record<string, number> = {};
    let grand = 0;
    for (const r of filtered) {
      grand += r.debt;
      for (const c of r.cells) byMonth[c.key] = (byMonth[c.key] ?? 0) + c.remaining;
    }
    return { byMonth, grand };
  }, [filtered]);

  const active = branch || year || q;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-3">
        <h1 className="text-2xl font-bold">Qarzdorlar</h1>
        <p className="text-sm text-slate-500">
          {filtered.length} ta shartnoma · Umumiy qarz: <b className="text-red-600">{money(totals.grand)}</b>
        </p>
      </div>

      {/* Bugungi aloqa holati */}
      {data && (
        <div
          className={`mb-3 rounded-xl border px-4 py-2.5 text-sm ${
            data.stats.contactedToday > 0
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}
        >
          <b>Bugun:</b>{' '}
          {data.stats.contactedToday > 0
            ? `${data.stats.contactedToday} ta o'quvchi bilan aloqa qilindi`
            : 'hali aloqa yozilmagan'}
        </div>
      )}

      {/* Filtrlar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ism yoki shartnoma № bo'yicha qidirish…"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
          />
        </div>
        <select value={branch} onChange={(e) => setBranch(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand">
          <option value="">Barcha filiallar</option>
          {data?.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand">
          <option value="">Barcha yillar</option>
          {data?.academicYears.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        {active && (
          <button onClick={() => { setQ(''); setBranch(''); setYear(''); }} className="px-2 py-1 text-sm text-slate-500 hover:text-slate-700">
            Tozalash
          </button>
        )}
      </div>

      {!filtered.length ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400">
          {rows.length ? 'Filtrga mos qarzdor yo‘q' : 'Qarzdor yo‘q 🎉'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-left font-semibold text-slate-500">
                  O&apos;quvchi · Sinf
                </th>
                {months.map((m) => (
                  <th key={m.key} className="border-b border-l border-slate-100 bg-slate-50 px-3 py-2 text-center font-semibold text-slate-500">
                    <div>{m.label}</div>
                    <div className="text-[10px] font-normal text-slate-400">{m.year}</div>
                  </th>
                ))}
                <th className="border-b border-l border-slate-200 bg-slate-50 px-4 py-2.5 text-right font-semibold text-slate-500">Jami</th>
              </tr>
            </thead>
            <tbody>
              {/* JAMI qatori */}
              <tr className="bg-slate-50/70 font-semibold">
                <td className="sticky left-0 z-10 border-b border-slate-200 bg-slate-100 px-4 py-2 text-slate-700">
                  JAMI ({filtered.length})
                </td>
                {months.map((m) => (
                  <td key={m.key} className="border-b border-l border-slate-100 bg-slate-100 px-3 py-2 text-center text-slate-600">
                    {totals.byMonth[m.key] ? moneyShort(totals.byMonth[m.key]) : '—'}
                  </td>
                ))}
                <td className="border-b border-l border-slate-200 bg-slate-100 px-4 py-2 text-right text-red-600">{moneyShort(totals.grand)}</td>
              </tr>

              {filtered.map((r) => {
                const byKey = new Map(r.cells.map((c) => [c.key, c]));
                return (
                  <tr key={r.contractId} className="hover:bg-slate-50/60">
                    {/* Chap ustun — o'quvchi kartochkasi */}
                    <td className="sticky left-0 z-10 min-w-[240px] border-b border-slate-100 bg-white px-4 py-2.5 align-top">
                      <Link href={`/contracts/${r.contractId}`} className="font-semibold text-slate-800 hover:text-brand">
                        {r.lastName} {r.firstName}
                      </Link>
                      <div className="text-xs text-slate-500">
                        №{r.number} · {r.className ?? '—'} · {fmtDate(r.startDate)}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {STATUS_BADGE[r.status] && (
                          <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_BADGE[r.status].cls}`}>
                            {STATUS_BADGE[r.status].label}
                          </span>
                        )}
                        {r.overdueMonths > 0 && (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">
                            {r.overdueMonths} oy qarz
                          </span>
                        )}
                        <button
                          onClick={() => setModal({ studentId: r.studentId, name: `${r.lastName} ${r.firstName}` })}
                          className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-brand/10 hover:text-brand"
                          title="Aloqa qo'shish"
                        >
                          <MessageSquare size={11} /> {r.contactCount || ''}
                        </button>
                      </div>
                      {r.lastContact ? (
                        <div className="mt-1 max-w-[240px] text-[11px] text-slate-500">
                          <span className="text-slate-400">{daysAgoLabel(r.lastContact.createdAt)} · {contactTypeLabel(r.lastContact.type)}</span>
                          <div className="truncate rounded bg-amber-50 px-1.5 py-0.5 text-amber-800" title={r.lastContact.note}>
                            {r.lastContact.note}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 text-[11px] text-slate-400">Aloqa yozilmagan</div>
                      )}
                    </td>

                    {/* Oylik kataklar */}
                    {months.map((m) => {
                      const c = byKey.get(m.key);
                      return (
                        <td key={m.key} className="border-b border-l border-slate-100 px-2 py-2 text-center">
                          <Cell cell={c} />
                        </td>
                      );
                    })}

                    <td className="border-b border-l border-slate-100 px-4 py-2 text-right font-bold text-red-600">
                      {moneyShort(r.debt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <DebtorContactModal
          studentId={modal.studentId}
          name={modal.name}
          onClose={() => setModal(null)}
          onChanged={() => refetch()}
        />
      )}
    </div>
  );
}

function Cell({ cell }: { cell: DebtorRow['cells'][number] | undefined }) {
  if (!cell) return <span className="text-slate-300">—</span>;
  if (cell.state === 'paid') {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600">
        <Check size={13} strokeWidth={3} />
      </span>
    );
  }
  if (cell.state === 'partial') {
    const pct = cell.amount ? Math.round((cell.paid / cell.amount) * 100) : 0;
    return (
      <div className="rounded-md bg-amber-50 px-1 py-0.5 leading-tight text-amber-700">
        <div className="text-xs font-semibold">{moneyShort(cell.paid)}/{moneyShort(cell.amount)}</div>
        <div className="text-[10px]">{pct}%</div>
      </div>
    );
  }
  // unpaid
  return (
    <span className={`text-xs font-semibold ${cell.overdue ? 'text-red-600' : 'text-slate-500'}`}>
      {moneyShort(cell.amount)}
    </span>
  );
}
