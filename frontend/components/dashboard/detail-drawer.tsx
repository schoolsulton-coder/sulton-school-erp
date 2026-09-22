'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, Search, X } from 'lucide-react';
import { dashboardApi, fmt, fmtDate, fmtPct, type ColType, type DashParams, type DetailReq } from '@/lib/dashboard';

const TONE: Record<string, string> = {
  good: 'text-emerald-700',
  bad: 'text-rose-700',
  warn: 'text-amber-700',
  muted: 'text-slate-400',
};

function cell(v: string | number | null | undefined, type?: ColType) {
  if (v === null || v === undefined || v === '') return '—';
  switch (type) {
    case 'money':
    case 'int':
      return fmt(Number(v));
    case 'num':
      return fmt(Number(v), Number.isInteger(Number(v)) ? 0 : 2);
    case 'pct':
      return fmtPct(Number(v));
    case 'date':
      return /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? fmtDate(String(v)) : String(v);
    default:
      return String(v);
  }
}
const numeric = (t?: ColType) => t === 'money' || t === 'int' || t === 'num' || t === 'pct';

/** Karta/qator bosilganda ochiladigan detal oynasi. Sinf kabi qatorlar ichkariga (drill) ochiladi, qolganlari — sahifaga o'tadi */
export function DetailDrawer({ req, params, onClose }: { req: DetailReq | null; params: DashParams; onClose: () => void }) {
  const router = useRouter();
  const [stack, setStack] = useState<DetailReq[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    setStack(req ? [req] : []);
    setQ('');
  }, [req]);

  const cur = stack[stack.length - 1] ?? null;
  const open = !!cur;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dash-detail', params, cur],
    queryFn: () => dashboardApi.detail({ ...params, ...cur! }),
    enabled: open,
  });

  const rows = useMemo(() => {
    if (!data) return [];
    const t = q.trim().toLowerCase();
    if (!t) return data.rows;
    return data.rows.filter((r) => data.columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(t)));
  }, [data, q]);

  if (!open) return null;

  const onRow = (r: (typeof rows)[number]) => {
    if (r._drill) {
      const [kind, key] = String(r._drill).split(':');
      setStack((s) => [...s, { kind, key, from: cur?.from, to: cur?.to }]);
      setQ('');
    } else if (r._href) {
      router.push(String(r._href));
    }
  };
  const clickable = (r: (typeof rows)[number]) => !!(r._drill || r._href);
  const errMsg = (error as any)?.response?.data?.message;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={onClose} role="dialog" aria-modal="true" aria-label={data?.title ?? 'Batafsil'}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full flex-col bg-white shadow-2xl sm:max-w-3xl sm:rounded-l-2xl"
      >
        <div className="flex items-start gap-2 border-b border-slate-100 px-4 pb-3 pt-[calc(0.75rem_+_env(safe-area-inset-top))] sm:px-5 sm:pt-4">
          {stack.length > 1 && (
            <button type="button" onClick={() => setStack((s) => s.slice(0, -1))} aria-label="Orqaga" className="-ml-1 mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-900">{data?.title ?? (isLoading ? 'Yuklanmoqda…' : 'Batafsil')}</h2>
            {data?.subtitle && <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{data.subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Yopish" className="-mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {data && (
          <div className="space-y-3 border-b border-slate-100 px-4 py-3 sm:px-5">
            {!!data.summary?.length && (
              <div className="flex flex-wrap gap-2">
                {data.summary.map((s) => (
                  <div key={s.label} className="rounded-lg bg-slate-50 px-3 py-1.5">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">{s.label}</div>
                    <div className="font-semibold text-slate-900">{cell(s.value, s.type)}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="relative min-w-0 flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Ro'yxatdan qidirish..."
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-base outline-none focus:border-blue-400 sm:text-sm"
                />
              </div>
              <span className="shrink-0 text-xs text-slate-500">
                {rows.length !== data.rows.length ? `${rows.length} / ` : ''}
                {data.total} ta
              </span>
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          {isLoading && (
            <div className="space-y-2 p-4 sm:p-5">
              {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />)}
            </div>
          )}
          {isError && <div className="m-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{errMsg || "Ma'lumotni yuklab bo'lmadi"}</div>}
          {data && !rows.length && <div className="py-16 text-center text-sm text-slate-400">Yozuv topilmadi</div>}

          {data && rows.length > 0 && (
            <>
              {/* Kompyuter: jadval */}
              <table className="hidden w-full text-sm sm:table">
                <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    {data.columns.map((c) => (
                      <th key={c.key} className={`whitespace-nowrap px-4 py-2.5 font-medium ${numeric(c.type) ? 'text-right' : ''}`}>{c.label}</th>
                    ))}
                    <th className="w-6" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={i}
                      onClick={() => onRow(r)}
                      className={`border-t border-slate-100 ${clickable(r) ? 'cursor-pointer hover:bg-blue-50/50' : ''} ${r._tone === 'muted' ? 'opacity-60' : ''}`}
                    >
                      {data.columns.map((c, ci) => (
                        <td
                          key={c.key}
                          className={`px-4 py-2.5 ${numeric(c.type) ? 'whitespace-nowrap text-right font-mono text-[13px]' : ''} ${ci === 0 ? 'font-medium text-slate-800' : 'text-slate-600'} ${c.type === 'money' && Number(r[c.key]) < 0 ? 'text-rose-600' : ''} ${ci === 0 && r._tone ? TONE[r._tone] ?? '' : ''}`}
                        >
                          {c.type === 'badge' && r[c.key] ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{String(r[c.key])}</span>
                          ) : (
                            cell(r[c.key], c.type)
                          )}
                        </td>
                      ))}
                      <td className="pr-3 text-slate-300">{clickable(r) && <ChevronRight size={15} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Telefon: kartochkalar */}
              <div className="divide-y divide-slate-100 sm:hidden">
                {rows.map((r, i) => {
                  // Sarlavha — birinchi matnli ustun (sana bo'lsa, keyingisi: o'quvchi / ta'minotchi)
                  const ti = data.columns[0].type === 'date' && data.columns.length > 1 ? 1 : 0;
                  const first = data.columns[ti];
                  const rest = data.columns.filter((_, ci) => ci !== ti);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onRow(r)}
                      disabled={!clickable(r)}
                      className="flex w-full items-start gap-2 px-4 py-3 text-left active:bg-slate-50 disabled:active:bg-transparent"
                    >
                      <div className="min-w-0 flex-1">
                        <div className={`font-medium text-slate-900 ${r._tone ? TONE[r._tone] ?? '' : ''}`}>{cell(r[first.key], first.type)}</div>
                        <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                          {rest.map((c) => (
                            <div key={c.key} className="flex min-w-0 justify-between gap-2">
                              <span className="shrink-0 text-slate-400">{c.label}</span>
                              <span className={`truncate text-right ${numeric(c.type) ? 'font-mono' : ''} ${c.type === 'money' && Number(r[c.key]) < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                                {cell(r[c.key], c.type)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {clickable(r) && <ChevronRight size={16} className="mt-0.5 shrink-0 text-slate-300" />}
                    </button>
                  );
                })}
              </div>
              {data.truncated && <div className="px-4 py-3 text-center text-xs text-slate-400">Birinchi {data.rows.length} ta yozuv ko&apos;rsatildi</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
