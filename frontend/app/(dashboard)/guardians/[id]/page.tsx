'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Pencil, KeyRound, Phone, User, Users, X, Copy, Check,
  Eye, EyeOff, Shuffle, ShieldCheck, Clock, Send, Info,
} from 'lucide-react';
import { crmApi, type GuardianDetail, type GuardianUpdateInput } from '@/lib/crm';
import { studentsApi, STATUS_LABEL, STATUS_COLOR, type StudentStatus } from '@/lib/students';

const RELATIONS = ['ota', 'ona', 'vasiy', 'buva', 'buvi', 'amaki', 'xola'];
const fmtDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString('uz', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
const initials = (name?: string) =>
  (name ?? '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '—';

export default function GuardianDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const { data: g, isLoading } = useQuery({
    queryKey: ['guardian', id],
    queryFn: () => crmApi.guardian(id),
  });

  if (isLoading) return <div className="p-6 text-slate-400">Yuklanmoqda...</div>;
  if (!g) return <div className="p-6 text-slate-400">Vasiy topilmadi</div>;

  return (
    <div className="min-h-full bg-slate-50/60 p-6">
      <button onClick={() => router.push('/guardians')} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-brand">
        <ArrowLeft size={16} /> Vasiylar
      </button>

      {/* Sarlavha kartochka */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand/10 text-xl font-bold text-brand">
              {initials(g.fullName)}
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Vasiy</div>
              <h1 className="text-2xl font-bold text-slate-800">{g.fullName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-500">{g.relation ?? '—'}</span>
                <span className="inline-flex items-center gap-1.5 text-slate-500"><Phone size={13} className="text-slate-400" />{g.phone}</span>
                {g.user ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600 ring-1 ring-emerald-200"><ShieldCheck size={12} /> Login bor</span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-400 ring-1 ring-slate-200">Loginsiz</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!g.user && (
              <button onClick={() => setShowLogin(true)} className="inline-flex items-center gap-2 rounded-xl border border-brand/30 bg-brand/5 px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand/10">
                <KeyRound size={16} /> Login yaratish
              </button>
            )}
            <button onClick={() => setShowEdit(true)} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark">
              <Pencil size={16} /> Tahrirlash
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Farzandlar */}
        <Section title="Farzandlar" icon={Users} count={g.students.length}>
          {g.students.length ? (
            <div className="divide-y divide-slate-50">
              {g.students.map((c) => (
                <Link key={c.student.id} href={`/students/${c.student.id}`} className="flex items-center gap-3 py-3 transition hover:bg-brand/[0.03] -mx-4 px-4 rounded-lg">
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-brand/10 text-xs font-bold text-brand">
                    {c.student.photo ? <img src={c.student.photo} alt="" className="h-full w-full object-cover" /> : initials(`${c.student.lastName} ${c.student.firstName}`)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-slate-800">{c.student.lastName} {c.student.firstName} {c.student.middleName ?? ''}</span>
                      {c.isPrimary && <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 ring-1 ring-amber-200">asosiy</span>}
                    </div>
                    <div className="text-xs text-slate-400">
                      {c.student.class?.name ?? 'Sinfsiz'}{c.student.branch?.name ? ` · ${c.student.branch.name}` : ''}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[c.student.status as StudentStatus] ?? 'bg-slate-100 text-slate-500'}`}>
                    {STATUS_LABEL[c.student.status as StudentStatus] ?? c.student.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-slate-400">Biriktirilgan farzand yo&apos;q</p>
          )}
        </Section>

        <div className="space-y-5">
          {/* Shaxsiy ma'lumot */}
          <Section title="Shaxsiy ma'lumot" icon={User}>
            <dl className="space-y-3">
              <Row label="F.I.SH" value={g.fullName} />
              <Row label="Telefon" value={g.phone} />
              <Row label="Aloqa" value={g.relation ?? '—'} capitalize />
              <Row label="Passport" value={g.passport ?? '—'} />
              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm text-slate-400">Telegram</dt>
                <dd className="text-right text-sm font-medium">
                  {g.telegramUsername ? (
                    <a href={`https://t.me/${g.telegramUsername.replace(/^@/, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-500 hover:underline">
                      <Send size={12} /> @{g.telegramUsername.replace(/^@/, '')}
                    </a>
                  ) : <span className="text-slate-700">—</span>}
                </dd>
              </div>
              <Row label="Login holati" value={g.user ? 'Yaratilgan' : 'Yaratilmagan'} />
            </dl>
          </Section>

          {/* Texnik */}
          <Section title="Texnik" icon={Clock}>
            <dl className="space-y-3">
              <Row label="Yaratilgan" value={fmtDate(g.createdAt)} />
              <Row label="Oxirgi o'zgarish" value={fmtDate(g.updatedAt)} />
            </dl>
          </Section>
        </div>
      </div>

      {showEdit && <EditModal g={g} onClose={() => setShowEdit(false)} />}
      {showLogin && <LoginModal g={g} onClose={() => setShowLogin(false)} />}
    </div>
  );
}

/* ---------- helpers ---------- */
function Section({ title, icon: Icon, count, children }: { title: string; icon: typeof Users; count?: number; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Icon size={16} className="text-brand" />
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h2>
        {count != null && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{count}</span>}
      </div>
      {children}
    </div>
  );
}
function Row({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-sm text-slate-400">{label}</dt>
      <dd className={`text-right text-sm font-medium text-slate-700 ${capitalize ? 'capitalize' : ''}`}>{value}</dd>
    </div>
  );
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- edit ---------- */
function EditModal({ g, onClose }: { g: GuardianDetail; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<GuardianUpdateInput>({
    fullName: g.fullName, phone: g.phone, relation: g.relation ?? '', passport: g.passport ?? '',
    telegramUsername: g.telegramUsername ?? '',
  });
  const [error, setError] = useState('');
  const inp = 'w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20';

  const save = useMutation({
    mutationFn: () => crmApi.updateGuardian(g.id, {
      fullName: form.fullName, phone: form.phone,
      relation: form.relation || undefined, passport: form.passport || undefined,
      telegramUsername: form.telegramUsername?.replace(/^@/, '') || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guardian', g.id] });
      qc.invalidateQueries({ queryKey: ['crm-guardians'] });
      onClose();
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  return (
    <Modal title="Vasiyni tahrirlash" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">F.I.SH</label>
          <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inp} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Telefon</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inp} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Aloqa (kim bo&apos;ladi)</label>
          <input list="rel-opts" value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} className={inp} />
          <datalist id="rel-opts">{RELATIONS.map((r) => <option key={r} value={r} />)}</datalist>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Passport</label>
          <input value={form.passport} onChange={(e) => setForm({ ...form, passport: e.target.value })} placeholder="AA1234567" className={inp} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Telegram username</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">@</span>
            <input value={(form.telegramUsername ?? '').replace(/^@/, '')} onChange={(e) => setForm({ ...form, telegramUsername: e.target.value })} placeholder="username" className={`${inp} pl-7`} />
          </div>
        </div>
        {error && <p className="text-sm text-rose-500">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Bekor qilish</button>
          <button onClick={() => { setError(''); save.mutate(); }} disabled={save.isPending || !form.fullName} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
            {save.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- login ---------- */
function genPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const arr = new Uint32Array(10);
  crypto.getRandomValues(arr);
  let s = '';
  for (let i = 0; i < 10; i++) s += chars[arr[i] % chars.length];
  return s;
}
function LoginModal({ g, onClose }: { g: GuardianDetail; onClose: () => void }) {
  const qc = useQueryClient();
  const [phone, setPhone] = useState(g.phone);
  const [password, setPassword] = useState('');
  const [telegram, setTelegram] = useState((g.telegramUsername ?? '').replace(/^@/, ''));
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ login: string; password: string; telegram: string } | null>(null);
  const inp = 'w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20';

  const create = useMutation({
    mutationFn: async () => {
      const tg = telegram.replace(/^@/, '').trim();
      if (tg && tg !== (g.telegramUsername ?? '')) {
        await crmApi.updateGuardian(g.id, { telegramUsername: tg });
      }
      return studentsApi.createGuardianAccount(g.id, { phone, password });
    },
    onSuccess: () => {
      setDone({ login: phone, password, telegram: telegram.replace(/^@/, '').trim() });
      qc.invalidateQueries({ queryKey: ['guardian', g.id] });
      qc.invalidateQueries({ queryKey: ['crm-guardians'] });
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  const useRandom = () => { setPassword(genPassword()); setShow(true); };

  if (done)
    return (
      <Modal title="Login yaratildi" onClose={onClose}>
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-100">
            <Check size={16} className="mt-0.5 shrink-0" />
            <span>Akkaunt yaratildi. Ushbu ma&apos;lumotlarni vasiyga yetkazing — keyin parol qayta ko&apos;rsatilmaydi.</span>
          </div>
          <CredRow label="Login" value={done.login} />
          <CredRow label="Parol" value={done.password} />
          {done.telegram && <CredRow label="Telegram" value={`@${done.telegram}`} />}
          <div className="flex justify-end pt-1">
            <button onClick={onClose} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">Yopish</button>
          </div>
        </div>
      </Modal>
    );

  return (
    <Modal title="Vasiyga login yaratish" onClose={onClose}>
      <div className="space-y-4">
        {/* Banner */}
        <div className="flex items-center gap-3 rounded-xl bg-brand/5 p-3 ring-1 ring-brand/10">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-white"><KeyRound size={18} /></div>
          <div className="text-sm">
            <div className="font-semibold text-slate-700">{g.fullName}</div>
            <div className="text-xs text-slate-500">Vasiy shu login orqali o&apos;quvchi kabinetiga kiradi</div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Login (telefon)</label>
          <div className="relative">
            <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998..." className={`${inp} pl-9`} />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-slate-500">Parol</label>
            <button type="button" onClick={useRandom} className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
              <Shuffle size={12} /> Tasodifiy yaratish
            </button>
          </div>
          <div className="relative">
            <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kamida 4 belgi" className={`${inp} pr-10`} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Telegram username <span className="text-slate-300">— ixtiyoriy</span></label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">@</span>
            <input value={telegram.replace(/^@/, '')} onChange={(e) => setTelegram(e.target.value)} placeholder="username" className={`${inp} pl-7`} />
          </div>
          <p className="mt-1 text-xs text-slate-400">Bildirishnomalar Telegram bot orqali yuboriladi</p>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-500 ring-1 ring-slate-100">
          <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
          Login yaratilgach parol faqat bir marta ko&apos;rsatiladi — nusxalab oling.
        </div>

        {error && <p className="text-sm text-rose-500">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Bekor qilish</button>
          <button onClick={() => { setError(''); create.mutate(); }} disabled={create.isPending || !phone || password.length < 4} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
            <KeyRound size={15} /> {create.isPending ? 'Yaratilmoqda...' : 'Yaratish'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
function CredRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
        <div className="font-mono text-sm font-semibold text-slate-800">{value}</div>
      </div>
      <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
        {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
      </button>
    </div>
  );
}
