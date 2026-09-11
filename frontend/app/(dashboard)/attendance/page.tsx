'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Search } from 'lucide-react';
import { attendanceApi, ATT_STATUS, type AttStatus, type ClassDayRow } from '@/lib/attendance';
import { useAuthStore } from '@/store/auth';
import { StudentDetailModal } from '@/components/student-detail';

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
  const [detail, setDetail] = useState<{ id: string; name: string } | null>(null);
  const [errMsg, setErrMsg] = useState('');

  const { data: my } = useQuery({ queryKey: ['att-my-classes'], queryFn: attendanceApi.myClasses });

  // Bitta sinf biriktirilgan bo'lsa — darhol o'sha sinf ochiladi
  useEffect(() => {
    if (my && !classId && my.classes.length === 1) setClassId(my.classes[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [my]);
  const { data: rows, isLoading: rowsLoading } = useQuery({
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
    // Standart 'Bor' — ustoz faqat kelmaganlarni o'zgartiradi, qolganlar yozuvsiz qolmaydi
    rows.forEach((r) => { init[r.id] = r.status ?? 'PRESENT'; });
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
      setErrMsg('');
      qc.invalidateQueries({ queryKey: ['attendance', classId, date] });
      qc.invalidateQueries({ queryKey: ['att-stats', classId] });
    },
    onError: (e: any) => setErrMsg(Array.isArray(e?.response?.data?.message) ? e.response.data.message[0] : (e?.response?.data?.message ?? 'Saqlashda xatolik')),
  });

  // Audit: shu kun oxirgi kim/qachon belgilagani
  const lastMarked = (rows ?? [])
    .filter((r) => r.markedAt)
    .sort((a, b) => new Date(b.markedAt!).getTime() - new Date(a.markedAt!).getTime())[0];

  const list: ClassDayRow[] = rows ?? [];
  const q = studentSearch.trim().toLowerCase();
  const filtered = q ? list.filter((r) => `${r.lastName} ${r.firstName}`.toLowerCase().includes(q)) : list;
  const setAll = (status: AttStatus) => setMarks((p) => ({ ...p, ...Object.fromEntries(filtered.map((r) => [r.id, status])) }));
  const markedCount = Object.keys(marks).length;

  // Mobilda 16px shrift — iOS input'ga bosganda sahifani "zoom" qilmaydi
  const sel = 'min-w-0 rounded-lg border border-slate-300 px-2.5 py-2.5 text-base outline-none focus:border-brand sm:py-1.5 sm:text-sm';

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3 sm:mb-5">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold sm:text-2xl">Davomat</h1>
          <p className="hidden text-sm text-slate-500 sm:block">Kunlik davomat belgilash</p>
        </div>
        <Link href="/attendance/statistics" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 sm:py-2">
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
        <div className="mb-3 flex flex-wrap gap-1.5 text-sm sm:gap-2">
          <Stat label="Davomat" value={`${stats.rate}%`} />
          <Stat label="Bor" value={stats.present} />
          <Stat label="Yo'q" value={stats.absent} />
          <Stat label="Kech" value={stats.late} />
          <Stat label="Sabab" value={stats.excused} />
        </div>
      )}

      {errMsg && (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span className="min-w-0 break-words">{errMsg}</span>
          <button onClick={() => setErrMsg('')} className="-m-1.5 shrink-0 rounded p-2 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {classId && lastMarked?.markedBy && (
        <div className="mb-2 text-xs text-slate-400">
          Oxirgi belgilagan: <b className="text-slate-600">{lastMarked.markedBy}</b>
          {lastMarked.markedAt ? ` · ${new Date(lastMarked.markedAt).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}
        </div>
      )}

      {!classId ? (
        <div className="flex min-h-[10rem] items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400 sm:px-6 sm:text-base">
          {my && !my.classes.length ? "Sizga sinf biriktirilmagan — Ma'lumotlar → Sinflar bo'limida kurator qilib biriktirilishi yoki dars jadvaliga qo'yilishi kerak" : 'Sinfni tanlang'}
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
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-base outline-none focus:border-brand sm:py-2 sm:text-sm"
              />
            </div>
          )}

          {canCreate && (
            <div className="mb-2 flex items-center gap-1.5 text-sm">
              <span className="shrink-0 text-slate-500">Hammaga:</span>
              <div className="grid flex-1 grid-cols-4 gap-1 sm:flex sm:flex-none sm:flex-wrap sm:gap-1.5">
                {ORDER.map((st) => (
                  <button key={st} onClick={() => setAll(st)} className={`truncate rounded-lg border border-slate-200 px-1 py-2.5 text-sm font-medium sm:px-2.5 sm:py-1 sm:text-xs ${ATT_STATUS[st].cls} hover:bg-slate-50`}>
                    {SHORT[st]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {filtered.map((r) => (
              <div key={r.id} className="flex flex-col gap-2 border-b border-slate-100 px-3 py-1.5 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:py-2">
                <button title={r.markedBy ? `Belgiladi: ${r.markedBy}` : ''} onClick={() => setDetail({ id: r.id, name: `${r.lastName} ${r.firstName}` })} className="min-w-0 truncate py-2.5 text-left text-sm font-medium text-slate-800 hover:text-brand hover:underline sm:flex-1 sm:py-0">{r.lastName} {r.firstName}</button>
                <div className="grid grid-cols-4 gap-1 sm:flex sm:shrink-0">
                  {ORDER.map((st) => {
                    const active = marks[r.id] === st;
                    return (
                      <button
                        key={st}
                        onClick={() => canCreate && setMarks((p) => ({ ...p, [r.id]: st }))}
                        disabled={!canCreate}
                        className={`rounded-lg px-2 py-2.5 text-sm font-semibold transition sm:px-2.5 sm:py-1.5 sm:text-xs ${
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
            {!filtered.length && <div className="px-3 py-10 text-center text-slate-400">{rowsLoading ? 'Yuklanmoqda…' : q ? "Qidiruvga mos o'quvchi yo'q" : "O'quvchi topilmadi"}</div>}
          </div>

          {canCreate && (
            // Mobilda pastda "yopishib" turadigan saqlash paneli — uzun ro'yxatda ham qo'l ostida
            <div className="sticky bottom-0 z-20 -mx-4 mt-4 flex flex-col gap-2 border-t border-slate-200 bg-slate-50/95 px-4 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:items-center sm:gap-3 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-0 sm:backdrop-blur-none">
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending || !markedCount}
                className="w-full rounded-lg bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-50 sm:w-auto sm:py-2.5"
              >
                {save.isPending ? 'Saqlanmoqda…' : 'Davomatni saqlash'}
              </button>
              {save.isSuccess && !save.isPending && <span className="text-center text-sm font-medium text-green-600 sm:text-left">✓ Saqlandi</span>}
            </div>
          )}
        </>
      )}

      {detail && <StudentDetailModal studentId={detail.id} name={detail.name} className={my?.classes.find((c) => c.id === classId)?.name} onClose={() => setDetail(null)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="whitespace-nowrap rounded-full bg-white px-3 py-1 shadow-sm">
      {label}: <b>{value}</b>
    </span>
  );
}
