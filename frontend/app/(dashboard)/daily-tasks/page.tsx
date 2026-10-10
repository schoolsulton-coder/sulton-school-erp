'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Search,
  Send,
  Settings2,
  X,
} from 'lucide-react';
import {
  dailyTasksApi,
  dayLabel,
  doneTone,
  schoolToday,
  shiftDay,
  type BoardStudent,
  type DailyBoard,
} from '@/lib/daily-tasks';
import { useMyClasses } from '@/lib/use-my-classes';
import { useAuthStore } from '@/store/auth';
import { canSeeAllClasses } from '@/lib/rbac';
import { DailyTaskManager } from '@/components/daily-task-manager';

const errText = (e: any) =>
  Array.isArray(e?.response?.data?.message)
    ? e.response.data.message[0]
    : (e?.response?.data?.message ?? 'Xatolik');

export default function DailyTasksPage() {
  const qc = useQueryClient();
  const can = useAuthStore((s) => s.can);
  const role = useAuthStore((s) => s.user?.role);
  const canMark = can('behavior.create');
  const canManage = can('behavior.update');

  const { classes } = useMyClasses();
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(schoolToday());
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState<string | null>(null); // mobil cheklist ochilgan o'quvchi
  const [manage, setManage] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!classId && classes.length) setClassId(classes[0].id);
  }, [classes, classId]);

  const key = ['daily-board', classId, date];
  const { data: board, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => dailyTasksApi.board(classId, date),
    enabled: !!classId,
  });

  /** Belgilash javobini kesh ichida qo'llash — qayta so'rovsiz (kun xulosasi ham qayta hisoblanadi) */
  const applyDay = (studentId: string, done: string[], coins: number) =>
    qc.setQueryData<DailyBoard>(key, (b) => {
      if (!b) return b;
      const students = b.students.map((s) =>
        s.id === studentId ? { ...s, done, doneCount: done.length, coins } : s,
      );
      return {
        ...b,
        students,
        totals: {
          ...b.totals,
          done: students.reduce((a, s) => a + s.doneCount, 0),
          coins: students.reduce((a, s) => a + s.coins, 0),
        },
      };
    });

  const afterWrite = () => {
    // Coin oynasi va statistikasi darhol yangilansin
    qc.invalidateQueries({ queryKey: ['coins'] });
    qc.invalidateQueries({ queryKey: ['coin-stats'] });
    qc.invalidateQueries({ queryKey: ['daily-stats'] });
  };

  const toggle = useMutation({
    mutationFn: (v: { studentId: string; taskId: string; done: boolean }) =>
      dailyTasksApi.mark({ ...v, date }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<DailyBoard>(key);
      const task = prev?.tasks.find((t) => t.id === v.taskId);
      const st = prev?.students.find((s) => s.id === v.studentId);
      if (prev && task && st) {
        const done = v.done ? [...st.done, v.taskId] : st.done.filter((id) => id !== v.taskId);
        applyDay(v.studentId, done, st.coins + (v.done ? task.coins : -task.coins));
      }
      return { prev };
    },
    onSuccess: (r) => applyDay(r.studentId, r.done, r.coins),
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      setErr(errText(e));
    },
    onSettled: afterWrite,
  });

  const toggleAll = useMutation({
    mutationFn: (v: { studentId: string; done: boolean }) =>
      dailyTasksApi.markAll({ ...v, date }),
    onSuccess: (r) => {
      applyDay(r.studentId, r.done, r.coins);
      afterWrite();
    },
    onError: (e) => setErr(errText(e)),
  });

  /** Ustun: bitta vazifani ro'yxatdagi hamma o'quvchiga */
  const toggleColumn = useMutation({
    mutationFn: (v: { taskId: string; done: boolean; students: string[] }) =>
      dailyTasksApi.markBulk({
        date,
        items: v.students.map((studentId) => ({ studentId, taskId: v.taskId, done: v.done })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      afterWrite();
    },
    onError: (e) => setErr(errText(e)),
  });

  const notify = useMutation({
    mutationFn: () => dailyTasksApi.notify({ classId, date }),
    onSuccess: (r) => setNote(`Xabar yuborildi: ${r.sent} ta o'quvchi vasiysiga`),
    onError: (e) => setErr(errText(e)),
  });

  const tasks = board?.tasks ?? [];
  const students = board?.students ?? [];
  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () => (q ? students.filter((s) => s.name.toLowerCase().includes(q)) : students),
    [students, q],
  );
  const totals = board?.totals;
  const percent = totals?.possible ? Math.round((totals.done / totals.possible) * 100) : 0;
  const isToday = date === (board?.today ?? schoolToday());
  const current = sheet ? students.find((s) => s.id === sheet) : null;

  const sel =
    'min-w-0 rounded-lg border border-slate-300 px-2.5 py-2.5 text-base outline-none focus:border-brand sm:py-1.5 sm:text-sm';

  return (
    <div className="p-4 sm:p-6">
      {/* Sarlavha */}
      <div className="mb-3 flex items-start justify-between gap-3 sm:mb-5">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold sm:text-2xl">Kunlik vazifalar</h1>
          <p className="hidden text-sm text-slate-500 sm:block">
            Bajarilgan vazifa o&apos;quvchining coiniga tushadi
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {canManage && classId && (
            <button
              onClick={() => setManage(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 sm:py-2"
            >
              <Settings2 size={15} /> <span className="hidden sm:inline">Vazifalar</span>
            </button>
          )}
          <Link
            href="/daily-tasks/statistics"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 sm:py-2"
          >
            <BarChart3 size={15} /> <span className="hidden sm:inline">Statistika</span>
          </Link>
        </div>
      </div>

      {/* Sinf va kun */}
      <div className="mb-3 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2">
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className={`${sel} flex-1 sm:max-w-xs`}>
          <option value="">Sinf</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setDate((d) => shiftDay(d, -1))}
            className="rounded-lg border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50 sm:p-2"
            aria-label="Oldingi kun"
          >
            <ChevronLeft size={16} />
          </button>
          <input
            type="date"
            value={date}
            max={board?.today ?? schoolToday()}
            onChange={(e) => setDate(e.target.value || schoolToday())}
            className={`${sel} w-[9.5rem]`}
          />
          <button
            onClick={() => setDate((d) => shiftDay(d, 1))}
            disabled={isToday}
            className="rounded-lg border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40 sm:p-2"
            aria-label="Keyingi kun"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {err && (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span className="min-w-0 break-words">{err}</span>
          <button onClick={() => setErr('')} className="-m-1.5 shrink-0 rounded p-2 text-red-400 hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      )}
      {note && (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <span className="min-w-0 break-words">{note}</span>
          <button onClick={() => setNote('')} className="-m-1.5 shrink-0 rounded p-2 text-emerald-500">
            <X size={14} />
          </button>
        </div>
      )}

      {!classId ? (
        <Empty text={classes.length ? 'Sinfni tanlang' : "Sizga sinf biriktirilmagan"} />
      ) : isLoading && !board ? (
        <Empty text="Yuklanmoqda…" />
      ) : !tasks.length ? (
        <Empty
          text={
            canManage
              ? "Vazifa ro'yxati bo'sh — «Vazifalar» tugmasidan qo'shing"
              : "Vazifa ro'yxati bo'sh — rahbariyat qo'shishi kerak"
          }
        />
      ) : (
        <>
          {/* Kun xulosasi */}
          <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <div className="text-sm font-medium text-slate-700">
                {dayLabel(date)}
                {isToday && <span className="ml-1.5 text-xs font-normal text-brand">· bugun</span>}
              </div>
              <div className="text-sm text-slate-500">
                <b className={doneTone(percent).text}>{totals?.done ?? 0}</b>
                <span className="text-slate-400"> / {totals?.possible ?? 0} vazifa</span>
                <span className="mx-1.5 text-slate-300">·</span>
                <b className="text-amber-600">+{totals?.coins ?? 0}</b>
                <span className="text-slate-400"> coin</span>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${doneTone(percent).bar}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                {totals?.students ?? 0} o&apos;quvchi · {tasks.length} vazifa · kuniga eng ko&apos;pi{' '}
                {totals?.perStudentMax ?? 0} coin
              </span>
              {canMark && (
                <button
                  onClick={() => notify.mutate()}
                  disabled={notify.isPending || !(totals?.done ?? 0)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <Send size={13} /> {notify.isPending ? 'Yuborilmoqda…' : 'Ota-onaga xulosa'}
                </button>
              )}
            </div>
          </div>

          {students.length > 6 && (
            <div className="relative mb-3">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`O'quvchi qidirish (${students.length} ta)`}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-base outline-none focus:border-brand sm:py-2 sm:text-sm"
              />
            </div>
          )}

          {/* ===== Mobil: o'quvchi kartalari ===== */}
          <div className="space-y-2 lg:hidden">
            {filtered.map((s) => (
              <StudentCard
                key={s.id}
                student={s}
                total={tasks.length}
                maxCoins={totals?.perStudentMax ?? 0}
                onOpen={() => setSheet(s.id)}
              />
            ))}
            {!filtered.length && <Empty text={q ? "Qidiruvga mos o'quvchi yo'q" : "O'quvchi yo'q"} />}
          </div>

          {/* ===== Kompyuter: jadval ===== */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white lg:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="sticky left-0 z-10 bg-slate-50/80 px-3 py-2 text-left font-semibold text-slate-600">
                    O&apos;quvchi
                  </th>
                  {tasks.map((t) => {
                    const all = filtered.length > 0 && filtered.every((s) => s.done.includes(t.id));
                    return (
                      <th key={t.id} className="px-1 py-2 text-center align-top font-medium">
                        {/* To'liq nom tooltipda; ustunda 2 qatorgacha ko'rinadi */}
                        <div
                          title={t.title}
                          className="mx-auto line-clamp-2 w-24 text-[11px] leading-tight text-slate-600"
                        >
                          {t.title}
                        </div>
                        <div className="text-[11px] text-amber-600">{t.coins} coin</div>
                        {canMark && (
                          <button
                            onClick={() =>
                              toggleColumn.mutate({
                                taskId: t.id,
                                done: !all,
                                students: filtered.map((s) => s.id),
                              })
                            }
                            disabled={toggleColumn.isPending}
                            className="mt-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-40"
                          >
                            {all ? 'bekor' : 'hammaga'}
                          </button>
                        )}
                      </th>
                    );
                  })}
                  <th className="px-3 py-2 text-right font-semibold text-slate-600">Coin</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const pct = tasks.length ? Math.round((s.doneCount / tasks.length) * 100) : 0;
                  return (
                    <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                      <td className="sticky left-0 z-10 max-w-[14rem] truncate bg-white px-3 py-1.5 font-medium text-slate-800">
                        {s.name}
                        <span className={`ml-2 text-xs font-normal ${doneTone(pct).text}`}>
                          {s.doneCount}/{tasks.length}
                        </span>
                      </td>
                      {tasks.map((t) => {
                        const done = s.done.includes(t.id);
                        return (
                          <td key={t.id} className="px-1 py-1.5 text-center">
                            <button
                              onClick={() => canMark && toggle.mutate({ studentId: s.id, taskId: t.id, done: !done })}
                              disabled={!canMark}
                              title={`${s.name} — ${t.title}`}
                              className={`grid h-8 w-8 place-items-center rounded-lg border transition ${
                                done
                                  ? 'border-emerald-500 bg-emerald-500 text-white'
                                  : `border-slate-200 bg-white text-transparent ${canMark ? 'hover:border-emerald-400 hover:text-emerald-200' : ''}`
                              }`}
                            >
                              <Check size={16} strokeWidth={3} />
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-3 py-1.5 text-right font-semibold text-amber-600">+{s.coins}</td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr>
                    <td colSpan={tasks.length + 2} className="px-3 py-10 text-center text-slate-400">
                      {q ? "Qidiruvga mos o'quvchi yo'q" : "O'quvchi yo'q"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Mobil cheklist (bitta o'quvchi) */}
      {current && board && (
        <StudentSheet
          student={current}
          board={board}
          canMark={canMark}
          busy={toggle.isPending || toggleAll.isPending}
          onToggle={(taskId, done) => toggle.mutate({ studentId: current.id, taskId, done })}
          onToggleAll={(done) => toggleAll.mutate({ studentId: current.id, done })}
          onClose={() => setSheet(null)}
        />
      )}

      {manage && board && (
        <DailyTaskManager
          classId={classId}
          className={board.class.name}
          canSchool={canSeeAllClasses(role)}
          onClose={() => {
            setManage(false);
            qc.invalidateQueries({ queryKey: ['daily-board'] });
          }}
        />
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex min-h-[10rem] items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400 sm:px-6 sm:text-base">
      {text}
    </div>
  );
}

function StudentCard({
  student,
  total,
  maxCoins,
  onOpen,
}: {
  student: BoardStudent;
  total: number;
  maxCoins: number;
  onOpen: () => void;
}) {
  const pct = total ? Math.round((student.doneCount / total) * 100) : 0;
  const tone = doneTone(pct);
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left active:bg-slate-50"
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold ${tone.soft} ${tone.text}`}>
        {student.doneCount}/{total}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-800">{student.name}</span>
        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100">
          <span className={`block h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%` }} />
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-bold text-amber-600">+{student.coins}</span>
        <span className="block text-[11px] text-slate-400">/ {maxCoins}</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-slate-300" />
    </button>
  );
}

function StudentSheet({
  student,
  board,
  canMark,
  busy,
  onToggle,
  onToggleAll,
  onClose,
}: {
  student: BoardStudent;
  board: DailyBoard;
  canMark: boolean;
  busy: boolean;
  onToggle: (taskId: string, done: boolean) => void;
  onToggleAll: (done: boolean) => void;
  onClose: () => void;
}) {
  const all = board.tasks.length > 0 && student.doneCount === board.tasks.length;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[90dvh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:max-w-md sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{student.name}</h2>
            <p className="truncate text-xs text-slate-500">
              {dayLabel(board.date)} · {student.doneCount}/{board.tasks.length} bajarildi ·{' '}
              <b className="text-amber-600">+{student.coins} coin</b>
            </p>
          </div>
          <button onClick={onClose} className="-m-2 rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <ul className="space-y-2">
            {board.tasks.map((t, i) => {
              const done = student.done.includes(t.id);
              return (
                <li key={t.id}>
                  <button
                    onClick={() => canMark && onToggle(t.id, !done)}
                    disabled={!canMark}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                      done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white active:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${
                        done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent'
                      }`}
                    >
                      <Check size={15} strokeWidth={3} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm font-medium ${done ? 'text-emerald-900' : 'text-slate-800'}`}>
                        {i + 1}. {t.title}
                      </span>
                      {t.scope === 'class' && (
                        <span className="text-[11px] text-indigo-500">sinf vazifasi</span>
                      )}
                    </span>
                    <span className={`shrink-0 text-sm font-bold ${done ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {t.coins}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {canMark && (
          <div className="flex gap-2 border-t border-slate-100 p-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))]">
            <button
              onClick={() => onToggleAll(!all)}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              <ListChecks size={16} /> {all ? 'Hammasini bekor qilish' : 'Hammasi bajarildi'}
            </button>
            <button onClick={onClose} className="rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white">
              Tayyor
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
