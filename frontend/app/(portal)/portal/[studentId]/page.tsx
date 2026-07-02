'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { portalApi, type PortalDetail } from '@/lib/portal';
import { money } from '@/lib/finance';
import { gradeColor } from '@/lib/grades';
import { SUB_STATUS } from '@/lib/homework';
import { ATT_STATUS } from '@/lib/attendance';

export default function PortalStudentPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { data } = useQuery({
    queryKey: ['portal-detail', studentId],
    queryFn: () => portalApi.detail(studentId),
  });

  if (!data) return <p className="text-slate-400">Yuklanmoqda...</p>;
  const d = data as PortalDetail;

  return (
    <div className="space-y-5">
      <Link href="/portal" className="text-sm text-brand">← Orqaga</Link>

      {/* Baholar */}
      <Section title={`Baholar — o'rtacha ${d.grades.overall || '—'}`}>
        {d.grades.subjects.length ? (
          d.grades.subjects.map((s) => (
            <div key={s.subject.id} className="flex items-center justify-between py-1.5 text-sm">
              <span>{s.subject.name}</span>
              <span className={`font-bold ${gradeColor(s.average)}`}>{s.average} <span className="text-xs text-slate-400">({s.count})</span></span>
            </div>
          ))
        ) : (
          <Empty />
        )}
      </Section>

      {/* Davomat */}
      <Section title={`Davomat — ${d.attendance.rate}% (joriy oy)`}>
        <div className="grid grid-cols-4 gap-2 text-center text-sm">
          <Pill label="Bor" value={d.attendance.present} cls="text-green-600" />
          <Pill label="Yo'q" value={d.attendance.absent} cls="text-red-600" />
          <Pill label="Kechikkan" value={d.attendance.late} cls="text-amber-600" />
          <Pill label="Sababli" value={d.attendance.excused} cls="text-brand" />
        </div>
      </Section>

      {/* Vazifalar */}
      <Section title="Vazifalar">
        {d.submissions.length ? (
          d.submissions.slice(0, 10).map((s) => (
            <div key={s.id} className="flex items-center justify-between py-1.5 text-sm">
              <div>
                <div className="font-medium">{s.homework.title}</div>
                <div className="text-xs text-slate-400">
                  {s.homework.subject.name} · {new Date(s.homework.dueDate).toLocaleDateString('uz-UZ')}
                </div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${SUB_STATUS[s.status as keyof typeof SUB_STATUS]?.cls ?? ''}`}>
                {SUB_STATUS[s.status as keyof typeof SUB_STATUS]?.label ?? s.status}
                {s.grade != null && ` · ${s.grade}`}
              </span>
            </div>
          ))
        ) : (
          <Empty />
        )}
      </Section>

      {/* To'lovlar */}
      <Section title="To'lovlar">
        {d.contracts.length ? (
          d.contracts.map((c) => {
            const debt = c.installments
              .filter((i) => i.status !== 'PAID')
              .reduce((s, i) => s + (i.amount - i.paidAmount), 0);
            return (
              <div key={c.id} className="py-1.5 text-sm">
                <div className="flex justify-between font-medium">
                  <span>{c.number}</span>
                  <span className={debt > 0 ? 'text-red-600' : 'text-green-600'}>
                    {debt > 0 ? `Qarz: ${money(debt)}` : "To'langan"}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <Empty />
        )}
      </Section>

      {/* Xulq */}
      <Section title={`Xulq balli — ${d.behavior.score}`}>
        {d.behavior.records.length ? (
          d.behavior.records.slice(0, 8).map((r) => (
            <div key={r.id} className="flex items-center justify-between py-1.5 text-sm">
              <div>
                <div>{r.description}</div>
                <div className="text-xs text-slate-400">{new Date(r.date).toLocaleDateString('uz-UZ')}</div>
              </div>
              <span className={`font-bold ${r.type === 'POSITIVE' ? 'text-green-600' : 'text-red-600'}`}>
                {r.type === 'POSITIVE' ? '+' : '−'}{r.points}
              </span>
            </div>
          ))
        ) : (
          <Empty />
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="mb-2 font-semibold">{title}</h2>
      {children}
    </div>
  );
}
function Pill({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <div className={`text-lg font-bold ${cls}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
function Empty() {
  return <p className="text-sm text-slate-400">Ma&apos;lumot yo&apos;q</p>;
}
