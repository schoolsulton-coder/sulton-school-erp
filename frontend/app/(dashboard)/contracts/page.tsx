'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus } from 'lucide-react';
import { contractsApi, type ContractOverviewRow } from '@/lib/contracts';

const num = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0));
const dateKey = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};
const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const WD = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];

const STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'Faol', cls: 'bg-green-100 text-green-700' },
  SUSPENDED: { label: 'Band', cls: 'bg-purple-100 text-purple-700' },
  TEMP_SUSPENDED: { label: 'Vaqtincha band', cls: 'bg-amber-100 text-amber-700' },
  LEFT: { label: 'Ketdi-aniqlashga', cls: 'bg-orange-100 text-orange-700' },
  DRAFT: { label: 'Qoralama', cls: 'bg-slate-100 text-slate-600' },
  COMPLETED: { label: 'Yakunlangan', cls: 'bg-slate-100 text-slate-600' },
  CANCELLED: { label: 'Bekor qilingan', cls: 'bg-slate-100 text-slate-600' },
  OTHER: { label: 'Boshqa', cls: 'bg-slate-100 text-slate-600' },
};

export default function ContractsPage() {
  const [q, setQ] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['contracts-overview'], queryFn: contractsApi.overview });
  const rows = data?.rows ?? [];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      const name = `${r.student.lastName} ${r.student.firstName}`.toLowerCase();
      return name.includes(term) || r.number.toLowerCase().includes(term);
    });
  }, [rows, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, ContractOverviewRow[]>();
    for (const r of filtered) {
      const k = dateKey(r.createdAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          Shartnomalar <span className="text-base font-normal text-slate-400">{rows.length} ta</span>
        </h1>
        <Link href="/contracts/new" className="flex items-center gap-1 rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark">
          <Plus size={18} /> Yangi shartnoma
        </Link>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Raqam yoki ism bo'yicha qidirish..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">№</th>
              <th className="px-4 py-3">Sana</th>
              <th className="px-4 py-3">O&apos;quvchi</th>
              <th className="px-4 py-3">Filial · Yil</th>
              <th className="px-4 py-3">Turi / Holat</th>
              <th className="px-4 py-3 text-right">Asl narx / Chegirma</th>
              <th className="px-4 py-3 text-right">To&apos;lanadigan / Oylik</th>
              <th className="px-4 py-3 text-right">To&apos;lovlar</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Yuklanmoqda…</td></tr>
            )}
            {!isLoading && grouped.map(([date, list]) => {
              const d = new Date(list[0].createdAt);
              const sum = list.reduce((s, r) => s + r.payable, 0);
              return (
                <Fragment key={date}>
                  <tr className="bg-slate-50/70">
                    <td colSpan={8} className="px-4 py-2 text-sm">
                      <span className="font-semibold text-slate-600">{date}</span>
                      <span className="ml-1 text-slate-400">({WD[d.getDay()]})</span>
                      <span className="ml-2 text-slate-400">· {list.length} ta</span>
                      <span className="ml-2 font-medium text-green-600">· {num(sum)} so&apos;m</span>
                    </td>
                  </tr>
                  {list.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-500">{r.number.split('-').pop()}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-slate-500">
                        {dateKey(r.createdAt)}<div className="text-xs text-slate-400">{fmtTime(r.createdAt)}</div>
                      </td>
                      <td className="px-4 py-2">
                        <Link href={`/contracts/${r.id}`} className="font-medium text-slate-800 hover:text-brand">
                          {r.student.lastName} {r.student.firstName}
                        </Link>
                        {r.student.class && <div className="text-xs text-slate-400">{r.student.class.name} ({r.student.class.language ?? '—'})</div>}
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-slate-700">{r.branch ?? '—'}</div>
                        <div className="text-xs text-slate-400">{r.academicYear ?? '—'}</div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`rounded px-2 py-0.5 text-xs ${r.type === 'YEARLY' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-brand'}`}>
                            {r.type === 'YEARLY' ? 'Yillik' : 'Oylik'}
                          </span>
                          <span className={`rounded px-2 py-0.5 text-xs ${(STATUS[r.status] ?? STATUS.OTHER).cls}`}>
                            {(STATUS[r.status] ?? STATUS.OTHER).label}
                          </span>
                          {r.overdue && <span className="rounded px-2 py-0.5 text-xs bg-red-100 text-red-700">Muddati o&apos;tgan</span>}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">
                        <div className="font-medium text-slate-800">{num(r.original)}</div>
                        {r.discount > 0 && <div className="text-xs text-red-500">−{num(r.discount)}</div>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">
                        <div className="font-semibold text-slate-900">{num(r.payable)}</div>
                        <div className="text-xs text-slate-400">{num(r.monthly)}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right font-medium text-green-600">
                        {r.paymentsSum > 0 ? num(r.paymentsSum) : '—'}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
            {!isLoading && !filtered.length && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Shartnoma topilmadi</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
