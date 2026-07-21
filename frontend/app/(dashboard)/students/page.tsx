'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Search, Plus, UserCheck, GraduationCap, UserMinus, Archive, Phone } from 'lucide-react';
import { studentsApi, STATUS_LABEL, STATUS_COLOR, type StudentListItem } from '@/lib/students';
import { StudentFormModal } from '@/components/student-form';
import { classesApi } from '@/lib/classes';
import { crmApi } from '@/lib/crm';

const initials = (last?: string, first?: string) => `${(last ?? '').charAt(0)}${(first ?? '').charAt(0)}`.toUpperCase() || '—';

export default function StudentsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{ classId?: string; status?: string; branchId?: string }>({});
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['students', search, page, filters],
    queryFn: () => studentsApi.list({ search: search || undefined, page, ...filters }),
  });
  const { data: classes } = useQuery({ queryKey: ['classes-mini'], queryFn: () => classesApi.list() });
  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });

  const stats = data?.stats;
  const set = (patch: Partial<typeof filters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const selCls = 'rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-600 outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20';

  return (
    <div className="min-h-full bg-slate-50/60 p-6">
      {/* Sarlavha */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand text-white shadow-sm"><Users size={22} /></div>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
              O&apos;quvchilar
              <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-sm font-semibold text-slate-500">{stats?.total ?? 0} ta</span>
            </h1>
            <p className="text-sm text-slate-400">O&apos;quvchilar ro&apos;yxati va kartalari</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark">
          <Plus size={18} /> Yangi o&apos;quvchi
        </button>
      </div>

      {/* Stat kartochkalar */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Stat icon={Users} tone="brand" label="Jami" value={stats?.total ?? 0} />
        <Stat icon={UserCheck} tone="emerald" label="Faol" value={stats?.active ?? 0} />
        <Stat icon={GraduationCap} tone="indigo" label="Bitirgan" value={stats?.graduated ?? 0} />
        <Stat icon={UserMinus} tone="rose" label="Chetlatilgan" value={stats?.expelled ?? 0} />
        <Stat icon={Archive} tone="slate" label="Arxiv" value={stats?.archived ?? 0} />
      </div>

      {/* Filtrlar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Ism yoki familiya bo'yicha qidirish..." className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20" />
        </div>
        <select value={filters.classId ?? ''} onChange={(e) => set({ classId: e.target.value || undefined })} className={selCls}>
          <option value="">Barcha sinflar</option>
          {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filters.branchId ?? ''} onChange={(e) => set({ branchId: e.target.value || undefined })} className={selCls}>
          <option value="">Barcha filiallar</option>
          {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={filters.status ?? ''} onChange={(e) => set({ status: e.target.value || undefined })} className={selCls}>
          <option value="">Barcha holatlar</option>
          <option value="ACTIVE">Faol</option>
          <option value="GRADUATED">Bitirgan</option>
          <option value="EXPELLED">Chetlatilgan</option>
          <option value="ARCHIVED">Arxiv</option>
        </select>
        {(filters.classId || filters.branchId || filters.status) && (
          <button onClick={() => { setFilters({}); setPage(1); }} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700">Tozalash</button>
        )}
      </div>

      {/* Jadval */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">F.I.SH</th>
                <th className="px-5 py-3">Sinf</th>
                <th className="px-5 py-3">Filial</th>
                <th className="px-5 py-3">Telefon</th>
                <th className="px-5 py-3 text-center">Holat</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">Yuklanmoqda...</td></tr>
              ) : data?.data.length ? (
                data.data.map((s: StudentListItem) => (
                  <tr key={s.id} onClick={() => router.push(`/students/${s.id}`)} className="cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-brand/[0.03]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-brand/10 text-xs font-bold text-brand">
                          {s.photo ? <img src={s.photo} alt="" className="h-full w-full object-cover" /> : initials(s.lastName, s.firstName)}
                        </div>
                        <span className="font-semibold text-slate-800">{s.lastName} {s.firstName} {s.middleName ?? ''}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">{s.class?.name ? <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{s.class.name}</span> : <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3.5 text-slate-600">{s.branch?.name ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      {s.guardians?.[0]?.guardian?.phone ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-600"><Phone size={13} className="text-slate-400" />{s.guardians[0].guardian.phone}</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[s.status]}`}>{STATUS_LABEL[s.status]}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">O&apos;quvchi topilmadi</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm disabled:opacity-40">←</button>
          <span className="text-sm text-slate-500">{page} / {data.pages}</span>
          <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm disabled:opacity-40">→</button>
        </div>
      )}

      {showForm && <StudentFormModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['students'] }); }} />}
    </div>
  );
}

const TONES: Record<string, string> = {
  brand: 'bg-brand/10 text-brand',
  emerald: 'bg-emerald-50 text-emerald-500',
  indigo: 'bg-indigo-50 text-indigo-500',
  rose: 'bg-rose-50 text-rose-500',
  slate: 'bg-slate-100 text-slate-500',
};
function Stat({ icon: Icon, tone, label, value }: { icon: typeof Users; tone: keyof typeof TONES; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${TONES[tone]}`}><Icon size={16} /></div>
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-800">{value}</div>
    </div>
  );
}
