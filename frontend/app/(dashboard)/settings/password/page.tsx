'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { usersApi } from '@/lib/users';

export default function ChangePasswordPage() {
  const user = useAuthStore((s) => s.user);
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const save = useMutation({
    mutationFn: () => usersApi.resetPassword(user!.id, pass),
    onSuccess: () => { setDone(true); setPass(''); setConfirm(''); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik (huquq yetarli emasmi?)'),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (pass.length < 6) return setError('Parol kamida 6 belgi');
    if (pass !== confirm) return setError('Parollar mos emas');
    save.mutate();
  };

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-bold">Parolni o&apos;zgartirish</h1>
      <p className="mb-6 text-sm text-slate-500">{user?.fullName}</p>

      <form onSubmit={submit} className="max-w-sm space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
        <input type="password" placeholder="Yangi parol" value={pass} onChange={(e) => setPass(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" required minLength={6} />
        <input type="password" placeholder="Parolni takrorlang" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" required />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {done && <p className="rounded-lg bg-green-50 p-2 text-sm text-green-700">✓ Parol yangilandi</p>}
        <button type="submit" disabled={save.isPending} className="w-full rounded-lg bg-brand py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
          {save.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </form>
    </div>
  );
}
