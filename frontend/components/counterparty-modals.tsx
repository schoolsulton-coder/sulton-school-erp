'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, Plus, ArrowLeftRight } from 'lucide-react';
import { crmApi } from '@/lib/crm';
import { counterpartiesApi, som, SABAB_OPTIONS, type CpCategory } from '@/lib/counterparties';
import { ModalShell, inp, lbl, todayIso } from './flow-ui';

/* ===== Yangi oldi-berdichi ===== */
export function NewCounterpartyModal({
  category,
  onClose,
  onSaved,
}: {
  category: CpCategory;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [branchId, setBranchId] = useState('');
  const [filiallararo, setFiliallararo] = useState(false);
  const [error, setError] = useState('');

  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });

  const save = useMutation({
    mutationFn: () =>
      counterpartiesApi.create({ name: name.trim(), branchId: branchId || undefined, category, filiallararo }),
    onSuccess: onSaved,
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  const submit = () => {
    setError('');
    if (!name.trim()) return setError('Ism kiriting');
    if (!branchId) return setError('Filial tanlang');
    save.mutate();
  };

  return (
    <ModalShell
      title="Yangi oldi-berdichi"
      subtitle="Kontragent (shaxs yoki tashkilot)"
      icon={UserPlus}
      onClose={onClose}
      footer={<SaveFooter onClose={onClose} pending={save.isPending} onSave={submit} />}
    >
      <div className="space-y-4 px-6 py-5">
        <div>
          <label className={lbl}>
            Ism <span className="text-rose-500">*</span>
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Aziz Rakhimov" className={inp} autoFocus />
        </div>
        <div>
          <label className={lbl}>
            Filial <span className="text-rose-500">*</span>
          </label>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inp}>
            <option value="">Tanlang...</option>
            {branches?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={lbl}>
            Filiallararo (transferlarda ko&apos;rinadimi?) <span className="text-rose-500">*</span>
          </label>
          <select value={filiallararo ? '1' : '0'} onChange={(e) => setFiliallararo(e.target.value === '1')} className={inp}>
            <option value="0">Yo&apos;q (oddiy oldi-berdichi)</option>
            <option value="1">Ha (filiallararo — transferlarda)</option>
          </select>
        </div>
        {error && <p className="text-sm font-medium text-rose-500">{error}</p>}
      </div>
    </ModalShell>
  );
}

/* ===== Yangi tranzaksiya (oldi-berdi kirim/chiqim) ===== */
export function NewTransactionModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [counterpartyId, setCp] = useState('');
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [date, setDate] = useState(todayIso());
  const [sabab, setSabab] = useState(SABAB_OPTIONS[0]);
  const [som_, setSom] = useState('');
  const [hasUsd, setHasUsd] = useState(false);
  const [usd, setUsd] = useState('');
  const [rate, setRate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const { data: list } = useQuery({
    queryKey: ['counterparties', 'OLDI_BERDICHI', 'all'],
    queryFn: () => counterpartiesApi.list({ category: 'OLDI_BERDICHI' }),
  });

  const somN = Number(som_) || 0;
  const usdN = hasUsd ? Number(usd) || 0 : 0;
  const rateN = Number(rate) || 0;
  const total = somN + usdN * rateN;

  const save = useMutation({
    mutationFn: () =>
      counterpartiesApi.addEntry(counterpartyId, {
        direction,
        somAmount: somN || undefined,
        dollarAmount: usdN || undefined,
        dollarRate: usdN > 0 ? rateN : undefined,
        sabab,
        date: `${date}T${new Date().toTimeString().slice(0, 8)}`,
        note: note || undefined,
      }),
    onSuccess: onSaved,
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  const submit = () => {
    setError('');
    if (!counterpartyId) return setError('Oldi-berdichini tanlang');
    if (usdN > 0 && rateN <= 0) return setError('Dollar kursini kiriting');
    if (total <= 0) return setError("Summa noto'g'ri");
    save.mutate();
  };

  return (
    <ModalShell
      title="Yangi tranzaksiya"
      subtitle="Oldi-berdi kirim/chiqim"
      icon={Plus}
      onClose={onClose}
      footer={<SaveFooter onClose={onClose} pending={save.isPending} onSave={submit} />}
    >
      <div className="space-y-4 px-6 py-5">
        <div>
          <label className={lbl}>
            Oldi-berdichi <span className="text-rose-500">*</span>
          </label>
          <select value={counterpartyId} onChange={(e) => setCp(e.target.value)} className={inp}>
            <option value="">—</option>
            {list?.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.branch ? ` — ${c.branch.name}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={lbl}>
            Turi <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection('IN')}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${direction === 'IN' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}
            >
              Kirim (bizga)
            </button>
            <button
              type="button"
              onClick={() => setDirection('OUT')}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${direction === 'OUT' ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-500'}`}
            >
              Chiqim (bizdan)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl}>
              Sana <span className="text-rose-500">*</span>
            </label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>
              Sabab <span className="text-rose-500">*</span>
            </label>
            <select value={sabab} onChange={(e) => setSabab(e.target.value)} className={inp}>
              {SABAB_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={lbl}>So&apos;m summasi (ixtiyoriy — faqat dollar ham bo&apos;ladi)</label>
          <input type="number" min={0} value={som_} onChange={(e) => setSom(e.target.value)} placeholder="0" className={inp} />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={hasUsd} onChange={(e) => setHasUsd(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Dollar ham bor
        </label>
        {hasUsd && (
          <div className="grid grid-cols-2 gap-3">
            <input type="number" min={0} value={usd} onChange={(e) => setUsd(e.target.value)} placeholder="Dollar" className={inp} />
            <input type="number" min={0} value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Dollar kursi" className={inp} />
          </div>
        )}

        <div className="text-sm text-slate-500">
          Kassaga ta&apos;siri:{' '}
          <span className={`font-semibold ${direction === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
            {direction === 'IN' ? '+' : '−'}
            {som(total)}
          </span>{' '}
          <span className="text-xs text-slate-400">({direction === 'IN' ? 'bizga kirdi' : 'bizdan chiqdi'})</span>
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

/* ===== Kontragent detali + yozuvlar ===== */
export function CounterpartyDetailModal({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['counterparty', id], queryFn: () => counterpartiesApi.get(id) });

  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['counterparty', id] });
    onChanged();
  };

  const add = useMutation({
    mutationFn: () =>
      counterpartiesApi.addEntry(id, {
        direction,
        somAmount: Number(amount),
        date: `${date}T${new Date().toTimeString().slice(0, 8)}`,
        note: note || undefined,
      }),
    onSuccess: () => {
      setAmount('');
      setNote('');
      setError('');
      refresh();
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  const del = useMutation({
    mutationFn: () => counterpartiesApi.remove(id),
    onSuccess: () => {
      onChanged();
      onClose();
    },
  });

  const kirim = (data?.entries ?? []).filter((e) => e.direction === 'IN').reduce((s, e) => s + e.amount, 0);
  const chiqim = (data?.entries ?? []).filter((e) => e.direction === 'OUT').reduce((s, e) => s + e.amount, 0);
  const balans = chiqim - kirim;

  const submit = () => {
    setError('');
    if (!(Number(amount) > 0)) return setError("Summa noto'g'ri");
    add.mutate();
  };

  return (
    <ModalShell
      title={data?.name ?? 'Kontragent'}
      subtitle={data?.branch?.name ?? undefined}
      icon={ArrowLeftRight}
      onClose={onClose}
      footer={
        <>
          <button
            onClick={() => {
              if (confirm("Kontragent va uning barcha yozuvlari o'chirilsinmi?")) del.mutate();
            }}
            className="mr-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-500 hover:bg-rose-50"
          >
            <Trash2 size={15} /> O&apos;chirish
          </button>
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
            Yopish
          </button>
        </>
      }
    >
      <div className="space-y-4 px-6 py-5">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl bg-emerald-50 p-3">
            <div className="text-xs text-emerald-600">Kirim</div>
            <div className="font-semibold text-emerald-700">{som(kirim)}</div>
          </div>
          <div className="rounded-xl bg-amber-50 p-3">
            <div className="text-xs text-amber-600">Chiqim</div>
            <div className="font-semibold text-amber-700">{som(chiqim)}</div>
          </div>
          <div className={`rounded-xl p-3 ${balans >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
            <div className={`text-xs ${balans >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Balans</div>
            <div className={`font-semibold ${balans >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{som(balans)}</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-3">
          <div className="mb-2 inline-flex rounded-lg bg-slate-100 p-1">
            <button onClick={() => setDirection('IN')} className={`rounded-md px-3 py-1 text-sm font-medium ${direction === 'IN' ? 'bg-emerald-500 text-white' : 'text-slate-500'}`}>
              Kirim
            </button>
            <button onClick={() => setDirection('OUT')} className={`rounded-md px-3 py-1 text-sm font-medium ${direction === 'OUT' ? 'bg-amber-500 text-white' : 'text-slate-500'}`}>
              Chiqim
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Summa (so'm)" className={inp} />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
          </div>
          <div className="mt-2 flex gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Izoh (ixtiyoriy)" className={inp} />
            <button onClick={submit} disabled={add.isPending} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
              <Plus size={15} /> Qo&apos;shish
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
        </div>

        <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2">Sana</th>
                <th className="px-3 py-2">Sabab / Izoh</th>
                <th className="px-3 py-2 text-right">Kirim</th>
                <th className="px-3 py-2 text-right">Chiqim</th>
              </tr>
            </thead>
            <tbody>
              {data?.entries.length ? (
                data.entries.map((e) => (
                  <tr key={e.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-500">{new Date(e.date).toLocaleDateString('uz-UZ')}</td>
                    <td className="px-3 py-2 text-slate-500">{e.note ?? '—'}</td>
                    <td className="px-3 py-2 text-right font-medium text-emerald-600">
                      {e.direction === 'IN' ? som(e.amount) : <span className="text-slate-300">−</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-amber-600">
                      {e.direction === 'OUT' ? som(e.amount) : <span className="text-slate-300">−</span>}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                    Yozuv yo&apos;q
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ModalShell>
  );
}

function SaveFooter({ onClose, pending, onSave }: { onClose: () => void; pending: boolean; onSave: () => void }) {
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
