'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronLeft, Check, User, Plus } from 'lucide-react';
import { contractsApi, money } from '@/lib/contracts';
import { crmApi, type ClassForm } from '@/lib/crm';

const lbl = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500';
const inp = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand disabled:bg-slate-50 disabled:text-slate-400';

const STEPS = ['Asosiy', 'Talaba', 'Shartnoma', 'Sanalar'];

const fmtD = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};
const monthsBetween = (a: string, b: string) => {
  const s = new Date(a), e = new Date(b);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
  return Math.max(1, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1);
};

export default function NewContractPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    branchId: '',
    academicYear: '',
    mode: '' as '' | 'existing' | 'new',
    studentId: '',
    studentLabel: '',
    classId: '',
    type: 'MONTHLY' as 'MONTHLY' | 'YEARLY',
    monthlyAmount: '',
    discountId: '',
    startDate: '2026-09-04',
    endDate: '2027-06-30',
  });
  const [ns, setNs] = useState({ lastName: '', firstName: '', gender: '' as '' | 'MALE' | 'FEMALE' });
  const set = (patch: Partial<typeof f>) => setF((p) => ({ ...p, ...patch }));

  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data: years } = useQuery({ queryKey: ['academic-years'], queryFn: crmApi.academicYears });
  const { data: discounts } = useQuery({ queryKey: ['discounts'], queryFn: contractsApi.discounts });
  const { data: classes } = useQuery({
    queryKey: ['classes-form', f.branchId, f.academicYear],
    queryFn: () => crmApi.classesForm(f.academicYear || undefined, f.branchId || undefined),
    enabled: !!f.branchId && !!f.academicYear,
  });
  // Mavjud talaba — QABUL (admissions) dan
  const { data: adm } = useQuery({
    queryKey: ['admissions', '', f.branchId, f.academicYear],
    queryFn: () => crmApi.admissionsList({ branchId: f.branchId || undefined, academicYear: f.academicYear || undefined }),
    enabled: f.mode === 'existing',
  });
  const admStudents = useMemo(() => {
    const rows = adm?.data ?? [];
    const seen = new Set<string>();
    return rows
      // Faqat "Shartnoma tuzishga" statusidagi qabullar
      .filter((r) => r.stage?.name === 'Shartnoma tuzishga' && r.student && !seen.has(r.student.id) && seen.add(r.student.id))
      .map((r) => ({
        id: r.student!.id,
        label: `${r.student!.lastName} ${r.student!.firstName}`,
        cls: r.class?.name ?? '',
        stage: r.stage?.name ?? '',
      }));
  }, [adm]);

  const talabaOk = f.mode === 'new'
    ? !!(ns.lastName && ns.firstName && ns.gender)
    : !!f.studentId;

  const done = useMemo(
    () => ({
      branchId: !!f.branchId,
      academicYear: !!f.academicYear,
      mode: !!f.mode,
      talaba: talabaOk,
      classId: !!f.classId,
      type: !!f.type,
      monthlyAmount: !!f.monthlyAmount,
      dates: !!(f.startDate && f.endDate),
    }),
    [f, talabaOk],
  );
  const filled = Object.values(done).filter(Boolean).length;
  const pct = Math.round((filled / 8) * 100);
  const stepDone = [
    [done.branchId, done.academicYear, done.mode].filter(Boolean).length,
    [done.talaba, done.classId].filter(Boolean).length,
    [done.type, done.monthlyAmount].filter(Boolean).length,
    done.dates ? 1 : 0,
  ];
  const stepTotal = [3, 2, 2, 1];
  const canSave = filled === 8;

  const save = useMutation({
    mutationFn: async () => {
      let studentId = f.studentId;
      if (f.mode === 'new') {
        const s: any = await crmApi.quickStudent({
          branchId: f.branchId || undefined,
          gender: ns.gender as 'MALE' | 'FEMALE',
          lastName: ns.lastName,
          firstName: ns.firstName,
        });
        studentId = s.id;
      }
      return contractsApi.create({
        studentId,
        startDate: f.startDate,
        months: monthsBetween(f.startDate, f.endDate),
        monthlyAmount: Number(f.monthlyAmount),
        discountId: f.discountId || undefined,
        type: f.type,
      });
    },
    onSuccess: () => router.push('/contracts'),
  });

  const cls = classes?.find((c: ClassForm) => c.id === f.classId);
  const branchName = branches?.find((b) => b.id === f.branchId)?.name;
  const talabaName = f.mode === 'new' ? `${ns.lastName} ${ns.firstName}`.trim() : f.studentLabel;

  const sumRow = (label: string, value: string) => (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className={value ? 'text-right font-medium text-slate-800' : 'text-slate-300'}>{value || '—'}</span>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Link href="/contracts" className="mb-4 inline-flex items-center gap-1 text-sm text-brand hover:underline">
        <ChevronLeft size={16} /> Shartnomalarga qaytish
      </Link>

      {/* Header + progress */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Yangi shartnoma</div>
            <h1 className="text-2xl font-bold">Shartnoma qo&apos;shish</h1>
            <p className="mt-1 text-sm text-slate-500">Majburiy maydonlar <span className="text-red-500">*</span> bilan belgilangan</p>
          </div>
          <div className="min-w-[280px] flex-1">
            <div className="mb-1 flex justify-between text-xs font-semibold uppercase tracking-wide text-slate-400">
              <span>{filled}/8 maydon to&apos;ldirildi</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              {STEPS.map((s, i) => {
                const complete = stepDone[i] === stepTotal[i];
                return (
                  <button key={s} onClick={() => setStep(i)} className="flex items-center gap-1.5 text-sm">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${complete ? 'bg-green-500 text-white' : step === i ? 'bg-brand text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {complete ? <Check size={12} /> : i + 1}
                    </span>
                    <span className={step === i ? 'font-medium text-slate-800' : 'text-slate-400'}>{s}</span>
                    {i < 3 && <span className="text-xs text-slate-300">({stepDone[i]}/{stepTotal[i]})</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Chap: bosqich maydonlari */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">{STEPS[step]}</h2>

          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={lbl}>Filial <span className="text-red-500">*</span></label>
                  <select value={f.branchId} onChange={(e) => set({ branchId: e.target.value, classId: '', studentId: '', studentLabel: '' })} className={inp}>
                    <option value="">Tanlang...</option>
                    {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>O&apos;quv yili <span className="text-red-500">*</span></label>
                  <select value={f.academicYear} onChange={(e) => set({ academicYear: e.target.value, classId: '', studentId: '', studentLabel: '' })} className={inp}>
                    <option value="">Tanlang...</option>
                    {years?.map((y) => <option key={y.id} value={y.name}>{y.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={lbl}>O&apos;quvchi turi <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => set({ mode: 'existing', studentId: '', studentLabel: '' })}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium ${f.mode === 'existing' ? 'border-brand bg-blue-50 text-brand' : 'border-slate-300 text-slate-600'}`}>
                    <User size={16} /> Mavjud talaba
                  </button>
                  <button type="button" onClick={() => set({ mode: 'new', studentId: '', studentLabel: '' })}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium ${f.mode === 'new' ? 'border-brand bg-blue-50 text-brand' : 'border-slate-300 text-slate-600'}`}>
                    <Plus size={16} /> Yangi talaba
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              {!f.mode && <p className="text-sm text-slate-400">Avval &quot;Asosiy&quot; bosqichida o&apos;quvchi turini tanlang.</p>}

              {f.mode === 'existing' && (
                <div>
                  <label className={lbl}>Talaba — Qabuldan (Shartnoma tuzishga) <span className="text-red-500">*</span></label>
                  <select
                    value={f.studentId}
                    onChange={(e) => {
                      const s = admStudents.find((x) => x.id === e.target.value);
                      set({ studentId: e.target.value, studentLabel: s?.label ?? '' });
                    }}
                    className={inp}
                  >
                    <option value="">Qabuldan tanlang...</option>
                    {admStudents.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}{s.cls ? ` · ${s.cls}` : ''}{s.stage ? ` · ${s.stage}` : ''}</option>
                    ))}
                  </select>
                  {!admStudents.length && <p className="mt-1 text-xs text-slate-400">&quot;Shartnoma tuzishga&quot; statusidagi talaba topilmadi (filial/yil bo&apos;yicha).</p>}
                </div>
              )}

              {f.mode === 'new' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={lbl}>Familiya <span className="text-red-500">*</span></label>
                    <input value={ns.lastName} onChange={(e) => setNs({ ...ns, lastName: e.target.value })} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Ism <span className="text-red-500">*</span></label>
                    <input value={ns.firstName} onChange={(e) => setNs({ ...ns, firstName: e.target.value })} className={inp} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={lbl}>Jinsi <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                      {(['MALE', 'FEMALE'] as const).map((g) => (
                        <button key={g} type="button" onClick={() => setNs({ ...ns, gender: g })}
                          className={`flex-1 rounded-lg border py-2 text-sm font-medium ${ns.gender === g ? 'border-brand bg-blue-50 text-brand' : 'border-slate-300'}`}>
                          {g === 'MALE' ? 'Erkak' : 'Ayol'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {f.mode && (
                <div>
                  <label className={lbl}>Sinf <span className="text-red-500">*</span></label>
                  <select value={f.classId} onChange={(e) => set({ classId: e.target.value })} className={inp} disabled={!f.branchId || !f.academicYear}>
                    <option value="">{!f.branchId || !f.academicYear ? 'Avval filial va yil' : 'Tanlang...'}</option>
                    {classes?.map((c: ClassForm) => (
                      <option key={c.id} value={c.id}>{c.name}{c.language ? ` (${c.language})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={lbl}>Turi <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  {(['MONTHLY', 'YEARLY'] as const).map((t) => (
                    <button key={t} type="button" onClick={() => set({ type: t })}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium ${f.type === t ? 'border-brand bg-blue-50 text-brand' : 'border-slate-300'}`}>
                      {t === 'MONTHLY' ? 'Oylik' : 'Yillik'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={lbl}>Oylik to&apos;lov (chegirmasiz) <span className="text-red-500">*</span></label>
                <input type="number" min={0} value={f.monthlyAmount} onChange={(e) => set({ monthlyAmount: e.target.value })} placeholder="so'm" className={inp} />
              </div>
              <div>
                <label className={lbl}>Chegirma</label>
                <select value={f.discountId} onChange={(e) => set({ discountId: e.target.value })} className={inp}>
                  <option value="">Chegirmasiz</option>
                  {discounts?.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.type === 'PERCENT' ? `${d.value}%` : money(d.value)})</option>)}
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={lbl}>Boshlanish sanasi <span className="text-red-500">*</span></label>
                <input type="date" value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} className={inp} />
              </div>
              <div>
                <label className={lbl}>Tugash sanasi <span className="text-red-500">*</span></label>
                <input type="date" value={f.endDate} onChange={(e) => set({ endDate: e.target.value })} className={inp} />
              </div>
              <p className="text-xs text-slate-400 sm:col-span-2">Davomiylik: {monthsBetween(f.startDate, f.endDate)} oy</p>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40">Orqaga</button>
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark">Keyingi</button>
            ) : (
              <span className="text-xs text-slate-400">O&apos;ngdan saqlang</span>
            )}
          </div>
        </div>

        {/* O'ng: XULOSA + saqlash */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Xulosa</h2>
              <span className="text-xs text-slate-400">{filled}/8 to&apos;ldirildi</span>
            </div>
            {sumRow('Filial', branchName ?? '')}
            {sumRow("O'quv yili", f.academicYear)}
            {sumRow("O'quvchi turi", f.mode === 'existing' ? 'Mavjud talaba' : f.mode === 'new' ? 'Yangi talaba' : '')}
            {sumRow('Talaba', talabaName)}
            {sumRow('Turi', f.type === 'YEARLY' ? 'Yillik' : 'Oylik')}
            {sumRow('Sinf', cls ? `${cls.name}${cls.language ? ` (${cls.language})` : ''}` : '')}
            {sumRow('Sana', f.startDate && f.endDate ? `${fmtD(f.startDate)} — ${fmtD(f.endDate)}` : '')}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <button onClick={() => save.mutate()} disabled={!canSave || save.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
              <Check size={16} /> {save.isPending ? 'Saqlanmoqda…' : 'Shartnomani saqlash'}
            </button>
            <Link href="/contracts" className="mt-2 block py-2 text-center text-sm text-slate-500 hover:text-slate-700">Bekor qilish</Link>
            {save.isError && <p className="mt-2 rounded bg-red-50 px-2 py-1 text-center text-xs text-red-600">Saqlashda xatolik.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
