'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hrApi, SALARY_LABEL, EMP_STATUS, type SalaryType } from '@/lib/hr';
import { money } from '@/lib/finance';

const inputCls = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['employee', id] });

  const { data: e } = useQuery({ queryKey: ['employee', id], queryFn: () => hrApi.employee(id) });

  const [salary, setSalary] = useState({ type: 'MONTHLY' as SalaryType, baseRate: '' });
  const saveSalary = useMutation({
    mutationFn: () => hrApi.setSalary(id, { type: salary.type, baseRate: Number(salary.baseRate) }),
    onSuccess: refresh,
  });
  const terminate = useMutation({ mutationFn: () => hrApi.terminate(id), onSuccess: refresh });

  if (!e) return <div className="p-8">Yuklanmoqda...</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-xl font-bold text-white">
            {e.user.fullName.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{e.user.fullName}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <span className={`rounded-full px-2 py-0.5 text-xs ${EMP_STATUS[e.status as keyof typeof EMP_STATUS].cls}`}>{EMP_STATUS[e.status as keyof typeof EMP_STATUS].label}</span>
              <span>{e.position?.name ?? '—'} · {e.department?.name ?? '—'}</span>
            </div>
          </div>
        </div>
        {e.status === 'ACTIVE' && (
          <button
            onClick={() => confirm('Xodimni ishdan bo\'shatasizmi?') && terminate.mutate()}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Ishdan bo&apos;shatish
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Ma'lumot */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 font-semibold">Ma&apos;lumotlar</h2>
          <Info label="Telefon" value={e.user.phone} />
          <Info label="Email" value={e.user.email ?? '—'} />
          <Info label="Ishga kirgan" value={new Date(e.hireDate).toLocaleDateString('uz-UZ')} />
          {e.fireDate && <Info label="Bo'shagan" value={new Date(e.fireDate).toLocaleDateString('uz-UZ')} />}
        </div>

        {/* Stavka */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 font-semibold">Stavka</h2>
          {e.salary ? (
            <p className="mb-3 text-sm">
              {SALARY_LABEL[e.salary.type as keyof typeof SALARY_LABEL]} · <b>{money(e.salary.baseRate)}</b>
            </p>
          ) : (
            <p className="mb-3 text-sm text-slate-400">Stavka belgilanmagan</p>
          )}
          <form onSubmit={(ev) => { ev.preventDefault(); saveSalary.mutate(); }} className="space-y-2">
            <select value={salary.type} onChange={(ev) => setSalary({ ...salary, type: ev.target.value as SalaryType })} className={`${inputCls} w-full`}>
              <option value="MONTHLY">Oylik</option>
              <option value="HOURLY">Soatbay</option>
              <option value="PER_LESSON">Darsbay</option>
            </select>
            <input type="number" placeholder="Summa" value={salary.baseRate} onChange={(ev) => setSalary({ ...salary, baseRate: ev.target.value })} className={`${inputCls} w-full`} required />
            <button disabled={saveSalary.isPending} className="w-full rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
              Stavkani saqlash
            </button>
          </form>
        </div>

        {/* Hujjatlar */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 font-semibold">Hujjatlar</h2>
          {e.documents?.length ? (
            e.documents.map((d: any) => (
              <div key={d.id} className="py-1 text-sm">📎 {d.fileName} <span className="text-xs text-slate-400">({d.type})</span></div>
            ))
          ) : (
            <p className="text-sm text-slate-400">Hujjat yo&apos;q</p>
          )}
        </div>
      </div>

      {/* Oylik tarixi */}
      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Oylik tarixi</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2">Davr</th>
                <th className="px-4 py-2 text-right">Asosiy</th>
                <th className="px-4 py-2 text-right">Bonus</th>
                <th className="px-4 py-2 text-right">Jarima</th>
                <th className="px-4 py-2 text-right">Jami</th>
                <th className="px-4 py-2">Holat</th>
              </tr>
            </thead>
            <tbody>
              {e.payrollItems?.map((p: any) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{p.payrollRun.period}</td>
                  <td className="px-4 py-2 text-right">{money(p.base)}</td>
                  <td className="px-4 py-2 text-right text-green-600">{money(p.bonus)}</td>
                  <td className="px-4 py-2 text-right text-red-600">{money(p.penalty)}</td>
                  <td className="px-4 py-2 text-right font-medium">{money(p.total)}</td>
                  <td className="px-4 py-2">{p.status}</td>
                </tr>
              ))}
              {!e.payrollItems?.length && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Oylik tarixi yo&apos;q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
