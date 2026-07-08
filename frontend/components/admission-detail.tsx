'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, ArrowRight } from 'lucide-react';
import { crmApi, type ClassForm } from '@/lib/crm';

const lbl = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500';
const inp =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-600';

// Placeholder ro'yxatlar — kerak bo'lsa oson o'zgartiriladi
const TEST_TYPES = ['Mantiq', 'Ingliz tili', 'Matematika', 'Ona tili', 'Umumiy test'];
const CONCLUSION = ['Qabul qilish mumkin', 'Qayta suhbat kerak', "Qabul qilib bo'lmaydi"];
const PARENT_STATUS = ["Ma'qul", 'Rad etdi', "Noma'lum"];

// ISO/Date → yyyy-mm-dd (type=date input uchun)
function toDateInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function AdmissionDetailBody({
  id,
  onClose,
}: {
  id: string;
  onClose?: () => void;
}) {
  const qc = useQueryClient();
  const router = useRouter();

  const { data: d, isLoading } = useQuery({ queryKey: ['admission', id], queryFn: () => crmApi.getAdmission(id) });
  const { data: stages } = useQuery({ queryKey: ['crm-stages'], queryFn: crmApi.stages });
  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data: years } = useQuery({ queryKey: ['academic-years'], queryFn: crmApi.academicYears });
  const { data: operators } = useQuery({ queryKey: ['operators'], queryFn: crmApi.operators });
  const { data: psychologists } = useQuery({ queryKey: ['psychologists'], queryFn: crmApi.psychologists });

  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);

  const [f, setF] = useState({
    branchId: '',
    classId: '',
    academicYear: '',
    stageId: '',
    managerId: '',
    testType: '',
    testLogicPct: '',
    psychologistId: '',
    psychologistConclusion: '',
    motherStatus: '',
    fatherStatus: '',
    demoStartDate: '',
  });

  useEffect(() => {
    if (!d) return;
    setF({
      branchId: d.branchId ?? '',
      classId: d.classId ?? '',
      academicYear: d.academicYear ?? '',
      stageId: d.stageId ?? '',
      managerId: d.managerId ?? '',
      testType: d.testType ?? '',
      testLogicPct: d.testLogicPct != null ? String(d.testLogicPct) : '',
      psychologistId: d.psychologistId ?? '',
      psychologistConclusion: d.psychologistConclusion ?? '',
      motherStatus: d.motherStatus ?? '',
      fatherStatus: d.fatherStatus ?? '',
      demoStartDate: toDateInput(d.demoStartDate),
    });
  }, [d]);

  // SINF ro'yxati — tanlangan filial + o'quv yili bo'yicha (sig'im bilan)
  const { data: classes } = useQuery({
    queryKey: ['classes-form', f.branchId, f.academicYear],
    queryFn: () => crmApi.classesForm(f.academicYear || undefined, f.branchId || undefined),
    enabled: !!f.branchId && !!f.academicYear,
  });

  const save = useMutation({
    mutationFn: () =>
      crmApi.updateAdmission(id, {
        branchId: f.branchId || undefined,
        classId: f.classId || undefined,
        academicYear: f.academicYear || undefined,
        stageId: f.stageId || undefined,
        managerId: f.managerId || undefined,
        psychologistId: f.psychologistId || undefined,
        testType: f.testType || undefined,
        testLogicPct: f.testLogicPct !== '' ? Number(f.testLogicPct) : undefined,
        psychologistConclusion: f.psychologistConclusion || undefined,
        motherStatus: f.motherStatus || undefined,
        fatherStatus: f.fatherStatus || undefined,
        demoStartDate: f.demoStartDate || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admissions'] });
      qc.invalidateQueries({ queryKey: ['admission', id] });
      setEditing(false); // ko'rish (view) rejimiga qaytadi → tugma "Tahrirlash"
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const del = useMutation({
    mutationFn: () => crmApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admissions'] });
      if (onClose) onClose();
      else router.push('/crm');
    },
  });

  if (isLoading || !d) {
    return <div className="p-10 text-center text-slate-400">Yuklanmoqda…</div>;
  }

  const name = d.student ? `${d.student.lastName} ${d.student.firstName}` : d.fullName;
  const sub = `${d.branch?.name ?? '—'} · ${d.class ? `${d.class.name} (${d.class.language ?? '—'})` : '—'} · ${d.academicYear ?? '—'}`;
  const hasContract = (d.student?._count?.contracts ?? 0) > 0;

  return (
    <div className="space-y-5">
      {/* Yuqori bar */}
      {onClose && (
        <div className="text-sm">
          <button onClick={onClose} className="flex items-center gap-1 text-slate-500 hover:text-slate-700">
            <X size={16} /> Yopish
          </button>
        </div>
      )}

      {/* QABUL header karta */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Qabul</div>
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              {name} <ArrowRight size={18} className="text-slate-300" />
            </h2>
            <p className="mt-1 text-sm text-slate-500">{sub}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{d.stage?.name ?? '—'}</span>
              {hasContract && <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">Shartnoma ochilgan</span>}
            </div>
          </div>
          <div className="flex flex-shrink-0 gap-2">
            {editing ? (
              <button onClick={() => save.mutate()} disabled={save.isPending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
                {save.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
              </button>
            ) : (
              <button onClick={() => setEditing(true)} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                Tahrirlash
              </button>
            )}
            <button
              onClick={() => { if (confirm("Ushbu qabulni o'chirasizmi? Bu amalni qaytarib bo'lmaydi.")) del.mutate(); }}
              disabled={del.isPending}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {del.isPending ? '...' : "O'chirish"}
            </button>
          </div>
        </div>
        {saved && <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">✓ Saqlandi</p>}
        {save.isError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">Saqlashda xatolik. Qayta urinib ko&apos;ring.</p>}
      </div>

      <fieldset disabled={!editing} className="m-0 min-w-0 space-y-5 border-0 p-0">
      {/* Asosiy qabul maydonlari */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl}>Filial</label>
            <select value={f.branchId} onChange={(e) => setF({ ...f, branchId: e.target.value, classId: '' })} className={inp}>
              <option value="">—</option>
              {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Sinf</label>
            <select value={f.classId} onChange={(e) => setF({ ...f, classId: e.target.value })} className={inp} disabled={!f.branchId || !f.academicYear}>
              <option value="">{!f.branchId || !f.academicYear ? 'Avval filial va yil' : '—'}</option>
              {classes?.map((c: ClassForm) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.language ? ` (${c.language})` : ''} — bo&apos;sh: {c.free} ({c.taken}/{c.capacity})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>O&apos;quv yili</label>
            <select value={f.academicYear} onChange={(e) => setF({ ...f, academicYear: e.target.value, classId: '' })} className={inp}>
              <option value="">—</option>
              {years?.map((y) => <option key={y.id} value={y.name}>{y.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Status</label>
            <select value={f.stageId} onChange={(e) => setF({ ...f, stageId: e.target.value })} className={inp}>
              {stages?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Gaplashgan</label>
            <select value={f.managerId} onChange={(e) => setF({ ...f, managerId: e.target.value })} className={inp}>
              <option value="">—</option>
              {operators?.map((o) => <option key={o.id} value={o.id}>{o.fullName}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* TESTLAR */}
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Testlar</h3>
        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <div>
            <label className={lbl}>Test turlari</label>
            <select value={f.testType} onChange={(e) => setF({ ...f, testType: e.target.value })} className={inp}>
              <option value="">—</option>
              {TEST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Mantiq (%)</label>
            <input type="number" min={0} max={100} value={f.testLogicPct} onChange={(e) => setF({ ...f, testLogicPct: e.target.value })} className={inp} />
            <p className="mt-1 text-xs text-slate-400">Kamida 30%</p>
          </div>
          <div>
            <label className={lbl}>Suhbatlashgan psixolog</label>
            <select value={f.psychologistId} onChange={(e) => setF({ ...f, psychologistId: e.target.value })} className={inp}>
              <option value="">—</option>
              {psychologists?.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Psixolog xulosasi</label>
            <select value={f.psychologistConclusion} onChange={(e) => setF({ ...f, psychologistConclusion: e.target.value })} className={inp}>
              <option value="">—</option>
              {CONCLUSION.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* OTA-ONA */}
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Ota-ona</h3>
        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <div>
            <label className={lbl}>Otasi</label>
            <select value={f.fatherStatus} onChange={(e) => setF({ ...f, fatherStatus: e.target.value })} className={inp}>
              <option value="">—</option>
              {PARENT_STATUS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Onasi</label>
            <select value={f.motherStatus} onChange={(e) => setF({ ...f, motherStatus: e.target.value })} className={inp}>
              <option value="">—</option>
              {PARENT_STATUS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* DEMO */}
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Demo</h3>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="sm:w-1/2">
            <label className={lbl}>Demo boshlanish sanasi</label>
            <input type="date" value={f.demoStartDate} onChange={(e) => setF({ ...f, demoStartDate: e.target.value })} className={inp} />
            <p className="mt-1 text-xs text-slate-400">Ixtiyoriy — bo&apos;sh qoldirsangiz demoga kirmagan deb hisoblanadi</p>
          </div>
        </div>
      </div>
      </fieldset>
    </div>
  );
}
