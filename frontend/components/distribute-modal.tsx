'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Wand2, Target, Check, AlertTriangle, User, Info } from 'lucide-react';
import { classesApi, type Subject, type BusySlot } from '@/lib/classes';
import { teacherLabel, type ManagedUser } from '@/lib/users';
import { PERIODS, WEEKDAYS } from '@/lib/schedule';

const key = (weekday: number, start: string) => `${weekday}-${start}`;

/** Bo'sh slotlarni kunlarga teng taqsimlab N tasini tanlaydi (kuniga 1 tadan) */
function autoPick(free: { weekday: number; start: string }[], n: number): Set<string> {
  const byDay = new Map<number, { weekday: number; start: string }[]>();
  for (const s of free) {
    if (!byDay.has(s.weekday)) byDay.set(s.weekday, []);
    byDay.get(s.weekday)!.push(s);
  }
  for (const arr of byDay.values()) arr.sort((a, b) => a.start.localeCompare(b.start));
  const days = [...byDay.keys()].sort((a, b) => a - b);
  const picked = new Set<string>();
  let round = 0;
  while (picked.size < n) {
    let added = false;
    for (const d of days) {
      const arr = byDay.get(d)!;
      if (arr[round]) {
        picked.add(key(d, arr[round].start));
        added = true;
        if (picked.size >= n) break;
      }
    }
    if (!added) break;
    round++;
  }
  return picked;
}

