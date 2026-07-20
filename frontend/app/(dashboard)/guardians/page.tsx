'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  Search,
  ShieldCheck,
  Baby,
  X,
  Save,
  Phone,
} from 'lucide-react';
import { crmApi, type GuardianRow } from '@/lib/crm';

const RELATIONS = ['ota-ona', 'ota', 'ona', 'vasiy'];

export default function GuardiansPage() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['crm-guardians'],
    queryFn: crmApi.guardians,
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((g) => {
      const kids = g.students
        .map((s) => `${s.student.lastName} ${s.student.firstName}`)
        .join(' ');
      return `${g.fullName} ${g.phone} ${kids}`.toLowerCase().includes(q);
    });
  }, [data, search]);

  const stats = useMemo(() => {
    const list = data ?? [];
    return {
      total: list.length,
      withKids: list.filter((g) => g.students.length > 0).length,
      withLogin: list.filter((g) => g.user).length,
    };
  }, [data]);

  return (
    <div className="min-h-full bg-slate-50/60 p-6">
      {/* Sarlavha */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand text-white shadow-sm">
            <Users size={22} />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
              Vasiylar
              <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-sm font-semibold text-slate-500">
                {stats.total} ta
              </span>
            </h1>
            <p className="text-sm text-slate-400">Ota-onalar va vasiylar ro&apos;yxati</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          <UserPlus size={18} /> Yangi vasiy
        </button>
      </div>

      {/* Statistika */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={Users} tone="brand" label="Jami vasiylar" value={stats.total} />
        <StatCard icon={Baby} tone="emerald" label="Farzandli" value={stats.withKids} />
        <StatCard icon={ShieldCheck} tone="violet" label="Login mavjud" value={stats.withLogin} />
      </div>

      {/* Qidiruv */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ism, telefon yoki farzand bo'yicha qidirish..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </div>

      {/* Jadval */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">F.I.SH</th>
                <th className="px-5 py-3">Telefon</th>
                <th className="px-5 py-3">Aloqa</th>
                <th className="px-5 py-3">Farzandlar</th>
                <th className="px-5 py-3 text-center">Login</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    Vasiy topilmadi
                  </td>
                </tr>
              ) : (
                filtered.map((g) => <GuardianRowItem key={g.id} g={g} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <GuardianFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function GuardianRowItem({ g }: { g: GuardianRow }) {
  return (
    <tr className="border-b border-slate-50 transition last:border-0 hover:bg-brand/[0.03]">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand">
            {g.fullName.slice(0, 1).toUpperCase()}
          </div>
          <span className="font-semibold text-slate-800">{g.fullName}</span>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <Phone size={13} className="text-slate-400" />
          {g.phone}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
          {g.relation ?? '—'}
        </span>
      </td>
      <td className="px-5 py-3.5">
        {g.students.length ? (
          <div className="flex flex-wrap gap-1">
            {g.students.map((s) => (
              <span
                key={s.student.id}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 ring-1 ring-emerald-100"
              >
                {s.student.lastName} {s.student.firstName}
                {s.student.class?.name && (
                  <span className="text-emerald-400">· {s.student.class.name}</span>
                )}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
      <td className="px-5 py-3.5 text-center">
        {g.user ? (
          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600 ring-1 ring-emerald-200">
            ✓ bor
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-400 ring-1 ring-slate-200">
            yo&apos;q
          </span>
        )}
      </td>
    </tr>
  );
}

function GuardianFormModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ fullName: '', phone: '', relation: 'ota-ona' });
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: () =>
      crmApi.createGuardian({
        fullName: form.fullName,
        phone: form.phone,
        relation: form.relation || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-guardians'] });
      onSaved();
    },
    onError: (e: any) =>
      setError(
        Array.isArray(e?.response?.data?.message)
          ? e.response.data.message.join(', ')
          : e?.response?.data?.message ?? 'Xatolik yuz berdi',
      ),
  });

  const inputCls =
    'w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand">
              <UserPlus size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Yangi vasiy</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              F.I.SH <span className="text-rose-500">*</span>
            </span>
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className={inputCls}
              placeholder="Masalan: Aliyev Vali"
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Telefon <span className="text-rose-500">*</span>
              </span>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputCls}
                placeholder="+998..."
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Aloqa
              </span>
              <select
                value={form.relation}
                onChange={(e) => setForm({ ...form, relation: e.target.value })}
                className={inputCls + ' cursor-pointer'}
              >
                {RELATIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Bekor
          </button>
          <button
            type="submit"
            disabled={save.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
          >
            <Save size={16} />
            {save.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </form>
    </div>
  );
}

const TONES: Record<string, string> = {
  brand: 'bg-brand/10 text-brand',
  emerald: 'bg-emerald-50 text-emerald-500',
  violet: 'bg-violet-50 text-violet-500',
};

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof Users;
  tone: keyof typeof TONES | string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </span>
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${TONES[tone] ?? TONES.brand}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-800">{value}</div>
    </div>
  );
}
