'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeftRight } from 'lucide-react';
import { crmApi } from '@/lib/crm';
import { flowAccountsApi, flowAccountLabel, type FlowAccount } from '@/lib/flow-accounts';
import { internalTransfersApi, usd, type ItKind } from '@/lib/internal-transfers';
import { som } from '@/lib/counterparties';
import { ModalShell, inp, todayIso } from './flow-ui';

const KASSA = ['Naqd', 'Karta', 'Bank'];
const numFmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0));
const TITLES: Record<ItKind, { t: string; s: string }> = {
  SOM: { t: "Yangi so'm o'tkazma", s: 'Bir filial ichida — hisobdan hisobga pul ko\'chirish' },
  DOLLAR: { t: 'Yangi dollar o\'tkazma', s: 'Bir filial ichida — hisobdan hisobga pul ko\'chirish' },
  VALYUTA: { t: 'Yangi valyuta ayirboshlash', s: 'Dollar ↔ So\'m konvertatsiya' },
  PUL: { t: 'Yangi pul ayirboshlash', s: 'Bir valyuta ichida — kassadan kassaga pul ko\'chirish' },
};

function Sarflash({ acc, amount, dollar }: { acc?: FlowAccount; amount: number; dollar?: boolean }) {
  if (!acc) return null;
  const fmt = (n: number) => (dollar ? usd(n) : som(n));
  const ok = acc.balance >= amount;
  return (
    <div className={`mt-1.5 rounded-lg px-3 py-2 text-xs ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
      {ok ? '✓ ' : '⚠ '}Sarflash mumkin: {fmt(acc.balance)}. {ok ? `Qoladi: ${fmt(acc.balance - amount)}.` : 'Mablag’ yetarli emas.'}
    </div>
  );
}
const Tasdiq = () => (
  <div className="mt-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
    Saqlangandan keyin pul qabul qiluvchi hisob kassiri tomonidan alohida tasdiqlanadi.
  </div>
);
const lblSm = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500';
function Group({ title, tone, children }: { title: string; tone: 'rose' | 'emerald'; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border p-3 ${tone === 'rose' ? 'border-rose-100 bg-rose-50/40' : 'border-emerald-100 bg-emerald-50/40'}`}>
      <div className={`mb-2 text-xs font-bold uppercase ${tone === 'rose' ? 'text-rose-600' : 'text-emerald-600'}`}>{title}</div>
      {children}
    </div>
  );
}