export function DistributeModal({
  classId,
  className,
  subjects,
  teachers,
  initialSubjectId,
  initialHours,
  onClose,
  onSaved,
}: {
  classId: string;
  className: string;
  subjects: Subject[];
  teachers: ManagedUser[];
  initialSubjectId?: string;
  initialHours?: number;
  onClose: () => void;
  onSaved: (created: number, skipped: number) => void;
}) {
  const qc = useQueryClient();
  const [subjectId, setSubjectId] = useState(initialSubjectId ?? '');
  const [teacherId, setTeacherId] = useState('');
  const [hours, setHours] = useState(String(initialHours ?? 2));
  const [room, setRoom] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const { data: avail } = useQuery({
    queryKey: ['availability', classId, teacherId],
    queryFn: () => classesApi.availability(classId, teacherId || undefined),
    enabled: !!classId,
  });

  const classBusy = useMemo(() => {
    const m = new Map<string, BusySlot>();
    (avail?.classBusy ?? []).forEach((s) => m.set(key(s.weekday, s.start), s));
    return m;
  }, [avail]);
  const teacherBusy = useMemo(() => {
    const m = new Map<string, BusySlot>();
    (avail?.teacherBusy ?? []).forEach((s) => m.set(key(s.weekday, s.start), s));
    return m;
  }, [avail]);

  const freeSlots = useMemo(() => {
    const list: { weekday: number; start: string }[] = [];
    for (const wd of WEEKDAYS) {
      for (const p of PERIODS) {
        const k = key(wd.n, p.start);
        if (!classBusy.has(k) && !teacherBusy.has(k)) list.push({ weekday: wd.n, start: p.start });
      }
    }
    return list;
  }, [classBusy, teacherBusy]);

  const n = Math.max(0, Number(hours) || 0);
  // Avtomatik tanlash — bo'sh slotlar, soat yoki ustoz o'zgarganda qayta hisoblanadi
  const freeSig = freeSlots.map((s) => key(s.weekday, s.start)).join(',');
  useEffect(() => {
    setSelected(autoPick(freeSlots, n));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeSig, n]);

  const toggle = (k: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) {
        next.delete(k);
      } else {
        if (next.size >= n) return prev; // belgilangan soatdan ko'p tanlab bo'lmaydi
        next.add(k);
      }
      return next;
    });
  };

  const save = useMutation({
    mutationFn: () => {
      const slots = [...selected].map((k) => {
        const [wd, start] = k.split('-');
        const period = PERIODS.find((p) => p.start === start)!;
        return { weekday: Number(wd), startTime: start, endTime: period.end };
      });
      return classesApi.bulkAddLessons({
        classId,
        subjectId,
        teacherId: teacherId || undefined,
        room: room || undefined,
        slots,
      });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['class-schedule', classId] });
      qc.invalidateQueries({ queryKey: ['norms', classId] });
      qc.invalidateQueries({ queryKey: ['availability', classId] });
      onSaved(res.created, res.skipped.length);
    },
    onError: (e: any) =>
      setError(
        Array.isArray(e?.response?.data?.message)
          ? e.response.data.message.join(', ')
          : e?.response?.data?.message ?? 'Xatolik yuz berdi',
      ),
  });

  const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? '';
  const enough = selected.size >= n && n > 0;
  const atLimit = selected.size >= n; // belgilangan soat to'ldi — ko'p tanlab bo'lmaydi

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[94vh] w-[96vw] max-w-[1400px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        {/* Sarlavha */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><Wand2 size={20} /></div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Fanni jadvalga taqsimlash</h2>
              <p className="text-xs text-slate-400">{className} sinfi · bo&apos;sh para va ustoz vaqtiga qarab bittada joylash</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={20} /></button>
        </div>

        {/* Boshqaruv */}
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 px-6 py-4 sm:grid-cols-4">
          <label className="col-span-2 block sm:col-span-1">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Fan</span>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={selCls}>
              <option value="">Tanlang...</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="col-span-2 block sm:col-span-1">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Ustoz</span>
            <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={selCls}>
              <option value="">Biriktirilmagan</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{teacherLabel(t)}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Soat/hafta</span>
            <input type="number" min={1} max={40} value={hours} onChange={(e) => setHours(e.target.value)} className={selCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Xona</span>
            <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="ixtiyoriy" className={selCls} />
          </label>
        </div>

        {/* Legenda + hisob */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-3 text-xs">
          <div className="flex items-center gap-3 text-slate-500">
            <Lg cls="bg-brand" t="tanlangan" />
            <Lg cls="bg-emerald-100 ring-1 ring-emerald-200" t="bo'sh" />
            <Lg cls="bg-slate-100 ring-1 ring-slate-200" t="sinf band" />
            <Lg cls="bg-amber-100 ring-1 ring-amber-200" t="ustoz band" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${enough ? 'text-emerald-600' : 'text-amber-600'}`}>Tanlangan {selected.size} / {n}</span>
            <button onClick={() => setSelected(autoPick(freeSlots, n))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 font-medium text-slate-600 hover:bg-slate-50">
              <Wand2 size={12} /> Avto
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto px-6 py-3">
          <table className="w-full table-fixed border-separate border-spacing-1 text-xs">
            <thead>
              <tr>
                <th className="w-14"></th>
                {WEEKDAYS.map((wd) => <th key={wd.n} className="pb-1 font-semibold text-slate-500">{wd.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map((p, i) => (
                <tr key={p.start}>
                  <td className="pr-1 text-right align-middle text-[10px] leading-tight text-slate-400">
                    <div className="font-semibold text-slate-500">{i + 1}-dars</div>
                    {p.start}
                  </td>
                  {WEEKDAYS.map((wd) => {
                    const k = key(wd.n, p.start);
                    const cBusy = classBusy.get(k);
                    const tBusy = teacherBusy.get(k);
                    const sel = selected.has(k);
                    if (cBusy)
                      return (
                        <td key={k}>
                          <div className="flex h-14 w-full flex-col justify-center gap-0.5 rounded-lg bg-slate-100 px-1.5 leading-tight ring-1 ring-slate-200">
                            <span className="truncate text-[11px] font-semibold text-slate-600">{cBusy.label}</span>
                            <span className="truncate text-[10px] text-slate-400">{cBusy.teacher ?? 'ustozsiz'}</span>
                          </div>
                        </td>
                      );
                    if (tBusy)
                      return (
                        <td key={k}>
                          <div className="flex h-14 w-full flex-col justify-center gap-0.5 rounded-lg bg-amber-50 px-1.5 leading-tight ring-1 ring-amber-200">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600"><User size={11} /> ustoz band</span>
                            <span className="truncate text-[10px] text-amber-500">{tBusy.label}</span>
                          </div>
                        </td>
                      );
                    return (
                      <td key={k}>
                        <button
                          type="button"
                          onClick={() => toggle(k)}
                          disabled={!sel && atLimit}
                          title={!sel && atLimit ? `Belgilangan soat (${n}) to'ldi` : undefined}
                          className={`grid h-14 w-full place-items-center rounded-lg text-[11px] font-medium transition ${
                            sel
                              ? 'bg-brand text-white shadow-sm'
                              : atLimit
                                ? 'cursor-not-allowed bg-slate-50 text-slate-300 ring-1 ring-slate-100'
                                : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {sel ? <Check size={16} /> : ''}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Ogohlantirish + tugmalar */}
        <div className="border-t border-slate-100 px-6 py-4">
          {!enough && n > 0 && (
            freeSlots.length < n ? (
              <p className="mb-2 flex items-center gap-1.5 text-xs text-amber-600">
                <AlertTriangle size={13} /> Bo&apos;sh joy yetarli emas — jami {freeSlots.length} ta bo&apos;sh para bor. Ustozni o&apos;zgartiring yoki soatni kamaytiring.
              </p>
            ) : (
              <p className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
                <Info size={13} /> Haftalik reja to&apos;liq emas — yana {n - selected.size} ta para tanlang («Avto» bilan avtomat to&apos;ldiring).
              </p>
            )
          )}
          {error && <p className="mb-2 text-sm text-rose-500">{error}</p>}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-500">
              {subjectName ? <><b className="text-slate-700">{subjectName}</b> · {selected.size} ta dars</> : 'Fan tanlang'}
            </span>
            <div className="flex gap-2">
              <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Bekor qilish</button>
              <button
                onClick={() => { setError(''); if (!subjectId) return setError('Fan tanlang'); if (selected.size === 0) return setError('Kamida bitta para tanlang'); save.mutate(); }}
                disabled={save.isPending || !subjectId || selected.size === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                <Target size={16} /> {save.isPending ? 'Joylanmoqda...' : `Joylash (${selected.size})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const selCls =
  'w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20';

function Lg({ cls, t }: { cls: string; t: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-3 w-3 rounded ${cls}`} /> {t}
    </span>
  );
}
