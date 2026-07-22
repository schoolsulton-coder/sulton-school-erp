'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, X, UserPlus, Trash2, KeyRound, Phone, Eye, EyeOff, RefreshCw, Copy, Check } from 'lucide-react';
import {
  studentsApi,
  STATUS_LABEL,
  STATUS_COLOR,
  type Guardian,
  type StudentStatus,
} from '@/lib/students';
import { StudentFormModal } from '@/components/student-form';
import { crmApi } from '@/lib/crm';

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('uz-UZ') : '—');
const fmtDateTime = (iso?: string | null) =>
  iso ? `${new Date(iso).toLocaleDateString('uz-UZ')} ${new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}` : '—';
const genderLabel = (g?: string) => (g === 'MALE' ? 'Erkak' : g === 'FEMALE' ? 'Ayol' : '—');
const initials = (last?: string, first?: string) => `${(last ?? '').charAt(0)}${(first ?? '').charAt(0)}`.toUpperCase() || '—';

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [manageGuardians, setManageGuardians] = useState(false);
  const [account, setAccount] = useState<null | { mode: 'student' | 'guardian'; targetId: string; title: string }>(null);

  const { data: s } = useQuery({ queryKey: ['student', id], queryFn: () => studentsApi.get(id) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['student', id] });

  if (!s) return <div className="p-8 text-slate-400">Yuklanmoqda...</div>;

  const primary = s.guardians?.find((g: any) => g.isPrimary)?.guardian ?? s.guardians?.[0]?.guardian ?? null;

  return (
    <div className="min-h-full bg-slate-50/60 p-6">
      <Link href="/students" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand">
        <ArrowLeft size={16} /> O&apos;quvchilar
      </Link>

      {/* Sarlavha kartochkasi */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-brand/10 text-xl font-bold text-brand">
            {s.photo ? <img src={s.photo} alt="" className="h-full w-full object-cover" /> : initials(s.lastName, s.firstName)}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">O&apos;quvchi</div>
            <h1 className="text-2xl font-bold text-slate-800">{s.lastName} {s.firstName} {s.middleName ?? ''}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{genderLabel(s.gender)}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[s.status as StudentStatus]}`}>{STATUS_LABEL[s.status as StudentStatus]}</span>
              {s.class && <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand">{s.class.name}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!s.userId && (
            <button onClick={() => setAccount({ mode: 'student', targetId: id, title: `${s.lastName} ${s.firstName}` })} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              <KeyRound size={15} /> Login yaratish
            </button>
          )}
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            <Pencil size={15} /> Tahrirlash
          </button>
        </div>
      </div>

      {/* Shaxsiy + Ota-ona */}
      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Section title="Shaxsiy ma'lumot">
          <Field label="Familiya" value={s.lastName} />
          <Field label="Ism" value={s.firstName} />
          <Field label="Otasining ismi" value={s.middleName ?? '—'} />
          <Field label="Jinsi" value={genderLabel(s.gender)} />
          <Field label="Tug'ilgan kun" value={fmtDate(s.birthDate)} />
          <Field label="Hujjat turi" value={s.documentType ?? '—'} />
          <Field label="Hujjat seriyasi" value={s.documentSeries ?? '—'} />
        </Section>

        <Section
          title="Ota-ona"
          action={<button onClick={() => setManageGuardians(true)} className="text-sm font-medium text-brand hover:underline">To&apos;liq ko&apos;rish →</button>}
        >
          {primary ? (
            <>
              <Field label="F.I.SH." value={primary.fullName} />
              <Field label="Kim" value={primary.relation ?? '—'} />
              <Field label="Telefon 1" value={primary.phone} bold />
              <Field label="Telefon 2" value="—" />
              <Field label="Manzil" value={s.address ?? '—'} />
            </>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-400">Vasiy qo&apos;shilmagan</p>
              <button onClick={() => setManageGuardians(true)} className="mt-2 text-sm font-medium text-brand hover:underline">+ Vasiy qo&apos;shish</button>
            </div>
          )}
        </Section>
      </div>

      {/* Qabullar */}
      <SectionBlock title="Qabullar" count={s.lead ? 1 : 0}>
        {s.lead ? (
          <TableWrap head={["O'quv yili", 'Sinf', 'Filial', 'Manba', 'Status', 'Yaratilgan']}>
            <tr className="border-t border-slate-50 hover:bg-slate-50/60">
              <td className="px-4 py-3">{s.lead.academicYear ?? s.class?.academicYear ?? '—'}</td>
              <td className="px-4 py-3">{s.lead.class ? `${s.lead.class.name}${s.lead.class.language ? ` (${s.lead.class.language})` : ''}` : (s.class?.name ?? '—')}</td>
              <td className="px-4 py-3">{s.lead.branch?.name ?? s.branch?.name ?? '—'}</td>
              <td className="px-4 py-3">{s.lead.source ?? '—'}</td>
              <td className="px-4 py-3"><span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-brand">{s.lead.stage?.name ?? '—'}</span></td>
              <td className="px-4 py-3 text-slate-500">{fmtDateTime(s.lead.createdAt)}</td>
            </tr>
          </TableWrap>
        ) : (
          <Empty text="Qabul yozuvi yo'q" />
        )}
      </SectionBlock>

      {/* Shartnomalar */}
      <SectionBlock title="Shartnomalar" count={s.contracts?.length ?? 0}>
        {s.contracts?.length ? (
          <TableWrap head={['№', "O'quv yili", 'Sinf', 'Turi', 'Filial', 'Status', 'Boshlanish']}>
            {s.contracts.map((c: any) => (
              <tr key={c.id} className="cursor-pointer border-t border-slate-50 hover:bg-slate-50/60" onClick={() => (window.location.href = `/contracts/${c.id}`)}>
                <td className="px-4 py-3 font-medium text-brand">{c.number}</td>
                <td className="px-4 py-3">{s.class?.academicYear ?? '—'}</td>
                <td className="px-4 py-3">{s.class?.name ?? '—'}</td>
                <td className="px-4 py-3">{c.type === 'YEARLY' ? 'Yillik' : 'Oylik'}</td>
                <td className="px-4 py-3">{s.branch?.name ?? '—'}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{c.status}</span></td>
                <td className="px-4 py-3 text-slate-500">{fmtDate(c.startDate)}</td>
              </tr>
            ))}
          </TableWrap>
        ) : (
          <Empty text="Shartnomalar yo'q" sub="Bu o'quvchiga hali shartnoma tuzilmagan." />
        )}
      </SectionBlock>

      {/* Texnik */}
      <SectionBlock title="Texnik">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
            <Field label="Yaratilgan" value={fmtDateTime(s.createdAt)} />
            <Field label="Oxirgi o'zgarish" value={fmtDateTime(s.updatedAt)} />
          </div>
        </div>
      </SectionBlock>

      {editing && <StudentFormModal student={s} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); refresh(); }} />}
      {manageGuardians && <GuardiansModal studentId={id} guardians={s.guardians ?? []} onClose={() => setManageGuardians(false)} onChanged={refresh} onLogin={(gid, title) => setAccount({ mode: 'guardian', targetId: gid, title })} />}
      {account && <AccountModal mode={account.mode} targetId={account.targetId} title={account.title} onClose={() => setAccount(null)} onDone={() => { setAccount(null); refresh(); }} />}
    </div>
  );
}

/* ===== Umumiy ===== */
function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
        {action}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">{children}</div>
    </div>
  );
}
function SectionBlock({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}{count !== undefined ? ` (${count})` : ''}</h2>
      {children}
    </div>
  );
}
function Field({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-start gap-2 border-b border-slate-50 py-2 last:border-0">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <span className={`text-sm text-slate-700 ${bold ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  );
}
function TableWrap({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{head.map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
function Empty({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
      <div className="text-3xl text-slate-300">∅</div>
      <div className="mt-2 font-medium text-slate-500">{text}</div>
      {sub && <div className="text-sm text-slate-400">{sub}</div>}
    </div>
  );
}

/* ===== Vasiylar boshqaruvi ===== */
function GuardiansModal({ studentId, guardians, onClose, onChanged, onLogin }: { studentId: string; guardians: any[]; onClose: () => void; onChanged: () => void; onLogin: (gid: string, title: string) => void }) {
  const [form, setForm] = useState({ fullName: '', phone: '', relation: 'ota-ona', isPrimary: false });
  const add = useMutation({ mutationFn: () => studentsApi.addGuardian(studentId, form), onSuccess: () => { setForm({ fullName: '', phone: '', relation: 'ota-ona', isPrimary: false }); onChanged(); } });
  const remove = useMutation({ mutationFn: (gid: string) => studentsApi.removeGuardian(studentId, gid), onSuccess: onChanged });
  const cls = 'w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white';
  return (
    <Modal title="Vasiylar (ota-ona)" onClose={onClose}>
      <div className="mb-4 space-y-2">
        {guardians.length ? guardians.map((g: { guardian: Guardian & { userId?: string }; isPrimary: boolean }) => (
          <GuardianItem key={g.guardian.id} g={g} onLogin={onLogin} onChanged={onChanged} onRemove={() => remove.mutate(g.guardian.id)} />
        )) : <p className="text-center text-sm text-slate-400">Vasiy qo&apos;shilmagan</p>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="space-y-2 rounded-xl border border-dashed border-slate-200 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Yangi vasiy</div>
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="F.I.SH" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={cls} required />
          <input placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={cls} required />
        </div>
        <div className="flex items-center gap-2">
          <input placeholder="Kim (ota/ona)" value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} className={cls} />
          <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-500"><input type="checkbox" checked={form.isPrimary} onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })} /> Asosiy</label>
        </div>
        <button type="submit" disabled={add.isPending} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"><UserPlus size={15} /> Qo&apos;shish</button>
      </form>
    </Modal>
  );
}

function GuardianItem({ g, onLogin, onChanged, onRemove }: { g: { guardian: Guardian & { userId?: string; telegramUsername?: string | null }; isPrimary: boolean }; onLogin: (gid: string, title: string) => void; onChanged: () => void; onRemove: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: g.guardian.fullName, phone: g.guardian.phone, relation: g.guardian.relation ?? '' });
  const cls = 'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';
  const save = useMutation({
    mutationFn: () => crmApi.updateGuardian(g.guardian.id, { fullName: form.fullName, phone: form.phone, relation: form.relation || undefined }),
    onSuccess: () => { setEditing(false); onChanged(); },
  });

  if (editing)
    return (
      <div className="space-y-2 rounded-xl border border-brand/30 bg-brand/[0.03] px-3 py-2.5">
        <div className="grid grid-cols-2 gap-2">
          <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="F.I.SH" className={cls} />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Telefon" className={cls} />
        </div>
        <div className="flex items-center gap-2">
          <input value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} placeholder="Kim (ota/ona)" className={cls} />
          <button onClick={() => save.mutate()} disabled={save.isPending} className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60"><Check size={13} /> Saqlash</button>
          <button onClick={() => setEditing(false)} className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100">Bekor</button>
        </div>
      </div>
    );

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5">
      <div>
        <div className="text-sm font-medium text-slate-700">{g.guardian.fullName}{g.isPrimary && <span className="ml-1 text-xs text-brand">(asosiy)</span>}</div>
        <div className="text-xs text-slate-400">{g.guardian.phone} · {g.guardian.relation ?? '—'}</div>
      </div>
      <div className="flex items-center gap-1.5">
        {g.guardian.userId ? <span className="text-xs font-medium text-emerald-600">✓ login</span> : <button onClick={() => onLogin(g.guardian.id, g.guardian.fullName)} className="text-xs font-medium text-brand hover:underline">login</button>}
        <button onClick={() => setEditing(true)} title="Tahrirlash" className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-brand/10 hover:text-brand"><Pencil size={13} /></button>
        <button onClick={onRemove} title="O'chirish" className="grid h-7 w-7 place-items-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-500"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

/* ===== Login yaratish ===== */
function AccountModal({ mode, targetId, title, onClose, onDone }: { mode: 'student' | 'guardian'; targetId: string; title: string; onClose: () => void; onDone: () => void }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [result, setResult] = useState<null | { login: string; password: string }>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const genPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let p = '';
    for (let i = 0; i < 8; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setPassword(p);
    setShowPw(true);
  };
  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  const create = useMutation({
    mutationFn: () => (mode === 'student'
      ? studentsApi.createAccount(targetId, { phone, password })
      : studentsApi.createGuardianAccount(targetId, { phone: phone || undefined, password })),
    onSuccess: (res: any) => setResult({ login: res.login, password }),
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  const cls = 'w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20';

  return (
    <Modal title="Login yaratish" onClose={onClose}>
      {/* Subyekt */}
      <div className="mb-4 flex items-center gap-3 rounded-xl bg-brand/5 px-4 py-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-brand/10 text-brand"><KeyRound size={18} /></div>
        <div>
          <div className="text-sm font-semibold text-slate-700">{title}</div>
          <div className="text-xs text-slate-400">{mode === 'student' ? "O'quvchi" : 'Vasiy'} portal kirish ma&apos;lumotlari</div>
        </div>
      </div>

      {result ? (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2.5 text-sm font-semibold text-emerald-700">
            <Check size={16} /> Akkaunt yaratildi
          </div>
          <CredRow label="Login (telefon)" value={result.login} copied={copied === 'l'} onCopy={() => copy(result.login, 'l')} />
          <CredRow label="Parol" value={result.password} copied={copied === 'p'} onCopy={() => copy(result.password, 'p')} />
          <p className="text-xs text-slate-400">Bu ma&apos;lumotlarni {mode === 'student' ? "o'quvchiga" : 'vasiyga'} bering. Parol keyin ko&apos;rinmaydi.</p>
          <button onClick={onDone} className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">Yopish</button>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
          <L label={mode === 'student' ? 'Telefon (login) *' : 'Telefon (ixtiyoriy)'}>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={cls + ' pl-9'} placeholder="+998 90 000 00 00" required={mode === 'student'} />
            </div>
          </L>
          <L label="Parol *">
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className={cls + ' pr-10'} placeholder="Kamida 6 belgi" required minLength={6} />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button type="button" onClick={genPassword} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
              <RefreshCw size={12} /> Tasodifiy parol yaratish
            </button>
          </L>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100">Bekor</button>
            <button type="submit" disabled={create.isPending} className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
              <KeyRound size={16} /> {create.isPending ? 'Yaratilmoqda...' : 'Yaratish'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function CredRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
        <div className="truncate font-mono text-sm font-semibold text-slate-800">{value}</div>
      </div>
      <button onClick={onCopy} className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${copied ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
        {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Nusxalandi' : 'Nusxa'}
      </button>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>{children}</label>;
}
