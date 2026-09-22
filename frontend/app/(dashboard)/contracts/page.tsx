'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, SlidersHorizontal, X } from 'lucide-react';
import { contractsApi, type ContractOverviewRow } from '@/lib/contracts';

const num = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0));
// Kartalardagi sonlar: 1 974 (bo'shliq bilan, qatorga bo'linmaydi)
const cnt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
const pctOf = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);
const dateKey = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};
const ymdLocal = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fmtYmd = (s: string) => s.split('-').reverse().join('.');
const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const WD = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];

const STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'Faol', cls: 'bg-green-100 text-green-700' },
  INACTIVE: { label: 'Nofaol', cls: 'bg-rose-100 text-rose-700' },
  SUSPENDED: { label: 'Band', cls: 'bg-purple-100 text-purple-700' },
  TEMP_SUSPENDED: { label: 'Vaqtincha band', cls: 'bg-sky-100 text-sky-700' },
  OVERDUE: { label: "Muddati o'tgan", cls: 'bg-orange-100 text-orange-700' },
  LEFT: { label: 'Ketdi-aniqlashga', cls: 'bg-yellow-100 text-yellow-800' },
  DRAFT: { label: 'Qoralama', cls: 'bg-slate-100 text-slate-600' },
  COMPLETED: { label: 'Yakunlangan', cls: 'bg-slate-100 text-slate-600' },
  CANCELLED: { label: 'Bekor qilingan', cls: 'bg-slate-100 text-slate-600' },
  OTHER: { label: 'Boshqa', cls: 'bg-slate-100 text-slate-600' },
};

type Tone = { card: string; on: string; label: string; value: string; sub: string };
const TONES: Record<string, Tone> = {
  blue: { card: 'border-blue-200 bg-blue-50/70', on: 'border-blue-400 ring-2 ring-blue-200', label: 'text-blue-700', value: 'text-blue-950', sub: 'text-blue-700/80' },
  emerald: { card: 'border-emerald-200 bg-emerald-50/70', on: 'border-emerald-400 ring-2 ring-emerald-200', label: 'text-emerald-700', value: 'text-emerald-800', sub: 'text-emerald-700/80' },
  amber: { card: 'border-amber-200 bg-amber-50/70', on: 'border-amber-400 ring-2 ring-amber-200', label: 'text-amber-700', value: 'text-amber-800', sub: 'text-amber-700/80' },
  slate: { card: 'border-slate-200 bg-slate-50', on: 'border-slate-400 ring-2 ring-slate-200', label: 'text-slate-600', value: 'text-slate-800', sub: 'text-slate-500' },
  rose: { card: 'border-rose-200 bg-rose-50/70', on: 'border-rose-400 ring-2 ring-rose-200', label: 'text-rose-600', value: 'text-rose-700', sub: 'text-rose-600/80' },
  violet: { card: 'border-violet-200 bg-violet-50/70', on: 'border-violet-400 ring-2 ring-violet-200', label: 'text-violet-600', value: 'text-violet-700', sub: 'text-violet-600/80' },
  sky: { card: 'border-sky-200 bg-sky-50/70', on: 'border-sky-400 ring-2 ring-sky-200', label: 'text-sky-700', value: 'text-sky-800', sub: 'text-sky-700/80' },
  orange: { card: 'border-orange-200 bg-orange-50/70', on: 'border-orange-400 ring-2 ring-orange-200', label: 'text-orange-600', value: 'text-orange-700', sub: 'text-orange-600/80' },
  yellow: { card: 'border-yellow-200 bg-yellow-50/70', on: 'border-yellow-400 ring-2 ring-yellow-200', label: 'text-yellow-700', value: 'text-yellow-800', sub: 'text-yellow-700/80' },
};

// Shartnoma turi: toifasi bor (Grand, Xodim farzandi, ...) — "Boshqa", qolganlari Oylik/Yillik
type TypeKey = 'MONTHLY' | 'YEARLY' | 'OTHER';
const typeOf = (r: ContractOverviewRow): TypeKey => (r.category ? 'OTHER' : r.type === 'YEARLY' ? 'YEARLY' : 'MONTHLY');
const TYPE_CARDS: { key: TypeKey; label: string; sub: string; tone: string }[] = [
  { key: 'MONTHLY', label: 'Oylik', sub: 'barcha holatlar', tone: 'emerald' },
  { key: 'YEARLY', label: 'Yillik', sub: 'barcha holatlar', tone: 'amber' },
  { key: 'OTHER', label: 'Boshqa', sub: 'Grand, xodim farzandi va boshqa', tone: 'slate' },
];

