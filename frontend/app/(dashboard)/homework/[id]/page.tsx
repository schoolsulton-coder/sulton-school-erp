'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { homeworkApi, SUB_STATUS, type Submission } from '@/lib/homework';

export default function HomeworkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['homework-detail', id] });

  const { data: hw } = useQuery({
    queryKey: ['homework-detail', id],
    queryFn: () => homeworkApi.get(id),
  });

  if (!hw) return <div className="p-8">Yuklanmoqda...</div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{hw.title}</h1>
        <p className="text-sm text-slate-500">
          {hw.class.name} · {hw.subject.name} · Muddat:{' '}
          {new Date(hw.dueDate).toLocaleString('uz-UZ')}
        </p>
        {hw.description && <p className="mt-2 text-sm text-slate-600">{hw.description}</p>}
      </div>

      {/* Statistika */}
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Badge label="Jami" value={hw.counts.total} cls="bg-slate-100 text-slate-600" />
        <Badge label="Topshirgan" value={hw.counts.submitted} cls="bg-blue-100 text-brand" />
        <Badge label="Tekshirilgan" value={hw.counts.checked} cls="bg-green-100 text-green-700" />
        <Badge label="Topshirmagan" value={hw.counts.missing} cls="bg-red-100 text-red-700" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">O&apos;quvchi</th>
              <th className="px-4 py-2">Holat</th>
              <th className="px-4 py-2">Topshiriq</th>
              <th className="px-4 py-2 text-right">Ball / Amal</th>
            </tr>
          </thead>
          <tbody>
            {hw.submissions.map((s: Submission) => (
              <SubmissionRow key={s.id} homeworkId={id} sub={s} onChange={refresh} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Badge({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <span className={`rounded-full px-3 py-1 ${cls}`}>
      {label}: <b>{value}</b>
    </span>
  );
}

function SubmissionRow({
  homeworkId,
  sub,
  onChange,
}: {
  homeworkId: string;
  sub: Submission;
  onChange: () => void;
}) {
  const [grade, setGrade] = useState(sub.grade != null ? String(sub.grade) : '');
  const [note, setNote] = useState(sub.teacherNote ?? '');
  const notSubmitted = sub.status === 'ASSIGNED' || sub.status === 'MISSING';

  const accept = useMutation({
    mutationFn: () => homeworkApi.submit(homeworkId, { studentId: sub.student.id }),
    onSuccess: onChange,
  });
  const save = useMutation({
    mutationFn: () =>
      homeworkApi.grade(sub.id, {
        grade: grade ? Number(grade) : undefined,
        teacherNote: note || undefined,
        status: 'CHECKED',
      }),
    onSuccess: onChange,
  });

  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-2 font-medium">
        {sub.student.lastName} {sub.student.firstName}
      </td>
      <td className="px-4 py-2">
        <span className={`rounded-full px-2 py-0.5 text-xs ${SUB_STATUS[sub.status].cls}`}>
          {SUB_STATUS[sub.status].label}
        </span>
      </td>
      <td className="px-4 py-2 text-slate-500">
        {sub.comment ?? '—'}
        {sub.files?.length ? <span className="ml-1 text-xs">📎{sub.files.length}</span> : null}
        {sub.submittedAt && (
          <div className="text-xs text-slate-400">
            {new Date(sub.submittedAt).toLocaleDateString('uz-UZ')}
          </div>
        )}
      </td>
      <td className="px-4 py-2">
        {notSubmitted ? (
          <div className="text-right">
            <button
              onClick={() => accept.mutate()}
              className="rounded bg-blue-100 px-3 py-1 text-xs font-medium text-brand hover:bg-blue-200"
            >
              Qabul qilindi
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <input
              type="number"
              min={0}
              max={100}
              placeholder="Ball"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-16 rounded border border-slate-200 px-2 py-1 text-right"
            />
            <input
              placeholder="Izoh"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-32 rounded border border-slate-200 px-2 py-1"
            />
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="rounded bg-brand px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
            >
              Saqlash
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