export function InternalTransferForm({ kind, onClose, onSaved }: { kind: ItKind; onClose: () => void; onSaved: () => void }) {
  const [branchId, setBranchId] = useState('');
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  // umumiy
  const [kassaTuri, setKassa] = useState('Naqd');
  const [fromAccountId, setFrom] = useState('');
  const [toAccountId, setTo] = useState('');
  const [somAmount, setSomA] = useState('');
  const [dollarAmount, setUsd] = useState('');
  const [dollarRate, setRate] = useState('');
  // valyuta
  const [valDir, setValDir] = useState<'BUY' | 'SELL'>('BUY');
  const [dollarKassa, setDollarKassa] = useState('Naqd');
  const [dollarAccId, setDollarAcc] = useState('');
  const [somKassa, setSomKassa] = useState('Naqd');
  const [somAccId, setSomAcc] = useState('');
  // pul
  const [pulCur, setPulCur] = useState<'SOM' | 'USD'>('SOM');
  const [lossPct, setLossPct] = useState('');
  const [loss, setLoss] = useState('');

  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data: accs } = useQuery({ queryKey: ['flow-acc', branchId], queryFn: () => flowAccountsApi.list({ branchId: branchId || undefined, active: 'true' }) });
  const accsOf = (cur: 'SOM' | 'USD', kassa?: string) => (accs ?? []).filter((a) => a.currency === cur && (!kassa || a.kassaTuri === kassa));
  const byId = (id: string) => (accs ?? []).find((a) => a.id === id);

  const somN = Number(somAmount) || 0;
  const usdN = Number(dollarAmount) || 0;
  const rateN = Number(dollarRate) || 0;
  const valSom = usdN * rateN;
  const lossN = Number(loss) || 0;
  const isUsd = kind === 'DOLLAR';

  // Pul: valyuta bo'yicha summa
  const pulAmount = pulCur === 'USD' ? usdN : somN;

  const save = useMutation({
    mutationFn: () => {
      let payload: any = { kind, branchId: branchId || undefined, date: `${date}T${new Date().toTimeString().slice(0, 8)}`, note: note || undefined };
      if (kind === 'SOM') payload = { ...payload, fromAccountId, toAccountId, kassaTuri, somAmount: somN };
      else if (kind === 'DOLLAR') payload = { ...payload, fromAccountId, toAccountId, kassaTuri, dollarAmount: usdN, dollarRate: rateN || undefined };
      else if (kind === 'VALYUTA') {
        payload = {
          ...payload,
          fromAccountId: valDir === 'BUY' ? somAccId : dollarAccId,
          toAccountId: valDir === 'BUY' ? dollarAccId : somAccId,
          somAmount: valSom,
          dollarAmount: usdN,
          dollarRate: rateN,
        };
      } else {
        payload = {
          ...payload,
          fromAccountId,
          toAccountId,
          somAmount: pulCur === 'SOM' ? pulAmount : undefined,
          dollarAmount: pulCur === 'USD' ? pulAmount : undefined,
          loss: lossN || undefined,
        };
      }
      return internalTransfersApi.create(payload);
    },
    onSuccess: onSaved,
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  const submit = () => {
    setError('');
    if (kind === 'SOM') {
      if (!fromAccountId || !toAccountId) return setError('Hisoblarni tanlang');
      if (fromAccountId === toAccountId) return setError('Bir xil hisob');
      if (somN <= 0) return setError('So\'m summasini kiriting');
    } else if (kind === 'DOLLAR') {
      if (!fromAccountId || !toAccountId) return setError('Hisoblarni tanlang');
      if (fromAccountId === toAccountId) return setError('Bir xil hisob');
      if (usdN <= 0) return setError('Dollar summasini kiriting');
    } else if (kind === 'VALYUTA') {
      if (!somAccId || !dollarAccId) return setError('Har ikki hisobni tanlang');
      if (usdN <= 0) return setError('Dollar summasini kiriting');
      if (rateN <= 0) return setError('Kursni kiriting');
    } else {
      if (!fromAccountId || !toAccountId) return setError('Hisoblarni tanlang');
      if (fromAccountId === toAccountId) return setError('Bir xil hisob');
      if (pulAmount <= 0) return setError('Summani kiriting');
    }
    save.mutate();
  };

  const footer = (
    <>
      <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Bekor</button>
      <button onClick={submit} disabled={save.isPending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
        {save.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
      </button>
    </>
  );
  const T = TITLES[kind];
  const filialSelect = (
    <div>
      <label className={lblSm}>Filial <span className="text-rose-500">*</span></label>
      <select value={branchId} onChange={(e) => { setBranchId(e.target.value); setFrom(''); setTo(''); setSomAcc(''); setDollarAcc(''); }} className={inp}>
        <option value="">Tanlang...</option>
        {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
    </div>
  );
  const dateInput = (
    <div>
      <label className={lblSm}>Sana <span className="text-rose-500">*</span></label>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
    </div>
  );
  const izoh = (
    <div>
      <label className={lblSm}>Izoh</label>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inp} />
    </div>
  );

  return (
    <ModalShell title={T.t} subtitle={T.s} icon={ArrowLeftRight} onClose={onClose} footer={footer}>
      <div className="space-y-4 px-6 py-5">
        {/* ===== Valyuta yo'nalishi ===== */}
        {kind === 'VALYUTA' && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setValDir('BUY')} className={`rounded-lg border p-2 text-sm ${valDir === 'BUY' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}>
              <div className="font-semibold">Dollar olamiz</div><div className="text-xs opacity-70">+$ / −so&apos;m</div>
            </button>
            <button type="button" onClick={() => setValDir('SELL')} className={`rounded-lg border p-2 text-sm ${valDir === 'SELL' ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-500'}`}>
              <div className="font-semibold">Dollar sotamiz</div><div className="text-xs opacity-70">−$ / +so&apos;m</div>
            </button>
          </div>
        )}

        {filialSelect}

        {/* ===== SANA + (kassa turi / valyuta) ===== */}
        {kind === 'SOM' || kind === 'DOLLAR' ? (
          <div className="grid grid-cols-2 gap-4">
            {dateInput}
            <div>
              <label className={lblSm}>Kassa turi <span className="text-rose-500">*</span></label>
              <select value={kassaTuri} onChange={(e) => { setKassa(e.target.value); setFrom(''); setTo(''); }} className={inp}>{KASSA.map((k) => <option key={k}>{k}</option>)}</select>
            </div>
          </div>
        ) : kind === 'PUL' ? (
          <div className="grid grid-cols-2 gap-4">
            {dateInput}
            <div>
              <label className={lblSm}>Valyuta <span className="text-rose-500">*</span></label>
              <select value={pulCur} onChange={(e) => { setPulCur(e.target.value as any); setFrom(''); setTo(''); }} className={inp}><option value="SOM">So&apos;m</option><option value="USD">Dollar</option></select>
            </div>
          </div>
        ) : (
          dateInput
        )}

        {/* ===== SOM ===== */}
        {kind === 'SOM' && (
          <>
            <div>
              <label className={lblSm}>So&apos;m summasi <span className="text-rose-500">*</span></label>
              <input type="number" min={0} step="0.01" value={somAmount} onChange={(e) => setSomA(e.target.value)} placeholder="0" className={inp} />
              <p className="mt-1 text-xs text-slate-400">Tiyin uchun nuqta yoki vergul kiriting — ko&apos;pi bilan 2 xona.</p>
            </div>
            <div>
              <label className={lblSm}>Jo&apos;natuvchi hisob <span className="text-rose-500">*</span></label>
              <select value={fromAccountId} onChange={(e) => setFrom(e.target.value)} className={inp}>
                <option value="">Tanlang...</option>
                {accsOf('SOM', kassaTuri).map((a) => <option key={a.id} value={a.id}>{flowAccountLabel(a)}</option>)}
              </select>
              <Sarflash acc={byId(fromAccountId)} amount={somN} />
            </div>
            <div>
              <label className={lblSm}>Qabul qiluvchi hisob <span className="text-rose-500">*</span></label>
              <select value={toAccountId} onChange={(e) => setTo(e.target.value)} className={inp}>
                <option value="">Tanlang...</option>
                {accsOf('SOM').filter((a) => a.id !== fromAccountId).map((a) => <option key={a.id} value={a.id}>{flowAccountLabel(a)}</option>)}
              </select>
              {toAccountId && <Tasdiq />}
            </div>
            {izoh}
            <div className="text-sm text-slate-500">Jami summa: <span className="font-semibold text-slate-800">{som(somN)}</span></div>
          </>
        )}

        {/* ===== DOLLAR ===== */}
        {kind === 'DOLLAR' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={lblSm}>Dollar summasi <span className="text-rose-500">*</span></label><input type="number" min={0} step="0.01" value={dollarAmount} onChange={(e) => setUsd(e.target.value)} placeholder="$" className={inp} /></div>
              <div><label className={lblSm}>Kurs <span className="text-rose-500">*</span></label><input type="number" min={0} value={dollarRate} onChange={(e) => setRate(e.target.value)} placeholder="Dollar kursi" className={inp} /></div>
            </div>
            <div>
              <label className={lblSm}>Jo&apos;natuvchi hisob <span className="text-rose-500">*</span></label>
              <select value={fromAccountId} onChange={(e) => setFrom(e.target.value)} className={inp}>
                <option value="">Tanlang...</option>
                {accsOf('USD', kassaTuri).map((a) => <option key={a.id} value={a.id}>{flowAccountLabel(a)}</option>)}
              </select>
              <Sarflash acc={byId(fromAccountId)} amount={usdN} dollar />
            </div>
            <div>
              <label className={lblSm}>Qabul qiluvchi hisob <span className="text-rose-500">*</span></label>
              <select value={toAccountId} onChange={(e) => setTo(e.target.value)} className={inp}>
                <option value="">Tanlang...</option>
                {accsOf('USD').filter((a) => a.id !== fromAccountId).map((a) => <option key={a.id} value={a.id}>{flowAccountLabel(a)}</option>)}
              </select>
              {accsOf('USD').filter((a) => a.id !== fromAccountId).length === 0 && <p className="mt-1 text-xs text-amber-600">Bu filialda mos kassa topilmadi</p>}
              {toAccountId && <Tasdiq />}
            </div>
            {izoh}
            <div className="text-sm text-slate-500">Jami summa: <span className="font-semibold text-slate-800">{usd(usdN)} ≈ {som(valSom)}</span></div>
          </>
        )}

        {/* ===== VALYUTA ===== */}
        {kind === 'VALYUTA' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={lblSm}>Dollar summasi <span className="text-rose-500">*</span></label><input type="number" min={0} step="0.01" value={dollarAmount} onChange={(e) => setUsd(e.target.value)} placeholder="$" className={inp} /></div>
              <div><label className={lblSm}>Kurs <span className="text-rose-500">*</span></label><input type="number" min={0} value={dollarRate} onChange={(e) => setRate(e.target.value)} placeholder="Dollar kursi" className={inp} /></div>
            </div>
            <Group title="Dollar tomon (kirim +)" tone="emerald">
              <div className="grid grid-cols-2 gap-3">
                <select value={dollarKassa} onChange={(e) => { setDollarKassa(e.target.value); setDollarAcc(''); }} className={inp}>{KASSA.map((k) => <option key={k}>{k}</option>)}</select>
                <select value={dollarAccId} onChange={(e) => setDollarAcc(e.target.value)} className={inp}>
                  <option value="">Hisob...</option>
                  {accsOf('USD', dollarKassa).map((a) => <option key={a.id} value={a.id}>{flowAccountLabel(a)}</option>)}
                </select>
              </div>
            </Group>
            <Group title="So'm tomon (chiqim −)" tone="rose">
              <div className="grid grid-cols-2 gap-3">
                <select value={somKassa} onChange={(e) => { setSomKassa(e.target.value); setSomAcc(''); }} className={inp}>{KASSA.map((k) => <option key={k}>{k}</option>)}</select>
                <select value={somAccId} onChange={(e) => setSomAcc(e.target.value)} className={inp}>
                  <option value="">Hisob...</option>
                  {accsOf('SOM', somKassa).map((a) => <option key={a.id} value={a.id}>{flowAccountLabel(a)}</option>)}
                </select>
              </div>
              {valDir === 'BUY' && byId(somAccId) && byId(somAccId)!.balance < valSom && (
                <p className="mt-2 text-xs text-rose-600">Mablag&apos; yetarli emas: {som(byId(somAccId)!.balance)} mavjud, {som(valSom)} kiritilgan.</p>
              )}
            </Group>
            {izoh}
            <div className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700">
              {valDir === 'BUY' ? 'Olamiz' : 'Sotamiz'}: {usd(usdN)} × {numFmt(rateN)} = {som(valSom)}
            </div>
          </>
        )}

        {/* ===== PUL ===== */}
        {kind === 'PUL' && (
          <>
            <Group title="Manba (chiqim −)" tone="rose">
              <div className="mb-2 grid grid-cols-2 gap-3">
                <select value={kassaTuri} onChange={(e) => { setKassa(e.target.value); setFrom(''); }} className={inp}>{KASSA.map((k) => <option key={k}>{k}</option>)}</select>
                <select value={fromAccountId} onChange={(e) => setFrom(e.target.value)} className={inp}>
                  <option value="">Hisob...</option>
                  {accsOf(pulCur, kassaTuri).map((a) => <option key={a.id} value={a.id}>{flowAccountLabel(a)}</option>)}
                </select>
              </div>
              <input type="number" min={0} step="0.01" value={pulCur === 'USD' ? dollarAmount : somAmount} onChange={(e) => (pulCur === 'USD' ? setUsd(e.target.value) : setSomA(e.target.value))} placeholder={`Summasi (${pulCur === 'USD' ? '$' : "so'm"})`} className={inp} />
              <Sarflash acc={byId(fromAccountId)} amount={pulAmount} dollar={pulCur === 'USD'} />
            </Group>
            <Group title="Maqsad (kirim +)" tone="emerald">
              <div className="grid grid-cols-2 gap-3">
                <select value={somKassa} onChange={(e) => { setSomKassa(e.target.value); setTo(''); }} className={inp}>{KASSA.map((k) => <option key={k}>{k}</option>)}</select>
                <select value={toAccountId} onChange={(e) => setTo(e.target.value)} className={inp}>
                  <option value="">Hisob...</option>
                  {accsOf(pulCur, somKassa).filter((a) => a.id !== fromAccountId).map((a) => <option key={a.id} value={a.id}>{flowAccountLabel(a)}</option>)}
                </select>
              </div>
            </Group>
            <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
              <div className="mb-1 text-xs font-bold uppercase text-amber-600">Yo&apos;qotish (komissiya, ko&apos;pi bilan 5%)</div>
              <p className="mb-2 text-xs text-slate-500">Yo&apos;qotish kiritilsa, amal boshqa vakolatli xodim tasdig&apos;iga yuboriladi.</p>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" min={0} max={5} step="0.01" value={lossPct} onChange={(e) => { const p = Math.min(5, Number(e.target.value) || 0); setLossPct(e.target.value); setLoss(String(+(pulAmount * p / 100).toFixed(2))); }} placeholder="Foiz %" className={inp} />
                <input type="number" min={0} value={loss} onChange={(e) => setLoss(e.target.value)} placeholder="Yo'qotish summasi" className={inp} />
              </div>
            </div>
            {izoh}
            <div className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700">
              Maqsadga yetib boradi: <span className="font-semibold">{pulCur === 'USD' ? usd(pulAmount - lossN) : som(pulAmount - lossN)}</span> {lossN > 0 && <span className="text-xs text-slate-500">(yo&apos;qotish: {pulCur === 'USD' ? usd(lossN) : som(lossN)})</span>}
            </div>
          </>
        )}

        {error && <p className="text-sm font-medium text-rose-500">{error}</p>}
      </div>
    </ModalShell>
  );
}