// O'quvchi holati — har shartnoma aynan bitta kartaga tushadi (yig'indisi = Jami)
const STATUS_CARDS: { key: string; label: string; sub: string; tone: string; match: string[] }[] = [
  { key: 'ACTIVE', label: 'Faol', sub: "o'qiyotgan", tone: 'emerald', match: ['ACTIVE', 'COMPLETED'] },
  { key: 'INACTIVE', label: 'Nofaol', sub: "to'lov qilmagani uchun", tone: 'rose', match: ['INACTIVE'] },
  { key: 'CANCELLED', label: 'Bekor qildi', sub: "o'qib, keyin ketgan", tone: 'slate', match: ['CANCELLED'] },
  { key: 'SUSPENDED', label: 'Band', sub: 'joyi band qilingan', tone: 'violet', match: ['SUSPENDED'] },
  { key: 'TEMP_SUSPENDED', label: 'Vaqtincha band', sub: "to'lov muddati ichida", tone: 'sky', match: ['TEMP_SUSPENDED'] },
  { key: 'OVERDUE', label: "Muddati o'tgan", sub: "to'lov kutilmoqda", tone: 'orange', match: ['OVERDUE'] },
  { key: 'LEFT', label: 'Ketdi-aniqlashga', sub: 'holati tekshirilmoqda', tone: 'yellow', match: ['LEFT'] },
];
// Qoralama / Boshqa — faqat shunday shartnoma bo'lsa ko'rinadi
const OTHER_STATUS_CARD = { key: 'OTHER', label: 'Boshqa holat', sub: 'qoralama va boshqa', tone: 'slate', match: [] as string[] };
const statusOf = (s: string) => STATUS_CARDS.find((c) => c.match.includes(s))?.key ?? 'OTHER';

