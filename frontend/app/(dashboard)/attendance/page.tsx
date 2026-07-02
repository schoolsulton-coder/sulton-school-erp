'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  attendanceApi,
  ATT_STATUS,
  type AttStatus,
  type ClassDayRow,
} from '@/lib/attendance';
import { classesApi } from '@/lib/classes';

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AttendancePage() {
  const qc = useQueryClient();
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(today());
  const [marks, setMarks] = useState<Record<string, AttStatus>>({});

  const { data: classes } = useQuery({ queryKey: ['classes-mini'], queryFn: () => classesApi.list() });
  const { data: rows } = useQuery({
    queryKey: ['attendance', classId, date],
    queryFn: () => attendanceApi.classDay(classId, date),
    enabled: !!classId,
  });
  const { data: stats } = useQuery({
    queryKey: ['att-stats', classId],
    queryFn: () => attendanceApi.classStats(classId),
    enabled: !!classId,
  });

  // mavjud holatlarni boshlang'ich qiymat sifatida yuklash
  useEffect(() => {
    if (rows) {
      const init: Record<string, AttStatus> = {};
      rows.forEach((r) => { if (r.status) init[r.id] = r.status; });
      setMarks(init);
    }
  }, [rows]);

  const save = useMutation({
    mutationFn: () =>
      attendanceApi.mark({
        classId,
        date,
        records: Object.entries(marks).map(([studentId, status]) => ({ studentId, status })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', classId, date] });
      qc.invalidateQueries({ queryKey: ['att-stats', classId] });
    },
  });

  const setAll = (status: AttStatus) => {
    if (!rows) return;
    const all: Record<string, AttStatus> = {};
    rows.forEach((r) => { all[r.id] = status; });
    setMarks(all);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Davomat</h1>
          <p className="text-sm text-slate-500">Kunlik davomat belgilash</p>
        </div>
        <div className="flex gap-2">
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Sinf</option>
            {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>

      {classId && stats && (
        <div className="mb-4 flex flex-wrap gap-3 text-sm">
          <Stat label="Davomat" value={`${stats.rate}%`} />
          <Stat label="Bor" value={stats.present} />
          <Stat label="Yo'q" value={stats.absent} />
          <Stat label="Kechikkan" value={stats.late} />
          <Stat label="Sababli" value={stats.excused} />
        </div>
      )}

      {!classId ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400">
          Sinfni tanlang
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
            Hammaga:
            {(Object.keys(ATT_STATUS) as AttStatus[]).map((st) => (
              <button key={st} onClick={() => setAll(st)} className="rounded border border-slate-200 px-2 py-0.5 hover:bg-slate-50">
                {ATT_STATUS[st].label}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {rows?.map((r: ClassDayRow) => (
              <div key={r.id} className="flex items-center justify-between border-b border-slate-100 px-4 py-2 last:border-0">
                <span className="text-sm font-medium">{r.lastName} {r.firstName}</span>
                <div className="flex gap-1">
                  {(Object.keys(ATT_STATUS) as AttStatus[]).map((st) => {
                    const active = marks[r.id] === st;
                    return (
                      <button
                        key={st}
                        onClick={() => setMarks({ ...marks, [r.id]: st })}
                        className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                          active ? ATT_STATUS[st].active : `border border-slate-200 ${ATT_STATUS[st].cls} hover:bg-slate-50`
                        }`}
                      >
                        {ATT_STATUS[st].label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending || !Object.keys(marks).length}
              className="rounded-lg bg-brand px-5 py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {save.isPending ? 'Saqlanmoqda...' : 'Davomatni saqlash'}
            </button>
            {save.isSuccess && <span className="text-sm text-green-600">✓ Saqlandi</span>}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="rounded-full bg-white px-3 py-1 shadow-sm">
      {label}: <b>{value}</b>
    </span>
  );
}
