'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, Search } from 'lucide-react';
import { crmApi } from '@/lib/crm';
import { hrApi, SHARTNOMA_TURLARI, SHARTNOMA_HOLATLARI, BANDLIK_TURLARI, SHARTNOMA_TILLARI, type Employee } from '@/lib/hr';

const lbl = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500';
const inp = 'w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white';

export function ShartnomaModal({ onClose, onSaved, employeeId: fixedEmp, employeeName }: { onClose: () => void; onSaved: () => void; employeeId?: string; employeeName?: string }) {
  const [empSearch, setEmpSearch] = useState('');
  const [employeeId, setEmployeeId] = useState(fixedEmp ?? '');
  const [type, setType] = useState(SHARTNOMA_TURLARI[0]);
  const [status, setStatus] = useState('YARATILGAN');
  const [date, setDate] = useState('');
  const [date2, setDate2] = useState('');
  const [number, setNumber] = useState('');
  const [kelishSana, setKelishSana] = useState('');
  const [kKuni, setKKuni] = useState('');
  const [employment, setEmployment] = useState('');
  const [stavka, setStavka] = useState('');
  const [til, setTil] = useState('');
  const [branchId, setBranchId] = useState('');
  const [qoshimchaLavozim, setQL] = useState('');
  const [qoshimchaStavka, setQS] = useState('');
  const [modda, setModda] = useState('');
  const [fayl1, setFayl1] = useState('');
  const [fayl2, setFayl2] = useState('');
  const [fayl3, setFayl3] = useState('');
  const [error, setError] = useState('');

  const { data: employees } = useQuery({ queryKey: ['hr-employees'], queryFn: () => hrApi.employees() });
  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });

  const filtered = useMemo(() => {
    const q = empSearch.toLowerCase();
    return (employees ?? []).filter((e) => !q || e.user.fullName.toLowerCase().includes(q) || (e.position?.name ?? '').toLowerCase().includes(q)).slice(0, 50);
  }, [employees, empSearch]);
  const selected = (employees ?? []).find((e) => e.id === employeeId);

  const save = useMutation({
    mutationFn: () =>
      hrApi.createShartnoma({
        employeeId,
        type,
        status,
        number: number || undefined,
        date: date || undefined,
        date2: date2 || undefined,
        kelishSana: kelishSana || undefined,
        kKuni: kKuni || undefined,
        employment: employment || undefined,
        stavka: stavka ? Number(stavka) : undefined,
        til: til || undefined,
        branchId: branchId || undefined,
        qoshimchaLavozim: qoshimchaLavozim || undefined,
        qoshimchaStavka: qoshimchaStavka ? Number(qoshimchaStavka) : undefined,
        modda: modda || undefined,
        fayl1: fayl1 || undefined,
        fayl2: fayl2 || undefined,
        fayl3: fayl3 || undefined,
      }),
    onSuccess: onSaved,
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  const submit = () => {
    setError('');
    if (!employeeId) return setError('Xodimni tanlang');
    if (!type) return setError('Shartnoma turini tanlang');
    if (!date) return setError('Sanani kiriting');
    save.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="mt-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-800">Yangi kadrlar shartnomasi</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Xodim tanlash */}
          <div>
            <label className={lbl}>Xodim / Lavozim <span className="text-rose-500">*</span></label>
            {fixedEmp ? (
              <div className="rounded-lg border border-brand/40 bg-brand/5 px-3 py-2 text-sm font-semibold text-slate-800">{employeeName ?? selected?.user.fullName ?? 'Xodim'}</div>
            ) : selected ? (
              <div className="flex items-center justify-between rounded-lg border border-brand/40 bg-brand/5 px-3 py-2 text-sm">
                <span><span className="font-semibold text-slate-800">{selected.user.fullName}</span> <span className="text-slate-400">· {selected.position?.name ?? '—'}</span></span>
                <button onClick={() => setEmployeeId('')} className="text-slate-400 hover:text-rose-500"><X size={16} /></button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} placeholder="Xodim nomi..." className={`${inp} pl-9`} />
                </div>
                <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-slate-200">
                  {filtered.map((e: Employee) => (
                    <button key={e.id} onClick={() => setEmployeeId(e.id)} className="flex w-full items-center gap-3 border-b border-slate-50 px-3 py-2 text-left text-sm last:border-0 hover:bg-slate-50">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">{e.user.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('')}</span>
                      <span><span className="font-medium text-slate-800">{e.user.fullName}</span><span className="ml-2 text-xs text-slate-400">{e.position?.name ?? ''} {e.department ? `· ${e.department.name}` : ''}</span></span>
                    </button>
                  ))}
                  {!filtered.length && <div className="px-3 py-4 text-center text-sm text-slate-400">Xodim topilmadi</div>}
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Shartnoma turi <span className="text-rose-500">*</span></label><select value={type} onChange={(e) => setType(e.target.value)} className={inp}>{SHARTNOMA_TURLARI.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className={lbl}>Holat</label><select value={status} onChange={(e) => setStatus(e.target.value)} className={inp}>{SHARTNOMA_HOLATLARI.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div><label className={lbl}>Sana <span className="text-rose-500">*</span></label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} /></div>
            <div><label className={lbl}>2-sana</label><input type="date" value={date2} onChange={(e) => setDate2(e.target.value)} className={inp} /><p className="mt-0.5 text-[11px] text-slate-400">Tugash/o&apos;zgartirish</p></div>
            <div><label className={lbl}>Shartnoma raqami</label><input value={number} onChange={(e) => setNumber(e.target.value)} className={inp} /></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Kelish sanasi (K.sana)</label><input type="date" value={kelishSana} onChange={(e) => setKelishSana(e.target.value)} className={inp} /></div>
            <div><label className={lbl}>K.kuni</label><input value={kKuni} onChange={(e) => setKKuni(e.target.value)} className={inp} /></div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div><label className={lbl}>Bandlik turi</label><select value={employment} onChange={(e) => setEmployment(e.target.value)} className={inp}><option value="">—</option>{BANDLIK_TURLARI.map((b) => <option key={b} value={b}>{b}</option>)}</select></div>
            <div><label className={lbl}>Stavka</label><input type="number" value={stavka} onChange={(e) => setStavka(e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Shartnoma tili</label><select value={til} onChange={(e) => setTil(e.target.value)} className={inp}><option value="">—</option>{SHARTNOMA_TILLARI.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          </div>

          <div><label className={lbl}>Filial</label><select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inp}><option value="">Tanlang...</option>{branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Qo&apos;shimcha lavozim</label><input value={qoshimchaLavozim} onChange={(e) => setQL(e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Qo&apos;shimcha stavka</label><input type="number" value={qoshimchaStavka} onChange={(e) => setQS(e.target.value)} className={inp} /></div>
          </div>

          <div><label className={lbl}>Modda</label><input value={modda} onChange={(e) => setModda(e.target.value)} className={inp} /></div>

          <div className="grid grid-cols-3 gap-4">
            <div><label className={lbl}>Fayl 1 (URL)</label><input value={fayl1} onChange={(e) => setFayl1(e.target.value)} placeholder="/path/file.pdf" className={inp} /></div>
            <div><label className={lbl}>Fayl 2</label><input value={fayl2} onChange={(e) => setFayl2(e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Fayl 3</label><input value={fayl3} onChange={(e) => setFayl3(e.target.value)} className={inp} /></div>
          </div>

          {error && <p className="text-sm font-medium text-rose-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Bekor</button>
          <button onClick={submit} disabled={save.isPending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">{save.isPending ? 'Saqlanmoqda...' : 'Yaratish'}</button>
        </div>
      </div>
    </div>
  );
}
