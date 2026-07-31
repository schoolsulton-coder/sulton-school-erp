'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Search } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  gradesApi,
  GRADE_TYPES,
  CHORAK_OPTIONS,
  gradeColor,
  gradeBg,
  type GradebookRow,
  type GradeType,
  type GradeCell,
} from '@/lib/grades';
import { useAuthStore } from '@/store/auth';

// Maktab (Toshkent) kuni — backend schoolToday() bilan bir xil bo'lishi shart
// (aks holda ustozning qurilmasi boshqa zonada bo'lsa, saqlash rad etiladi)
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
const fmtDay = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

export default function GradesPage() {
  const qc = useQueryClient();
  const can = useAuthStore((s) => s.can);
  const canCreate = can('grades.create');
  const canUpdate = can('grades.update');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [type, setType] = useState<GradeType>('DAILY');
  const [date, setDate] = useState(today());
  const [period, setPeriod] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [edit, setEdit] = useState<GradeCell | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const { data: my } = useQuery({ queryKey: ['grades-my-subjects'], queryFn: gradesApi.mySubjects });

  const subjectOptions = useMemo(() => {
    if (!my) return [];
    if (my.canGradeAll) return my.subjects;
    if (!classId) return my.subjects;
    const s = my.assignments.filter((a) => a.classId === classId).map((a) => ({ id: a.subjectId, name: a.subjectName }));
    return s.length ? s : my.subjects;
  }, [my, classId]);

  const { data: gradebook } = useQuery({
    queryKey: ['gradebook', classId, subjectId, type],
    queryFn: () => gradesApi.gradebook(classId, subjectId, type),
    enabled: !!classId && !!subjectId,
  });
  const gbKey = ['gradebook', classId, subjectId, type];

  // Kontekst (sinf/fan/tur/sana) o'zgarganda mavjud baholarni yuklaymiz.
  // Fon-refetch (bir xil kontekst) foydalanuvchi kiritgan yangi baholarni O'CHIRMAYDI.
  const ctxKey = `${classId}|${subjectId}|${type}|${date}`;
  const loadedCtx = useRef('');
  useEffect(() => {
    if (!gradebook) return;
    if (loadedCtx.current === ctxKey) return;
    loadedCtx.current = ctxKey;
    const next: Record<string, string> = {};
    for (const s of gradebook) {
      const g = s.grades.find((x) => x.date.slice(0, 10) === date);
      if (g) next[s.id] = String(g.value);
    }
    setValues(next);
  }, [gradebook, ctxKey, date]);

  const save = useMutation({
    mutationFn: () =>
      gradesApi.bulk({
        subjectId,
        classId,
        type,
        period: period || undefined,
        // Ustoz uchun har doim joriy kun (tab tunni kesib o'tsa ham 403 bo'lmasin)
        date: my && !my.canGradeAll ? today() : date,
        items: Object.entries(values)
          .filter(([, v]) => v !== '')
          .map(([studentId, v]) => ({ studentId, value: Number(v) })),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: gbKey }),
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Saqlashda xatolik'),
  });

  const patch = useMutation({
    mutationFn: (d: { id: string; value: number }) => gradesApi.update(d.id, { value: d.value }),
    onSuccess: () => { setEdit(null); qc.invalidateQueries({ queryKey: gbKey }); },
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Xatolik'),
  });
  const del = useMutation({
    mutationFn: (id: string) => gradesApi.remove(id),
    onSuccess: () => { setEdit(null); qc.invalidateQueries({ queryKey: gbKey }); },
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Xatolik'),
  });

  const rows: GradebookRow[] = gradebook ?? [];
  const q = studentSearch.trim().toLowerCase();
  const filteredRows = q ? rows.filter((s) => `${s.lastName} ${s.firstName}`.toLowerCase().includes(q)) : rows;
  const setVal = (id: string, v: string) => {
    if (v !== '' && !/^[1-5]$/.test(v)) return; // faqat 1..5
    setValues((p) => ({ ...p, [id]: v }));
  };
  const fillAll = (v: string) => setValues((p) => ({ ...p, ...Object.fromEntries(filteredRows.map((s) => [s.id, v])) }));
  const enteredCount = Object.values(values).filter((v) => v !== '').length;

  const onKey = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); inputs.current[idx + 1]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); inputs.current[idx - 1]?.focus(); }
  };

  const sel = 'min-w-0 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand';

  return (
    <div className="p-3 sm:p-6">
      <div className="mb-3 flex items-center justify-between sm:mb-5">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Baholash</h1>
          <p className="hidden text-sm text-slate-500 sm:block">Sinf jurnali · 5 balli tizim</p>
        </div>
        <Link href="/grades/statistics" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 sm:py-2">
          <BarChart3 size={15} /> Statistika
        </Link>
      </div>

      {/* Tanlovlar */}
      <div className="mb-3 space-y-1.5 rounded-xl border border-slate-200 bg-white p-2">
        <div className="flex items-center gap-1.5">
          <select value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectId(''); }} className={`${sel} flex-1`}>
            <option value="">Sinf</option>
            {my?.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={`${sel} flex-[2]`} disabled={!classId && !my?.canGradeAll}>
            <option value="">Fan</option>
            {subjectOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={my ? !my.canGradeAll : true}
            title={my && !my.canGradeAll ? 'Ustoz faqat bugungi kunga baho qo\'yadi' : ''}
            className={`${sel} flex-1 disabled:bg-slate-50 disabled:text-slate-500`}
          />
          {(type === 'QUARTER' || type === 'YEAR') && (
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className={`${sel} flex-1`}>
              <option value="">Chorak</option>
              {CHORAK_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
        {/* Baho turi — pill tugmalar (mobilda gorizontal aylanadi) */}
        <div className="-mx-0.5 flex gap-1 overflow-x-auto px-0.5">
          {GRADE_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] font-medium ${type === t.key ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {!classId || !subjectId ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400">
          {my && !my.classes.length ? 'Sizga fan biriktirilmagan' : 'Sinf va fanni tanlang'}
        </div>
      ) : (
        <>
          {/* O'quvchi qidirish (ro'yxat uzun bo'lganda) */}
          {rows.length > 6 && (
            <div className="relative mb-3">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder={`O'quvchi qidirish (${rows.length} ta)`}
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
              />
            </div>
          )}

          {/* Hammaga tez qo'yish */}
          {canCreate && (
            <div className="mb-3 flex items-center gap-2 text-sm">
              <span className="text-slate-500">Hammaga:</span>
              {['5', '4', '3', '2', '1'].map((v) => (
                <button key={v} onClick={() => fillAll(v)} className={`h-10 w-10 rounded-lg font-bold sm:h-8 sm:w-8 ${gradeBg(Number(v))} hover:ring-2 hover:ring-brand/30`}>{v}</button>
              ))}
              <button onClick={() => setValues({})} className="ml-1 rounded-lg border border-slate-200 px-3 py-1.5 text-slate-500 hover:bg-slate-50">Tozalash</button>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="hidden w-8 px-3 py-2.5 sm:table-cell">#</th>
                  <th className="px-3 py-2.5">O&apos;quvchi</th>
                  <th className="hidden px-3 py-2.5 md:table-cell">So&apos;nggi baholar ({GRADE_TYPES.find((t) => t.key === type)?.label})</th>
                  <th className="w-16 px-2 py-2.5 text-center sm:w-20">O&apos;rtacha</th>
                  <th className="w-20 px-2 py-2.5 text-center sm:w-28">Baho ({fmtDay(date)})</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((s, idx) => (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="hidden px-3 py-2 text-slate-400 sm:table-cell">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium">{s.lastName} {s.firstName}</td>
                    <td className="hidden px-3 py-2 md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {s.grades.slice(0, 12).map((g) => (
                          <button
                            key={g.id}
                            onClick={() => canUpdate && setEdit(g)}
                            disabled={!canUpdate}
                            title={canUpdate ? `${fmtDay(g.date)} · bosib tahrirlang` : fmtDay(g.date)}
                            className={`h-6 min-w-6 rounded px-1.5 text-xs font-bold ${gradeBg(g.value)} ${canUpdate ? 'hover:ring-2 hover:ring-brand/40' : 'cursor-default'}`}
                          >
                            {g.value}
                          </button>
                        ))}
                        {!s.grades.length && <span className="text-xs text-slate-400">—</span>}
                      </div>
                    </td>
                    <td className={`px-2 py-2 text-center text-base font-bold ${gradeColor(s.average)}`}>{s.average || '—'}</td>
                    <td className="px-2 py-2 text-center">
                      <input
                        ref={(el) => { inputs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        disabled={!canCreate}
                        value={values[s.id] ?? ''}
                        onChange={(e) => setVal(s.id, e.target.value)}
                        onKeyDown={(e) => onKey(e, idx)}
                        onFocus={(e) => e.target.select()}
                        className="h-11 w-14 rounded-lg border border-slate-300 text-center text-lg font-semibold outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50 disabled:text-slate-300 sm:h-9 sm:w-12 sm:text-base"
                      />
                    </td>
                  </tr>
                ))}
                {!filteredRows.length && <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-400">{q ? 'Qidiruvga mos o\'quvchi yo\'q' : 'O\'quvchi topilmadi'}</td></tr>}
              </tbody>
            </table>
          </div>

          {canCreate && (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => save.mutate()}
                disabled={!enteredCount || save.isPending}
                className="rounded-lg bg-brand px-6 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {save.isPending ? 'Saqlanmoqda…' : `Saqlash (${enteredCount})`}
              </button>
              {save.isSuccess && !save.isPending && <span className="text-sm font-medium text-green-600">✓ Saqlandi</span>}
              <span className="text-xs text-slate-400">Enter — keyingi o&apos;quvchi · bir kunga bitta baho (qayta saqlansa yangilanadi)</span>
            </div>
          )}
        </>
      )}

      {/* Baho tahrirlash / o'chirish */}
      {edit && <EditGradeModal grade={edit} canDelete={can('grades.delete')} onClose={() => setEdit(null)} onSave={(v) => patch.mutate({ id: edit.id, value: v })} onDelete={() => del.mutate(edit.id)} busy={patch.isPending || del.isPending} />}
    </div>
  );
}

function EditGradeModal({ grade, canDelete, onClose, onSave, onDelete, busy }: { grade: GradeCell; canDelete: boolean; onClose: () => void; onSave: (v: number) => void; onDelete: () => void; busy: boolean }) {
  const [v, setV] = useState(String(grade.value));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xs space-y-4 rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold">Bahoni tahrirlash</h2>
        <p className="text-sm text-slate-500">Sana: {fmtDay(grade.date)}</p>
        <div className="flex justify-center gap-2">
          {['5', '4', '3', '2', '1'].map((n) => (
            <button key={n} onClick={() => setV(n)} className={`h-11 w-11 rounded-lg text-lg font-bold ${v === n ? gradeBg(Number(n)) + ' ring-2 ring-brand' : 'bg-slate-100 text-slate-500'}`}>{n}</button>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          {canDelete && <button onClick={onDelete} disabled={busy} className="flex-1 rounded-lg border border-red-200 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">O&apos;chirish</button>}
          <button onClick={() => onSave(Number(v))} disabled={busy} className="flex-1 rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">Saqlash</button>
        </div>
      </div>
    </div>
  );
}
