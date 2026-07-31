'use client';

import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { gradesApi, gradeColor, gradeBg } from '@/lib/grades';
import { attendanceApi, ATT_STATUS, type AttStatus } from '@/lib/attendance';

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}
function fmtDay(iso: string) {
  const s = new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
  const [, m, d] = s.split('-');
  return `${d}.${m}`;
}
const rateColor = (v: number) => (v >= 90 ? 'text-green-600' : v >= 75 ? 'text-sky-600' : v >= 60 ? 'text-amber-600' : 'text-red-600');

export function StudentDetailModal({ studentId, name, className, onClose }: { studentId: string; name: string; className?: string; onClose: () => void }) {
  const { data: gr, isLoading: grL } = useQuery({ queryKey: ['student-grade-report', studentId], queryFn: () => gradesApi.studentReport(studentId) });
  const { data: at, isLoading: atL } = useQuery({ queryKey: ['student-att-report', studentId], queryFn: () => attendanceApi.studentReport(studentId) });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-slate-50 shadow-xl sm:rounded-2xl">
        {/* Sarlavha */}
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">{initials(name)}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-bold text-slate-800">{name}</div>
            {className && <div className="text-xs text-slate-500">{className}</div>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>

        <div className="space-y-4 p-4">
          {/* BAHOLAR */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Baholar</h3>
              {gr && (
                <span className="flex items-center gap-2 text-sm text-slate-500">
                  O&apos;rtacha <span className={`rounded-lg px-2 py-0.5 text-base font-bold ${gradeBg(gr.overall)}`}>{gr.overall || '—'}</span>
                </span>
              )}
            </div>
            {grL ? (
              <p className="py-3 text-center text-sm text-slate-400">Yuklanmoqda…</p>
            ) : !gr || !gr.subjects.length ? (
              <p className="py-3 text-center text-sm text-slate-400">Baho yo&apos;q</p>
            ) : (
              <div className="space-y-2">
                {gr.subjects.map((s) => {
                  const recent = gr.progress.filter((p) => p.subject === s.subject.name).slice(-8);
                  return (
                    <div key={s.subject.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{s.subject.name}</span>
                      <div className="hidden gap-1 sm:flex">
                        {recent.map((p, i) => <span key={i} className={`h-5 min-w-5 rounded px-1 text-center text-xs font-bold ${gradeBg(p.value)}`}>{p.value}</span>)}
                      </div>
                      <span className={`w-9 text-right text-base font-bold ${gradeColor(s.average)}`}>{s.average}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* DAVOMAT */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Davomat</h3>
              {at && <span className={`text-lg font-bold ${rateColor(at.rate)}`}>{at.rate}%</span>}
            </div>
            {atL ? (
              <p className="py-3 text-center text-sm text-slate-400">Yuklanmoqda…</p>
            ) : !at || !at.total ? (
              <p className="py-3 text-center text-sm text-slate-400">Davomat belgilanmagan</p>
            ) : (
              <>
                <div className="mb-3 grid grid-cols-4 gap-2 text-center">
                  <Mini label="Bor" value={at.present} cls="text-green-600" />
                  <Mini label="Yo'q" value={at.absent} cls="text-red-600" />
                  <Mini label="Kech" value={at.late} cls="text-amber-600" />
                  <Mini label="Sabab" value={at.excused} cls="text-sky-600" />
                </div>
                {at.records && at.records.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {at.records.slice(0, 30).map((r, i) => (
                      <span key={i} title={fmtDay(r.date)} className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${badge(r.status)}`}>
                        {fmtDay(r.date)}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="rounded-lg bg-slate-50 py-2">
      <div className={`text-xl font-bold ${cls}`}>{value}</div>
      <div className="text-[11px] text-slate-400">{label}</div>
    </div>
  );
}
function badge(st: AttStatus) {
  return st === 'PRESENT' ? 'bg-green-100 text-green-700'
    : st === 'ABSENT' ? 'bg-red-100 text-red-700'
    : st === 'LATE' ? 'bg-amber-100 text-amber-700'
    : 'bg-sky-100 text-sky-700';
}
