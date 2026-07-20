'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle2, Pencil, Trash2, Save } from 'lucide-react';
import { paymentsApi, money, KASSA_TYPES } from '@/lib/payments';
import { financeApi } from '@/lib/finance';

const UZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('uz-UZ') : '—');
const fmtDateTime = (iso?: string | null) =>
  iso ? `${new Date(iso).toLocaleDateString('uz-UZ')} ${new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}` : '—';
const isCash = (m?: string | null) => /naqd|nal/i.test(m ?? '');

export function PaymentDetailModal({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDate, setConfirmDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: p } = useQuery({
    queryKey: ['payment', id],
    queryFn: () => paymentsApi.get(id),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['payment', id] });
    qc.invalidateQueries({ queryKey: ['payments'] });
    onChanged();
  };

  const confirm = useMutation({
    mutationFn: () => paymentsApi.confirm(id, confirmDate),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: () => paymentsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      onChanged();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-2xl overflow-y-auto bg-slate-50 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <span className="font-bold text-slate-800">To&apos;lov ma&apos;lumoti</span>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        {!p ? (
          <div className="p-8 text-slate-400">Yuklanmoqda...</div>
        ) : (
          <div className="space-y-4 p-6">
            {/* Tasdiqlash paneli */}
            {isCash(p.method) ? (
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                <CheckCircle2 size={18} className="text-slate-400" /> Naqd to‘lov — tasdiqlash shart emas.
              </div>
            ) : !p.confirmedAt ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-amber-500">Tasdiqlash · Tasdiqlashga</div>
                  <p className="text-sm text-amber-700">Hisobdan tushgani tekshirilib tasdiqlanishi kerak.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="date" value={confirmDate} onChange={(e) => setConfirmDate(e.target.value)} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none" />
                  <button onClick={() => confirm.mutate()} disabled={confirm.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                    <CheckCircle2 size={16} /> Tasdiqlash
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 size={18} />
                  <span className="text-sm font-semibold">Tasdiqlangan · {fmtDate(p.confirmedAt)}</span>
                </div>
                <button onClick={() => confirm.mutate()} disabled={confirm.isPending} className="rounded-lg border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60">
                  Tasdiqni bekor qilish
                </button>
              </div>
            )}

            {/* To'lov header */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">To&apos;lov · {fmtDate(p.paidAt)}</div>
                  <div className={`text-3xl font-bold ${p.isRefund ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {p.isRefund ? '− ' : ''}{money(p.amount)}
                  </div>
                  <div className="text-sm text-slate-500">
                    {p.student ? `${p.student.lastName} ${p.student.firstName}` : '—'}
                    {p.contract?.number ? ` · ${p.contract.number}` : ''}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setEditing((v) => !v)}
                    disabled={!!p.confirmedAt}
                    title={p.confirmedAt ? 'Avval tasdiqni bekor qiling' : undefined}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Pencil size={14} /> Tahrirlash
                  </button>
                  <button
                    onClick={() => { if (window.confirm("To'lovni o'chirishni tasdiqlaysizmi?")) remove.mutate(); }}
                    disabled={remove.isPending || !!p.confirmedAt}
                    title={p.confirmedAt ? 'Avval tasdiqni bekor qiling' : undefined}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={14} /> O&apos;chirish
                  </button>
                </div>
              </div>
            </div>

            {editing && <EditForm p={p} onDone={() => { setEditing(false); refresh(); }} />}

            {/* Ma'lumotlar */}
            <Section title="Ma'lumotlar">
              <Grid>
                <Row label="To'lov ID" value={<code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{p.id.slice(0, 12)}</code>} />
                <Row label="Summa" value={money(p.amount)} />
                <Row label="Sana" value={fmtDate(p.paidAt)} />
                <Row label="Oy" value={UZ_MONTHS[new Date(p.paidAt).getMonth()]} />
                <Row label="Kassa turi" value={p.method} />
                <Row label="Hisob" value={p.account?.name ?? '—'} />
                <Row label="To'lov turi (type)" value={p.type ?? '—'} />
                <Row label="Karta 4 raqami" value={p.cardLast4 ?? '—'} />
                <Row label="Filial" value={p.student?.branch?.name ?? '—'} />
                <Row label="O'quv yili" value={p.student?.class?.academicYear ?? '—'} />
                <Row label="Shartnoma" value={p.contract?.number ?? '—'} />
                <Row label="O'quvchi" value={p.student ? `${p.student.lastName} ${p.student.firstName}` : '—'} />
                <Row label="Sinf" value={p.student?.class ? `${p.student.class.name}${p.student.class.language ? ` (${p.student.class.language})` : ''}` : '—'} />
                <Row label="Tasdiq" value={p.confirmedAt ? <span className="text-emerald-600">Tasdiqlangan</span> : isCash(p.method) ? <span className="text-slate-400">Shart emas (naqd)</span> : <span className="text-amber-600">Tasdiqlashga</span>} />
                <Row label="Tasdiqlandi" value={fmtDate(p.confirmedAt)} />
                <Row label="Izoh" value={p.note ?? '—'} />
              </Grid>
            </Section>

            {/* Metama'lumot */}
            <Section title="Metama'lumot">
              <Grid>
                <Row label="Yaratildi" value={fmtDateTime(p.createdAt)} />
                <Row label="Kim yaratdi" value={p.createdByName ?? '—'} />
                <Row label="Oxirgi o'zgarish" value={fmtDateTime(p.updatedAt)} />
                <Row label="Kim o'zgartirdi" value={p.updatedByName ?? '—'} />
                <Row label="O'zgartirish soni" value={String(p.updateCount)} />
              </Grid>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function EditForm({ p, onDone }: { p: any; onDone: () => void }) {
  const [amount, setAmount] = useState(String(p.amount));
  const [method, setMethod] = useState(p.method);
  const [accountId, setAccountId] = useState(p.account?.id ?? '');
  const [date, setDate] = useState(new Date(p.paidAt).toISOString().slice(0, 10));
  const [note, setNote] = useState(p.note ?? '');
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: financeApi.accounts });

  const save = useMutation({
    mutationFn: () =>
      paymentsApi.update(p.id, {
        amount: Number(amount),
        method,
        accountId: accountId || undefined,
        paidAt: date,
        note: note || undefined,
      }),
    onSuccess: onDone,
  });

  const cls = 'w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white';
  return (
    <div className="rounded-2xl border border-brand/30 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Tahrirlash</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="mb-1 block text-xs text-slate-500">Summa</span><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={cls} /></label>
        <label className="block"><span className="mb-1 block text-xs text-slate-500">Kassa turi</span>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={cls + ' cursor-pointer'}>
            {KASSA_TYPES.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <label className="block"><span className="mb-1 block text-xs text-slate-500">Hisob</span>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={cls + ' cursor-pointer'}>
            <option value="">—</option>
            {accounts?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <label className="block"><span className="mb-1 block text-xs text-slate-500">Sana</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cls} /></label>
        <label className="col-span-2 block"><span className="mb-1 block text-xs text-slate-500">Izoh</span><input value={note} onChange={(e) => setNote(e.target.value)} className={cls} /></label>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onDone} className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:bg-slate-100">Bekor</button>
        <button onClick={() => save.mutate()} disabled={save.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
          <Save size={14} /> Saqlash
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">{children}</div>
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">{children}</div>;
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-50 pb-2 text-sm last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-medium text-slate-700">{value}</span>
    </div>
  );
}
