'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import { dueLabel, fmtDay, HW, portalApi, TONE, todayStr, type HomeworkItem } from '@/lib/portal';
import { Badge, Card, Empty, PageTitle, Skeleton, Stat } from '@/components/portal/ui';

type Filter = 'active' | 'done' | 'all';

export default function PortalHomeworkPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [filter, setFilter] = useState<Filter>('active');
  const { data, isLoading } = useQuery({
    queryKey: ['portal-homework', studentId],
    queryFn: () => portalApi.homework(studentId),
  });

  const list = useMemo(() => {
    const rows = data?.list ?? [];
    const sorted = [...rows].sort((a, b) => (a.done === b.done ? b.dueDate.localeCompare(a.dueDate) : a.done ? 1 : -1));
    if (filter === 'active') return sorted.filter((h) => !h.done);
    if (filter === 'done') return sorted.filter((h) => h.done);
    return sorted;
  }, [data, filter]);

  if (isLoading && !data) return <Skeleton rows={3} />;
  if (!data) return null;

  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition ${active ? 'bg-brand text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`;

  return (
    <div className="space-y-4">
      <PageTitle title="Uy vazifalari" sub={`${data.list.length} ta vazifa`} />

      <Card>
        <div className="grid grid-cols-4 gap-2">
          <Stat value={data.counts.pending} label="Kutilmoqda" tone={data.counts.pending ? 'amber' : 'slate'} />
          <Stat value={data.counts.overdue} label="Kechikkan" tone={data.counts.overdue ? 'rose' : 'slate'} />
          <Stat value={data.counts.submitted} label="Topshirilgan" tone="sky" />
          <Stat value={data.counts.checked} label="Baholangan" tone="emerald" />
        </div>
      </Card>

      <div className="flex gap-2">
        <button type="button" onClick={() => setFilter('active')} className={chip(filter === 'active')}>Bajarilishi kerak</button>
        <button type="button" onClick={() => setFilter('done')} className={chip(filter === 'done')}>Topshirilgan</button>
        <button type="button" onClick={() => setFilter('all')} className={chip(filter === 'all')}>Hammasi</button>
      </div>

      {list.length ? (
        <div className="space-y-3">
          {list.map((h) => <HomeworkCard key={h.id} h={h} />)}
        </div>
      ) : (
        <Card>
          <Empty text={filter === 'active' ? "Bajarilmagan vazifa yo'q 🎉" : "Vazifa yo'q"} icon={BookOpen} />
        </Card>
      )}
    </div>
  );
}

function HomeworkCard({ h }: { h: HomeworkItem }) {
  const st = HW[h.status] ?? { label: h.statusLabel, tone: 'slate' as const };
  return (
    <div className={`rounded-3xl border bg-white p-4 shadow-sm ${h.overdue ? 'border-rose-200' : 'border-slate-200/80'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-slate-800">{h.title}</div>
          <div className="mt-0.5 text-sm text-slate-500">
            {h.subject}
            {h.teacher ? ` · ${h.teacher}` : ''}
          </div>
        </div>
        <Badge tone={st.tone}>{st.label}</Badge>
      </div>

      {h.description && <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{h.description}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className={`rounded-xl px-2.5 py-1 ${h.overdue ? TONE.rose.soft : 'bg-slate-50 text-slate-600'}`}>
          Muddat: {fmtDay(h.dueDate)} · {dueLabel(h.dueDate, todayStr())}
        </span>
        {h.grade != null && <span className={`rounded-xl px-2.5 py-1 font-semibold ${TONE.emerald.soft}`}>Baho: {h.grade}</span>}
        {h.submittedAt && <span className="rounded-xl bg-slate-50 px-2.5 py-1 text-slate-500">Topshirdi: {fmtDay(h.submittedAt)}</span>}
      </div>

      {h.teacherNote && (
        <p className="mt-2 rounded-2xl bg-sky-50 px-3 py-2 text-sm text-sky-800">
          <b>Ustoz izohi:</b> {h.teacherNote}
        </p>
      )}
    </div>
  );
}
