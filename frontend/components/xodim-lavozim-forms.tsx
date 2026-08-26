'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, Search } from 'lucide-react';
import { crmApi } from '@/lib/crm';
import { usersApi } from '@/lib/users';
import { hrApi, BANDLIK_TURLARI, type Employee } from '@/lib/hr';
import { KelishuvFields, emptyKelishuv, validateKelishuv } from '@/components/kelishuv-fields';

const lbl = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500';
const inp = 'w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white';

function Shell({ title, sub, onClose, footer, children, wide }: { title: string; sub?: string; onClose: () => void; footer: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`mt-8 w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div><h2 className="text-lg font-bold text-slate-800">{title}</h2>{sub && <p className="text-xs text-slate-400">{sub}</p>}</div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">{footer}</div>
      </div>
    </div>
  );
}

/* ===== Yangi xodim (2 bosqich) ===== */
export function XodimModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [f, setF] = useState<any>({ familiya: '', ism: '', middleName: '', gender: '', phone: '', birthDate: '', passportSeriya: '', passportRaqam: '', passportBerilgan: '', passportOrgan: '', stir: '', cardNumber: '', address: '', mapLink: '', password: '', roleId: '' });
  const [branchIds, setBranchIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: usersApi.roles });

  const save = useMutation({
    mutationFn: () => hrApi.createXodim({ ...f, branchIds: Array.from(branchIds) }),
    onSuccess: onSaved,
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  const next = () => { setError(''); if (!f.familiya || !f.ism) return setError('Familiya va ism majburiy'); if (!f.phone) return setError('Telefon majburiy'); setStep(2); };
  const submit = () => { setError(''); if (!f.roleId) return setError('Rol (guruh) tanlang'); if (!f.password || f.password.length < 6) return setError('Parol kamida 6 belgi'); save.mutate(); };
  const toggleBr = (id: string) => { const n = new Set(branchIds); n.has(id) ? n.delete(id) : n.add(id); setBranchIds(n); };

  return (
    <Shell title="Yangi xodim" sub="ERP xodim kartasi" onClose={onClose} wide
      footer={step === 1 ? (
        <><button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Bekor</button><button onClick={next} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark">Keyingi</button></>
      ) : (
        <><button onClick={() => setStep(1)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Orqaga</button><button onClick={submit} disabled={save.isPending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">{save.isPending ? 'Saqlanmoqda...' : 'Saqlash'}</button></>
      )}
    >
      <div className="mb-4 flex gap-2">
        <div className={`flex-1 rounded-lg border px-3 py-2 text-sm ${step === 1 ? 'border-brand bg-brand/5 font-semibold text-brand' : 'border-slate-200 text-slate-400'}`}>1. Xodim <span className="text-xs font-normal">ERP ma&apos;lumotlari</span></div>
        <div className={`flex-1 rounded-lg border px-3 py-2 text-sm ${step === 2 ? 'border-brand bg-brand/5 font-semibold text-brand' : 'border-slate-200 text-slate-400'}`}>2. LMS <span className="text-xs font-normal">Login, rol</span></div>
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Familiya <span className="text-rose-500">*</span></label><input value={f.familiya} onChange={(e) => set('familiya', e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Ism <span className="text-rose-500">*</span></label><input value={f.ism} onChange={(e) => set('ism', e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Otasining ismi</label><input value={f.middleName} onChange={(e) => set('middleName', e.target.value)} className={inp} /></div>
          </div>
          <div>
            <label className={lbl}>Jinsi</label>
            <div className="grid grid-cols-2 gap-2">
              {[['MALE', 'Erkak'], ['FEMALE', 'Ayol']].map(([v, l]) => <button key={v} type="button" onClick={() => set('gender', v)} className={`rounded-lg border px-3 py-2 text-sm ${f.gender === v ? 'border-brand bg-brand/5 text-brand' : 'border-slate-200 text-slate-500'}`}>{l}</button>)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Telefon <span className="text-rose-500">*</span></label><input value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="998901234567" className={inp} /></div>
            <div><label className={lbl}>Tug&apos;ilgan sana</label><input type="date" value={f.birthDate} onChange={(e) => set('birthDate', e.target.value)} className={inp} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Pasport seriya</label><input value={f.passportSeriya} onChange={(e) => set('passportSeriya', e.target.value)} placeholder="AA" className={inp} /></div>
            <div><label className={lbl}>Raqam</label><input value={f.passportRaqam} onChange={(e) => set('passportRaqam', e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Berilgan sana</label><input type="date" value={f.passportBerilgan} onChange={(e) => set('passportBerilgan', e.target.value)} className={inp} /></div>
          </div>
          <div><label className={lbl}>Pasport bergan organ</label><input value={f.passportOrgan} onChange={(e) => set('passportOrgan', e.target.value)} className={inp} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>STIR</label><input value={f.stir} onChange={(e) => set('stir', e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Karta raqami</label><input value={f.cardNumber} onChange={(e) => set('cardNumber', e.target.value)} className={inp} /></div>
          </div>
          <div><label className={lbl}>Yashash manzili</label><input value={f.address} onChange={(e) => set('address', e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Manzil havolasi (Google Maps)</label><input value={f.mapLink} onChange={(e) => set('mapLink', e.target.value)} placeholder="https://maps.google.com/..." className={inp} /></div>
          <div>
            <label className={lbl}>Filiallar</label>
            <div className="flex flex-wrap gap-2">
              {branches?.map((b) => <button key={b.id} type="button" onClick={() => toggleBr(b.id)} className={`rounded-lg border px-3 py-1.5 text-sm ${branchIds.has(b.id) ? 'border-brand bg-brand/5 text-brand' : 'border-slate-200 text-slate-500'}`}>{b.name}</button>)}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div><label className={lbl}>Login (telefon)</label><input value={f.phone} disabled className={`${inp} opacity-60`} /></div>
          <div><label className={lbl}>Parol <span className="text-rose-500">*</span></label><input type="text" value={f.password} onChange={(e) => set('password', e.target.value)} placeholder="Kamida 6 belgi" className={inp} /></div>
          <div><label className={lbl}>Rol / guruh <span className="text-rose-500">*</span></label><select value={f.roleId} onChange={(e) => set('roleId', e.target.value)} className={inp}><option value="">Tanlang...</option>{roles?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
        </div>
      )}
      {error && <p className="mt-3 text-sm font-medium text-rose-500">{error}</p>}
    </Shell>
  );
}

/* ===== Yangi lavozim ===== */
export function LavozimModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [empSearch, setEmpSearch] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [lavozim, setLavozim] = useState('');
  const [employment, setEmployment] = useState('');
  const [kimIshlaydi, setKim] = useState('Shaxsan ishlaydi');
  const [kelishuv, setKelishuv] = useState(emptyKelishuv());
  const [error, setError] = useState('');

  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data: depts } = useQuery({ queryKey: ['hr-departments'], queryFn: hrApi.departments });
  const { data: employees } = useQuery({ queryKey: ['hr-employees'], queryFn: () => hrApi.employees() });
  const filtered = useMemo(() => { const q = empSearch.toLowerCase(); return (employees ?? []).filter((e) => !q || e.user.fullName.toLowerCase().includes(q)).slice(0, 50); }, [employees, empSearch]);
  const selected = (employees ?? []).find((e) => e.id === employeeId);

  const save = useMutation({
    mutationFn: () => hrApi.createLavozim({
      employeeId, branchId: branchId || undefined, departmentId: departmentId || undefined,
      lavozim: lavozim || undefined, employment: employment || undefined, kimIshlaydi,
      boshlanish: kelishuv.startDate || undefined,
      startDate: kelishuv.startDate || undefined,
      endDate: kelishuv.endDate || undefined,
      formal: kelishuv.formal,
      hisobKitob: kelishuv.hisobKitob || undefined,
      baseRate: kelishuv.baseRate || undefined,
      rasmiyOyligi: kelishuv.rasmiyOyligi || undefined,
      soliqKim: kelishuv.soliqKim || undefined,
      note: kelishuv.note || undefined,
    }),
    onSuccess: onSaved,
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });
  const submit = () => {
    setError('');
    if (!employeeId) return setError('Xodimni tanlang');
    if (!lavozim) return setError('Lavozim nomini kiriting');
    const kErr = validateKelishuv(kelishuv);
    if (kErr) return setError(kErr);
    save.mutate();
  };

  return (
    <Shell title="Yangi lavozim" sub="Lavozim + birinchi kelishuv birga yaratiladi" onClose={onClose}
      footer={<><button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Bekor</button><button onClick={submit} disabled={save.isPending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">{save.isPending ? 'Saqlanmoqda...' : 'Yaratish'}</button></>}
    >
      <div className="space-y-4">
        <div>
          <label className={lbl}>Xodim <span className="text-rose-500">*</span></label>
          {selected ? (
            <div className="flex items-center justify-between rounded-lg border border-brand/40 bg-brand/5 px-3 py-2 text-sm"><span className="font-medium text-slate-800">{selected.user.fullName}</span><button onClick={() => setEmployeeId('')} className="text-slate-400 hover:text-rose-500"><X size={14} /></button></div>
          ) : (
            <>
              <div className="relative"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} placeholder="Tanlang..." className={`${inp} pl-8`} /></div>
              {empSearch && <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-slate-200">{filtered.map((e: Employee) => <button key={e.id} onClick={() => { setEmployeeId(e.id); setEmpSearch(''); }} className="block w-full border-b border-slate-50 px-3 py-1.5 text-left text-sm last:border-0 hover:bg-slate-50">{e.user.fullName}</button>)}</div>}
            </>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Filial <span className="text-rose-500">*</span></label><select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inp}><option value="">Tanlang...</option>{branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          <div><label className={lbl}>Bo&apos;lim <span className="text-rose-500">*</span></label><select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inp}><option value="">Tanlang...</option>{depts?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
        </div>
        <div><label className={lbl}>Lavozim <span className="text-rose-500">*</span></label><input value={lavozim} onChange={(e) => setLavozim(e.target.value)} placeholder="Masalan: Matematika o'qituvchisi" className={inp} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Bandlik <span className="text-rose-500">*</span></label><select value={employment} onChange={(e) => setEmployment(e.target.value)} className={inp}><option value="">—</option>{BANDLIK_TURLARI.map((b) => <option key={b} value={b}>{b}</option>)}</select></div>
          <div><label className={lbl}>Kim ishlaydi</label><select value={kimIshlaydi} onChange={(e) => setKim(e.target.value)} className={inp}><option>Shaxsan ishlaydi</option><option>O&apos;rinbosari ishlaydi</option></select></div>
        </div>
        <div className="border-t border-slate-100 pt-4">
          <div className="mb-3 text-xs font-bold uppercase text-slate-500">Birinchi kelishuv</div>
          <KelishuvFields value={kelishuv} onChange={setKelishuv} />
        </div>
        {error && <p className="text-sm font-medium text-rose-500">{error}</p>}
      </div>
    </Shell>
  );
}
