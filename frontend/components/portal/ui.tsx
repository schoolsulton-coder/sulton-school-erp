'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { TONE, type Tone } from '@/lib/portal';
import type { ReactNode } from 'react';

/* Portal uchun umumiy, sodda va zamonaviy komponentlar */

export function Card({
  title,
  icon: Icon,
  tone = 'slate',
  href,
  action,
  children,
  className = '',
}: {
  title?: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  href?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const t = TONE[tone];
  const inner = (
    <>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {Icon && (
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${t.soft}`}>
                <Icon size={16} />
              </span>
            )}
            <h2 className="truncate font-semibold text-slate-800">{title}</h2>
          </div>
          {action}
          {href && !action && <ChevronRight size={18} className="shrink-0 text-slate-300" />}
        </div>
      )}
      {children}
    </>
  );
  const cls = `block rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm ${href ? 'transition active:scale-[0.99] hover:shadow-md' : ''} ${className}`;
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

/** Katta raqam + izoh */
export function Stat({ value, label, tone = 'slate', sub }: { value: ReactNode; label: string; tone?: Tone; sub?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-slate-50 px-3 py-2.5 text-center">
      <div className={`text-xl font-bold leading-tight ${TONE[tone].text}`}>{value}</div>
      <div className="mt-0.5 truncate text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

/** Halqali ko'rsatkich (foiz yoki ball) */
export function Ring({
  value,
  max = 100,
  tone = 'emerald',
  label,
  sub,
  size = 116,
}: {
  value: number | null;
  max?: number;
  tone?: Tone;
  label?: ReactNode;
  sub?: string;
  size?: number;
}) {
  const pct = value === null || !max ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
        <circle cx="21" cy="21" r="15.9155" fill="none" strokeWidth="4.5" className="stroke-slate-100" />
        <circle
          cx="21"
          cy="21"
          r="15.9155"
          fill="none"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray={`${pct} ${100 - pct}`}
          className={TONE[tone].ring}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={`text-2xl font-bold leading-none ${TONE[tone].text}`}>{label ?? (value === null ? '—' : value)}</div>
        {sub && <div className="mt-1 text-[11px] text-slate-400">{sub}</div>}
      </div>
    </div>
  );
}

/** Rangli yorliq */
export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONE[tone].soft}`}>{children}</span>;
}

/** Chiziqli ko'rsatkich */
export function Bar({ value, max, tone = 'sky' }: { value: number; max: number; tone?: Tone }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${TONE[tone].bar}`} style={{ width: `${Math.max(0, Math.min(100, max ? (value / max) * 100 : 0))}%` }} />
    </div>
  );
}

export function Empty({ text, icon: Icon }: { text: string; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-slate-400">
      {Icon && <Icon size={28} className="text-slate-300" />}
      {text}
    </div>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-3xl bg-white/70" />
      ))}
    </div>
  );
}

/** ‹ Sentabr 2026 › — oy yoki hafta almashtirish */
export function Switcher({
  label,
  onPrev,
  onNext,
  disabledNext,
  right,
}: {
  label: ReactNode;
  onPrev: () => void;
  onNext: () => void;
  disabledNext?: boolean;
  right?: ReactNode;
}) {
  const btn = 'grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition active:scale-95 disabled:opacity-40';
  return (
    <div className="mb-4 flex items-center gap-2">
      <button type="button" onClick={onPrev} aria-label="Oldingi" className={btn}>
        <ChevronLeft size={18} />
      </button>
      <div className="flex-1 text-center text-sm font-semibold text-slate-700">{label}</div>
      <button type="button" onClick={onNext} disabled={disabledNext} aria-label="Keyingi" className={btn}>
        <ChevronRight size={18} />
      </button>
      {right}
    </div>
  );
}

/** Sahifa sarlavhasi */
export function PageTitle({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-slate-500">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
