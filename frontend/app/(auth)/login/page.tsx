'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Logo } from '@/components/logo';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { login, password });
      setAuth(data.accessToken, data.user);
      const portalRoles = ['student', 'guardian'];
      router.push(portalRoles.includes(data.user.role) ? '/portal' : '/crm');
    } catch {
      setError("Login yoki parol noto'g'ri");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand to-brand-dark p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:p-10">
        {/* Sarlavha */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-brand/10 text-brand">
            <Logo className="h-10 w-10" />
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Sulton School
          </div>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">ERP tizimiga kirish</h1>
          <p className="mt-1 text-sm text-slate-400">Login va parolingizni kiriting</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Login */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Login</label>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Telefon yoki email"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10"
              required
            />
          </div>

          {/* Parol */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Parol</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-slate-900 outline-none transition focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10"
                required
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? 'Kirilmoqda...' : 'Kirish'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Parolni unutdingizmi? Administrator bilan bog&apos;laning.
        </p>
      </div>
    </main>
  );
}
