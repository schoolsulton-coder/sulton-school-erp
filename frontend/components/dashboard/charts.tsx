'use client';

import { useMemo, useState, type ReactNode } from 'react';

/* Dashboard grafiklari — kutubxonasiz, Tailwind + SVG. Hammasi bosiladigan (detal ochadi). */

export interface Series {
  key: string;
  label: string;
  /** ustun rangi (Tailwind bg-*) */
  cls: string;
  /** tanlangan/hover holatdagi rang */
  on?: string;
  /** bir xil stack kalitli seriyalar bitta ustunda ustma-ust turadi */
  stack?: string;
}

export interface ColumnItem {
  id: string;
  label: string;
  title: string;
  values: Record<string, number>;
}

/** Ustunli grafik: tepada tanlangan guruh ma'lumoti (qora tooltip), ustun bosilsa — onSelect */
export function ColumnChart({
  items,
  series,
  format,
  axis,
  extra,
  onSelect,
  height = 200,
  empty = "Bu davrda ma'lumot yo'q",
}: {
  items: ColumnItem[];
  series: Series[];
  format: (n: number) => string;
  axis: (n: number) => string;
  extra?: (item: ColumnItem) => { label: string; value: string; cls?: string }[];
  onSelect?: (item: ColumnItem) => void;
  height?: number;
  empty?: string;
}) {
  const groups = useMemo(() => {
    const g: Series[][] = [];
    const seen = new Map<string, Series[]>();
    for (const s of series) {
      const k = s.stack ?? s.key;
      if (!seen.has(k)) {
        const arr: Series[] = [];
        seen.set(k, arr);
        g.push(arr);
      }
      seen.get(k)!.push(s);
    }
    return g;
  }, [series]);

  const max = Math.max(1, ...items.flatMap((it) => groups.map((g) => g.reduce((s, x) => s + Math.max(0, it.values[x.key] ?? 0), 0))));
  const hasData = items.some((it) => series.some((s) => (it.values[s.key] ?? 0) !== 0));
  const lastWithData = [...items].reverse().find((it) => series.some((s) => (it.values[s.key] ?? 0) !== 0));
  const [hover, setHover] = useState<string | null>(null);
  const active = items.find((it) => it.id === hover) ?? lastWithData ?? items[items.length - 1];
  const step = Math.max(1, Math.ceil(items.length / 7));

  if (!items.length || !hasData) {
    return <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400" style={{ height }}>{empty}</div>;
  }

  return (
    <div>
      {active && (
        <div className="mb-3 rounded-xl bg-slate-900 px-3 py-2.5 text-white sm:px-4">
          <div className="text-sm font-semibold">{active.title}</div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm">
            {series.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-sm ${s.cls}`} />
                {s.label}: <b className="font-semibold">{format(active.values[s.key] ?? 0)}</b>
              </span>
            ))}
            {extra?.(active).map((x) => (
              <span key={x.label}>
                {x.label}: <b className={`font-semibold ${x.cls ?? ''}`}>{x.value}</b>
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="relative" style={{ height }}>
        <div className="pointer-events-none absolute left-0 top-0 text-[11px] text-slate-400">{axis(max)}</div>
        <div className="pointer-events-none absolute bottom-0 left-0 text-[11px] text-slate-400">0</div>
        <div className="absolute inset-y-0 left-9 right-0 flex items-end gap-1 border-b border-slate-200 sm:left-12 sm:gap-2" onMouseLeave={() => setHover(null)}>
          {items.map((it) => {
            const on = active?.id === it.id;
            return (
              <button
                key={it.id}
                type="button"
                onMouseEnter={() => setHover(it.id)}
                onFocus={() => setHover(it.id)}
                onClick={() => {
                  setHover(it.id);
                  onSelect?.(it);
                }}
                aria-label={`${it.title} — batafsil`}
                className={`flex h-full min-w-0 flex-1 items-end justify-center gap-0.5 rounded-t-md pt-2 transition sm:gap-1 ${on ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
              >
                {groups.map((g) => (
                  <span key={g[0].key} className="flex h-full w-full max-w-[36px] flex-col-reverse">
                    {g.map((s) => {
                      const v = Math.max(0, it.values[s.key] ?? 0);
                      return (
                        <span
                          key={s.key}
                          className={`block w-full first:rounded-b-none last:rounded-t-[3px] ${on && s.on ? s.on : s.cls}`}
                          style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? 2 : 0 }}
                        />
                      );
                    })}
                  </span>
                ))}
              </button>
            );
          })}
        </div>
      </div>
      <div className="ml-9 mt-1.5 flex gap-1 sm:ml-12 sm:gap-2">
        {items.map((it, i) => (
          <span key={it.id} className="min-w-0 flex-1 truncate text-center text-[10px] text-slate-500 sm:text-xs">
            {i % step === 0 || i === items.length - 1 ? it.label : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

export interface DonutSeg {
  key: string;
  label: string;
  value: number;
  /** SVG rangi (Tailwind stroke-*) */
  stroke: string;
  /** legend nuqtasi (Tailwind bg-*) */
  dot: string;
}

/** Donut diagramma: segment yoki legend bosilsa — onSelect */
export function Donut({
  segments,
  center,
  sub,
  onSelect,
  format = (n) => String(n),
}: {
  segments: DonutSeg[];
  center: ReactNode;
  sub?: string;
  onSelect?: (s: DonutSeg) => void;
  format?: (n: number) => string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  let acc = 0;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
          <circle cx="21" cy="21" r="15.9155" fill="none" strokeWidth="6" className="stroke-slate-100" />
          {total > 0 &&
            segments.map((s) => {
              const len = (s.value / total) * 100;
              const off = acc;
              acc += len;
              if (!s.value) return null;
              return (
                <circle
                  key={s.key}
                  cx="21"
                  cy="21"
                  r="15.9155"
                  fill="none"
                  strokeWidth="6"
                  strokeDasharray={`${len} ${100 - len}`}
                  strokeDashoffset={-off}
                  className={`${s.stroke} cursor-pointer transition-opacity hover:opacity-80`}
                  onClick={() => onSelect?.(s)}
                >
                  <title>{`${s.label}: ${format(s.value)}`}</title>
                </circle>
              );
            })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-xl font-bold text-slate-900">{center}</div>
          {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
        </div>
      </div>
      <div className="w-full min-w-0 space-y-1">
        {segments.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onSelect?.(s)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50"
          >
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} />
            <span className="min-w-0 flex-1 truncate text-slate-600">{s.label}</span>
            <span className="font-semibold text-slate-800">{format(s.value)}</span>
            <span className="w-12 text-right text-xs text-slate-400">{total ? `${Math.round((s.value / total) * 100)}%` : '0%'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export interface BarRow {
  id: string;
  label: string;
  value: number;
  display: string;
  sub?: string;
  /** chiziq rangi (Tailwind bg-*) */
  bar: string;
}

/** Gorizontal chiziqlar ro'yxati (sinflar, fanlar, qarz guruhlari) — qator bosilsa onSelect */
export function BarList({
  rows,
  max,
  onSelect,
  empty = "Ma'lumot yo'q",
  limit,
}: {
  rows: BarRow[];
  max?: number;
  onSelect?: (r: BarRow) => void;
  empty?: string;
  limit?: number;
}) {
  const [all, setAll] = useState(false);
  const shown = limit && !all ? rows.slice(0, limit) : rows;
  const m = max ?? Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <div className="py-6 text-center text-sm text-slate-400">{empty}</div>;
  return (
    <div>
      <div className="space-y-0.5">
        {shown.map((r) => (
          <button key={r.id} type="button" onClick={() => onSelect?.(r)} className="block w-full rounded-lg px-2 py-1.5 text-left hover:bg-slate-50">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-slate-700">{r.label}</span>
              <span className="shrink-0 whitespace-nowrap font-mono text-xs text-slate-600 sm:text-[13px]">
                {r.display}
                {r.sub && <span className="text-slate-400"> · {r.sub}</span>}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${r.bar}`} style={{ width: `${Math.max(0, Math.min(100, (r.value / m) * 100))}%` }} />
            </div>
          </button>
        ))}
      </div>
      {limit && rows.length > limit && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-1 px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800">
          {all ? "Kamroq ko'rsatish" : `Yana ${rows.length - limit} ta`}
        </button>
      )}
    </div>
  );
}
