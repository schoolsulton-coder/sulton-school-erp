'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronLeft, Check, User, Plus, Search, Info, X } from 'lucide-react';
import { contractsApi } from '@/lib/contracts';
import { crmApi, type ClassForm } from '@/lib/crm';
import { api } from '@/lib/api';

const lbl = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500';
const inp = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand disabled:bg-slate-50 disabled:text-slate-400';
const card = 'rounded-2xl border border-slate-200 bg-white p-5';
const sectionTitle = 'mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500';

const CONTRACT_TYPES = [
  { key: 'Oylik', desc: "Har oy alohida to'lov" },
  { key: 'Yillik', desc: '12 oylik, bir martalik narx' },
  { key: 'Grand', desc: 'Oshxona tanlanadi' },
  { key: 'Xodim farzandi', desc: 'Xodim imtiyozi' },
  { key: 'Yarim yillik', desc: '6 oy' },
  { key: '6-oylik', desc: "6 oylik alohida to'lov" },
];
const SCHOOL_TYPES = ['Xususiy', 'Davlat'];

const num = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0));
const fmtD = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};
const monthsBetween = (a: string, b: string) => {
  const s = new Date(a), e = new Date(b);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
  return Math.max(1, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1);
};
const prevYear = (year: string) => {
  const m = year.match(/^(\d{4})-(\d{4})$/);
  return m ? `${Number(m[1]) - 1}-${Number(m[2]) - 1}` : '';
};
const yearDates = (ay: string) => {
  const m = ay.match(/^(\d{4})-(\d{4})$/);
  return m ? { start: `${m[1]}-09-04`, end: `${m[2]}-06-30` } : { start: '', end: '' };
};

