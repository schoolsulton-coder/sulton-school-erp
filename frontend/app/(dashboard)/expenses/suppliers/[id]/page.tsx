'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Trash2, Search, Building2, X } from 'lucide-react';
import { expensesApi, money, EXPENSE_STATUS_LABEL, EXPENSE_STATUS_COLOR, type ExpenseStatus } from '@/lib/expenses';
import { crmApi } from '@/lib/crm';
import { ExpenseFormModal } from '@/components/expense-form';
import { ExpenseDetail } from '@/components/expense-detail';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('uz-UZ');

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editSup, setEditSup] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const params = { search: search || undefined, branchId: branchId || undefined };
  const { data } = useQuery({ queryKey: ['supplier-detail', id, params], queryFn: () => expensesApi.supplierDetail(id, params) });
  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['supplier-detail', id] }); qc.invalidateQueries({ queryKey: ['supplier-balances'] }); };

  const remove = useMutation({
    mutationFn: () => expensesApi.removeSupplier(id),
    onSuccess: () => router.push('/expenses'),
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Xatolik'),
  });

  const s = data?.supplier;
  const stats = data?.stats;
  const rows = data?.expenses ?? [];
  const sel = 'rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-600 outline-none focus:border-brand focus:bg-white';

  return (
    <div className="min-h-full bg-slate-50/60 p-6">
      <Link href="/expenses" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"><ArrowLeft size={16} /> Ta&apos;minotchilar ro&apos;yxati</Link>

      {/* Sarlavha */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand"><Building2 size={24} /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{s?.name ?? '...'}</h1>
            <div className="mt-0.5 flex items-center gap-2 text-sm text-slate-400">
              <span>{s?.branch?.name ?? '—'}</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600 ring-1 ring-emerald-200">Faol</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"><Plus size={16} /> Xarajat qo&apos;shish</button>
          <button onClick={() => setEditSup(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"><Pencil size={15} /> Tahrirlash</button>
          <button onClick={() => { if (confirm("Ta'minotchini o'chirasizmi?")) remove.mutate(); }} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-50"><Trash2 size={15} /> O&apos;chirish</button>
        </div>
      </div>

      {/* Stat kartochkalar */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="slate" label="Xaridlar" value={stats?.count ?? 0} isCount />
        <Stat tone="brand" label="Jami summa" value={stats?.jamiXarid ?? 0} />
        <Stat tone="emerald" label="To'langan" value={stats?.jamiTolov ?? 0} />
        <Stat tone="rose" label="Qoldiq" value={stats?.qoldiq ?? 0} />
      </div>

      {/* Xaridlar */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <h3 className="mr-2 font-semibold text-slate-700">Xaridlar <span className="text-slate-400">({stats?.count ?? 0})</span></h3>
          <div className="relative min-w-[200px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Xarajat nomi bo'yicha izlash..." className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand focus:bg-white" />
          </div>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={sel}>
            <option value="">Barcha filiallar</option>
            {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Sana</th>
                <th className="px-5 py-3">№</th>
                <th className="px-5 py-3">Xarajat nomi</th>
                <th className="px-5 py-3">Filial · Bo'lim</th>
                <th className="px-5 py-3 text-center">Xarajat soni</th>
                <th className="px-5 py-3 text-right">Summa</th>
                <th className="px-5 py-3 text-right">To'langan</th>
                <th className="px-5 py-3 text-right">Qoldiq</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((e) => (
                <tr key={e.id} onClick={() => setDetailId(e.id)} className="cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-brand/[0.03]">
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">{fmtDate(e.date)}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-400">№{e.number}</td>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-slate-800">{e.name}</div>
                    <span className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${EXPENSE_STATUS_COLOR[e.status as ExpenseStatus]}`}>{EXPENSE_STATUS_LABEL[e.status as ExpenseStatus]}</span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    <div>{e.branch?.name ?? '—'}</div>
                    {e.department && <div className="text-xs text-slate-400">{e.department}</div>}
                  </td>
                  <td className="px-5 py-3.5 text-center text-slate-500">{e.itemsCount}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-slate-800">{money(e.total)}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-emerald-600">{money(e.paid)}</td>
                  <td className={`whitespace-nowrap px-5 py-3.5 text-right font-medium ${e.remaining > 0 ? 'text-rose-600' : e.remaining < 0 ? 'text-indigo-600' : 'text-emerald-600'}`}>{money(e.remaining)}</td>
                </tr>
              )) : (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">Xarid topilmadi</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && <ExpenseFormModal onClose={() => setShowForm(false)} onSaved={(eid) => { setShowForm(false); refresh(); setDetailId(eid); }} />}
      {editSup && s && <SupplierEditModal supplier={{ id: s.id, name: s.name, phone: s.phone, branchId: s.branch?.id ?? null }} branches={branches ?? []} onClose={() => setEditSup(false)} onSaved={() => { setEditSup(false); refresh(); }} />}
      {detailId && <ExpenseDetail id={detailId} onClose={() => setDetailId(null)} onChanged={refresh} />}
    </div>
  );
}

const TONES: Record<string, string> = {
  slate: 'from-slate-100 to-slate-50 text-slate-600',
  brand: 'from-brand/10 to-brand/5 text-brand',
  emerald: 'from-emerald-50 to-emerald-50/40 text-emerald-600',
  rose: 'from-rose-50 to-rose-50/40 text-rose-600',
};
function Stat({ tone, label, value, isCount }: { tone: keyof typeof TONES; label: string; value: number; isCount?: boolean }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${TONES[tone]} p-4 shadow-sm`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1.5 text-xl font-bold">{money(value)}{!isCount && <span className="text-sm font-medium opacity-60"> so&apos;m</span>}</div>
    </div>
  );
}

function SupplierEditModal({ supplier, branches, onClose, onSaved }: { supplier: { id: string; name: string; phone?: string | null; branchId: string | null }; branches: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: supplier.name, phone: supplier.phone ?? '', branchId: supplier.branchId ?? '' });
  const save = useMutation({
    mutationFn: () => expensesApi.updateSupplier(supplier.id, { name: form.name, phone: form.phone || undefined, branchId: form.branchId || undefined }),
    onSuccess: onSaved,
  });
  const inp = 'w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-slate-800">Ta&apos;minotchini tahrirlash</h2><button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button></div>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nomi" className={inp} />
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Telefon (ixtiyoriy)" className={inp} />
        <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className={inp}>
          <option value="">Filial —</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Bekor</button>
          <button onClick={() => form.name.trim() && save.mutate()} disabled={save.isPending} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">Saqlash</button>
        </div>
      </div>
    </div>
  );
}
