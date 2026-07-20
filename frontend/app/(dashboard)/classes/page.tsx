'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Search,
  GraduationCap,
  LayoutGrid,
  Users,
  Armchair,
  Gauge,
} from 'lucide-react';
import { classesApi, type ClassRow } from '@/lib/classes';
import { ClassFormModal } from '@/components/class-form';

export default function ClassesPage() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filial, setFilial] = useState('all');
  const [year, setYear] = useState('all');
  const [status, setStatus] = useState('all');

  const { data: classes, isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesApi.list(),
  });

  const branchOptions = useMemo(
    () =>
      Array.from(
        new Map(
          (classes ?? [])
            .filter((c) => c.branch)
            .map((c) => [c.branch!.id, c.branch!.name]),
        ),
      ),
    [classes],
  );
  const yearOptions = useMemo(
    () => Array.from(new Set((classes ?? []).map((c) => c.academicYear))),
    [classes],
  );

  const filtered = useMemo(() => {
    return (classes ?? []).filter((c) => {
      if (search && !`${c.name} ${c.branch?.name ?? ''}`.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (filial !== 'all' && c.branch?.id !== filial) return false;
      if (year !== 'all' && c.academicYear !== year) return false;
      if (status !== 'all' && (c.status ?? 'Faol') !== status) return false;
      return true;
    });
  }, [classes, search, filial, year, status]);

  const stats = useMemo(() => {
    const totalCapacity = filtered.reduce((s, c) => s + c.capacity, 0);
    const totalStudents = filtered.reduce((s, c) => s + c.studentCount, 0);
    const totalFree = filtered.reduce((s, c) => s + c.freeSeats, 0);
    return {
      count: filtered.length,
      totalCapacity,
      totalStudents,
      totalFree,
      avgFill: totalCapacity
        ? Math.round((totalStudents / totalCapacity) * 100)
        : 0,
    };
  }, [filtered]);

  return (
    <div className="min-h-full bg-slate-50/60 p-6">
      {/* Sarlavha */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand text-white shadow-sm">
            <GraduationCap size={22} />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
              Sinflar
              <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-sm font-semibold text-slate-500">
                {stats.count} ta
              </span>
            </h1>
            <p className="text-sm text-slate-400">
              Sinflar, sig&apos;im va to&apos;liqlik boshqaruvi
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          <Plus size={18} /> Yangi sinf
        </button>
      </div>

      {/* Statistika kartochkalari */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={LayoutGrid} tone="brand" label="Sinflar" value={stats.count} />
        <StatCard icon={Armchair} tone="indigo" label="Jami joy" value={stats.totalCapacity} />
        <StatCard icon={Users} tone="emerald" label="O'quvchilar" value={stats.totalStudents} sub={`${stats.avgFill}% band`} />
        <StatCard icon={Armchair} tone="amber" label="Bo'sh joy" value={stats.totalFree} />
        <StatCard icon={Gauge} tone="violet" label="O'rtacha to'liqlik" value={`${stats.avgFill}%`} />
      </div>

      {/* Filtrlar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sinf yoki filial bo'yicha qidirish..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <FilterSelect value={filial} onChange={setFilial}>
          <option value="all">Barcha filiallar</option>
          {branchOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={year} onChange={setYear}>
          <option value="all">Barcha yillar</option>
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={status} onChange={setStatus}>
          <option value="all">Barcha holatlar</option>
          <option value="Faol">Faol</option>
          <option value="Nofaol">Nofaol</option>
          <option value="Arxiv">Arxiv</option>
        </FilterSelect>
      </div>

      {/* Jadval */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Sinf</th>
                <th className="px-5 py-3">Filial · Yil</th>
                <th className="px-5 py-3 text-center">Joy</th>
                <th className="px-5 py-3 text-center">O&apos;quvchi</th>
                <th className="px-5 py-3 text-center">Bo&apos;sh</th>
                <th className="px-5 py-3">To&apos;liqlik</th>
                <th className="px-5 py-3 text-center">Holat</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    Sinf topilmadi.{' '}
                    <button
                      onClick={() => setShowForm(true)}
                      className="font-semibold text-brand hover:underline"
                    >
                      Yangi sinf qo&apos;shing
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <ClassRowItem
                    key={c.id}
                    c={c}
                    onClick={() => router.push(`/classes/${c.id}`)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <ClassFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function ClassRowItem({ c, onClick }: { c: ClassRow; onClick: () => void }) {
  const pct = Math.min(c.fillPercent, 100);
  const barColor =
    c.fillPercent >= 100
      ? 'bg-rose-500'
      : c.fillPercent >= 80
        ? 'bg-amber-500'
        : 'bg-emerald-500';
  return (
    <tr
      onClick={onClick}
      className="cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-brand/[0.03]"
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand/10 text-sm font-bold text-brand">
            {c.gradeLevel}
          </div>
          <div>
            <div className="font-semibold text-slate-800">{c.name}</div>
            {c.language && (
              <span className="text-xs text-slate-400">{c.language}</span>
            )}
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <div className="text-slate-700">{c.branch?.name ?? '—'}</div>
        <div className="text-xs text-slate-400">{c.academicYear}</div>
      </td>
      <td className="px-5 py-3.5 text-center font-medium text-slate-600">
        {c.capacity}
      </td>
      <td className="px-5 py-3.5 text-center font-semibold text-slate-800">
        {c.studentCount}
      </td>
      <td className="px-5 py-3.5 text-center font-medium text-slate-500">
        {c.freeSeats}
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="w-9 text-xs font-semibold text-slate-500">
            {c.fillPercent}%
          </span>
        </div>
      </td>
      <td className="px-5 py-3.5 text-center">
        <StatusBadge status={c.status ?? 'Faol'} />
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Faol: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
    Nofaol: 'bg-slate-100 text-slate-500 ring-slate-200',
    Arxiv: 'bg-amber-50 text-amber-600 ring-amber-200',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${map[status] ?? map.Faol}`}
    >
      {status}
    </span>
  );
}

const TONES: Record<string, string> = {
  brand: 'bg-brand/10 text-brand',
  indigo: 'bg-indigo-50 text-indigo-500',
  emerald: 'bg-emerald-50 text-emerald-500',
  amber: 'bg-amber-50 text-amber-500',
  violet: 'bg-violet-50 text-violet-500',
};

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  sub,
}: {
  icon: typeof Users;
  tone: keyof typeof TONES | string;
  label: string;
  value: string | number;
  sub?: string;
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
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-600 outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
    >
      {children}
    </select>
  );
}