export default function NewContractPage() {
  const router = useRouter();
  const [talabaSearch, setTalabaSearch] = useState('');
  const [gradeHint, setGradeHint] = useState(true);
  const [f, setF] = useState({
    branchId: '',
    academicYear: '',
    mode: '' as '' | 'existing' | 'new',
    studentId: '',
    studentLabel: '',
    contractType: '',
    classId: '',
    narx: '',
    chegirma: '',
    schoolType: 'Xususiy',
    schoolName: '',
    startDate: '2026-09-04',
    endDate: '2027-06-30',
  });
  const set = (patch: Partial<typeof f>) => setF((p) => ({ ...p, ...patch }));

  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data: years } = useQuery({ queryKey: ['academic-years'], queryFn: crmApi.academicYears });
  const { data: classes } = useQuery({
    queryKey: ['classes-form', f.branchId, f.academicYear],
    queryFn: () => crmApi.classesForm(f.academicYear || undefined, f.branchId || undefined),
    enabled: !!f.branchId && !!f.academicYear,
  });
  const { data: adm } = useQuery({
    queryKey: ['admissions', '', f.branchId, f.academicYear],
    queryFn: () => crmApi.admissionsList({ branchId: f.branchId || undefined, academicYear: f.academicYear || undefined }),
    enabled: f.mode === 'new',
  });
  const qabulStudents = useMemo(() => {
    const rows = adm?.data ?? [];
    const seen = new Set<string>();
    return rows
      .filter((r) => r.stage?.name === 'Shartnoma tuzishga' && r.student && (r.student._count?.contracts ?? 0) === 0 && !seen.has(r.student.id) && seen.add(r.student.id))
      .map((r) => ({ id: r.student!.id, lastName: r.student!.lastName, firstName: r.student!.firstName, gender: r.student!.gender ?? null }));
  }, [adm]);
  const qabulFiltered = useMemo(() => {
    const t = talabaSearch.trim().toLowerCase();
    if (!t) return qabulStudents;
    return qabulStudents.filter((s) => `${s.lastName} ${s.firstName}`.toLowerCase().includes(t));
  }, [qabulStudents, talabaSearch]);

  const py = prevYear(f.academicYear);
  const { data: allStudents } = useQuery({
    queryKey: ['students-prev', py],
    queryFn: () => api.get('/students', { params: { limit: 300, academicYear: py } }).then((r) => r.data.data as any[]),
    enabled: f.mode === 'existing' && !!py,
  });

  // Tanlangan talaba to'liq ma'lumoti
  const { data: student } = useQuery({
    queryKey: ['student', f.studentId],
    queryFn: () => api.get(`/students/${f.studentId}`).then((r) => r.data),
    enabled: !!f.studentId,
  });

  // Avtomatik sinf: oxirgi sinfdan 1 daraja yuqori
  useEffect(() => {
    if (!student?.class || !classes || f.classId) return;
    const next = (student.class.gradeLevel ?? 0) + 1;
    const suggested = classes.find((c: ClassForm) => c.gradeLevel === next);
    if (suggested) { set({ classId: suggested.id }); setGradeHint(true); }
  }, [student, classes]); // eslint-disable-line

  // Maktab nomi — filial nomi bilan oldindan to'ldiriladi
  useEffect(() => {
    if (student && !f.schoolName) {
      const bn = branches?.find((b) => b.id === f.branchId)?.name;
      if (bn) set({ schoolName: bn });
    }
  }, [student]); // eslint-disable-line

  const done = useMemo(
    () => ({
      branchId: !!f.branchId, academicYear: !!f.academicYear, mode: !!f.mode,
      studentId: !!f.studentId, contractType: !!f.contractType, classId: !!f.classId,
      narx: !!f.narx, schoolType: !!f.schoolType, schoolName: !!f.schoolName,
    }),
    [f],
  );
  const TOTAL = 9;
  const months = monthsBetween(f.startDate, f.endDate);
  const monthlyNet = Math.max(0, Number(f.narx || 0) - Number(f.chegirma || 0));
  const filled = Object.values(done).filter(Boolean).length;
  const pct = Math.round((filled / TOTAL) * 100);
  const canSave = filled === TOTAL;

  const save = useMutation({
    mutationFn: () =>
      contractsApi.create({
        studentId: f.studentId,
        startDate: f.startDate,
        months,
        monthlyAmount: Number(f.narx) || 0,
        discountAmount: f.chegirma !== '' ? Number(f.chegirma) : undefined,
        type: f.contractType === 'Yillik' ? 'YEARLY' : 'MONTHLY',
      }),
    onSuccess: () => router.push('/contracts'),
  });

  const cls = classes?.find((c: ClassForm) => c.id === f.classId);
  const branchName = branches?.find((b) => b.id === f.branchId)?.name;
  const genderTxt = (g?: string | null) => (g === 'FEMALE' ? 'Ayol' : g === 'MALE' ? 'Erkak' : '');
  const lastContractStatus = student?.contracts?.[0]?.status as string | undefined;

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

      <div className={`mb-5 ${card}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Yangi shartnoma</div>
            <h1 className="text-2xl font-bold">Shartnoma qo&apos;shish</h1>
            <p className="mt-1 text-sm text-slate-500">Majburiy maydonlar <span className="text-red-500">*</span> bilan belgilangan</p>
          </div>
          <div className="min-w-[280px] flex-1">
            <div className="mb-1 flex justify-between text-xs font-semibold uppercase tracking-wide text-slate-400">
              <span>{filled}/{TOTAL} maydon to&apos;ldirildi</span><span>{pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {/* ASOSIY */}
          <div className={card}>
            <h2 className={sectionTitle}>Asosiy</h2>
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
                  <select value={f.academicYear} onChange={(e) => { const yd = yearDates(e.target.value); set({ academicYear: e.target.value, classId: '', studentId: '', studentLabel: '', startDate: yd.start || f.startDate, endDate: yd.end || f.endDate }); }} className={inp}>
                    <option value="">Tanlang...</option>
                    {years?.map((y) => <option key={y.id} value={y.name}>{y.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={lbl}>O&apos;quvchi turi <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => set({ mode: 'existing', studentId: '', studentLabel: '', classId: '' })}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium ${f.mode === 'existing' ? 'border-brand bg-brand text-white' : 'border-slate-300 text-slate-600'}`}>
                    <User size={16} /> Mavjud talaba
                  </button>
                  <button type="button" onClick={() => set({ mode: 'new', studentId: '', studentLabel: '', classId: '' })}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium ${f.mode === 'new' ? 'border-brand bg-brand text-white' : 'border-slate-300 text-slate-600'}`}>
                    <Plus size={16} /> Yangi talaba
                  </button>
                </div>
                {f.mode === 'new' && <p className="mt-2 text-xs text-slate-500">Admission sheet&apos;dan &quot;Shartnoma tuzishga&quot; statusidagi nomzodlar ko&apos;rsatiladi.</p>}
                {f.mode === 'existing' && <p className="mt-2 text-xs text-slate-500">{py || '—'} o&apos;quv yilida o&apos;qigan talabalar ko&apos;rsatiladi.</p>}
              </div>
            </div>
          </div>

          {/* TALABA */}
          <div className={card}>
            <h2 className={sectionTitle}>Talaba <span className="text-red-500">*</span></h2>
            {!f.mode && <p className="text-sm text-slate-400">Avval &quot;Asosiy&quot; bo&apos;limida o&apos;quvchi turini tanlang.</p>}

            {/* Tanlangan talaba kartochkasi */}
            {f.mode && f.studentId && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50/60 p-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-700">
                    {`${student?.lastName?.[0] ?? ''}${student?.firstName?.[0] ?? ''}`.toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800">{f.studentLabel || `${student?.lastName ?? ''} ${student?.firstName ?? ''}`}</div>
                    <div className="text-xs text-slate-500">{fmtD(student?.birthDate)}{student?.gender ? ` · ${genderTxt(student.gender)}` : ''}</div>
                  </div>
                  <button onClick={() => set({ studentId: '', studentLabel: '', classId: '' })} className="ml-auto text-sm text-brand hover:underline">O&apos;zgartirish</button>
                </div>
                {student?.class && (student.contracts?.length ?? 0) > 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-slate-600">
                    <Info size={14} className="flex-shrink-0 text-brand" />
                    Oxirgi shartnomasi: <span className="font-medium">{student.class.name}{student.class.language ? ` (${student.class.language})` : ''}</span> · {student.class.academicYear}
                    {lastContractStatus === 'ACTIVE' && <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">Faol</span>}
                  </div>
                )}
              </div>
            )}

            {/* Ro'yxat / tanlash (talaba tanlanmagan bo'lsa) */}
            {f.mode === 'new' && !f.studentId && (
              <div>
                <p className="mb-2 text-sm text-slate-500">Shartnoma tuzmagan talabalar (eng oxirgilari birinchi)</p>
                <div className="relative mb-2">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={talabaSearch} onChange={(e) => setTalabaSearch(e.target.value)} placeholder="F.I.Sh. bo'yicha qidirish..." className={`${inp} pl-9`} />
                </div>
                <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
                  {qabulFiltered.map((s) => {
                    const initials = `${s.lastName[0] ?? ''}${s.firstName[0] ?? ''}`.toUpperCase();
                    return (
                      <button key={s.id} type="button" onClick={() => set({ studentId: s.id, studentLabel: `${s.lastName} ${s.firstName}` })}
                        className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-0 hover:bg-slate-50">
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">{initials}</span>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800">{s.lastName} {s.firstName}</div>
                          <div className="text-xs text-slate-400">{genderTxt(s.gender)}</div>
                        </div>
                      </button>
                    );
                  })}
                  {!qabulFiltered.length && <p className="px-3 py-6 text-center text-sm text-slate-400">Nomzod topilmadi.</p>}
                </div>
              </div>
            )}
            {f.mode === 'existing' && !f.studentId && (
              <div>
                <p className="mb-2 text-sm text-slate-500">{py || '—'} o&apos;quv yilida o&apos;qigan talabalar</p>
                <select value="" onChange={(e) => {
                  const s = allStudents?.find((x) => x.id === e.target.value);
                  set({ studentId: e.target.value, studentLabel: s ? `${s.lastName} ${s.firstName}` : '' });
                }} className={inp}>
                  <option value="">Tanlang...</option>
                  {allStudents?.map((s) => <option key={s.id} value={s.id}>{s.lastName} {s.firstName}{s.class ? ` · ${s.class.name}` : ''}</option>)}
                </select>
                {!allStudents?.length && <p className="mt-1 text-xs text-slate-400">{py} o&apos;quv yilida o&apos;qigan talaba topilmadi.</p>}
              </div>
            )}
          </div>

          {/* Talaba tanlangach — qolgan bo'limlar */}
          {f.studentId && (
            <>
              {/* SHARTNOMA TURI */}
              <div className={card}>
                <h2 className={sectionTitle}>Shartnoma turi <span className="text-red-500">*</span></h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {CONTRACT_TYPES.map((t) => {
                    const sel = f.contractType === t.key;
                    return (
                      <button key={t.key} type="button" onClick={() => set({ contractType: t.key })}
                        className={`rounded-xl border p-3 text-left ${sel ? 'border-brand bg-blue-50 ring-1 ring-brand' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className={`text-sm font-semibold ${sel ? 'text-brand' : 'text-slate-800'}`}>{t.key}</div>
                        <div className="mt-0.5 text-xs text-slate-400">{t.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SINF VA NARX */}
              <div className={card}>
                <h2 className={sectionTitle}>Sinf va narx</h2>
                <label className={lbl}>Sinf <span className="text-red-500">*</span></label>
                <select value={f.classId} onChange={(e) => { set({ classId: e.target.value }); setGradeHint(false); }} className={inp}>
                  <option value="">Tanlang...</option>
                  {classes?.map((c: ClassForm) => (
                    <option key={c.id} value={c.id}>{c.name}{c.language ? ` (${c.language})` : ''} — {c.free}/{c.capacity} bo&apos;sh</option>
                  ))}
                </select>
                {gradeHint && cls && student?.class && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-slate-600">
                    <Info size={14} className="mt-0.5 flex-shrink-0 text-brand" />
                    <span>Avtomatik tanlandi: oxirgi sinfi <b>{student.class.name}{student.class.language ? ` (${student.class.language})` : ''}</b>dan 1 daraja yuqori. Kerak bo&apos;lsa boshqa sinf tanlang.</span>
                    <button onClick={() => setGradeHint(false)} className="ml-auto text-slate-400 hover:text-slate-600"><X size={14} /></button>
                  </div>
                )}
                {cls && (
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="text-slate-500">Sinf to&apos;liqligi</span>
                    <span className="font-medium text-slate-700">{cls.taken}/{cls.capacity} · bo&apos;sh <span className="text-green-600">{cls.free}</span></span>
                  </div>
                )}
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={lbl}>Narx (oylik, so&apos;m) <span className="text-red-500">*</span></label>
                    <input type="number" min={0} value={f.narx} onChange={(e) => set({ narx: e.target.value })} placeholder="masalan 6500000" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Chegirma (oylik summa, so&apos;m)</label>
                    <input type="number" min={0} value={f.chegirma} onChange={(e) => set({ chegirma: e.target.value })} placeholder="0" className={inp} />
                  </div>
                </div>
                {f.narx && (
                  <div className="mt-2 space-y-1 rounded-lg bg-blue-50 px-3 py-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">To&apos;lanadigan (oylik)</span><span className="font-medium text-slate-700">{num(monthlyNet)} so&apos;m</span></div>
                    <div className="flex justify-between border-t border-blue-100 pt-1"><span className="text-slate-500">JAMI ({months} oy)</span><span className="font-semibold text-brand">{num(monthlyNet * months)} so&apos;m</span></div>
                    {Number(f.chegirma) > 0 && <div className="flex justify-between text-xs"><span className="text-slate-400">Jami chegirma</span><span className="text-red-500">−{num(Number(f.chegirma) * months)} so&apos;m</span></div>}
                  </div>
                )}
              </div>

              {/* MAKTAB MA'LUMOTI */}
              <div className={card}>
                <h2 className={sectionTitle}>Maktab ma&apos;lumoti</h2>
                {f.mode === 'existing' && <p className="mb-3 text-xs text-slate-400">Mavjud talaba — <b>{f.schoolName}</b> ichidan kelmoqda, shuning uchun oldindan to&apos;ldirildi. Kerak bo&apos;lsa o&apos;zgartiring.</p>}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={lbl}>Maktab turi <span className="text-red-500">*</span></label>
                    <select value={f.schoolType} onChange={(e) => set({ schoolType: e.target.value })} className={inp}>
                      {SCHOOL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Maktab nomi <span className="text-red-500">*</span></label>
                    <input value={f.schoolName} onChange={(e) => set({ schoolName: e.target.value })} placeholder="Maktab nomi" className={inp} />
                  </div>
                </div>
              </div>

              {/* SANALAR */}
              <div className={card}>
                <h2 className={sectionTitle}>Sanalar</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={lbl}>Boshlanish sana <span className="text-red-500">*</span></label>
                    <input type="date" value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Tugash sana <span className="text-red-500">*</span></label>
                    <input type="date" value={f.endDate} onChange={(e) => set({ endDate: e.target.value })} className={inp} />
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-400">Chegirmalar shartnoma yaratilgach &quot;Shartnoma summalari&quot; oylarida belgilanadi.</p>
              </div>
            </>
          )}
        </div>

        {/* O'ng: XULOSA + saqlash */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className={card}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Xulosa</h2>
              <span className="text-xs text-slate-400">{filled}/{TOTAL} to&apos;ldirildi</span>
            </div>
            {sumRow('Filial', branchName ?? '')}
            {sumRow("O'quv yili", f.academicYear)}
            {sumRow("O'quvchi turi", f.mode === 'existing' ? 'Mavjud talaba' : f.mode === 'new' ? 'Yangi talaba' : '')}
            {sumRow('Talaba', f.studentLabel)}
            {sumRow('Shartnoma turi', f.contractType)}
            {sumRow('Sinf', cls ? `${cls.name}${cls.language ? ` (${cls.language})` : ''}` : '')}
            {sumRow(`Narx (${months} oy)`, f.narx ? `${num(monthlyNet * months)} so'm` : '')}
            {sumRow('Maktab', f.schoolName ? `${f.schoolType} · ${f.schoolName}` : '')}
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
