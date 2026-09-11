'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Paperclip } from 'lucide-react';
import { homeworkApi, SUB_STATUS, parseAttachment, type Submission } from '@/lib/homework';

export default function HomeworkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [err, setErr] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: ['homework-detail', id] });

  const { data: hw, isLoading } = useQuery({
    queryKey: ['homework-detail', id],
    queryFn: () => homeworkApi.get(id),
  });

  if (isLoading) return <div className="p-4 text-slate-400 sm:p-8">Yuklanmoqda…</div>;
  if (!hw) return <div className="p-4 text-slate-400 sm:p-8">Vazifa topilmadi</div>;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5 sm:mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="min-w-0 break-words text-xl font-bold sm:text-2xl">{hw.title}</h1>
          {hw.type && <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{hw.type}</span>}
        </div>
        <p className="text-sm text-slate-500">
          {hw.class.name} · {hw.subject.name} · Muddat:{' '}
          {new Date(hw.dueDate).toLocaleString('uz-UZ')}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          {hw.teacherName ? `Ustoz: ${hw.teacherName}` : ''}
          {hw.createdAt ? `${hw.teacherName ? ' · ' : ''}Qo'shildi: ${new Date(hw.createdAt).toLocaleString('uz-UZ')}` : ''}
        </p>
        {hw.description && <p className="mt-2 break-words text-sm text-slate-600">{hw.description}</p>}
        {hw.attachments?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {hw.attachments.map((raw, i) => {
              const f = parseAttachment(raw);
              if (!f) return null;
              return (
                <a key={i} href={f.d} download={f.n}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-brand hover:bg-slate-50 sm:py-1.5">
                  <Paperclip size={14} className="shrink-0" /> <span className="truncate">{f.n}</span>
                </a>
              );
            })}
          </div>
        )}
      </div>

      {err && (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span className="min-w-0 break-words">{err}</span>
          <button onClick={() => setErr('')} className="-my-1 shrink-0 rounded p-2 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Statistika */}
      <div className="mb-4 grid grid-cols-2 gap-2 text-sm sm:flex sm:flex-wrap sm:gap-3">
        <Badge label="Jami" value={hw.counts.total} cls="bg-slate-100 text-slate-600" />
        <Badge label="Topshirgan" value={hw.counts.submitted} cls="bg-blue-100 text-brand" />
        <Badge label="Tekshirilgan" value={hw.counts.checked} cls="bg-green-100 text-green-700" />
        <Badge label="Topshirmagan" value={hw.counts.notSubmitted} cls="bg-red-100 text-red-700" />
      </div>

      {/* Mobil: kartalar */}
      <div className="space-y-2 md:hidden">
        {hw.submissions.map((s: Submission) => (
          <SubmissionCard key={s.id} homeworkId={id} sub={s} onChange={refresh} onError={setErr} />
        ))}
      </div>

      {/* Desktop: jadval */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-2">O&apos;quvchi</th>
                <th className="px-4 py-2">Holat</th>
                <th className="px-4 py-2">Topshiriq</th>
                <th className="px-4 py-2 text-right">Ball / Amal</th>
              </tr>
            </thead>
            <tbody>
              {hw.submissions.map((s: Submission) => (
                <SubmissionRow key={s.id} homeworkId={id} sub={s} onChange={refresh} onError={setErr} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Badge({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <span className={`rounded-full px-3 py-1.5 text-center sm:py-1 sm:text-left ${cls}`}>
      {label}: <b>{value}</b>
    </span>
  );
}

type SubmissionProps = {
  homeworkId: string;
  sub: Submission;
  onChange: () => void;
  onError: (m: string) => void;
};

function useSubmissionActions({ homeworkId, sub, onChange, onError }: SubmissionProps) {
  const [grade, setGrade] = useState(sub.grade != null ? String(sub.grade) : '');
  const [note, setNote] = useState(sub.teacherNote ?? '');
  const notSubmitted = sub.status === 'ASSIGNED' || sub.status === 'MISSING';
  const errText = (e: any) => { const m = e?.response?.data?.message; onError(Array.isArray(m) ? m[0] : (m ?? 'Xatolik yuz berdi')); };

  const accept = useMutation({
    mutationFn: () => homeworkApi.submit(homeworkId, { studentId: sub.student.id }),
    onSuccess: onChange,
    onError: errText,
  });
  const save = useMutation({
    mutationFn: () =>
      homeworkApi.grade(sub.id, {
        grade: grade ? Number(grade) : undefined,
        teacherNote: note || undefined,
        status: 'CHECKED',
      }),
    onSuccess: onChange,
    onError: errText,
  });

  return { grade, setGrade, note, setNote, notSubmitted, accept, save };
}

function SubmissionFiles({ files }: { files?: string[] | null }) {
  if (!files?.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1.5 md:gap-1">
      {files.map((raw, i) => {
        const f = parseAttachment(raw);
        const href = f ? f.d : raw;
        const name = f ? f.n : `Fayl ${i + 1}`;
        return (
          <a key={i} href={href} download={name} target="_blank" rel="noopener"
            className="inline-flex max-w-full items-center gap-1 rounded border border-slate-200 px-2 py-2 text-xs text-brand hover:bg-slate-50 md:px-1.5 md:py-0.5">
            <Paperclip size={11} className="shrink-0" /> <span className="truncate">{name}</span>
          </a>
        );
      })}
    </div>
  );
}

function SubmissionCard(props: SubmissionProps) {
  const { sub } = props;
  const { grade, setGrade, note, setNote, notSubmitted, accept, save } = useSubmissionActions(props);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 break-words font-semibold text-slate-800">
          {sub.student.lastName} {sub.student.firstName}
        </span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${SUB_STATUS[sub.status].cls}`}>
          {SUB_STATUS[sub.status].label}
        </span>
      </div>

      <div className="mt-1.5 text-sm text-slate-500">
        <span className="break-words">{sub.comment ?? '—'}</span>
        <SubmissionFiles files={sub.files} />
        {sub.submittedAt && (
          <div className="mt-1 text-xs text-slate-400">
            {new Date(sub.submittedAt).toLocaleDateString('uz-UZ')}
          </div>
        )}
      </div>

      {notSubmitted ? (
        <button
          onClick={() => accept.mutate()}
          className="mt-3 w-full rounded-lg bg-blue-100 px-3 py-2.5 text-sm font-medium text-brand hover:bg-blue-200"
        >
          Qabul qilindi
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={5}
              placeholder="1-5"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              title="5 balli baho"
              className="w-16 shrink-0 rounded-lg border border-slate-200 px-2 py-2.5 text-center text-sm"
            />
            <input
              placeholder="Izoh"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            />
          </div>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="w-full rounded-lg bg-brand px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            Saqlash
          </button>
        </div>
      )}
    </div>
  );
}

function SubmissionRow(props: SubmissionProps) {
  const { sub } = props;
  const { grade, setGrade, note, setNote, notSubmitted, accept, save } = useSubmissionActions(props);

  return (
    <tr className="border-t border-slate-100">
      <td className="sticky left-0 z-10 bg-white px-4 py-2 font-medium">
        {sub.student.lastName} {sub.student.firstName}
      </td>
      <td className="px-4 py-2">
        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${SUB_STATUS[sub.status].cls}`}>
          {SUB_STATUS[sub.status].label}
        </span>
      </td>
      <td className="max-w-[360px] break-words px-4 py-2 text-slate-500">
        {sub.comment ?? '—'}
        <SubmissionFiles files={sub.files} />
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
              className="whitespace-nowrap rounded bg-blue-100 px-3 py-1 text-xs font-medium text-brand hover:bg-blue-200"
            >
              Qabul qilindi
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <input
              type="number"
              min={1}
              max={5}
              placeholder="1-5"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              title="5 balli baho"
              className="w-14 rounded border border-slate-200 px-2 py-1 text-right"
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
              className="whitespace-nowrap rounded bg-brand px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
            >
              Saqlash
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
