'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, MoreVertical, type LucideIcon } from 'lucide-react';

/* ===== Form uslublari (expense-form bilan bir xil) ===== */
export const inp =
  'w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20';
export const lbl = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500';
export const sel =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm outline-none focus:border-brand';

/* ===== Sana yordamchilari (hammasi lokal vaqt bo'yicha) ===== */
export const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayIso = () => localIso(new Date());

export interface Range {
  from: string;
  to: string;
}

export const monthRange = (): Range => {
  const n = new Date();
  return { from: localIso(new Date(n.getFullYear(), n.getMonth(), 1)), to: localIso(n) };
};
export const dayRange = (d = new Date()): Range => ({ from: localIso(d), to: localIso(d) });

/** Backend `new Date(...)` bilan o'qiydi — `to` kunning oxirigacha kengaytiriladi */
export const rangeParams = (r: Range) => ({ from: `${r.from}T00:00:00`, to: `${r.to}T23:59:59.999` });

export const fmtDate = (iso: string) => localIso(new Date(iso));
export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

/* ===== Sana oralig'i tanlagich ===== */
const PRESETS: { label: string; make: () => Range }[] = [
  { label: 'Bugun', make: () => dayRange() },
  {
    label: 'Kecha',
    make: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return dayRange(d);
    },
  },
  {
    label: 'Oxirgi 7 kun',
    make: () => {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return { from: localIso(d), to: todayIso() };
    },
  },
  { label: 'Bu oy', make: monthRange },
  {
    label: "O'tgan oy",
    make: () => {
      const n = new Date();
      return {
        from: localIso(new Date(n.getFullYear(), n.getMonth() - 1, 1)),
        to: localIso(new Date(n.getFullYear(), n.getMonth(), 0)),
      };
    },
  },
  {
    label: 'Bu yil',
    make: () => ({ from: localIso(new Date(new Date().getFullYear(), 0, 1)), to: todayIso() }),
  },
];

export function DateRangePicker({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
      >
        <Calendar size={16} className="text-slate-400" />
        {value.from} — {value.to}
        <ChevronDown size={16} className={`text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                onChange(p.make());
                setOpen(false);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              {p.label}
            </button>
          ))}
          <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
            <input
              type="date"
              value={value.from}
              onChange={(e) => e.target.value && onChange({ ...value, from: e.target.value })}
              className={inp}
            />
            <input
              type="date"
              value={value.to}
              onChange={(e) => e.target.value && onChange({ ...value, to: e.target.value })}
              className={inp}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Statistika kartochkasi ===== */
const TONES = {
  sky: ['border-sky-100 bg-gradient-to-br from-sky-50 to-sky-50/20', 'text-sky-600', 'bg-sky-100/80 text-sky-600'],
  emerald: [
    'border-emerald-100 bg-gradient-to-br from-emerald-50 to-emerald-50/20',
    'text-emerald-600',
    'bg-emerald-100/80 text-emerald-600',
  ],
  rose: ['border-rose-100 bg-gradient-to-br from-rose-50 to-rose-50/20', 'text-rose-600', 'bg-rose-100/80 text-rose-600'],
  violet: [
    'border-violet-100 bg-gradient-to-br from-violet-50 to-violet-50/20',
    'text-violet-600',
    'bg-violet-100/80 text-violet-600',
  ],
  amber: [
    'border-amber-100 bg-gradient-to-br from-amber-50 to-amber-50/20',
    'text-amber-600',
    'bg-amber-100/80 text-amber-600',
  ],
} as const;
export type Tone = keyof typeof TONES;

export function StatCard({
  tone,
  label,
  value,
  icon: Icon,
}: {
  tone: Tone;
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  const [card, text, badge] = TONES[tone];
  return (
    <div className={`flex items-center justify-between rounded-2xl border p-4 shadow-sm ${card}`}>
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <div className={`mt-1.5 truncate text-xl font-bold ${text}`}>{value}</div>
      </div>
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${badge}`}>
        <Icon size={18} />
      </div>
    </div>
  );
}

/* ===== Panel ===== */
export function Panel({
  title,
  hint,
  right,
  children,
}: {
  title: string;
  hint?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-bold text-slate-800">{title}</h2>
          {hint && <p className="text-xs text-slate-400">{hint}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

/** Panel ichidagi label — qiymat qatori */
export function InfoRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 px-5 py-3 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold ${tone ?? 'text-slate-700'}`}>{value}</span>
    </div>
  );
}

/* ===== Jadval bezaklari ===== */
export function StatusPill({ label = 'Bajarilgan' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600 ring-1 ring-emerald-100">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {label}
    </span>
  );
}

export function Badge({ name, tone = 'slate' }: { name: string; tone?: 'slate' | 'emerald' | 'rose' | 'indigo' }) {
  const map = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${map[tone]}`}>{name}</span>;
}

export function RowMenu({ items }: { items: { label: string; icon?: LucideIcon; onClick: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={box} className="relative flex justify-end">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {items.map((it) => (
            <button
              key={it.label}
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              {it.icon && <it.icon size={14} className="text-slate-400" />}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== Modal karkasi ===== */
export function ModalShell({
  title,
  subtitle,
  icon: Icon,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="mt-10 w-full max-w-xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand">
              <Icon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{title}</h2>
              {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            ✕
          </button>
        </div>
        {children}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">{footer}</div>
      </div>
    </div>
  );
}
