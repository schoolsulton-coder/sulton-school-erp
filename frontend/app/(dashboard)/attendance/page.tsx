'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Search } from 'lucide-react';
import { attendanceApi, ATT_STATUS, type AttStatus, type ClassDayRow } from '@/lib/attendance';
import { useAuthStore } from '@/store/auth';

// Maktab (Toshkent) kuni — backend bilan bir xil
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });

// Ixcham (mobil) yozuvlar
const SHORT: Record<AttStatus, string> = { PRESENT: 'Bor', ABSENT: "Yo'q", LATE: 'Kech', EXCUSED: 'Sabab' };
const ORDER: AttStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

export default function AttendancePage() {
  const qc = useQueryClient();
  const can = useAuthStore((s) => s.can);
  const canCreate = can('attendance.create');
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(today());
  const [studentSearch, setStudentSearch] = useState('');
  const [marks, setMarks] = useState<Record<string, AttStatus>>({});

  const { data: my } = useQuery({ queryKey: ['att-my-classes'], queryFn: attendanceApi.myClasses });
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

  // Kontekst (sinf/sana) o'zgarganda mavjud holatlarni yuklaymiz;
  // fon-refetch belgilanган holatlarni O'CHIRMAYDI.
  const ctxKey = `${classId}|${date}`;
  const loadedCtx = useRef('');
  useEffect(() => {
    if (!rows) return;
    if (loadedCtx.current === ctxKey) return;
    loadedCtx.current = ctxKey;
    const init: Record<string, AttStatus> = {};
    rows.forEach((r) => { if (r.status) init[r.id] = r.status; });
    setMarks(init);
  }, [rows, ctxKey]);

  const save = useMutation({
    mutationFn: () =>
      attendanceApi.mark({
        classId,
        // Ustoz uchun har doim joriy kun (tab tunni kesib o'tsa ham 403 bo'lmasin)
        date: my && !my.canMarkAll ? today() : date,
        records: Object.entries(marks).map(([studentId, status]) => ({ studentId, status })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', classId, date] });
      qc.invalidateQueries({ queryKey: ['att-stats', classId] });
    },
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Saqlashda xatolik'),
  });

  const list: ClassDayRow[] = rows ?? [];
  const q = studentSearch.trim().toLowerCase();
  const filtered = q ? list.filter((r) => `${r.lastName} ${r.firstName}`.toLowerCase().includes(q)) : list;
  const setAll = (status: AttStatus) => setMarks((p) => ({ ...p, ...Object.fromEntries(filtered.map((r) => [r.id, status])) }));
  const markedCount = Object.keys(marks).length;

  const sel = 'min-w-0 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand';

  return (
    <div className="p-3 sm:p-6">
      <div className="mb-3 flex items-center justify-between sm:mb-5">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Davomat</h1>
          <p className="hidden text-sm text-slate-500 sm:block">Kunlik davomat belgilash</p>
        </div>
        <Link href="/attendance/statistics" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 sm:py-2">
          <BarChart3 size={15} /> Statistika
        </Link>
      </div>

      {/* Tanlovlar */}
      <div className="mb-3 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2">
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className={`${sel} flex-1`}>
          <option value="">Sinf</option>
          {my?.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={my ? !my.canMarkAll : true}
          title={my && !my.canMarkAll ? 'Faqat bugungi davomat' : ''}
          className={`${sel} flex-1 disabled:bg-slate-50 disabled:text-slate-500`}
        />
      </div>

      {classId && stats && (
        <div className="mb-3 flex flex-wrap gap-2 text-sm">
          <Stat label="Davomat" value={`${stats.rate}%`} />
          <Stat label="Bor" value={stats.present} />
          <Stat label="Yo'q" value={stats.absent} />
          <Stat label="Kech" value={stats.late} />
          <Stat label="Sabab" value={stats.excused} />
        </div>
      )}

      {!classId ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400">
          {my && !my.classes.length ? 'Sizga sinf biriktirilmagan' : 'Sinfni tanlang'}
        </div>
      ) : (
        <>
          {list.length > 6 && (
            <div className="relative mb-3">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder={`O'quvchi qidirish (${list.length} ta)`}
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
              />
            </div>
          )}

          {canCreate && (
            <div className="mb-2 flex flex-wrap items-center gap-1.5 text-sm">
              <span className="text-slate-500">Hammaga:</span>
              {ORDER.map((st) => (
                <button key={st} onClick={() => setAll(st)} className={`rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium ${ATT_STATUS[st].cls} hover:bg-slate-50`}>
                  {SHORT[st]}
                </button>
              ))}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {filtered.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 last:border-0">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.lastName} {r.firstName}</span>
                <div className="flex shrink-0 gap-1">
                  {ORDER.map((st) => {
                    const active = marks[r.id] === st;
                    return (
                      <button
                        key={st}
                        onClick={() => canCreate && setMarks((p) => ({ ...p, [r.id]: st }))}
                        disabled={!canCreate}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                          active ? ATT_STATUS[st].active : `bg-slate-100 ${ATT_STATUS[st].cls} ${canCreate ? 'hover:bg-slate-200' : ''}`
                        }`}
                      >
                        {SHORT[st]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {!filtered.length && <div className="px-3 py-10 text-center text-slate-400">{q ? "Qidiruvga mos o'quvchi yo'q" : "O'quvchi topilmadi"}</div>}
          </div>

          {canCreate && (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending || !markedCount}
                className="rounded-lg bg-brand px-6 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {save.isPending ? 'Saqlanmoqda…' : 'Davomatni saqlash'}
              </button>
              {save.isSuccess && !save.isPending && <span className="text-sm font-medium text-green-600">✓ Saqlandi</span>}
            </div>
          )}
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
