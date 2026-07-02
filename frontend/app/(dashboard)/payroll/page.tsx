'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { payrollApi, PAYROLL_STATUS, type PayrollRun } from '@/lib/payroll';

export default function PayrollPage() {
  const qc = useQueryClient();
  const [period, setPeriod] = useState('');
  const [error, setError] = useState('');

  const { data: runs } = useQuery({ queryKey: ['payroll-runs'], queryFn: payrollApi.runs });

  const create = useMutation({
    mutationFn: () => payrollApi.createRun(period),
    onSuccess: () => {
      setPeriod('');
      setError('');
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Oylik hisob-kitob</h1>
          <p className="text-sm text-slate-500">
            <Link href="/hr" className="text-brand">← HR — Xodimlar</Link>
          </p>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
          className="flex items-center gap-2"
        >
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <button disabled={create.isPending} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
            + Hisob ochish
          </button>
        </form>
      </div>
      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {runs?.map((r: PayrollRun) => (
          <Link
            key={r.id}
            href={`/payroll/${r.id}`}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">{r.period}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${PAYROLL_STATUS[r.status].cls}`}>
                {PAYROLL_STATUS[r.status].label}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">{r._count.items} xodim</p>
          </Link>
        ))}
        {!runs?.length && (
          <p className="col-span-full py-8 text-center text-slate-400">
            Hali oylik hisobi yo&apos;q — yangi davr oching
          </p>
        )}
      </div>
    </div>
  );
}
