'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Pencil, Plus, School, Trash2, Users, X } from 'lucide-react';
import { dailyTasksApi, type DailyTask } from '@/lib/daily-tasks';

/**
 * Kunlik vazifalar ro'yxatini boshqarish.
 * Maktab bo'yicha umumiy vazifalarni faqat rahbariyat tahrirlaydi (backend ham tekshiradi),
 * koordinator o'z sinfiga qo'shimcha vazifa qo'sha oladi.
 */
export function DailyTaskManager({
  classId,
  className,
  canSchool,
  onClose,
}: {
  classId: string;
  className: string;
  canSchool: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', coins: 5 });
  const [adding, setAdding] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', coins: 5, school: canSchool });

  const key = ['daily-tasks', classId, 'all'];
  const { data: tasks, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => dailyTasksApi.tasks(classId, true),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['daily-tasks'] });
    qc.invalidateQueries({ queryKey: ['daily-board'] });
  };
  const onErr = (e: any) =>
    setErr(
      Array.isArray(e?.response?.data?.message)
        ? e.response.data.message[0]
        : (e?.response?.data?.message ?? 'Xatolik'),
    );

  const create = useMutation({
    mutationFn: () =>
      dailyTasksApi.createTask({
        title: newTask.title.trim(),
        coins: Number(newTask.coins) || 0,
        classId: newTask.school ? undefined : classId,
      }),
    onSuccess: () => {
      setNewTask({ title: '', coins: 5, school: canSchool });
      setAdding(false);
      setErr('');
      refresh();
    },
    onError: onErr,
  });

  const update = useMutation({
    mutationFn: (v: { id: string; data: { title?: string; coins?: number; active?: boolean } }) =>
      dailyTasksApi.updateTask(v.id, v.data),
    onSuccess: () => {
      setEditing(null);
      setErr('');
      refresh();
    },
    onError: onErr,
  });

  const remove = useMutation({
    mutationFn: (id: string) => dailyTasksApi.removeTask(id),
    onSuccess: (r: any) => {
      setErr(r?.closed ? "Vazifa belgilangan kunlari borligi uchun o'chirilmadi — yopildi" : '');
      refresh();
    },
    onError: onErr,
  });

  const startEdit = (t: DailyTask) => {
    setEditing(t.id);
    setForm({ title: t.title, coins: t.coins });
  };
  const canEdit = (t: DailyTask) => (t.scope === 'school' ? canSchool : true);

  const inp =
    'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand sm:py-2 sm:text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:max-w-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold sm:text-lg">Vazifalar ro&apos;yxati</h2>
            <p className="truncate text-xs text-slate-500">
              Maktab bo&apos;yicha umumiy + {className} uchun qo&apos;shimcha
            </p>
          </div>
          <button onClick={onClose} className="-m-2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {err && (
          <div className="mx-4 mt-3 flex items-start justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:mx-5">
            <span className="min-w-0 break-words">{err}</span>
            <button onClick={() => setErr('')} className="-m-1 shrink-0 rounded p-1 text-amber-500">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-slate-400">Yuklanmoqda…</div>
          ) : (
            <ul className="space-y-2">
              {(tasks ?? []).map((t) => (
                <li
                  key={t.id}
                  className={`rounded-xl border px-3 py-2.5 ${t.active ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50 opacity-70'}`}
                >
                  {editing === t.id ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        value={form.title}
                        onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                        className={`${inp} sm:flex-1`}
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={form.coins}
                          onChange={(e) => setForm((p) => ({ ...p, coins: Number(e.target.value) }))}
                          className={`${inp} w-24`}
                        />
                        <span className="text-sm text-slate-500">coin</span>
                        <button
                          onClick={() => update.mutate({ id: t.id, data: { title: form.title.trim(), coins: form.coins } })}
                          disabled={update.isPending || !form.title.trim()}
                          className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {update.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                        </button>
                        <button onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500">
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span
                        title={t.scope === 'school' ? "Maktab bo'yicha umumiy" : 'Shu sinf uchun'}
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${t.scope === 'school' ? 'bg-brand/10 text-brand' : 'bg-indigo-50 text-indigo-500'}`}
                      >
                        {t.scope === 'school' ? <School size={15} /> : <Users size={15} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-800">{t.title}</div>
                        <div className="text-xs text-slate-500">
                          {t.coins} coin · {t.scope === 'school' ? 'umumiy' : (t.className ?? 'sinf')}
                          {!t.active && ' · yopilgan'}
                        </div>
                      </div>
                      {canEdit(t) && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => update.mutate({ id: t.id, data: { active: !t.active } })}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                          >
                            {t.active ? 'Yopish' : 'Ochish'}
                          </button>
                          <button onClick={() => startEdit(t)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => remove.mutate(t.id)}
                            disabled={remove.isPending}
                            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
              {!tasks?.length && <li className="py-10 text-center text-sm text-slate-400">Vazifa yo&apos;q</li>}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-100 px-4 py-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] sm:px-5 sm:pb-3">
          {adding ? (
            <div className="space-y-2">
              <input
                value={newTask.title}
                onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
                placeholder="Vazifa nomi — masalan: Erta uyg'onish"
                className={inp}
                autoFocus
              />
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={newTask.coins}
                  onChange={(e) => setNewTask((p) => ({ ...p, coins: Number(e.target.value) }))}
                  className={`${inp} w-24`}
                />
                <span className="text-sm text-slate-500">coin</span>
                <select
                  value={newTask.school ? 'school' : 'class'}
                  onChange={(e) => setNewTask((p) => ({ ...p, school: e.target.value === 'school' }))}
                  className={`${inp} flex-1`}
                >
                  {canSchool && <option value="school">Maktab bo&apos;yicha (hamma sinfga)</option>}
                  <option value="class">Faqat {className}</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => create.mutate()}
                  disabled={create.isPending || !newTask.title.trim()}
                  className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {create.isPending ? 'Qo‘shilmoqda…' : 'Qo‘shish'}
                </button>
                <button onClick={() => setAdding(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-600">
                  Bekor
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-brand hover:text-brand"
            >
              <Plus size={16} /> Vazifa qo&apos;shish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
