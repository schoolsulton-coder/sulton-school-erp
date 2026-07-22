'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Receipt } from 'lucide-react';
import { expensesApi } from '@/lib/expenses';
import { crmApi } from '@/lib/crm';

function academicYears(): string[] {
  // Standart maktab davri: iyul–iyun
  const base = 2024;
  return Array.from({ length: 5 }, (_, i) => `${base + i}-${base + i + 1}`);
}
function defaultYear(todayIso: string): string {
  const d = new Date(todayIso);
  const y = d.getFullYear();
  return d.getMonth() >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export function ExpenseFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: (id: string) => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [branchId, setBranchId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [date, setDate] = useState(today);
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState(defaultYear(new Date().toISOString()));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [newSup, setNewSup] = useState('');
  const [addingSup, setAddingSup] = useState(false);

  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', branchId],
    queryFn: () => expensesApi.suppliers(branchId || undefined),
    enabled: !!branchId,
  });

  const createSupplier = useMutation({
    mutationFn: () => expensesApi.createSupplier({ name: newSup, branchId: branchId || undefined }),
    onSuccess: (s: any) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      setSupplierId(s.id);
      setNewSup('');
      setAddingSup(false);
    },
  });

  const save = useMutation({
    mutationFn: () => expensesApi.create({
      supplierId, branchId, date,
      department: department || undefined,
      academicYear: year || undefined,
      note: note || undefined,
    }),
    onSuccess: (e: any) => onSaved(e.id),
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  const years = useMemo(academicYears, []);
  const inp = 'w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20';
  const lbl = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="mt-10 w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><Receipt size={20} /></div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Yangi xarajat</h2>
              <p className="text-xs text-slate-400">Yaratilgandan so&apos;ng, detailда qatorlar (line) qo&apos;shasiz</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
          <div>
            <label className={lbl}>Filial <span className="text-rose-500">*</span></label>
            <select value={branchId} onChange={(e) => { setBranchId(e.target.value); setSupplierId(''); }} className={inp}>
              <option value="">Tanlang...</option>
              {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Ta&apos;minotchi <span className="text-rose-500">*</span></label>
            {addingSup ? (
              <div className="flex gap-1.5">
                <input autoFocus value={newSup} onChange={(e) => setNewSup(e.target.value)} placeholder="Yangi ta'minotchi nomi" className={inp} />
                <button onClick={() => newSup.trim() && createSupplier.mutate()} disabled={createSupplier.isPending} className="shrink-0 rounded-lg bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">OK</button>
                <button onClick={() => setAddingSup(false)} className="shrink-0 rounded-lg px-2 text-sm text-slate-400 hover:text-slate-600">✕</button>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} disabled={!branchId} className={`${inp} disabled:opacity-50`}>
                  <option value="">{branchId ? 'Tanlang...' : 'Avval filial'}</option>
                  {suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button onClick={() => branchId && setAddingSup(true)} disabled={!branchId} title="Yangi ta'minotchi" className="shrink-0 rounded-lg border border-slate-200 px-2.5 text-brand hover:bg-brand/5 disabled:opacity-40"><Plus size={16} /></button>
              </div>
            )}
          </div>
          <div>
            <label className={lbl}>Sana <span className="text-rose-500">*</span></label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Bo&apos;lim</label>
            <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="masalan: Marketing bo'limi" className={inp} />
          </div>
          <div>
            <label className={lbl}>O&apos;quv yili</label>
            <select value={year} onChange={(e) => setYear(e.target.value)} className={inp}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Hujjat izohi</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ixtiyoriy — masalan 'Mart to'lovi'" className={inp} />
          </div>
        </div>

        {error && <p className="px-6 text-sm text-rose-500">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Bekor</button>
          <button
            onClick={() => { setError(''); if (!branchId) return setError('Filial tanlang'); if (!supplierId) return setError("Ta'minotchi tanlang"); save.mutate(); }}
            disabled={save.isPending}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {save.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  );
}
