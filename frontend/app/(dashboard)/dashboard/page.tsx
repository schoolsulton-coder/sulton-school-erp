'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { financeApi, money } from '@/lib/finance';
import { crmApi } from '@/lib/crm';
import { classesApi } from '@/lib/classes';

export default function DashboardHome() {
  const user = useAuthStore((s) => s.user);
  const can = useAuthStore((s) => s.can);

  const { data: finance } = useQuery({
    queryKey: ['dash-finance'],
    queryFn: financeApi.summary,
    enabled: can('finance.view'),
  });
  const { data: crm } = useQuery({
    queryKey: ['dash-crm'],
    queryFn: crmApi.stats,
    enabled: can('crm.view'),
  });
  const { data: classes } = useQuery({
    queryKey: ['dash-classes'],
    queryFn: () => classesApi.list(),
    enabled: can('classes.view'),
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">
        Assalomu alaykum, {user?.fullName?.split(' ')[0]} 👋
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Sulton School ERP &amp; LMS boshqaruv paneli
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {can('finance.view') && (
          <StatCard
            title="Umumiy balans"
            value={money(finance?.totalBalance ?? 0)}
            sub={`Oylik sof: ${money(finance?.month.net ?? 0)}`}
            href="/finance"
            color="from-blue-500 to-blue-700"
          />
        )}
        {can('crm.view') && (
          <StatCard
            title="Lead'lar"
            value={String(crm?.total ?? 0)}
            sub={`Konversiya: ${crm?.conversionRate ?? 0}%`}
            href="/crm"
            color="from-violet-500 to-violet-700"
          />
        )}
        {can('classes.view') && (
          <StatCard
            title="Sinflar"
            value={String(classes?.length ?? 0)}
            sub={`${classes?.reduce((s, c) => s + c.studentCount, 0) ?? 0} o'quvchi`}
            href="/classes"
            color="from-emerald-500 to-emerald-700"
          />
        )}
        {can('contracts.view') && (
          <StatCard
            title="Shartnomalar"
            value="→"
            sub="To'lov jadvali & PDF"
            href="/contracts"
            color="from-amber-500 to-amber-600"
          />
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Tezkor havolalar</h2>
        <div className="flex flex-wrap gap-3">
          {can('crm.view') && <QuickLink href="/crm" label="Yangi murojaat" />}
          {can('classes.view') && <QuickLink href="/classes" label="Sinf qo'shish" />}
          {can('contracts.view') && <QuickLink href="/contracts" label="Shartnoma tuzish" />}
          {can('finance.view') && <QuickLink href="/finance" label="To'lov / xarajat" />}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  href,
  color,
}: {
  title: string;
  value: string;
  sub: string;
  href: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl bg-gradient-to-br ${color} p-5 text-white shadow-sm transition hover:shadow-md`}
    >
      <div className="text-sm opacity-90">{title}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs opacity-80">{sub}</div>
    </Link>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition hover:border-brand hover:text-brand"
    >
      {label}
    </Link>
  );
}
