'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, Search, RotateCcw } from 'lucide-react';
import { crmApi } from '@/lib/crm';
import { flowAccountsApi, flowAccountLabel } from '@/lib/flow-accounts';
import { hrApi, type Employee } from '@/lib/hr';

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const YEARS = [2024, 2025, 2026, 2027];
const AY = ['2024-2025', '2025-2026', '2026-2027'];
const KASSA = ['Naqd', 'Karta', 'Bank'];
const numFmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0));
const lbl = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500';
const inp = 'w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white';
const now = new Date();

export function TolovModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [branchId, setBranchId] = useState('');
  const [empSearch, setEmpSearch] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [academicYear, setAY] = useState('2026-2027');
  const [som, setSom] = useState('');
  const [somKassa, setSomKassa] = useState('Naqd');
  const [somAccountId, setSomAcc] = useState('');
  const [usd, setUsd] = useState('');
  const [rate, setRate] = useState('');
  const [usdKassa, setUsdKassa] = useState('Naqd');
  const [usdAccountId, setUsdAcc] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const period = `${year}-${String(month).padStart(2, '0')}`;

  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data: employees } = useQuery({ queryKey: ['hr-employees'], queryFn: () => hrApi.employees() });
  const { data: somAccs } = useQuery({ queryKey: ['flow-acc', 'SOM', branchId], queryFn: () => flowAccountsApi.list({ currency: 'SOM', branchId: branchId || undefined, active: 'true' }) });
  const { data: usdAccs } = useQuery({ queryKey: ['flow-acc', 'USD', branchId], queryFn: () => flowAccountsApi.list({ currency: 'USD', branchId: branchId || undefined, active: 'true' }) });
  const { data: status } = useQuery({ queryKey: ['oylik-status', employeeId, period], queryFn: () => hrApi.oylikStatus(employeeId, period), enabled: !!employeeId });

  const filtered = useMemo(() => {
    const q = empSearch.toLowerCase();
    return (employees ?? []).filter((e) => !q || e.user.fullName.toLowerCase().includes(q)).slice(0, 50);
  }, [employees, empSearch]);
  const selected = (employees ?? []).find((e) => e.id === employeeId);
  const somAcc = somAccs?.find((a) => a.id === somAccountId);

  const save = useMutation({
    mutationFn: () =>
      hrApi.createTolov({
        employeeId, branchId: branchId || undefined, date,
        kassa: somKassa, somAmount: Number(som) || 0, somAccountId: somAccountId || undefined,
        dollarAmount: Number(usd) || undefined, dollarRate: Number(rate) || undefined,
        dollarKassa: Number(usd) ? usdKassa : undefined, dollarAccountId: Number(usd) ? usdAccountId || undefined : undefined,
        periodYear: year, periodMonth: month, note: note || undefined,
      }),
    onSuccess: onSaved,
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  const submit = () => {
    setError('');
    if (!employeeId) return setError('Xodimni tanlang');
    if ((Number(som) || 0) <= 0 && (Number(usd) || 0) <= 0) return setError('Summa kiriting');
    save.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="mt-8 w-full max-w-xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-800">Yangi maosh to&apos;lovi</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Filial <span className="text-rose-500">*</span></label><select value={branchId} onChange={(e) => { setBranchId(e.target.value); setSomAcc(''); setUsdAcc(''); }} className={inp}><option value="">Tanlang...</option>{branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
            <div>
              <label className={lbl}>Xodim / Lavozim <span className="text-rose-500">*</span></label>
              {selected ? (
                <div className="flex items-center justify-between rounded-lg border border-brand/40 bg-brand/5 px-3 py-2 text-sm"><span className="truncate font-medium text-slate-800">{selected.user.fullName}</span><button onClick={() => setEmployeeId('')} className="text-slate-400 hover:text-rose-500"><X size={14} /></button></div>
              ) : (
                <div className="relative"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} placeholder="Qidirish..." className={`${inp} pl-8`} /></div>
              )}
            </div>
          </div>
          {!selected && empSearch && (
            <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-200">
              {filtered.map((e: Employee) => (
                <button key={e.id} onClick={() => { setEmployeeId(e.id); setEmpSearch(''); }} className="block w-full border-b border-slate-50 px-3 py-1.5 text-left text-sm last:border-0 hover:bg-slate-50">{e.user.fullName} <span className="text-xs text-slate-400">{e.position?.name ?? ''}</span></button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-4 gap-3">
            <div><label className={lbl}>Sana</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Yil</label><select value={year} onChange={(e) => setYear(Number(e.target.value))} className={inp}>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select></div>
            <div><label className={lbl}>Oy</label><select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={inp}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>
            <div><label className={lbl}>O&apos;quv yili</label><select value={academicYear} onChange={(e) => setAY(e.target.value)} className={inp}>{AY.map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
          </div>

          {/* To'lov holati */}
          {status && (
            <div className="grid grid-cols-4 gap-2 rounded-xl bg-slate-50 p-3 text-center text-xs">
              <div><div className="text-slate-400">Hisoblangan</div><div className="font-semibold text-slate-700">{numFmt(status.hisoblangan)}</div></div>
              <div><div className="text-slate-400">Olingan</div><div className="font-semibold text-emerald-600">{numFmt(status.olingan)}</div></div>
              <div><div className="text-slate-400">Avvalgi qoldiq</div><div className="font-semibold text-amber-600">{numFmt(status.avvalgi)}</div></div>
              <div><div className="text-slate-400">Oy yakuni</div><div className={`font-semibold ${status.oyYakuni > 0 ? 'text-rose-600' : 'text-slate-700'}`}>{numFmt(status.oyYakuni)}</div></div>
            </div>
          )}

          {/* So'm to'lovi */}
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase text-slate-500">So&apos;m to&apos;lovi</span>{status && <button onClick={() => setSom(String(Math.max(0, status.oyYakuni)))} className="inline-flex items-center gap-1 text-xs text-brand hover:underline"><RotateCcw size={12} /> To&apos;liq</button>}</div>
            <input type="number" value={som} onChange={(e) => setSom(e.target.value)} placeholder="Summa" className={`${inp} mb-2`} />
            {somAcc && (Number(som) || 0) > 0 && <p className={`mb-2 rounded-lg px-2 py-1 text-xs ${somAcc.balance >= (Number(som) || 0) ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>Sarflash mumkin: {numFmt(somAcc.balance)}. Qoladi: {numFmt(somAcc.balance - (Number(som) || 0))}.</p>}
            <div className="grid grid-cols-2 gap-3">
              <select value={somKassa} onChange={(e) => setSomKassa(e.target.value)} className={inp}>{KASSA.map((k) => <option key={k}>{k}</option>)}</select>
              <select value={somAccountId} onChange={(e) => setSomAcc(e.target.value)} className={inp}><option value="">Hisob...</option>{somAccs?.filter((a) => a.kassaTuri === somKassa).map((a) => <option key={a.id} value={a.id}>{flowAccountLabel(a)}</option>)}</select>
            </div>
          </div>

          {/* Dollar to'lovi */}
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="mb-2 text-xs font-bold uppercase text-slate-500">Dollar to&apos;lovi <span className="font-normal normal-case text-slate-400">(ixtiyoriy)</span></div>
            <div className="mb-2 grid grid-cols-2 gap-3">
              <input type="number" value={usd} onChange={(e) => setUsd(e.target.value)} placeholder="Dollar" className={inp} />
              <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Kurs" className={inp} />
            </div>
            {(Number(usd) || 0) > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <select value={usdKassa} onChange={(e) => setUsdKassa(e.target.value)} className={inp}>{KASSA.map((k) => <option key={k}>{k}</option>)}</select>
                <select value={usdAccountId} onChange={(e) => setUsdAcc(e.target.value)} className={inp}><option value="">Hisob...</option>{usdAccs?.filter((a) => a.kassaTuri === usdKassa).map((a) => <option key={a.id} value={a.id}>{flowAccountLabel(a)}</option>)}</select>
              </div>
            )}
          </div>

          <div><label className={lbl}>Izoh</label><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ixtiyoriy" className={inp} /></div>
          {error && <p className="text-sm font-medium text-rose-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Bekor</button>
          <button onClick={submit} disabled={save.isPending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">{save.isPending ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </div>
      </div>
    </div>
  );
}
