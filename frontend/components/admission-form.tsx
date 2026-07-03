'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, Plus, Phone } from 'lucide-react';
import { crmApi, type ClassForm, type StudentHit, type GuardianHit } from '@/lib/crm';
import { api } from '@/lib/api';

const lbl = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500';
const inp = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand';

export function AdmissionForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [view, setView] = useState<'main' | 'student'>('main');
  const [f, setF] = useState({
    branchId: '',
    academicYear: '',
    classId: '',
    managerId: '',
    psychologistId: '',
    stageId: '',
    note: '',
  });
  const [student, setStudent] = useState<{ id: string; label: string } | null>(null);
  const [q, setQ] = useState('');

  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data: years } = useQuery({ queryKey: ['years'], queryFn: crmApi.academicYears });
  const { data: psychologists } = useQuery({ queryKey: ['psychologists'], queryFn: crmApi.psychologists });
  const { data: operators } = useQuery({ queryKey: ['operators'], queryFn: crmApi.operators });
  const { data: stages } = useQuery({
    queryKey: ['stages'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/crm/stages').then((r) => r.data),
  });
  const { data: classes } = useQuery({
    queryKey: ['classes-form', f.branchId, f.academicYear],
    queryFn: () => crmApi.classesForm(f.academicYear || undefined, f.branchId || undefined),
    enabled: !!f.branchId && !!f.academicYear,
  });
  const { data: hits } = useQuery({
    queryKey: ['student-search', q],
    queryFn: () => crmApi.searchStudents(q),
    enabled: q.length >= 2 && !student,
  });

  // default: 1-bosqich
  useEffect(() => {
    if (stages?.length && !f.stageId) setF((s) => ({ ...s, stageId: stages[0].id }));
  }, [stages]); // eslint-disable-line

  const save = useMutation({
    mutationFn: () =>
      crmApi.createAdmission({
        studentId: student!.id,
        branchId: f.branchId,
        academicYear: f.academicYear,
        classId: f.classId,
        managerId: f.managerId || undefined,
        psychologistId: f.psychologistId || undefined,
        stageId: f.stageId || undefined,
        note: f.note || undefined,
      }),
    onSuccess: onCreated,
  });

  const canSave = f.branchId && f.academicYear && f.classId && f.managerId && student;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-xl overflow-y-auto bg-slate-50 p-6 shadow-2xl"
      >
        {view === 'student' ? (
          <NewStudentForm
            branchId={f.branchId}
            branchName={branches?.find((b) => b.id === f.branchId)?.name ?? ''}
            onBack={() => setView('main')}
            onCreated={(s) => {
              setStudent({ id: s.id, label: `${s.lastName} ${s.firstName}` });
              setView('main');
            }}
          />
        ) : (
          <>
            <button onClick={onClose} className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
              <X size={16} /> Yopish
            </button>
            <h2 className="mb-5 text-2xl font-bold">Yangi qabul</h2>

            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Filial <span className="text-red-500">*</span></label>
                  <select value={f.branchId} onChange={(e) => setF({ ...f, branchId: e.target.value, classId: '' })} className={inp}>
                    <option value="">—</option>
                    {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>O&apos;quv yili <span className="text-red-500">*</span></label>
                  <select value={f.academicYear} onChange={(e) => setF({ ...f, academicYear: e.target.value, classId: '' })} className={inp}>
                    <option value="">—</option>
                    {years?.map((y) => <option key={y.id} value={y.name}>{y.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Sinf <span className="text-red-500">*</span></label>
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
                  <label className={lbl}>Gaplashgan <span className="text-red-500">*</span></label>
                  <select value={f.managerId} onChange={(e) => setF({ ...f, managerId: e.target.value })} className={inp}>
                    <option value="">Tanlang</option>
                    {operators?.map((o) => <option key={o.id} value={o.id}>{o.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Suhbatlashgan psixolog</label>
                  <select value={f.psychologistId} onChange={(e) => setF({ ...f, psychologistId: e.target.value })} className={inp}>
                    <option value="">—</option>
                    {psychologists?.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Boshlang&apos;ich status</label>
                  <select value={f.stageId} onChange={(e) => setF({ ...f, stageId: e.target.value })} className={inp}>
                    {stages?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Talaba */}
              <div>
                <label className={lbl}>Talaba <span className="text-red-500">*</span></label>
                {student ? (
                  <div className="flex items-center justify-between rounded-lg border border-brand bg-blue-50 px-3 py-2 text-sm">
                    <span className="font-medium">{student.label}</span>
                    <button onClick={() => { setStudent(null); setQ(''); }} className="text-slate-400 hover:text-red-500"><X size={16} /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="F.I.Sh yoki hujjat seriyasi bo'yicha qidirish..." className={inp} />
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs text-slate-400">2 ta belgidan boshlab qidiring</span>
                      <button onClick={() => setView('student')} className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-brand hover:bg-blue-100">
                        <Plus size={14} /> Yangi talaba
                      </button>
                    </div>
                    {q.length >= 2 && hits && hits.length > 0 && (
                      <div className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {hits.map((h: StudentHit) => (
                          <button key={h.id} onClick={() => { setStudent({ id: h.id, label: `${h.lastName} ${h.firstName}` }); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
                            {h.lastName} {h.firstName} {h.class && <span className="text-xs text-slate-400">· {h.class.name}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className={lbl}>Izoh (ixtiyoriy)</label>
                <textarea value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Qo'shimcha eslatma. Detail sahifasida tarix bilan istalgancha qo'shiladi." className={`${inp} h-24`} />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={onClose} className="text-sm text-slate-500">Bekor</button>
                <button onClick={() => save.mutate()} disabled={!canSave || save.isPending} className="rounded-lg bg-brand px-6 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
                  {save.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ============ Yangi o'quvchi (nested) ============ */
function NewStudentForm({
  branchId,
  branchName,
  onBack,
  onCreated,
}: {
  branchId: string;
  branchName: string;
  onBack: () => void;
  onCreated: (s: { id: string; firstName: string; lastName: string }) => void;
}) {
  const [f, setF] = useState({ gender: '', lastName: '', firstName: '' });
  const [guardian, setGuardian] = useState<GuardianHit | null>(null);
  const [gq, setGq] = useState('');
  const [addG, setAddG] = useState<{ fullName: string; phone: string; relation: string } | null>(null);

  const { data: guardians } = useQuery({
    queryKey: ['guardian-search', gq],
    queryFn: () => crmApi.searchGuardians(gq || undefined),
    enabled: !guardian,
  });

  const createG = useMutation({
    mutationFn: () => crmApi.createGuardian(addG!),
    onSuccess: (g: any) => { setGuardian(g); setAddG(null); },
  });
  const save = useMutation({
    mutationFn: () =>
      crmApi.quickStudent({
        branchId,
        gender: f.gender as 'MALE' | 'FEMALE',
        lastName: f.lastName,
        firstName: f.firstName,
        guardianId: guardian?.id,
      }),
    onSuccess: (s: any) => onCreated(s),
  });

  const canSave = f.gender && f.lastName && f.firstName && guardian;

  return (
    <>
      <button onClick={onBack} className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <X size={16} /> Yopish
      </button>
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">O&apos;quvchi qo&apos;shish</div>
        <h2 className="text-2xl font-bold">Yangi o&apos;quvchi</h2>
        <p className="mt-1 text-sm text-slate-500">Qabul bosqichi: asosiy ma&apos;lumot yetarli. Qolgan maydonlar shartnoma tuzish vaqtida to&apos;ldiriladi.</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Filial <span className="text-red-500">*</span></label>
            <input value={branchName} disabled className={`${inp} bg-slate-100 text-slate-500`} />
          </div>
          <div>
            <label className={lbl}>Jinsi <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              {(['MALE', 'FEMALE'] as const).map((g) => (
                <button key={g} onClick={() => setF({ ...f, gender: g })} className={`flex-1 rounded-lg border py-2 text-sm font-medium ${f.gender === g ? 'border-brand bg-blue-50 text-brand' : 'border-slate-300'}`}>
                  {g === 'MALE' ? 'Erkak' : 'Ayol'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={lbl}>Familiya <span className="text-red-500">*</span></label>
            <input value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} className={inp} />
          </div>
          <div>
            <label className={lbl}>Ism <span className="text-red-500">*</span></label>
            <input value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} className={inp} />
          </div>
        </div>

        {/* Ota-ona */}
        <div>
          <label className={lbl}>Ota-ona <span className="text-red-500">*</span></label>
          {guardian ? (
            <div className="flex items-center justify-between rounded-lg border border-brand bg-blue-50 px-3 py-2 text-sm">
              <span>{guardian.fullName} <span className="text-xs text-slate-400">· {guardian.phone}</span></span>
              <button onClick={() => setGuardian(null)} className="text-slate-400 hover:text-red-500"><X size={16} /></button>
            </div>
          ) : addG ? (
            <div className="space-y-2 rounded-lg border border-slate-200 p-3">
              <input placeholder="F.I.Sh" value={addG.fullName} onChange={(e) => setAddG({ ...addG, fullName: e.target.value })} className={inp} />
              <input placeholder="Telefon" value={addG.phone} onChange={(e) => setAddG({ ...addG, phone: e.target.value })} className={inp} />
              <input placeholder="Kim bo'ladi (ota/ona)" value={addG.relation} onChange={(e) => setAddG({ ...addG, relation: e.target.value })} className={inp} />
              <div className="flex gap-2">
                <button onClick={() => setAddG(null)} className="flex-1 rounded-lg border border-slate-300 py-1.5 text-sm">Bekor</button>
                <button onClick={() => createG.mutate()} disabled={!addG.fullName || !addG.phone} className="flex-1 rounded-lg bg-brand py-1.5 text-sm font-semibold text-white disabled:opacity-50">Qo&apos;shish</button>
              </div>
            </div>
          ) : (
            <>
              <input value={gq} onChange={(e) => setGq(e.target.value)} placeholder="Familiya yoki telefon bo'yicha qidirish..." className={inp} />
              <div className="mt-1 overflow-hidden rounded-lg border border-slate-200">
                <div className="bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase text-slate-400">So&apos;nggi yozilganlar</div>
                <div className="max-h-44 overflow-y-auto">
                  {guardians?.slice(0, 8).map((g: GuardianHit) => (
                    <button key={g.id} onClick={() => setGuardian(g)} className="block w-full border-t border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50">
                      <div className="font-medium">{g.fullName}</div>
                      <div className="flex items-center gap-1 text-xs text-slate-400">{g.relation ?? '—'} <Phone size={11} className="text-red-400" /> {g.phone}</div>
                    </button>
                  ))}
                  {!guardians?.length && <div className="px-3 py-3 text-sm text-slate-400">Topilmadi</div>}
                </div>
              </div>
              <button onClick={() => setAddG({ fullName: '', phone: '', relation: 'ota-ona' })} className="mt-2 flex items-center gap-1 text-sm text-brand">
                <Plus size={14} /> Yangi ota-ona qo&apos;shish
              </button>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button onClick={onBack} className="text-sm text-slate-500">Bekor</button>
          <button onClick={() => save.mutate()} disabled={!canSave || save.isPending} className="rounded-lg bg-brand px-6 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
            {save.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </>
  );
}
