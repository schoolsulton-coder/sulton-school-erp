'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  studentsApi,
  STATUS_LABEL,
  STATUS_COLOR,
  type StudentListItem,
} from '@/lib/students';
import { classesApi } from '@/lib/classes';

export default function StudentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['students', search, page],
    queryFn: () => studentsApi.list({ search: search || undefined, page }),
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">O&apos;quvchilar</h1>
          <p className="text-sm text-slate-500">Jami: {data?.total ?? 0}</p>
        </div>
        <div className="flex gap-2">
          <input
            placeholder="Qidirish (ism/familiya)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark"
          >
            + Yangi o&apos;quvchi
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">F.I.SH</th>
              <th className="px-4 py-3">Sinf</th>
              <th className="px-4 py-3">Holat</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">Yuklanmoqda...</td></tr>
            ) : data?.data.length ? (
              data.data.map((s: StudentListItem) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/students/${s.id}`} className="font-medium text-brand">
                      {s.lastName} {s.firstName} {s.middleName ?? ''}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{s.class?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[s.status]}`}>
                      {STATUS_LABEL[s.status]}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">O&apos;quvchi topilmadi</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-slate-300 px-3 py-1 text-sm disabled:opacity-40"
          >
            ←
          </button>
          <span className="text-sm text-slate-500">
            {page} / {data.pages}
          </span>
          <button
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-300 px-3 py-1 text-sm disabled:opacity-40"
          >
            →
          </button>
        </div>
      )}

      {showForm && (
        <NewStudentModal
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ['students'] });
          }}
        />
      )}
    </div>
  );
}

function NewStudentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    birthDate: '',
    gender: '',
    address: '',
    classId: '',
  });
  const { data: classes } = useQuery({
    queryKey: ['classes-mini'],
    queryFn: () => classesApi.list(),
  });

  const create = useMutation({
    mutationFn: () =>
      studentsApi.create({
        firstName: form.firstName,
        lastName: form.lastName,
        middleName: form.middleName || undefined,
        birthDate: form.birthDate || undefined,
        gender: (form.gender as 'MALE' | 'FEMALE') || undefined,
        address: form.address || undefined,
        classId: form.classId || undefined,
      }),
    onSuccess: onCreated,
  });

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
        className="w-full max-w-md space-y-3 rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold">Yangi o&apos;quvchi</h2>
        <div className="flex gap-2">
          <input placeholder="Familiya" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={inputCls} required />
          <input placeholder="Ism" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={inputCls} required />
        </div>
        <input placeholder="Otasining ismi" value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} className={inputCls} />
        <div className="flex gap-2">
          <input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className={inputCls} />
          <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className={inputCls}>
            <option value="">Jinsi</option>
            <option value="MALE">O&apos;g&apos;il</option>
            <option value="FEMALE">Qiz</option>
          </select>
        </div>
        <select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className={inputCls}>
          <option value="">Sinfsiz</option>
          {classes?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input placeholder="Manzil" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} />
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-300 py-2">Bekor</button>
          <button type="submit" disabled={create.isPending} className="flex-1 rounded-lg bg-brand py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
            {create.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </form>
    </div>
  );
}
