'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { portalApi, type OverviewCard } from '@/lib/portal';
import { useAuthStore } from '@/store/auth';
import { money } from '@/lib/finance';
import { gradeColor } from '@/lib/grades';

export default function PortalHome() {
  const user = useAuthStore((s) => s.user);
  const { data: cards, isLoading } = useQuery({
    queryKey: ['portal-overview'],
    queryFn: portalApi.overview,
  });

  return (
    <div>
      <h1 className="text-xl font-bold">Assalomu alaykum, {user?.fullName?.split(' ')[0]}!</h1>
      <p className="mb-5 text-sm text-slate-500">Farzandingiz ma&apos;lumotlari</p>

      {isLoading ? (
        <p className="text-slate-400">Yuklanmoqda...</p>
      ) : !cards?.length ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
          Sizga biriktirilgan o&apos;quvchi topilmadi
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map((c: OverviewCard) => (
            <Link
              key={c.id}
              href={`/portal/${c.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">{c.lastName} {c.firstName}</h2>
                  <p className="text-sm text-slate-500">{c.className ?? 'Sinfsiz'}</p>
                </div>
                <span className={`text-2xl font-bold ${gradeColor(c.gradeAvg)}`}>
                  {c.gradeAvg || '—'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="O'rtacha baho" value={c.gradeAvg || '—'} />
                <Metric label="Davomat" value={`${c.attendanceRate}%`} />
                <Metric label="Xulq balli" value={c.behaviorScore} />
                <Metric label="Vazifa (kutilmoqda)" value={c.homeworkPending} />
              </div>

              {c.debt > 0 && (
                <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  Qarzdorlik: <b>{money(c.debt)}</b>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
