'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Pencil, Trash2, ExternalLink, FileText, FileDown } from 'lucide-react';
import { hrApi, CONTRACT_STATUS, SHARTNOMA_HOLATLARI } from '@/lib/hr';
import { contractTemplatesApi } from '@/lib/contract-templates';
import { ShartnomaModal } from '@/components/shartnoma-form';

const initials = (n: string) =>
  (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  const [y, m, d] = new Date(iso).toLocaleDateString('en-CA').split('-');
  return `${d}.${m}.${y}`;
};
const fmtDT = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
const numFmt = (n?: number | null) => (n == null ? '—' : new Intl.NumberFormat('uz-UZ').format(n));
/** Havoladan o'qiladigan nom chiqaramiz (Google Drive va h.k. uchun — «Fayl N») */
const faylNomi = (url: string, i: number) => {
  try {
    const last = new URL(url).pathname.split('/').filter(Boolean).pop();
    if (last && /\.\w{2,5}$/.test(last)) return decodeURIComponent(last);
  } catch {
    /* to'g'ri URL bo'lmasa — tartib raqami bilan */
  }
  return `Fayl ${i + 1}`;
};

export function ShartnomaDetailPanel({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [tplId, setTplId] = useState('');
  const [pdfPending, setPdfPending] = useState(false);
  const { data: c, isLoading } = useQuery({ queryKey: ['shartnoma', id], queryFn: () => hrApi.shartnoma(id) });
  // Kadrlar hujjati shablonlari (buyruq, mehnat shartnomasi...)
  const { data: templates } = useQuery({
    queryKey: ['contract-templates', 'HR'],
    queryFn: () => contractTemplatesApi.list('HR'),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['shartnoma', id] });
    qc.invalidateQueries({ queryKey: ['shartnomalar'] });
    onChanged?.();
  };

  const setStatus = useMutation({
    mutationFn: (status: string) => hrApi.updateShartnoma(id, { status }),
    onSuccess: refresh,
  });
  const del = useMutation({
    mutationFn: () => hrApi.removeShartnoma(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shartnomalar'] });
      onChanged?.();
      onClose();
    },
  });

  const st = c ? CONTRACT_STATUS[c.status] ?? { label: c.status, cls: 'bg-slate-100 text-slate-500' } : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-xl overflow-y-auto bg-slate-50 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <span className="font-bold text-slate-800">Shartnoma</span>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        {isLoading || !c ? (
          <div className="p-10 text-center text-slate-400">Yuklanmoqda…</div>
        ) : (
          <div className="space-y-4 p-5">
            {/* Sarlavha kartochkasi */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start gap-4">
                <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-lg font-bold text-slate-600">
                  {c.employee.avatar
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={c.employee.avatar} alt="" className="h-full w-full object-cover" />
                    : initials(c.employee.fullName)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{c.type}</div>
                  <div className="truncate text-xl font-bold text-brand">{c.employee.fullName}</div>
                  <div className="text-sm text-slate-600">{c.employee.position ?? '—'}</div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    № {c.number} · {fmtDate(c.date)}{c.branch ? ` · ${c.branch}` : ''}
                  </div>
                  {c.employee.department && (
                    <div className="text-xs text-slate-400">Bo&apos;lim: {c.employee.department}</div>
                  )}
                </div>
                <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${st!.cls}`}>{st!.label}</span>
              </div>

              {/* Amallar */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
                  <span className="text-slate-500">Holat:</span>
                  <select
                    value={c.status}
                    disabled={setStatus.isPending}
                    onChange={(e) => setStatus.mutate(e.target.value)}
                    className="cursor-pointer bg-transparent font-medium text-slate-700 outline-none"
                  >
                    {SHARTNOMA_HOLATLARI.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </label>
                {/* Hujjat (PDF) — kadrlar shablonlari bo'yicha.
                    Shablon yo'q bo'lsa tugma yuklash sahifasiga olib boradi. */}
                {templates && templates.length === 0 ? (
                  <Link
                    href="/settings/contract-templates"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    title="Avval kadrlar hujjati shablonini yuklang"
                  >
                    <FileDown size={14} /> PDF — shablon yuklash
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    {templates && templates.length > 1 && (
                      <select
                        value={tplId || templates[0].id}
                        onChange={(e) => setTplId(e.target.value)}
                        className="cursor-pointer rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 outline-none"
                      >
                        {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    )}
                    <button
                      onClick={async () => {
                        if (!templates?.length) return; // hali yuklanmagan
                        setPdfPending(true);
                        await contractTemplatesApi.openHrPdf(tplId || templates[0].id, id, `${c.type} ${c.number}`.trim());
                        setPdfPending(false);
                      }}
                      disabled={pdfPending || !templates?.length}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <FileDown size={14} /> {pdfPending ? 'PDF...' : 'PDF'}
                    </button>
                  </span>
                )}
                <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark">
                  <Pencil size={14} /> Tahrirlash
                </button>
                <button
                  onClick={() => { if (window.confirm("Shartnoma o'chirilsinmi?")) del.mutate(); }}
                  disabled={del.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                >
                  <Trash2 size={14} /> O&apos;chirish
                </button>
              </div>
            </div>

            {/* Asosiy ma'lumotlar */}
            <Section title="Asosiy ma'lumotlar">
              <Field label="Sana" value={fmtDate(c.date)} />
              <Field label="2-sana" value={fmtDate(c.date2)} />
              <Field label="K. sana" value={fmtDate(c.kelishSana)} />
              <Field label="K. kuni" value={c.kKuni} />
              <Field label="Shartnoma raqami" value={c.number} />
              <Field label="Bandlik turi" value={c.employment} />
              <Field label="Stavka" value={c.stavka == null ? null : numFmt(c.stavka)} />
              <Field label="Shartnoma tili" value={c.til} />
              <Field label="Filial" value={c.branch} />
            </Section>

            {/* Qo'shimcha */}
            <Section title="Qo'shimcha">
              <Field label="Qo'shimcha lavozim" value={c.qoshimchaLavozim} />
              <Field label="Qo'shimcha stavka" value={c.qoshimchaStavka == null ? null : numFmt(c.qoshimchaStavka)} />
              <Field label="Modda" value={c.modda} />
            </Section>

            {/* Fayllar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Fayllar</h3>
              {c.fayllar.length ? (
                <ol className="space-y-2">
                  {c.fayllar.map((f, i) => (
                    <li key={f + i} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                      <FileText size={15} className="flex-shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-700">{i + 1}. {faylNomi(f, i)}</span>
                        <span className="block truncate text-xs text-slate-400">{f}</span>
                      </span>
                      <a
                        href={f}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
                      >
                        Ochish <ExternalLink size={12} />
                      </a>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="py-3 text-center text-sm text-slate-400">Fayl biriktirilmagan — «Tahrirlash» orqali havola qo&apos;shing</p>
              )}
            </div>

            {c.note && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="mb-2 text-sm font-semibold text-slate-700">Izoh</h3>
                <p className="whitespace-pre-wrap text-sm text-slate-600">{c.note}</p>
              </div>
            )}

            <div className="px-1 text-xs text-slate-400">Yaratildi: {fmtDT(c.createdAt)}</div>
          </div>
        )}

        {editing && c && (
          <ShartnomaModal
            contract={c}
            onClose={() => setEditing(false)}
            onSaved={() => { setEditing(false); refresh(); }}
          />
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-0.5 text-sm ${value ? 'text-slate-800' : 'text-slate-300'}`}>{value || '—'}</div>
    </div>
  );
}
