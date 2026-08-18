'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, UserPlus, TrendingUp } from 'lucide-react';
import { crmApi } from '@/lib/crm';
import { financeApi } from '@/lib/finance';
import { counterpartiesApi, som, KASSA_TURI, INVEST_TYPES, MONTHS } from '@/lib/counterparties';
import { ModalShell, inp, lbl, todayIso } from './flow-ui';

const nowYear = () => new Date().getFullYear();
const academicYears = () => Array.from({ length: 5 }, (_, i) => `${2024 + i}-${2025 + i}`);

function Footer({ onClose, pending, onSave }: { onClose: () => void; pending: boolean; onSave: () => void }) {
  return (
    <>
      <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
        Bekor
      </button>
      <button onClick={onSave} disabled={pending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
        {pending ? 'Saqlanmoqda...' : 'Saqlash'}
      </button>
    </>
  );
}

/* ===== Yangi transfer (jo'natuvchi → qabul qiluvchi) ===== */
export function NewTransferModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [fromId, setFrom] = useState('');
  const [toId, setTo] = useState('');
  const [date, setDate] = useState(todayIso());
  const [somOn, setSomOn] = useState(true);
  const [somV, setSomV] = useState('');
  const [usdOn, setUsdOn] = useState(false);
  const [usdV, setUsdV] = useState('');
  const [rate, setRate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  // Transfer ishtirokchilari — filiallararo oldi-berdichilar
  const { data: list } = useQuery({
    queryKey: ['counterparties', 'OLDI_BERDICHI', 'true', 'transfer'],
    queryFn: () => counterpartiesApi.list({ category: 'OLDI_BERDICHI', filiallararo: 'true' }),
  });

  const somN = somOn ? Number(somV) || 0 : 0;
  const usdN = usdOn ? Number(usdV) || 0 : 0;
  const rateN = Number(rate) || 0;
  const total = somN + usdN * rateN;

  const save = useMutation({
    mutationFn: () =>
      counterpartiesApi.transfer({
        fromId,
        toId,
        somAmount: somN || undefined,
        dollarAmount: usdN || undefined,
        dollarRate: usdN > 0 ? rateN : undefined,
        date: `${date}T${new Date().toTimeString().slice(0, 8)}`,
        note: note || undefined,
      }),
    onSuccess: onSaved,
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  const submit = () => {
    setError('');
    if (!fromId) return setError('Jo\'natuvchini tanlang');
    if (!toId) return setError('Qabul qiluvchini tanlang');
    if (fromId === toId) return setError('Bir xil kontragent tanlandi');
    if (usdN > 0 && rateN <= 0) return setError('Dollar kursini kiriting');
    if (total <= 0) return setError("Summa noto'g'ri");
    save.mutate();
  };

  const opts = list?.data ?? [];

  return (
    <ModalShell
      title="Yangi transfer"
      subtitle="Jo'natuvchi (Chiqim) → Qabul qiluvchi (Kirim)"
      icon={ArrowLeftRight}
      onClose={onClose}
      footer={<Footer onClose={onClose} pending={save.isPending} onSave={submit} />}
    >
      <div className="space-y-4 px-6 py-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl}>Jo&apos;natuvchi <span className="text-rose-500">*</span></label>
            <select value={fromId} onChange={(e) => setFrom(e.target.value)} className={inp}>
              <option value="">—</option>
              {opts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Qabul qiluvchi <span className="text-rose-500">*</span></label>
            <select value={toId} onChange={(e) => setTo(e.target.value)} className={inp}>
              <option value="">—</option>
              {opts.filter((c) => c.id !== fromId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={lbl}>Sana <span className="text-rose-500">*</span></label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={somOn} onChange={(e) => setSomOn(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          So&apos;mda
        </label>
        {somOn && <input type="number" min={0} value={somV} onChange={(e) => setSomV(e.target.value)} placeholder="So'm summasi" className={inp} />}

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={usdOn} onChange={(e) => setUsdOn(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Dollarda
        </label>
        {usdOn && (
          <div className="grid grid-cols-2 gap-3">
            <input type="number" min={0} value={usdV} onChange={(e) => setUsdV(e.target.value)} placeholder="Dollar" className={inp} />
            <input type="number" min={0} value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Dollar kursi" className={inp} />
          </div>
        )}

        <div className="text-sm text-slate-500">Jami: <span className="font-semibold text-slate-700">{som(total)}</span></div>

        <div>
          <label className={lbl}>Izoh</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inp} />
        </div>

        {error && <p className="text-sm font-medium text-rose-500">{error}</p>}
      </div>
    </ModalShell>
  );
}

/* ===== Yangi investor (ko'p filial) ===== */
export function NewInvestorModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });

  const toggle = (id: string) =>
    setBranchIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = useMutation({
    mutationFn: () => counterpartiesApi.create({ name: name.trim(), category: 'INVESTOR', branchIds }),
    onSuccess: onSaved,
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  const submit = () => {
    setError('');
    if (!name.trim()) return setError('Ism kiriting');
    if (!branchIds.length) return setError('Kamida bitta filial tanlang');
    save.mutate();
  };

  return (
    <ModalShell
      title="Yangi investor"
      subtitle="Investor bir necha filialga tegishli bo'lishi mumkin"
      icon={UserPlus}
      onClose={onClose}
      footer={<Footer onClose={onClose} pending={save.isPending} onSave={submit} />}
    >
      <div className="space-y-4 px-6 py-5">
        <div>
          <label className={lbl}>Ism <span className="text-rose-500">*</span></label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inp} autoFocus />
        </div>
        <div>
          <label className={lbl}>Filial(lar) <span className="text-rose-500">*</span></label>
          <div className="space-y-1.5 rounded-xl border border-slate-200 p-3">
            {branches?.map((b) => (
              <label key={b.id} className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={branchIds.includes(b.id)} onChange={() => toggle(b.id)} className="h-4 w-4 rounded border-slate-300" />
                {b.name}
              </label>
            ))}
          </div>
          <div className="mt-1 text-xs text-slate-400">{branchIds.length} ta tanlandi</div>
        </div>
        {error && <p className="text-sm font-medium text-rose-500">{error}</p>}
      </div>
    </ModalShell>
  );
}

/* ===== Yangi investitsiya ===== */
export function NewInvestmentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [branchId, setBranchId] = useState('');
  const [investorId, setInvestor] = useState('');
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [date, setDate] = useState(todayIso());
  const [year, setYear] = useState(nowYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [academicYear, setAcademic] = useState(academicYears()[2]);
  const [investType, setInvestType] = useState('');
  const [somOn, setSomOn] = useState(true);
  const [somV, setSomV] = useState('');
  const [kassaTuri, setKassa] = useState(KASSA_TURI[0]);
  const [accountId, setAccount] = useState('');
  const [usdOn, setUsdOn] = useState(false);
  const [usdV, setUsdV] = useState('');
  const [rate, setRate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data: accounts } = useQuery({ queryKey: ['fin-accounts'], queryFn: financeApi.accounts });
  const { data: investors } = useQuery({
    queryKey: ['counterparties', 'INVESTOR', 'all'],
    queryFn: () => counterpartiesApi.list({ category: 'INVESTOR' }),
  });

  const somN = somOn ? Number(somV) || 0 : 0;
  const usdN = usdOn ? Number(usdV) || 0 : 0;
  const rateN = Number(rate) || 0;
  const total = somN + usdN * rateN;

  const save = useMutation({
    mutationFn: () =>
      counterpartiesApi.addEntry(investorId, {
        direction,
        somAmount: somN || undefined,
        dollarAmount: usdN || undefined,
        dollarRate: usdN > 0 ? rateN : undefined,
        kassaTuri: somN > 0 ? kassaTuri : undefined,
        accountId: somN > 0 ? accountId || undefined : undefined,
        branchId: branchId || undefined,
        periodYear: year,
        periodMonth: month,
        academicYear,
        investType: investType || undefined,
        date: `${date}T${new Date().toTimeString().slice(0, 8)}`,
        note: note || undefined,
      }),
    onSuccess: onSaved,
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  const submit = () => {
    setError('');
    if (!branchId) return setError('Filial tanlang');
    if (!investorId) return setError('Investorni tanlang');
    if (usdN > 0 && rateN <= 0) return setError('Dollar kursini kiriting');
    if (total <= 0) return setError("Summa noto'g'ri");
    save.mutate();
  };

  return (
    <ModalShell
      title="Yangi investitsiya"
      subtitle="Investor pul kiritishi yoki dividend"
      icon={TrendingUp}
      onClose={onClose}
      footer={<Footer onClose={onClose} pending={save.isPending} onSave={submit} />}
    >
      <div className="space-y-4 px-6 py-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl}>Filial <span className="text-rose-500">*</span></label>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inp}>
              <option value="">Tanlang...</option>
              {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Investor <span className="text-rose-500">*</span></label>
            <select value={investorId} onChange={(e) => setInvestor(e.target.value)} className={inp}>
              <option value="">—</option>
              {investors?.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={lbl}>Turi <span className="text-rose-500">*</span></label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setDirection('IN')} className={`rounded-lg border px-3 py-2 text-sm font-medium ${direction === 'IN' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}>
              Kirim <span className="text-xs opacity-70">(investor pul kirgizdi)</span>
            </button>
            <button type="button" onClick={() => setDirection('OUT')} className={`rounded-lg border px-3 py-2 text-sm font-medium ${direction === 'OUT' ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-500'}`}>
              Chiqim <span className="text-xs opacity-70">(dividend va h.k.)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl}>Sana <span className="text-rose-500">*</span></label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Hisobot davri <span className="text-rose-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={inp}>
                {[nowYear() - 1, nowYear(), nowYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={inp}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl}>O&apos;quv yili <span className="text-rose-500">*</span></label>
            <select value={academicYear} onChange={(e) => setAcademic(e.target.value)} className={inp}>
              {academicYears().map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Investitsiya turi</label>
            <select value={investType} onChange={(e) => setInvestType(e.target.value)} className={inp}>
              <option value="">—</option>
              {INVEST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={somOn} onChange={(e) => setSomOn(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          So&apos;mda
        </label>
        {somOn && (
          <div className="space-y-2 rounded-xl bg-slate-50 p-3">
            <input type="number" min={0} value={somV} onChange={(e) => setSomV(e.target.value)} placeholder="So'm summasi" className={inp} />
            <div className="grid grid-cols-2 gap-2">
              <select value={kassaTuri} onChange={(e) => setKassa(e.target.value)} className={inp}>
                {KASSA_TURI.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <select value={accountId} onChange={(e) => setAccount(e.target.value)} className={inp}>
                <option value="">Hisob —</option>
                {accounts?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={usdOn} onChange={(e) => setUsdOn(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Dollarda
        </label>
        {usdOn && (
          <div className="grid grid-cols-2 gap-3">
            <input type="number" min={0} value={usdV} onChange={(e) => setUsdV(e.target.value)} placeholder="Dollar" className={inp} />
            <input type="number" min={0} value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Dollar kursi" className={inp} />
          </div>
        )}

        <div className="text-sm text-slate-500">
          Jami summa: <span className={`font-semibold ${direction === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>{direction === 'IN' ? '+' : '−'}{som(total)}</span>
        </div>

        <div>
          <label className={lbl}>Izoh</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inp} />
        </div>

        {error && <p className="text-sm font-medium text-rose-500">{error}</p>}
      </div>
    </ModalShell>
  );
}
