'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { crmApi } from '@/lib/crm';
import { hrApi, type Oylik10Month } from '@/lib/hr';

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const numFmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0));
const AY = ['2024-2025', '2025-2026', '2026-2027'];
const selCls = 'rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-brand focus:bg-white';
const now = new Date();
const defaultAY = now.getMonth() + 1 >= 9 ? `${now.getFullYear()}-${now.getFullYear() + 1}` : `${now.getFullYear() - 1}-${now.getFullYear()}`;
const monthLabel = (period: string) => { const [y, m] = period.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };

function Stat({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 p-4 shadow-sm ${tone ?? 'bg-white'}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-800">{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

/* ===== 10 oylik ===== */
export function Oylik10Tab() {
  const [academicYear, setAY] = useState(AY.includes(defaultAY) ? defaultAY : '2025-2026');
  const [branchId, setBranchId] = useState('');
  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data, isLoading } = useQuery({ queryKey: ['oylik10', academicYear, branchId], queryFn: () => hrApi.oylik10(academicYear, branchId || undefined) });
  const t = data?.totals;
  const months = data?.months ?? [];
  const maxH = Math.max(1, ...months.map((m) => m.hisoblangan));

  return (
    <>
      <div className="mb-5 flex items-center justify-between rounded-2xl bg-slate-900 p-6 text-white">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-sky-300">Maoshlar · 10 oylik hisobot</div>
          <div className="mt-1 text-2xl font-bold">Sentabrdan iyungacha bir qarashda</div>
          <div className="mt-1 text-sm text-slate-300">O&apos;quv yilini tanlang — har oyning jami hisoblangan maoshi va tasdiq holati.</div>
        </div>
        <div className="rounded-xl bg-white/10 px-4 py-2 text-right"><div className="font-bold">{academicYear}</div><div className="text-xs text-slate-300">10 oy · Sentabr — Iyun</div></div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <select value={academicYear} onChange={(e) => setAY(e.target.value)} className={selCls}>{AY.map((a) => <option key={a} value={a}>{a}</option>)}</select>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={selCls}><option value="">Barcha filiallar</option>{branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="10 oy jami" value={numFmt(t?.jami ?? 0)} sub="so'm" tone="bg-sky-50/50" />
        <Stat label="Oylik o'rtacha" value={numFmt(t?.ortacha ?? 0)} sub="jami ÷ 10 oy" />
        <Stat label="Xodimlar" value={t?.xodimlar ?? 0} tone="bg-emerald-50/50" />
        <Stat label="To'ldirilgan oy" value={`${t?.toldirilgan ?? 0}/10`} tone="bg-amber-50/50" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Oy</th><th className="px-5 py-3">Oylik ko&apos;lami</th><th className="px-5 py-3 text-right">Xodim</th><th className="px-5 py-3 text-right">Hisoblangan</th><th className="px-5 py-3 text-right">Tasdiqlangan</th><th className="px-5 py-3 text-right">Tasdiqlashga</th><th className="px-5 py-3 text-center">Holat</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">Yuklanmoqda...</td></tr>
              ) : months.map((m: Oylik10Month) => (
                <tr key={m.period} className="border-b border-slate-50 transition last:border-0 hover:bg-brand/[0.03]">
                  <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-slate-700">{monthLabel(m.period)}</td>
                  <td className="px-5 py-3.5"><div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand" style={{ width: `${(m.hisoblangan / maxH) * 100}%` }} /></div></td>
                  <td className="px-5 py-3.5 text-right text-slate-500">{m.xodim}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-slate-800">{numFmt(m.hisoblangan)}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right text-emerald-600">{numFmt(m.tasdiqlangan)}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right text-amber-600">{numFmt(m.tasdiqlashga)}</td>
                  <td className="px-5 py-3.5 text-center">{m.tasdiqlashga > 0 ? <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">Tasdiqlashga</span> : m.xodim > 0 ? <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">Tayyor</span> : <span className="text-slate-300">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ===== Umumiy ===== */
export function UmumiyTab() {
  const [branchId, setBranchId] = useState('');
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data } = useQuery({ queryKey: ['maosh-umumiy', period, branchId], queryFn: () => hrApi.maoshUmumiy(period, branchId || undefined) });

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={selCls}><option value="">Barcha filiallar</option>{branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <span className="rounded-full bg-slate-100 px-3 py-2 text-xs text-slate-500">Joriy oy: {period}</span>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Faol xodimlar" value={data?.xodimlar ?? 0} tone="bg-sky-50/50" />
        <Stat label="Bu oy hisoblangan" value={numFmt(data?.hisoblangan ?? 0)} sub="so'm" />
        <Stat label="Berilgan" value={numFmt(data?.berilgan ?? 0)} tone="bg-emerald-50/50" />
        <Stat label="Qoldiq" value={numFmt(data?.qoldiq ?? 0)} tone="bg-rose-50/50" />
        <Stat label="Shartnomalar" value={data?.shartnomalar ?? 0} tone="bg-amber-50/50" />
      </div>
    </>
  );
}
