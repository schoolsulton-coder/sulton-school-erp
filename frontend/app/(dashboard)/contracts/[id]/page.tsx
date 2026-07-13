'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, FileText, Pencil, Trash2, Plus, X } from 'lucide-react';
import { contractsApi } from '@/lib/contracts';

const num = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0));
const UZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};
const fmtDateTime = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${fmtDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const C_STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'Faol', cls: 'border-green-200 text-green-700' },
  SUSPENDED: { label: 'Band', cls: 'border-purple-200 text-purple-700' },
  TEMP_SUSPENDED: { label: 'Vaqtincha band', cls: 'border-amber-200 text-amber-700' },
  LEFT: { label: 'Ketdi-aniqlashga', cls: 'border-orange-200 text-orange-700' },
  DRAFT: { label: 'Qoralama', cls: 'border-slate-200 text-slate-600' },
  COMPLETED: { label: 'Yakunlangan', cls: 'border-slate-200 text-slate-600' },
  CANCELLED: { label: 'Bekor qilingan', cls: 'border-red-200 text-red-600' },
  OTHER: { label: 'Boshqa', cls: 'border-slate-200 text-slate-600' },
};
const INST_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Yangi', cls: 'border-amber-300 text-amber-600' },
  PARTIAL: { label: 'Qisman', cls: 'border-blue-300 text-brand' },
  PAID: { label: "To'langan", cls: 'border-green-300 text-green-700' },
  OVERDUE: { label: "Muddati o'tgan", cls: 'border-red-300 text-red-600' },
};

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);

  const { data: c } = useQuery({ queryKey: ['contract', id], queryFn: () => contractsApi.get(id) as Promise<any> });
  if (!c) return <div className="p-8 text-slate-400">Yuklanmoqda…</div>;

  const inst: any[] = c.installments ?? [];
  const monthlyBase = c.monthlyAmount ?? 0;
  const payable = inst.reduce((s, i) => s + i.amount, 0);
  const original = monthlyBase * inst.length;
  const discount = Math.max(0, original - payable);
  const paid = inst.reduce((s, i) => s + i.paidAmount, 0);
  const debt = payable - paid;
  const pctPaid = payable ? Math.round((paid / payable) * 100) : 0;

  const name = `${c.student.lastName} ${c.student.firstName}${c.student.middleName ? ` ${c.student.middleName}` : ''}`;
  const cls = c.student.class;
  const st = C_STATUS[c.status] ?? C_STATUS.OTHER;
  const guardian = c.student.guardians?.[0]?.guardian;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <Link href="/contracts" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
        <ChevronLeft size={16} /> Shartnomalar
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Shartnoma {c.number} · {fmtDate(c.createdAt)}</div>
            <h1 className="mt-1 text-2xl font-bold">{name}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className={`rounded-full border px-2 py-0.5 ${st.cls}`}>{st.label}</span>
              <span className="rounded-full border border-green-200 px-2 py-0.5 text-green-700">{c.type === 'YEARLY' ? 'Yillik' : 'Oylik'}</span>
              {cls && <span className="rounded-full border border-slate-200 px-2 py-0.5 text-slate-600">{cls.name}{cls.language ? ` (${cls.language})` : ''}</span>}
              {c.student.branch && <span className="rounded-full border border-slate-200 px-2 py-0.5 text-slate-600">{c.student.branch.name}</span>}
              {cls?.academicYear && <span className="rounded-full border border-slate-200 px-2 py-0.5 text-slate-600">{cls.academicYear}</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Shartnoma davri</div>
            <div className="mt-1 font-medium text-slate-700">{fmtDate(c.startDate)} — {fmtDate(c.endDate)}</div>
            <div className="mt-3 flex flex-wrap justify-end gap-1.5">
              <button onClick={() => contractsApi.openPdf(id, c.number)} title="PDF" className="rounded-lg border border-slate-200 p-2 text-brand hover:bg-slate-50"><FileText size={16} /></button>
              <button title="Tahrirlash" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><Pencil size={16} /></button>
              <button title="O'chirish" className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* PUL QISMI */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Pul qismi</h2>
          <span className="text-xs text-slate-400">{pctPaid}% to&apos;langan</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">Jami summa</div>
            <div className="mt-1 text-2xl font-bold">{num(payable)} <span className="text-sm font-normal text-slate-400">so&apos;m</span></div>
            <div className="mt-1 text-xs text-slate-400">Yalpi: {num(original)} so&apos;m · chegirma: {num(discount)} so&apos;m</div>
            <div className="mt-3 border-t border-slate-100 pt-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Maktab</span><span className="font-medium">{num(payable)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Oshxona</span><span className="font-medium">0</span></div>
            </div>
          </div>
          <div className="rounded-xl border border-green-100 bg-green-50/40 p-4">
            <div className="text-xs uppercase tracking-wide text-green-600/70">Jami to&apos;lov</div>
            <div className="mt-1 text-2xl font-bold text-green-700">{num(paid)} <span className="text-sm font-normal text-green-600/60">so&apos;m</span></div>
            <div className="mt-3 border-t border-green-100 pt-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Maktab</span><span className="font-medium">{num(paid)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Oshxona</span><span className="font-medium">0</span></div>
            </div>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50/40 p-4">
            <div className="text-xs uppercase tracking-wide text-red-600/70">Qarzdorlik</div>
            <div className="mt-1 text-2xl font-bold text-red-600">{num(debt)} <span className="text-sm font-normal text-red-500/60">so&apos;m</span></div>
            <div className="mt-3 border-t border-red-100 pt-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Maktab</span><span className="font-medium">{num(debt)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Oshxona</span><span className="font-medium">0</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* SHARTNOMA SUMMALARI */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Shartnoma summalari ({inst.length} / {inst.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Oy</th><th className="px-3 py-2">Yil</th>
                <th className="px-3 py-2 text-right">Narx</th><th className="px-3 py-2 text-right">Chegirma</th>
                <th className="px-3 py-2 text-right">To&apos;lanadigan</th><th className="px-3 py-2 text-right">To&apos;langan</th>
                <th className="px-3 py-2 text-right">Qoldiq</th><th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-center">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {inst.map((i) => {
                const d = new Date(i.dueDate);
                const ch = Math.max(0, monthlyBase - i.amount);
                const qoldiq = i.amount - i.paidAmount;
                const s = INST_STATUS[i.status] ?? INST_STATUS.PENDING;
                return (
                  <tr key={i.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-700">{UZ_MONTHS[d.getMonth()]}</td>
                    <td className="px-3 py-2 text-slate-500">{d.getFullYear()}</td>
                    <td className="px-3 py-2 text-right">{num(monthlyBase)}</td>
                    <td className="px-3 py-2 text-right text-red-500">{ch > 0 ? num(ch) : '—'}</td>
                    <td className="px-3 py-2 text-right font-medium">{num(i.amount)}</td>
                    <td className="px-3 py-2 text-right text-green-600">{i.paidAmount > 0 ? num(i.paidAmount) : '—'}</td>
                    <td className="px-3 py-2 text-right font-medium text-red-600">{num(qoldiq)}</td>
                    <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-xs ${s.cls}`}>{s.label}</span></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1 text-slate-300">
                        <Pencil size={14} /><Trash2 size={14} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 font-semibold text-slate-700">
                <td className="px-3 py-2" colSpan={2}>JAMI</td>
                <td className="px-3 py-2 text-right">{num(original)}</td>
                <td className="px-3 py-2 text-right text-red-500">{num(discount)}</td>
                <td className="px-3 py-2 text-right">{num(payable)}</td>
                <td className="px-3 py-2 text-right text-green-600">{paid > 0 ? num(paid) : '—'}</td>
                <td className="px-3 py-2 text-right text-red-600">{num(debt)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* TO'LOVLAR */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">To&apos;lovlar ({c.payments?.length ?? 0})</h2>
          <button onClick={() => setPayOpen(true)} className="flex items-center gap-1 text-sm font-medium text-brand hover:underline"><Plus size={15} /> Qo&apos;shish</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Sana</th><th className="px-3 py-2">Oy</th><th className="px-3 py-2 text-right">Summa</th>
                <th className="px-3 py-2">Kassa</th><th className="px-3 py-2">Izoh</th>
              </tr>
            </thead>
            <tbody>
              {c.payments?.map((p: any) => {
                const d = new Date(p.paidAt);
                return (
                  <tr key={p.id} className="border-b border-slate-50">
                    <td className="px-3 py-2 text-slate-500">{fmtDate(p.paidAt)}</td>
                    <td className="px-3 py-2 text-slate-500">{UZ_MONTHS[d.getMonth()]}</td>
                    <td className="px-3 py-2 text-right font-medium text-green-600">{num(p.amount)}</td>
                    <td className="px-3 py-2 text-slate-500">{p.method}</td>
                    <td className="px-3 py-2 text-slate-500">{p.note ?? '—'}</td>
                  </tr>
                );
              })}
              {!c.payments?.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">Hali to&apos;lov qayd etilmagan</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* OTA-ONA + QO'SHIMCHA */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Ota-ona</h2>
          <InfoRow label="Ism sharifi" value={guardian?.fullName} accent />
          <InfoRow label="Kim?" value={guardian?.relation} />
          <InfoRow label="Telefon" value={guardian?.phone} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Qo&apos;shimcha</h2>
          <InfoRow label="Maxsus chegirma" value={c.discount ? c.discount.name : '—'} />
          <InfoRow label="Qo'shildi" value={fmtDateTime(c.createdAt)} />
          <InfoRow label="Oxirgi o'zgarish" value={fmtDateTime(c.updatedAt)} />
        </div>
      </div>

      {payOpen && (
        <PaymentModal contractId={id} onClose={() => setPayOpen(false)} onPaid={() => { setPayOpen(false); qc.invalidateQueries({ queryKey: ['contract', id] }); }} />
      )}
    </div>
  );
}

function InfoRow({ label, value, accent }: { label: string; value?: string | null; accent?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className={`text-right ${value ? (accent ? 'font-medium text-brand' : 'text-slate-800') : 'text-slate-300'}`}>{value || '—'}</span>
    </div>
  );
}

function PaymentModal({ contractId, onClose, onPaid }: { contractId: string; onClose: () => void; onPaid: () => void }) {
  const [form, setForm] = useState({ amount: '', method: 'naqd', note: '' });
  const pay = useMutation({
    mutationFn: () => contractsApi.addPayment(contractId, { amount: Number(form.amount), method: form.method, note: form.note || undefined }),
    onSuccess: onPaid,
  });
  const inp = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); pay.mutate(); }} className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">To&apos;lov qo&apos;shish</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <input type="number" placeholder="Summa (so'm)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inp} required />
        <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className={inp}>
          <option value="naqd">Naqd</option><option value="plastik">Plastik karta</option><option value="click">Click</option><option value="payme">Payme</option>
        </select>
        <input placeholder="Izoh (ixtiyoriy)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inp} />
        <button type="submit" disabled={pay.isPending} className="w-full rounded-lg bg-brand py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
          {pay.isPending ? 'Saqlanmoqda...' : "To'lovni saqlash"}
        </button>
      </form>
    </div>
  );
}
