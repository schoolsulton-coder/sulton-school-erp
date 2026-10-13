'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronRight, GraduationCap, Search, Star, Users, X } from 'lucide-react';
import { classesApi, type StaffClasses, type StaffMember } from '@/lib/classes';
import { useAuthStore } from '@/store/auth';

const ROLE_FILTERS = [
  { key: 'all', label: 'Hammasi' },
  { key: 'coordinator', label: 'Koordinator' },
  { key: 'teacher', label: 'Ustoz' },
  { key: 'curator', label: 'Kurator' },
] as const;

const ROLE_TONE: Record<string, string> = {
  coordinator: 'bg-indigo-50 text-indigo-600',
  teacher: 'bg-sky-50 text-sky-600',
  curator: 'bg-emerald-50 text-emerald-600',
};

const errText = (e: any) =>
  Array.isArray(e?.response?.data?.message)
    ? e.response.data.message[0]
    : (e?.response?.data?.message ?? 'Xatolik');

/**
 * Xodim–sinf biriktirish: chapda xodim, o'ngda uning sinflari.
 * Biriktirilgan sinf — o'sha xodimga Baholash/Davomat/Ahloq/Coin/Kunlik vazifalar
 * oynalarida ko'rinadigan sinf (kurator biriktiruvi sinf formasida beriladi).
 */
