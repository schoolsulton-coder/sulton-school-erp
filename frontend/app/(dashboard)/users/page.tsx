'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  usersApi,
  STATUS_LABEL,
  STATUS_COLOR,
  type ManagedUser,
} from '@/lib/users';

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2';

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<null | { mode: 'create' } | { mode: 'edit'; user: ManagedUser } | { mode: 'password'; user: ManagedUser }>(null);

  const { data: users } = useQuery({
    queryKey: ['users', search],
    queryFn: () => usersApi.list({ search: search || undefined }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['users'] });

  const toggleBlock = useMutation({
    mutationFn: (u: ManagedUser) =>
      usersApi.setStatus(u.id, u.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED'),
    onSuccess: refresh,
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Foydalanuvchilar</h1>
          <p className="text-sm text-slate-500">
            Xodimlar va kirish huquqlari ·{' '}
            <Link href="/roles" className="text-brand">Rollar va ruxsatlar →</Link>
          </p>
        </div>
        <div className="flex gap-2">
          <input
            placeholder="Qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button onClick={() => setModal({ mode: 'create' })} className="rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark">
            + Yangi foydalanuvchi
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">F.I.SH</th>
              <th className="px-4 py-3">Telefon</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Holat</th>
              <th className="px-4 py-3 text-right">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u: ManagedUser) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{u.fullName}</td>
                <td className="px-4 py-3">{u.phone}</td>
                <td className="px-4 py-3">{u.role.name}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[u.status]}`}>
                    {STATUS_LABEL[u.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2 text-xs">
                    <button onClick={() => setModal({ mode: 'edit', user: u })} className="text-brand hover:underline">Tahrir</button>
                    <button onClick={() => setModal({ mode: 'password', user: u })} className="text-slate-500 hover:underline">Parol</button>
                    <button
                      onClick={() => toggleBlock.mutate(u)}
                      className={u.status === 'BLOCKED' ? 'text-green-600 hover:underline' : 'text-red-500 hover:underline'}
                    >
                      {u.status === 'BLOCKED' ? 'Faollashtirish' : 'Bloklash'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!users?.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Foydalanuvchi yo&apos;q</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal?.mode === 'create' && (
        <UserModal onClose={() => setModal(null)} onDone={() => { setModal(null); refresh(); }} />
      )}
      {modal?.mode === 'edit' && (
        <UserModal user={modal.user} onClose={() => setModal(null)} onDone={() => { setModal(null); refresh(); }} />
      )}
      {modal?.mode === 'password' && (
        <PasswordModal user={modal.user} onClose={() => setModal(null)} onDone={() => setModal(null)} />
      )}
    </div>
  );
}

function UserModal({
  user,
  onClose,
  onDone,
}: {
  user?: ManagedUser;
  onClose: () => void;
  onDone: () => void;
}) {
  const editing = !!user;
  const [form, setForm] = useState({
    fullName: user?.fullName ?? '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
    password: '',
    roleId: user?.role.id ?? '',
    status: user?.status ?? 'ACTIVE',
  });
  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: usersApi.roles });
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: () =>
      editing
        ? usersApi.update(user!.id, {
            fullName: form.fullName,
            phone: form.phone,
            email: form.email || undefined,
            roleId: form.roleId,
            status: form.status as any,
          })
        : usersApi.create({
            fullName: form.fullName,
            phone: form.phone,
            email: form.email || undefined,
            password: form.password,
            roleId: form.roleId,
          }),
    onSuccess: onDone,
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
        className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold">{editing ? 'Tahrirlash' : 'Yangi foydalanuvchi'}</h2>
        <input placeholder="F.I.SH" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputCls} required />
        <input placeholder="Telefon (+998...)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} required />
        <input placeholder="Email (ixtiyoriy)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
        {!editing && (
          <input type="password" placeholder="Parol" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} required minLength={6} />
        )}
        <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} className={inputCls} required>
          <option value="">Rol tanlang</option>
          {roles?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {editing && (
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className={inputCls}>
            <option value="ACTIVE">Faol</option>
            <option value="INACTIVE">Nofaol</option>
            <option value="BLOCKED">Bloklangan</option>
          </select>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Actions onClose={onClose} pending={save.isPending} />
      </form>
    </div>
  );
}

function PasswordModal({
  user,
  onClose,
  onDone,
}: {
  user: ManagedUser;
  onClose: () => void;
  onDone: () => void;
}) {
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const save = useMutation({
    mutationFn: () => usersApi.resetPassword(user.id, password),
    onSuccess: () => setDone(true),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
        className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold">Parol tiklash</h2>
        <p className="text-sm text-slate-500">{user.fullName}</p>
        {done ? (
          <>
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">✓ Parol yangilandi</p>
            <button type="button" onClick={onDone} className="w-full rounded-lg bg-brand py-2 font-semibold text-white">Yopish</button>
          </>
        ) : (
          <>
            <input type="password" placeholder="Yangi parol" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} required minLength={6} />
            <Actions onClose={onClose} pending={save.isPending} />
          </>
        )}
      </form>
    </div>
  );
}

function Actions({ onClose, pending }: { onClose: () => void; pending: boolean }) {
  return (
    <div className="flex gap-2 pt-2">
      <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-300 py-2">Bekor</button>
      <button type="submit" disabled={pending} className="flex-1 rounded-lg bg-brand py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
        {pending ? 'Saqlanmoqda...' : 'Saqlash'}
      </button>
    </div>
  );
}