// Joriy o'quv yili: iyundan boshlab — keyingi yil qabuli (masalan, 2026-09 → 2026-2027)
const currentAcademicYear = () => {
  const d = new Date();
  const y = d.getMonth() >= 5 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${y + 1}`;
};

const SKEY = 'contracts-filters';
// Mobilda text-base (16px) — iOS fokusda sahifani kattalashtirmasligi uchun
const sel = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-blue-400 sm:py-2 sm:text-sm';

export default function ContractsPage() {
  const [q, setQ] = useState('');
  const [year, setYear] = useState<string | null>(null); // null — avtomatik (joriy o'quv yili)
  const [branch, setBranch] = useState('');
  const [cls, setCls] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [typeF, setTypeF] = useState<TypeKey | ''>('');
  const [statusF, setStatusF] = useState('');
  const [panel, setPanel] = useState(false);
  const [restored, setRestored] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['contracts-overview'], queryFn: contractsApi.overview });
  const rows = useMemo(() => data?.rows ?? [], [data]);

  // Filtrlar sahifadan chiqib-qaytganda saqlanib qoladi (shu tab doirasida)
  useEffect(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem(SKEY) || 'null');
      if (s) {
        setQ(s.q ?? ''); setYear(s.year ?? null); setBranch(s.branch ?? ''); setCls(s.cls ?? '');
        setFrom(s.from ?? ''); setTo(s.to ?? ''); setTypeF(s.typeF ?? ''); setStatusF(s.statusF ?? '');
      }
    } catch { /* saqlanmagan bo'lsa — standart filtrlar */ }
    setRestored(true);
  }, []);
  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(SKEY, JSON.stringify({ q, year, branch, cls, from, to, typeF, statusF }));
    } catch { /* private rejim — saqlanmaydi */ }
  }, [restored, q, year, branch, cls, from, to, typeF, statusF]);

  const years = useMemo(
    () => Array.from(new Set(rows.map((r) => r.academicYear).filter((y): y is string => !!y))).sort().reverse(),
    [rows],
  );
  const defaultYear = useMemo(() => {
    const cur = currentAcademicYear();
    return years.includes(cur) ? cur : years[0] ?? '';
  }, [years]);
  const effYear = year ?? defaultYear;

  const branches = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) if (r.branchId && r.branch) m.set(r.branchId, r.branch);
    return Array.from(m, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);
  const classes = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) {
      if (!r.classId || !r.student.class) continue;
      if (effYear && r.academicYear !== effYear) continue;
      if (branch && r.branchId !== branch) continue;
      const c = r.student.class;
      m.set(r.classId, c.language ? `${c.name} (${c.language})` : c.name);
    }
    return Array.from(m, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'uz', { numeric: true }));
  }, [rows, effYear, branch]);

  // 1) Qidiruv + panel filtrlari — kartalar shu to'plamdan sanaladi
  const base = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (term) {
        const a = `${r.student.lastName} ${r.student.firstName}`.toLowerCase();
        const b = `${r.student.firstName} ${r.student.lastName}`.toLowerCase();
        const hit =
          a.includes(term) || b.includes(term) || r.number.toLowerCase().includes(term) ||
          r.id.toLowerCase().startsWith(term) || r.studentId?.toLowerCase().startsWith(term);
        if (!hit) return false;
      }
      if (effYear && r.academicYear !== effYear) return false;
      if (branch && r.branchId !== branch) return false;
      if (cls && r.classId !== cls) return false;
      if (from || to) {
        const d = ymdLocal(r.createdAt);
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      return true;
    });
  }, [rows, q, effYear, branch, cls, from, to]);

  // 2) Tur kartasi → holat kartalari shu tur ichidan sanaladi
  const typeCounts = useMemo(() => {
    const c: Record<TypeKey, number> = { MONTHLY: 0, YEARLY: 0, OTHER: 0 };
    for (const r of base) c[typeOf(r)]++;
    return c;
  }, [base]);
  const typed = useMemo(() => (typeF ? base.filter((r) => typeOf(r) === typeF) : base), [base, typeF]);
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of typed) {
      const k = statusOf(r.status);
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [typed]);
  const statusCards = (statusCounts.OTHER ?? 0) > 0 || statusF === 'OTHER' ? [...STATUS_CARDS, OTHER_STATUS_CARD] : STATUS_CARDS;

  // 3) Holat kartasi → jadval
  const filtered = useMemo(
    () => (statusF ? typed.filter((r) => statusOf(r.status) === statusF) : typed),
    [typed, statusF],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ContractOverviewRow[]>();
    for (const r of filtered) {
      const k = dateKey(r.createdAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const panelCount = [effYear, branch, cls, from || to].filter(Boolean).length;
  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (effYear) chips.push({ key: 'year', label: effYear, remove: () => { setYear(''); setCls(''); } });
  if (branch) chips.push({ key: 'branch', label: branches.find((b) => b.id === branch)?.name ?? 'Filial', remove: () => { setBranch(''); setCls(''); } });
  if (cls) chips.push({ key: 'cls', label: classes.find((c) => c.id === cls)?.name ?? 'Sinf', remove: () => setCls('') });
  if (from || to) {
    const label = from && to ? `${fmtYmd(from)} – ${fmtYmd(to)}` : from ? `${fmtYmd(from)} dan` : `${fmtYmd(to)} gacha`;
    chips.push({ key: 'date', label, remove: () => { setFrom(''); setTo(''); } });
  }
  if (typeF) chips.push({ key: 'type', label: `Tur: ${TYPE_CARDS.find((t) => t.key === typeF)?.label}`, remove: () => setTypeF('') });
  if (statusF) chips.push({ key: 'status', label: `Holat: ${statusCards.find((s) => s.key === statusF)?.label ?? statusF}`, remove: () => setStatusF('') });

  const clearAll = () => {
    setQ(''); setYear(''); setBranch(''); setCls(''); setFrom(''); setTo(''); setTypeF(''); setStatusF('');
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">
          Shartnomalar{' '}
          <span className="text-base font-normal text-slate-400">
            {filtered.length !== rows.length ? `${filtered.length} / ${rows.length}` : rows.length} ta
          </span>
        </h1>
        <Link href="/contracts/new" className="flex items-center gap-1 rounded-lg bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-dark sm:py-2">
          <Plus size={18} /> Yangi shartnoma
        </Link>
      </div>

      {/* Qidiruv + Filterlar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-3">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Raqam, ism, ID bo'yicha qidirish..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-base outline-none focus:border-blue-400 sm:text-sm"
            />
            {q && (
              <button type="button" onClick={() => setQ('')} aria-label="Qidiruvni tozalash" className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setPanel((v) => !v)}
            aria-expanded={panel}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition sm:px-4 ${panel ? 'border-blue-400 bg-blue-100 text-blue-800' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
          >
            <SlidersHorizontal size={16} />
            <span className="hidden sm:inline">Filterlar</span>
            {panelCount > 0 && (
              <span className="grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-blue-600 px-1 text-[11px] font-bold text-white">{panelCount}</span>
            )}
          </button>
        </div>

        {panel && (
          <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">O&apos;quv yili</span>
              <select value={effYear} onChange={(e) => { setYear(e.target.value); setCls(''); }} className={sel}>
                <option value="">Barcha yillar</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Filial</span>
              <select value={branch} onChange={(e) => { setBranch(e.target.value); setCls(''); }} className={sel}>
                <option value="">Barcha filiallar</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Sinf</span>
              <select value={cls} onChange={(e) => setCls(e.target.value)} className={sel}>
                <option value="">Barcha sinflar</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Sana (dan)</span>
              <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={sel} />
            </label>
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Sana (gacha)</span>
              <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={sel} />
            </label>
          </div>
        )}
      </div>

      {/* Faol filtrlar */}
      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <span key={c.key} className="inline-flex max-w-full items-center gap-1 rounded-full border border-blue-200 bg-blue-50 py-1 pl-3 pr-1 text-xs font-medium text-blue-800">
              <span className="truncate">{c.label}</span>
              <button type="button" onClick={c.remove} aria-label={`${c.label} filtrini olib tashlash`} className="grid h-6 w-6 shrink-0 place-items-center rounded-full hover:bg-blue-100 sm:h-5 sm:w-5">
                <X size={12} />
              </button>
            </span>
          ))}
          {chips.length > 1 && (
            <button type="button" onClick={clearAll} className="px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800">
              Hammasini tozalash
            </button>
          )}
        </div>
      )}

      {/* Shartnoma turi + O'quvchi holati */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 sm:p-5">
        {isLoading ? (
          <div className="h-56 animate-pulse rounded-xl bg-slate-50" />
        ) : (
          <>
            <SectionHead title="Shartnoma turi" note="Oylik va Yillik sonlariga barcha holatlar kiradi" />
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
              <StatCard label="Jami (filtr)" value={base.length} sub="barcha tur va holatlar" tone="blue" active={!typeF} onClick={() => setTypeF('')} />
              {TYPE_CARDS.map((t) => (
                <StatCard
                  key={t.key}
                  label={t.label}
                  value={typeCounts[t.key]}
                  pct={pctOf(typeCounts[t.key], base.length)}
                  sub={t.sub}
                  tone={t.tone}
                  active={typeF === t.key}
                  onClick={() => setTypeF(typeF === t.key ? '' : t.key)}
                />
              ))}
            </div>

            <div className="my-4 border-t border-slate-100" />

            <SectionHead title="O'quvchi holati" note="Ayni paytdagi real holat" />
            <div className={`grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 ${statusCards.length > 7 ? '2xl:grid-cols-8' : '2xl:grid-cols-7'}`}>
              {statusCards.map((s) => (
                <StatCard
                  key={s.key}
                  label={s.label}
                  value={statusCounts[s.key] ?? 0}
                  pct={pctOf(statusCounts[s.key] ?? 0, typed.length)}
                  sub={s.sub}
                  tone={s.tone}
                  active={statusF === s.key}
                  onClick={() => setStatusF(statusF === s.key ? '' : s.key)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">№</th>
              <th className="px-4 py-3">Sana</th>
              <th className="px-4 py-3">O&apos;quvchi</th>
              <th className="px-4 py-3">Filial · Yil</th>
              <th className="px-4 py-3">Turi / Holat</th>
              <th className="px-4 py-3 text-right">Asl narx / Chegirma</th>
              <th className="px-4 py-3 text-right">To&apos;lanadigan / Oylik</th>
              <th className="px-4 py-3 text-right">To&apos;lovlar</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Yuklanmoqda…</td></tr>
            )}
            {!isLoading && grouped.map(([date, list]) => {
              const d = new Date(list[0].createdAt);
              const sum = list.reduce((s, r) => s + r.payable, 0);
              return (
                <Fragment key={date}>
                  <tr className="bg-slate-50/70">
                    <td colSpan={8} className="px-4 py-2 text-sm">
                      <span className="font-semibold text-slate-600">{date}</span>
                      <span className="ml-1 text-slate-400">({WD[d.getDay()]})</span>
                      <span className="ml-2 text-slate-400">· {list.length} ta</span>
                      <span className="ml-2 font-medium text-green-600">· {num(sum)} so&apos;m</span>
                    </td>
                  </tr>
                  {list.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-500">{r.number.split('-').pop()}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-slate-500">
                        {dateKey(r.createdAt)}<div className="text-xs text-slate-400">{fmtTime(r.createdAt)}</div>
                      </td>
                      <td className="px-4 py-2">
                        <Link href={`/contracts/${r.id}`} className="font-medium text-slate-800 hover:text-brand">
                          {r.student.lastName} {r.student.firstName}
                        </Link>
                        {r.student.class && <div className="text-xs text-slate-400">{r.student.class.name} ({r.student.class.language ?? '—'})</div>}
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-slate-700">{r.branch ?? '—'}</div>
                        <div className="text-xs text-slate-400">{r.academicYear ?? '—'}</div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`rounded px-2 py-0.5 text-xs ${r.category ? 'bg-slate-100 text-slate-700' : r.type === 'YEARLY' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-brand'}`}>
                            {r.category ?? (r.type === 'YEARLY' ? 'Yillik' : 'Oylik')}
                          </span>
                          <span className={`rounded px-2 py-0.5 text-xs ${(STATUS[r.status] ?? STATUS.OTHER).cls}`}>
                            {(STATUS[r.status] ?? STATUS.OTHER).label}
                          </span>
                          {r.overdue && <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">Qarzdor</span>}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">
                        <div className="font-medium text-slate-800">{num(r.original)}</div>
                        {r.discount > 0 && <div className="text-xs text-red-500">−{num(r.discount)}</div>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">
                        <div className="font-semibold text-slate-900">{num(r.payable)}</div>
                        <div className="text-xs text-slate-400">{num(r.monthly)}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right font-medium text-green-600">
                        {r.paymentsSum > 0 ? num(r.paymentsSum) : '—'}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
            {!isLoading && !filtered.length && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Shartnoma topilmadi</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SectionHead({ title, note }: { title: string; note: string }) {
  return (
    <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 sm:mb-3">
      <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-800 sm:text-sm">{title}</h2>
      <span className="text-[11px] text-slate-500 sm:text-xs">{note}</span>
    </div>
  );
}

function StatCard({ label, value, pct, sub, tone, active, onClick }: {
  label: string; value: number; pct?: number; sub: string; tone: string; active: boolean; onClick: () => void;
}) {
  const t = TONES[tone] ?? TONES.slate;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-w-0 flex-col rounded-xl border px-3 py-2.5 text-left transition sm:px-3.5 sm:py-3 ${t.card} ${active ? t.on : 'hover:shadow-sm'}`}
    >
      <div className={`truncate text-[11px] font-medium uppercase sm:text-xs ${t.label}`} title={label}>{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5 whitespace-nowrap">
        {pct !== undefined && <span className={`text-xs sm:text-sm ${t.sub}`}>({pct}%)</span>}
        <span className={`text-xl font-bold leading-tight sm:text-2xl ${t.value}`}>{cnt(value)}</span>
      </div>
      <div className={`mt-1 text-[11px] font-medium leading-snug sm:text-xs ${t.sub}`}>{sub}</div>
    </button>
  );
}