export default function ClassStaffPage() {
  const qc = useQueryClient();
  const can = useAuthStore((s) => s.can);
  const canEdit = can('classes.update');
  const [selected, setSelected] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false); // mobilda pastdan ochiladigan oyna
  const [role, setRole] = useState<(typeof ROLE_FILTERS)[number]['key']>('all');
  const [year, setYear] = useState('');
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');

  const key = ['class-staff'];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: classesApi.staff });

  const staff = data?.staff ?? [];
  const allClasses = data?.classes ?? [];

  // O'quv yillari — eng yangisi birinchi, standart tanlov ham o'sha
  const years = useMemo(
    () => [...new Set(allClasses.map((c) => c.academicYear))].sort().reverse(),
    [allClasses],
  );
  useEffect(() => {
    if (!year && years.length) setYear(years[0]);
  }, [years, year]);
  const classes = useMemo(
    () => (year ? allClasses.filter((c) => c.academicYear === year) : allClasses),
    [allClasses, year],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return staff.filter(
      (u) =>
        (role === 'all' || u.role === role) &&
        (!s || u.fullName.toLowerCase().includes(s) || (u.phone ?? '').includes(s)),
    );
  }, [staff, role, q]);

  useEffect(() => {
    if (!selected && filtered.length) setSelected(filtered[0].id);
  }, [filtered, selected]);

  const current = staff.find((u) => u.id === selected) ?? null;

  /** Keshni darhol yangilaymiz — qayta so'rovsiz */
  const applyLocal = (userId: string, classId: string, on: boolean) =>
    qc.setQueryData<StaffClasses>(key, (d) => {
      if (!d) return d;
      const user = d.staff.find((u) => u.id === userId);
      return {
        staff: d.staff.map((u) =>
          u.id === userId
            ? {
                ...u,
                classes: on
                  ? [...u.classes, { id: classId, isCurator: false }]
                  : u.classes.filter((c) => c.id !== classId),
              }
            : u,
        ),
        classes: d.classes.map((c) =>
          c.id === classId
            ? {
                ...c,
                staff: on
                  ? [...c.staff, { id: userId, fullName: user?.fullName ?? '', isCurator: false }]
                  : c.staff.filter((s) => s.id !== userId),
              }
            : c,
        ),
      };
    });

  const toggle = useMutation({
    mutationFn: (v: { userId: string; classId: string; on: boolean }) =>
      v.on
        ? classesApi.assignTeacher(v.classId, { teacherId: v.userId })
        : classesApi.removeTeacher(v.classId, v.userId),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<StaffClasses>(key);
      applyLocal(v.userId, v.classId, v.on);
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      setErr(errText(e));
    },
    onSuccess: () => {
      setErr('');
      // Sinf ro'yxatlari (menyu/oynalardagi) ham yangilansin
      qc.invalidateQueries({ queryKey: ['classes-mini'] });
      qc.invalidateQueries({ queryKey: ['att-my-classes'] });
    },
  });

  const sel =
    'min-w-0 rounded-lg border border-slate-300 px-2.5 py-2.5 text-base outline-none focus:border-brand sm:py-2 sm:text-sm';

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-3 sm:mb-5">
        <h1 className="text-xl font-bold sm:text-2xl">Sinf biriktirish</h1>
        <p className="text-sm text-slate-500">
          Koordinator, ustoz va kuratorga sinf biriktiriladi — o&apos;quv jarayoni oynalarida faqat shu
          sinflar ko&apos;rinadi
        </p>
      </div>

      {err && (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span className="min-w-0 break-words">{err}</span>
          <button onClick={() => setErr('')} className="-m-1.5 shrink-0 rounded p-2 text-red-400">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2">
        <div className="relative w-full min-w-0 sm:flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Xodim qidirish"
            className={`${sel} w-full pl-9`}
          />
        </div>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className={`${sel} w-full sm:w-auto`}
          title="O'quv yili"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
          <option value="">Barcha yillar</option>
        </select>
        <div className="grid w-full grid-cols-4 gap-1 sm:flex sm:w-auto sm:shrink-0 sm:flex-wrap">
          {ROLE_FILTERS.map((r) => (
            <button
              key={r.key}
              onClick={() => setRole(r.key)}
              className={`truncate rounded-lg px-2 py-2 text-sm font-medium transition sm:px-3 sm:py-1.5 ${
                role === r.key ? 'bg-brand text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && !data ? (
        <Empty text="Yuklanmoqda…" />
      ) : !filtered.length ? (
        <Empty text={q || role !== 'all' ? 'Mos xodim topilmadi' : 'Xodim yo‘q'} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-[22rem_1fr]">
          {/* Xodimlar ro'yxati */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Xodimlar · {filtered.length}
            </div>
            <ul className="max-h-[32rem] overflow-y-auto">
              {filtered.map((u) => (
                <li key={u.id}>
                  <button
                    onClick={() => {
                      setSelected(u.id);
                      setSheet(true);
                    }}
                    className={`flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-0 transition ${
                      selected === u.id ? 'bg-brand/5' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-slate-800">{u.fullName}</span>
                        {u.status !== 'ACTIVE' && (
                          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                            nofaol
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs">
                        <span className={`rounded px-1.5 py-0.5 ${ROLE_TONE[u.role] ?? 'bg-slate-100 text-slate-500'}`}>
                          {u.roleName}
                        </span>
                        {u.subject && <span className="truncate text-slate-400">{u.subject}</span>}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className={`block text-sm font-bold ${u.classes.length ? 'text-brand' : 'text-slate-300'}`}>
                        {u.classes.length}
                      </span>
                      <span className="block text-[10px] text-slate-400">sinf</span>
                    </span>
                    <ChevronRight size={15} className="shrink-0 text-slate-300 lg:hidden" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Kompyuterda yonma-yon */}
          {current && (
            <div className="hidden lg:block">
              <ClassPicker
                user={current}
                classes={classes}
                canEdit={canEdit}
                busy={toggle.isPending}
                onToggle={(classId, on) => toggle.mutate({ userId: current.id, classId, on })}
              />
            </div>
          )}
        </div>
      )}

      {/* Mobilda — pastdan ochiladigan oyna */}
      {current && sheet && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-900/40 backdrop-blur-sm lg:hidden">
          <div className="max-h-[88dvh] w-full overflow-hidden rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl">
            <ClassPicker
              user={current}
              classes={classes}
              canEdit={canEdit}
              busy={toggle.isPending}
              onToggle={(classId, on) => toggle.mutate({ userId: current.id, classId, on })}
              onClose={() => setSheet(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ClassPicker({
  user,
  classes,
  canEdit,
  busy,
  onToggle,
  onClose,
}: {
  user: StaffMember;
  classes: StaffClasses['classes'];
  canEdit: boolean;
  busy: boolean;
  onToggle: (classId: string, on: boolean) => void;
  onClose?: () => void;
}) {
  const mine = new Map(user.classes.map((c) => [c.id, c.isCurator]));
  const [onlyMine, setOnlyMine] = useState(false);
  const list = onlyMine ? classes.filter((c) => mine.has(c.id)) : classes;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-800">{user.fullName}</div>
          <div className="text-xs text-slate-500">
            {user.roleName} · biriktirilgan: <b className="text-brand">{user.classes.length}</b> sinf
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => setOnlyMine((v) => !v)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
              onlyMine ? 'border-brand bg-brand/5 text-brand' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {onlyMine ? 'Hamma sinf' : 'Faqat biriktirilgani'}
          </button>
          {onClose && (
            <button onClick={onClose} className="-m-1 rounded-lg p-2 text-slate-400 hover:bg-slate-100">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <ul className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto">
        {list.map((c) => {
          const on = mine.has(c.id);
          const isCurator = mine.get(c.id) === true;
          const others = c.staff.filter((s) => s.id !== user.id);
          return (
            <li key={c.id}>
              <button
                onClick={() => canEdit && !busy && onToggle(c.id, !on)}
                disabled={!canEdit}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                  on ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                } disabled:cursor-default`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 ${
                    on ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent'
                  }`}
                >
                  <Check size={15} strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-slate-800">{c.name}</span>
                    {isCurator && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                        <Star size={9} /> kurator
                      </span>
                    )}
                    {c.status !== 'Faol' && (
                      <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                        {c.status}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Users size={11} /> {c.students}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <GraduationCap size={11} /> {c.academicYear}
                    </span>
                    {others.length > 0 && (
                      <span className="truncate">
                        · {others.map((s) => s.fullName.split(' ')[0]).join(', ')}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {!list.length && (
          <li className="px-3 py-10 text-center text-sm text-slate-400">
            {onlyMine ? 'Hali sinf biriktirilmagan' : 'Sinf yo‘q'}
          </li>
        )}
      </ul>

      {!canEdit && (
        <div className="border-t border-slate-100 px-3 py-2 text-xs text-slate-400">
          Biriktirish uchun sinflarni tahrirlash ruxsati kerak
        </div>
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
