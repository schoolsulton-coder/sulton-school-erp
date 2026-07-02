'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  hrApi,
  SALARY_LABEL,
  EMP_STATUS,
  type Employee,
  type Department,
} from '@/lib/hr';
import { usersApi } from '@/lib/users';
import { money } from '@/lib/finance';

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2';

export default function HrPage() {
  const qc = useQueryClient();
  const [showHire, setShowHire] = useState(false);
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: () => hrApi.employees() });
  const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: hrApi.departments });

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">HR — Xodimlar</h1>
          <p className="text-sm text-slate-500">
            Jami: {employees?.length ?? 0} · <Link href="/payroll" className="text-brand">Oylik hisob-kitob →</Link>
          </p>
        </div>
        <button onClick={() => setShowHire(true)} className="rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark">
          + Ishga qabul
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Xodimlar */}
        <div className="lg:col-span-3">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">F.I.SH</th>
                  <th className="px-4 py-3">Lavozim</th>
                  <th className="px-4 py-3">Stavka</th>
                  <th className="px-4 py-3">Holat</th>
                </tr>
              </thead>
              <tbody>
                {employees?.map((e: Employee) => (
                  <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/hr/${e.id}`} className="font-medium text-brand">{e.user.fullName}</Link>
                      <div className="text-xs text-slate-400">{e.user.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      {e.position?.name ?? '—'}
                      {e.department && <div className="text-xs text-slate-400">{e.department.name}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {e.salary ? `${SALARY_LABEL[e.salary.type]} · ${money(e.salary.baseRate)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${EMP_STATUS[e.status].cls}`}>
                        {EMP_STATUS[e.status].label}
                      </span>
                    </td>
                  </tr>
                ))}
                {!employees?.length && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Xodim yo&apos;q</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Struktura */}
        <StructurePanel departments={departments ?? []} onChange={() => qc.invalidateQueries({ queryKey: ['departments'] })} />
      </div>

      {showHire && (
        <HireModal
          departments={departments ?? []}
          onClose={() => setShowHire(false)}
          onDone={() => { setShowHire(false); qc.invalidateQueries({ queryKey: ['employees'] }); }}
        />
      )}
    </div>
  );
}

function StructurePanel({ departments, onChange }: { departments: Department[]; onChange: () => void }) {
  const [name, setName] = useState('');
  const add = useMutation({ mutationFn: () => hrApi.createDepartment(name), onSuccess: () => { setName(''); onChange(); } });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-2 font-semibold">Bo&apos;limlar</h2>
      {departments.map((d) => (
        <div key={d.id} className="border-b border-slate-100 py-2 text-sm last:border-0">
          <div className="flex justify-between font-medium">
            <span>{d.name}</span>
            <span className="text-xs text-slate-400">{d._count.employees} xodim</span>
          </div>
          {d.positions.length > 0 && (
            <div className="text-xs text-slate-400">{d.positions.map((p) => p.name).join(', ')}</div>
          )}
        </div>
      ))}
      <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="mt-3 flex gap-2">
        <input placeholder="Yangi bo'lim" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm" />
        <button className="rounded-lg bg-brand px-3 text-sm font-semibold text-white">+</button>
      </form>
    </div>
  );
}

function HireModal({ departments, onClose, onDone }: { departments: Department[]; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    fullName: '', phone: '', password: '', roleId: '', hireDate: '',
    departmentId: '', positionId: '', salaryType: 'MONTHLY', baseRate: '',
  });
  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: usersApi.roles });
  const { data: positions } = useQuery({ queryKey: ['positions'], queryFn: hrApi.positions });
  const [error, setError] = useState('');

  const hire = useMutation({
    mutationFn: () => hrApi.hire({
      fullName: form.fullName, phone: form.phone, password: form.password, roleId: form.roleId,
      hireDate: form.hireDate,
      departmentId: form.departmentId || undefined,
      positionId: form.positionId || undefined,
      salaryType: form.baseRate ? (form.salaryType as any) : undefined,
      baseRate: form.baseRate ? Number(form.baseRate) : undefined,
    }),
    onSuccess: onDone,
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); hire.mutate(); }} className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold">Ishga qabul</h2>
        <p className="text-xs text-slate-400">Login akkaunt + xodim profili birga yaratiladi</p>
        <input placeholder="F.I.SH" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputCls} required />
        <div className="flex gap-2">
          <input placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} required />
          <input type="password" placeholder="Parol" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} required minLength={6} />
        </div>
        <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} className={inputCls} required>
          <option value="">Rol tanlang</option>
          {roles?.filter((r) => !['student', 'guardian'].includes(r.slug)).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <div className="flex gap-2">
          <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className={inputCls}>
            <option value="">Bo&apos;limsiz</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={form.positionId} onChange={(e) => setForm({ ...form, positionId: e.target.value })} className={inputCls}>
            <option value="">Lavozimsiz</option>
            {positions?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} className={inputCls} required />
        <div className="flex gap-2">
          <select value={form.salaryType} onChange={(e) => setForm({ ...form, salaryType: e.target.value })} className={inputCls}>
            <option value="MONTHLY">Oylik</option>
            <option value="HOURLY">Soatbay</option>
            <option value="PER_LESSON">Darsbay</option>
          </select>
          <input type="number" placeholder="Stavka (ixtiyoriy)" value={form.baseRate} onChange={(e) => setForm({ ...form, baseRate: e.target.value })} className={inputCls} />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-300 py-2">Bekor</button>
          <button type="submit" disabled={hire.isPending} className="flex-1 rounded-lg bg-brand py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
            {hire.isPending ? 'Saqlanmoqda...' : 'Qabul qilish'}
          </button>
        </div>
      </form>
    </div>
  );
}
