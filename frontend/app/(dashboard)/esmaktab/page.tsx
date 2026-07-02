'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { esmaktabApi, type SyncLog } from '@/lib/esmaktab';
import { classesApi } from '@/lib/classes';

export default function EsmaktabPage() {
  const qc = useQueryClient();
  const [classId, setClassId] = useState('');
  const [period, setPeriod] = useState('');
  const [month, setMonth] = useState('');

  const { data: classes } = useQuery({ queryKey: ['classes-mini'], queryFn: () => classesApi.list() });
  const { data: status } = useQuery({ queryKey: ['esmaktab-status'], queryFn: esmaktabApi.status });
  const { data: logs } = useQuery({ queryKey: ['esmaktab-logs'], queryFn: esmaktabApi.logs });

  const sync = useMutation({
    mutationFn: () => esmaktabApi.sync('students'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['esmaktab-logs'] }),
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">E-maktab integratsiya</h1>
        <p className="text-sm text-slate-500">Elektron jurnal eksporti va sinxronizatsiya</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Excel eksport */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">📊 Excel eksport</h2>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Sinf tanlang (o&apos;quvchilar uchun ixtiyoriy)</option>
            {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <div className="space-y-3">
            <button
              onClick={() => esmaktabApi.exportStudents(classId || undefined)}
              className="w-full rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              👥 O&apos;quvchilar ro&apos;yxati
            </button>

            <div className="flex gap-2">
              <input placeholder="Davr (1-chorak)" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-1/2 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <button
                onClick={() => classId && esmaktabApi.exportGrades(classId, period || undefined)}
                disabled={!classId}
                className="w-1/2 rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                📝 Baholar jurnali
              </button>
            </div>

            <div className="flex gap-2">
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-1/2 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <button
                onClick={() => classId && esmaktabApi.exportAttendance(classId, month || undefined)}
                disabled={!classId}
                className="w-1/2 rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                📅 Davomat hisoboti
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">Baholar va davomat uchun sinf tanlanishi shart.</p>
        </div>

        {/* API sync */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">🔄 API sinxronizatsiya</h2>
          <div className="mb-3 flex items-center justify-between text-sm">
            <span>E-maktab API</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${status?.apiConfigured ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {status?.apiConfigured ? '● Sozlangan' : '○ Sozlanmagan'}
            </span>
          </div>
          {!status?.apiConfigured && (
            <p className="mb-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
              Rasmiy E-maktab API kalitlari <code>.env</code> da yo&apos;q. Hozircha
              Excel eksportdan foydalaning. API ulanganda sync avtomatik ishlaydi.
            </p>
          )}
          <button
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
            className="w-full rounded-lg border border-slate-300 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            {sync.isPending ? 'Yuborilmoqda...' : 'Sinxronizatsiyani sinash'}
          </button>
        </div>
      </div>

      {/* Loglar */}
      <h2 className="mb-3 text-lg font-semibold">Sinxronizatsiya loglari</h2>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Sana</th>
              <th className="px-4 py-2">Obyekt</th>
              <th className="px-4 py-2">Holat</th>
              <th className="px-4 py-2">Xabar</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map((l: SyncLog) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-500">{new Date(l.createdAt).toLocaleString('uz-UZ')}</td>
                <td className="px-4 py-2">{l.entity}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${l.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {l.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-500">{l.message ?? '—'}</td>
              </tr>
            ))}
            {!logs?.length && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Log yo&apos;q</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
