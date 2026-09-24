'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, LogOut, Users } from 'lucide-react';
import { behaviorTone, dec, gradeTone, money, portalApi, rateTone, TONE } from '@/lib/portal';
import { Empty, Skeleton } from '@/components/portal/ui';
import { useAuthStore } from '@/store/auth';

/** Farzandlar ro'yxati. Bitta farzand bo'lsa — to'g'ridan-to'g'ri uning sahifasi ochiladi. */
export default function PortalHome() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { data, isLoading } = useQuery({ queryKey: ['portal-overview'], queryFn: portalApi.overview });

  useEffect(() => {
    if (data?.length === 1) router.replace(`/portal/${data[0].id}`);
  }, [data, router]);

  const onLogout = () => {
    logout();
    window.location.replace('/login');
  };

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="bg-gradient-to-br from-brand to-brand-dark text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 pb-5 pt-[calc(1rem_+_env(safe-area-inset-top))]">
          <div className="min-w-0">
            <div className="text-sm text-white/70">🏫 Sulton School</div>
            <h1 className="mt-1 truncate text-xl font-bold">Assalomu alaykum{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}!</h1>
          </div>
          <button onClick={onLogout} aria-label="Chiqish" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white/80 transition hover:bg-white/10">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">
        <p className="mb-3 text-sm text-slate-500">Farzandni tanlang</p>
        {isLoading ? (
          <Skeleton rows={2} />
        ) : !data?.length ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white">
            <Empty text="Sizga biriktirilgan o'quvchi topilmadi. Maktab ma'muriyatiga murojaat qiling." icon={Users} />
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((c) => (
              <Link
                key={c.id}
                href={`/portal/${c.id}`}
                className="block rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm transition active:scale-[0.99] hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand/10 text-lg font-bold text-brand">
                    {`${c.lastName[0] ?? ''}${c.firstName[0] ?? ''}`.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-slate-800">{c.fullName}</div>
                    <div className="truncate text-sm text-slate-500">{[c.className, c.branch].filter(Boolean).join(' · ') || 'Sinfsiz'}</div>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-slate-300" />
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  <Mini label="Baho" value={c.gradeAvg ? dec(c.gradeAvg) : '—'} cls={TONE[gradeTone(c.gradeAvg, c.gradeScale)].text} />
                  <Mini label="Davomat" value={c.attendanceRate === null ? '—' : `${c.attendanceRate}%`} cls={TONE[rateTone(c.attendanceRate)].text} />
                  <Mini label="Ahloq" value={`${c.behaviorRemaining}`} cls={TONE[behaviorTone(c.behaviorRemaining, c.behaviorLimit)].text} />
                  <Mini label="Vazifa" value={`${c.homeworkPending}`} cls={c.homeworkPending ? 'text-amber-700' : 'text-slate-500'} />
                </div>

                {c.overdue > 0 && (
                  <div className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    Muddati o&apos;tgan to&apos;lov: <b>{money(c.overdue)}</b>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Mini({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-2 py-2">
      <div className={`text-lg font-bold leading-tight ${cls}`}>{value}</div>
      <div className="truncate text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}
