'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  studentsApi,
  STATUS_LABEL,
  STATUS_COLOR,
  type Guardian,
  type StudentStatus,
} from '@/lib/students';

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [showGuardian, setShowGuardian] = useState(false);
  const [account, setAccount] = useState<
    null | { mode: 'student' | 'guardian'; targetId: string; title: string }
  >(null);

  const { data: s } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsApi.get(id),
  });

  const removeGuardian = useMutation({
    mutationFn: (gid: string) => studentsApi.removeGuardian(id, gid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student', id] }),
  });

  if (!s) return <div className="p-8">Yuklanmoqda...</div>;

  return (
    <div className="p-6">
      {/* Sarlavha */}
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white">
          {s.firstName?.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold">
            {s.lastName} {s.firstName} {s.middleName ?? ''}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[s.status as StudentStatus]}`}>
              {STATUS_LABEL[s.status as StudentStatus]}
            </span>
            {s.class && <span>Sinf: {s.class.name}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Shaxsiy ma'lumotlar */}
        <Section title="Shaxsiy ma'lumotlar">
          <Info label="Tug'ilgan sana" value={s.birthDate ? new Date(s.birthDate).toLocaleDateString('uz-UZ') : '—'} />
          <Info label="Jinsi" value={s.gender === 'MALE' ? "O'g'il" : s.gender === 'FEMALE' ? 'Qiz' : '—'} />
          <Info label="Manzil" value={s.address ?? '—'} />
          <Info label="Qabul sanasi" value={s.admissionDate ? new Date(s.admissionDate).toLocaleDateString('uz-UZ') : '—'} />
        </Section>

        {/* Vasiylar */}
        <Section
          title="Vasiylar (ota-ona)"
          action={
            <button onClick={() => setShowGuardian(true)} className="text-sm font-medium text-brand">
              + Qo&apos;shish
            </button>
          }
        >
          {s.guardians?.length ? (
            s.guardians.map((g: { guardian: Guardian; isPrimary: boolean }) => (
              <div key={g.guardian.id} className="group flex items-center justify-between py-1.5 text-sm">
                <div>
                  <div className="font-medium">
                    {g.guardian.fullName}
                    {g.isPrimary && <span className="ml-1 text-xs text-brand">(asosiy)</span>}
                  </div>
                  <div className="text-xs text-slate-400">
                    {g.guardian.phone} · {g.guardian.relation ?? '—'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(g.guardian as any).userId ? (
                    <span className="text-xs text-green-600">✓ login</span>
                  ) : (
                    <button
                      onClick={() =>
                        setAccount({ mode: 'guardian', targetId: g.guardian.id, title: g.guardian.fullName })
                      }
                      className="text-xs text-brand hover:underline"
                    >
                      login
                    </button>
                  )}
                  <button
                    onClick={() => removeGuardian.mutate(g.guardian.id)}
                    className="text-xs text-red-400 opacity-0 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">Vasiy qo&apos;shilmagan</p>
          )}
        </Section>

        {/* Portal akkaunti */}
        <Section title="Portal akkaunti">
          {s.userId ? (
            <p className="text-sm text-green-600">✓ O&apos;quvchi logini yaratilgan</p>
          ) : (
            <button
              onClick={() => setAccount({ mode: 'student', targetId: id, title: `${s.lastName} ${s.firstName}` })}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              O&apos;quvchiga login yaratish
            </button>
          )}
          <p className="mt-2 text-xs text-slate-400">
            Vasiy loginlari yuqoridagi “login” tugmasi orqali yaratiladi.
          </p>
        </Section>

        {/* Hujjatlar */}
        <Section title="Hujjatlar">
          {s.documents?.length ? (
            s.documents.map((d: any) => (
              <div key={d.id} className="py-1 text-sm">
                📎 {d.fileName} <span className="text-xs text-slate-400">({d.type})</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">Hujjat yo&apos;q</p>
          )}
        </Section>
      </div>

      {/* Shartnomalar */}
      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Shartnomalar</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {s.contracts?.length ? (
            s.contracts.map((c: any) => (
              <Link
                key={c.id}
                href={`/contracts/${c.id}`}
                className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-sm last:border-0 hover:bg-slate-50"
              >
                <span className="font-medium text-brand">{c.number}</span>
                <span className="text-slate-500">{c.status}</span>
              </Link>
            ))
          ) : (
            <p className="px-4 py-6 text-center text-sm text-slate-400">Shartnoma yo&apos;q</p>
          )}
        </div>
      </div>

      {showGuardian && (
        <GuardianModal
          studentId={id}
          onClose={() => setShowGuardian(false)}
          onAdded={() => {
            setShowGuardian(false);
            qc.invalidateQueries({ queryKey: ['student', id] });
          }}
        />
      )}

      {account && (
        <AccountModal
          mode={account.mode}
          targetId={account.targetId}
          title={account.title}
          onClose={() => setAccount(null)}
          onDone={() => {
            setAccount(null);
            qc.invalidateQueries({ queryKey: ['student', id] });
          }}
        />
      )}
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function GuardianModal({
  studentId,
  onClose,
  onAdded,
}: {
  studentId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [form, setForm] = useState({ fullName: '', phone: '', relation: 'ota-ona', isPrimary: false });
  const add = useMutation({
    mutationFn: () => studentsApi.addGuardian(studentId, form),
    onSuccess: onAdded,
  });
  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
        className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold">Vasiy qo&apos;shish</h2>
        <input placeholder="F.I.SH" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputCls} required />
        <input placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} required />
        <input placeholder="Kim bo'ladi (ota/ona)" value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} className={inputCls} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isPrimary} onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })} />
          Asosiy vasiy
        </label>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-300 py-2">Bekor</button>
          <button type="submit" disabled={add.isPending} className="flex-1 rounded-lg bg-brand py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
            {add.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </form>
    </div>
  );
}

function AccountModal({
  mode,
  targetId,
  title,
  onClose,
  onDone,
}: {
  mode: 'student' | 'guardian';
  targetId: string;
  title: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [login, setLogin] = useState<string | null>(null);
  const [error, setError] = useState('');

  const create = useMutation({
    mutationFn: () =>
      mode === 'student'
        ? studentsApi.createAccount(targetId, { phone, password })
        : studentsApi.createGuardianAccount(targetId, {
            phone: phone || undefined,
            password,
          }),
    onSuccess: (res: any) => setLogin(res.login),
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
        className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold">Login yaratish</h2>
        <p className="text-sm text-slate-500">{title}</p>

        {login ? (
          <>
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              ✓ Akkaunt yaratildi. Login: <b>{login}</b>
            </div>
            <button type="button" onClick={onDone} className="w-full rounded-lg bg-brand py-2 font-semibold text-white">Yopish</button>
          </>
        ) : (
          <>
            <input
              placeholder={mode === 'student' ? 'Telefon (login)' : 'Telefon (ixtiyoriy)'}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputCls}
              required={mode === 'student'}
            />
            <input
              type="password"
              placeholder="Parol"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              required
              minLength={6}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-300 py-2">Bekor</button>
              <button type="submit" disabled={create.isPending} className="flex-1 rounded-lg bg-brand py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
                {create.isPending ? 'Yaratilmoqda...' : 'Yaratish'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
