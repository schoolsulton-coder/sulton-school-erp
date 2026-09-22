'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, RefreshCw } from 'lucide-react';
import {
  addDaysStr,
  dashboardApi,
  fmt,
  fmtDate,
  fmtDay,
  fmtPct,
  fmtShort,
  fmtSigned,
  todayStr,
  type AcademicData,
  type CeoDashboard,
  type DashParams,
  type DetailReq,
} from '@/lib/dashboard';
import { BarList, ColumnChart, Donut } from './charts';
import { DetailDrawer } from './detail-drawer';

type Preset = 'today' | '7' | '30' | 'month' | 'custom';
const PRESETS: { key: Exclude<Preset, 'custom'>; label: string }[] = [
  { key: 'today', label: 'Bugun' },
  { key: '7', label: '7 kun' },
  { key: '30', label: '30 kun' },
  { key: 'month', label: 'Shu oy' },
];
const rangeOf = (p: Exclude<Preset, 'custom'>) => {
  const t = todayStr();
  if (p === 'today') return { from: t, to: t };
  if (p === '7') return { from: addDaysStr(t, -6), to: t };
  if (p === 'month') return { from: `${t.slice(0, 8)}01`, to: t };
  return { from: addDaysStr(t, -29), to: t };
};
const SKEY = 'ceo-dashboard-filters';
const sel = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-blue-400 sm:text-sm';

type Tone = 'white' | 'amber' | 'rose' | 'sky' | 'emerald' | 'blue';
const TONES: Record<Tone, { box: string; title: string; value: string; sub: string }> = {
  white: { box: 'border-slate-200 bg-white', title: 'text-slate-700', value: 'text-slate-900', sub: 'text-slate-600' },
  amber: { box: 'border-amber-200 bg-amber-50/60', title: 'text-amber-900', value: 'text-amber-900', sub: 'text-amber-800' },
  rose: { box: 'border-rose-200 bg-rose-50/60', title: 'text-rose-800', value: 'text-rose-700', sub: 'text-rose-700' },
  sky: { box: 'border-sky-200 bg-sky-50/60', title: 'text-sky-800', value: 'text-sky-900', sub: 'text-sky-700' },
  emerald: { box: 'border-emerald-200 bg-emerald-50/60', title: 'text-emerald-800', value: 'text-emerald-800', sub: 'text-emerald-700' },
  blue: { box: 'border-blue-200 bg-blue-50/60', title: 'text-blue-900', value: 'text-blue-950', sub: 'text-blue-800' },
};

/** Bosiladigan karta — detal oynasini ochadi */
function Card({ tone = 'white', title, onClick, children }: { tone?: Tone; title: ReactNode; onClick?: () => void; children: ReactNode }) {
  const t = TONES[tone];
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`flex min-w-0 flex-col items-stretch rounded-2xl border p-4 text-left transition ${t.box} ${onClick ? 'hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300' : ''}`}
    >
      <div className={`text-sm font-medium uppercase tracking-wide ${t.title}`}>{title}</div>
      {children}
    </Tag>
  );
}
function Big({ tone = 'white', value, unit, cls }: { tone?: Tone; value: ReactNode; unit?: string; cls?: string }) {
  return (
    <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
      <span className={`text-2xl font-bold tracking-tight ${cls ?? TONES[tone].value}`}>{value}</span>
      {unit && <span className="text-sm text-slate-500">{unit}</span>}
    </div>
  );
}
function Line({ label, value, cls = '' }: { label: ReactNode; value: ReactNode; cls?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className={`whitespace-nowrap font-mono text-[13px] ${cls}`}>{value}</span>
    </div>
  );
}
function Delta({ value, goodUp = true, suffix = '%' }: { value: number | null; goodUp?: boolean; suffix?: string }) {
  if (value === null) return <span className="text-xs text-slate-400">—</span>;
  if (value === 0) return <span className="text-xs font-semibold text-slate-500">±0{suffix}</span>;
  const good = value === 0 ? null : value > 0 === goodUp;
  return (
    <span className={`text-xs font-semibold ${good === null ? 'text-slate-500' : good ? 'text-emerald-600' : 'text-rose-600'}`}>
      {value > 0 ? '+' : ''}
      {String(value).replace('.', ',')}
      {suffix}
    </span>
  );
}
function Section({ title, note, children, right }: { title: string; note?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="text-lg font-semibold text-slate-900">
          {title}
          {note && <span className="ml-2 text-sm font-normal text-slate-500">— {note}</span>}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}
function Panel({ title, right, children }: { title: ReactNode; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}
const tashkentTime = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const rangeLabel = (f: string, t: string) => (f === t ? fmtDate(f) : `${fmtDate(f)} – ${fmtDate(t)}`);
const scoreBar = (v: number) => (v >= 80 ? 'bg-emerald-500' : v >= 50 ? 'bg-amber-400' : 'bg-rose-500');
const rateBar = (v: number) => (v >= 90 ? 'bg-emerald-500' : v >= 80 ? 'bg-amber-400' : 'bg-rose-500');
const gradeBar = (v: number) => (v >= 4.5 ? 'bg-emerald-500' : v >= 3.5 ? 'bg-sky-500' : v >= 2.5 ? 'bg-amber-400' : 'bg-rose-500');

export function CeoDashboard() {
  const qc = useQueryClient();
  const [preset, setPreset] = useState<Preset>('30');
  const [range, setRange] = useState(() => rangeOf('30'));
  const [branchId, setBranchId] = useState('');
  const [classId, setClassId] = useState(''); // O'quv jarayoni bo'limi uchun
  const [detail, setDetail] = useState<DetailReq | null>(null);
  const [split, setSplit] = useState(false);
  const [asTable, setAsTable] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [restored, setRestored] = useState(false);

  // Filtrlar shu tab doirasida saqlanadi (boshqa sahifaga o'tib qaytganda)
  useEffect(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem(SKEY) || 'null');
      if (s) {
        setPreset(s.preset ?? '30');
        setRange(s.preset && s.preset !== 'custom' ? rangeOf(s.preset) : { from: s.from, to: s.to });
        setBranchId(s.branchId ?? '');
        setClassId(s.classId ?? '');
      }
    } catch { /* standart filtrlar */ }
    setRestored(true);
  }, []);
  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(SKEY, JSON.stringify({ preset, ...range, branchId, classId }));
    } catch { /* private rejim */ }
  }, [restored, preset, range, branchId, classId]);

  const params: DashParams = { from: range.from, to: range.to, branchId: branchId || undefined };
  const { data, isLoading, isError, isFetching, refetch, error } = useQuery({
    queryKey: ['dash-ceo', params],
    queryFn: () => dashboardApi.ceo(params),
    placeholderData: keepPreviousData,
    enabled: restored,
  });
  // Sinf tanlanganda faqat o'quv jarayoni qayta hisoblanadi (moliya qismi tegilmaydi)
  const academicQuery = useQuery({
    queryKey: ['dash-academic', params, classId],
    queryFn: () => dashboardApi.academic({ ...params, classId }),
    placeholderData: keepPreviousData,
    enabled: restored && !!classId,
  });
  // Filial almashsa, tanlangan sinf o'sha filialda bo'lmasa — tozalanadi
  useEffect(() => {
    if (classId && data && !data.classes.some((c) => c.id === classId)) setClassId('');
  }, [data, classId]);

  const open = useCallback((req: DetailReq) => setDetail(req), []);
  const close = useCallback(() => setDetail(null), []);

  const choose = (p: Exclude<Preset, 'custom'>) => {
    setPreset(p);
    setRange(rangeOf(p));
  };
  const setDate = (k: 'from' | 'to', v: string) => {
    if (!v) return;
    setPreset('custom');
    setRange((r) => {
      const n = { ...r, [k]: v };
      if (n.from > n.to) k === 'from' ? (n.to = v) : (n.from = v);
      return n;
    });
  };
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['dash-detail'] });
    refetch();
  };
  const doExport = async () => {
    setExporting(true);
    try {
      await dashboardApi.exportXlsx(params);
    } finally {
      setExporting(false);
    }
  };

  const errMsg = (error as any)?.response?.data?.message;

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">CEO Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Bugungi moliyaviy holat, davr pul oqimi, qabul ritmi va o&apos;quv jarayoni — bitta boshqaruv oynasida.</p>

      {/* ===== Filtrlar ===== */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="grid grid-cols-4 gap-2 lg:flex">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => choose(p.key)}
                aria-pressed={preset === p.key}
                className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition sm:px-4 ${preset === p.key ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-1">
            <label className="block min-w-0 lg:w-44">
              <span className="mb-1 block text-xs text-slate-500">Sanadan</span>
              <input type="date" value={range.from} max={range.to} onChange={(e) => setDate('from', e.target.value)} className={sel} />
            </label>
            <label className="block min-w-0 lg:w-44">
              <span className="mb-1 block text-xs text-slate-500">Sanagacha</span>
              <input type="date" value={range.to} min={range.from} max={todayStr()} onChange={(e) => setDate('to', e.target.value)} className={sel} />
            </label>
            <label className="col-span-2 block min-w-0 sm:col-span-1 lg:w-64">
              <span className="mb-1 block text-xs text-slate-500">Filiallar</span>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={sel}>
                <option value="">Barcha filiallar</option>
                {data?.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          </div>
        </div>
        {data && (
          <p className="mt-2.5 text-xs text-slate-500">
            Joriy davr: <span className="font-mono text-slate-700">{rangeLabel(data.period.from, data.period.to)}</span>
            <span className="mx-2 text-slate-300">·</span>
            Solishtirilmoqda: <span className="font-mono text-slate-700">{rangeLabel(data.period.prevFrom, data.period.prevTo)}</span>
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {data ? `Hisob: ${tashkentTime(data.generatedAt)} · Toshkent vaqti · barcha summalar so'mda` : 'Hisoblanmoqda…'}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={doExport} disabled={!data || exporting} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:px-4">
            <Download size={16} /> {exporting ? 'Tayyorlanmoqda…' : 'Excel'}
          </button>
          <button type="button" onClick={refresh} disabled={isFetching} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:px-4">
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} /> Ma&apos;lumotni yangilash
          </button>
        </div>
      </div>

      {isError && <div className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{errMsg || "Dashboard ma'lumotini yuklab bo'lmadi"}</div>}
      {isLoading && !data && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      )}

      {data && (
        <Body
          d={data}
          open={open}
          split={split}
          setSplit={setSplit}
          asTable={asTable}
          setAsTable={setAsTable}
          stale={isFetching}
          classId={classId}
          setClassId={setClassId}
          academic={classId ? academicQuery.data ?? null : data.academic}
          academicStale={academicQuery.isFetching}
        />
      )}

      <DetailDrawer req={detail} params={params} onClose={close} />
    </div>
  );
}

function Body({
  d,
  open,
  split,
  setSplit,
  asTable,
  setAsTable,
  stale,
  classId,
  setClassId,
  academic,
  academicStale,
}: {
  d: CeoDashboard;
  open: (r: DetailReq) => void;
  split: boolean;
  setSplit: (v: boolean) => void;
  asTable: boolean;
  setAsTable: (v: boolean) => void;
  stale: boolean;
  classId: string;
  setClassId: (v: string) => void;
  academic: CeoDashboard['academic'] | AcademicData | null;
  academicStale: boolean;
}) {
  const router = useRouter();
  const t = d.today;
  const r = d.result;
  const a = academic;
  const cls = !!classId;
  // Detal oynasi ham tanlangan sinf doirasida ochiladi
  const openA = (r: DetailReq) => open({ ...r, classId: classId || undefined });
  const branchName = d.branches.find((b) => b.id === d.branchId)?.name ?? 'barcha filiallar';
  const asOf = fmtDate(d.generatedAt.slice(0, 10));
  const runwayTone: Tone = t.runway.months === null ? 'white' : t.runway.months < 1 ? 'rose' : t.runway.months < 2 ? 'amber' : 'emerald';
  const bucketLabel = d.flow.bucketDays === 1 ? 'kunlik' : `${d.flow.bucketDays} kunlik guruhlar`;
  const ALERT = {
    danger: { box: 'border-rose-200 bg-rose-50', dot: 'bg-rose-500', title: 'text-rose-800', text: 'text-rose-700' },
    warning: { box: 'border-amber-200 bg-amber-50', dot: 'bg-amber-500', title: 'text-amber-900', text: 'text-amber-800' },
    info: { box: 'border-slate-200 bg-white', dot: 'bg-slate-400', title: 'text-slate-800', text: 'text-slate-600' },
  };

  return (
    <div className={`transition-opacity ${stale ? 'opacity-70' : ''}`}>
      {/* ===== Ogohlantirishlar ===== */}
      {d.alerts.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Ogohlantirishlar</h2>
          <div className="space-y-2">
            {d.alerts.map((al, i) => {
              const s = ALERT[al.level];
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => open({ kind: al.kind, key: al.key })}
                  className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition hover:shadow-sm ${s.box}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                  <span className="min-w-0 flex-1">
                    <b className={`font-semibold ${s.title}`}>{al.title}</b> <span className={s.text}>{al.text}</span>
                  </span>
                  <span className={`shrink-0 font-medium underline underline-offset-2 ${s.title}`}>Ochish</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== Bugungi holat ===== */}
      <Section title="Bugungi holat" note={`faqat filial bilan o'zgaradi · hisob: ${asOf}`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card title="Kassa qoldig'i" onClick={() => open({ kind: 'cash' })}>
            <Big value={fmt(t.cash.som)} unit="so'm" />
            <div className="mt-1 font-semibold text-slate-800">{fmt(t.cash.usd, 2)} <span className="text-sm font-normal text-slate-500">USD</span></div>
            {t.cash.somPending !== 0 && <div className="mt-1 text-sm text-slate-600">{fmtSigned(t.cash.somPending)} so&apos;m tasdiq kutmoqda</div>}
            <div className="mt-auto pt-1 text-sm text-slate-500">{t.cash.accounts} ta hisob · joriy holat: {asOf}</div>
          </Card>

          <Card tone="amber" title="Muddati o'tgan qarzdorlik" onClick={() => open({ kind: 'receivables' })}>
            <Big tone="amber" value={fmt(t.receivables.overdue)} unit="so'm" />
            <div className="mt-1 text-sm text-amber-800">{fmtPct(t.receivables.ratio)} · muddati kelgan summaga nisbatan</div>
            <div className="mt-1 text-sm text-amber-800">{t.receivables.students} ta o&apos;quvchi · {t.receivables.contracts} ta shartnoma</div>
            <div className="mt-auto pt-1 text-sm text-amber-700">Kelgusi oylar bilan jami qarz: {fmt(t.receivables.debt)}</div>
          </Card>

          <Card tone="rose" title="Ta'minotchilarga qarz" onClick={() => open({ kind: 'suppliers' })}>
            <Big tone="rose" value={fmt(t.suppliers.qarz)} unit="so'm" />
            <div className="mt-2 space-y-0.5">
              <Line label="avans:" value={fmt(t.suppliers.avans)} cls="text-rose-700" />
              <Line label="farq:" value={fmtSigned(t.suppliers.farq)} cls="font-semibold text-rose-700" />
            </div>
            <div className="mt-auto pt-1 text-sm text-rose-700">{t.suppliers.balances} ta balans · {asOf} holatiga</div>
          </Card>

          <Card tone="amber" title="Xarajat nazorati" onClick={() => open({ kind: 'expenses', key: 'OPEN' })}>
            <Big tone="amber" value={fmt(t.expenseControl.open)} unit="hujjat nazoratda" />
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm text-amber-900">
              {([
                ['UNPAID', "to'lovsiz", t.expenseControl.unpaid],
                ['PARTIAL', 'qisman', t.expenseControl.partial],
                ['EXCESS', 'ortiqcha', t.expenseControl.excess],
                ['INCOMPLETE', "noto'liq", t.expenseControl.incomplete],
              ] as const).map(([k, l, n]) => (
                <span
                  key={k}
                  role="link"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); open({ kind: 'expenses', key: k }); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); open({ kind: 'expenses', key: k }); } }}
                  className="cursor-pointer rounded hover:underline"
                >
                  {l}: <b>{n}</b>
                </span>
              ))}
            </div>
            <div className="mt-auto pt-1 text-sm text-amber-700">qarz {fmt(t.expenseControl.qarz)} · avans {fmt(t.expenseControl.avans)}</div>
          </Card>

          <Card title="Tashqi saldo" onClick={() => open({ kind: 'external' })}>
            <Big value={fmtSigned(t.external.saldo)} cls={t.external.saldo < 0 ? 'text-rose-600' : t.external.saldo > 0 ? 'text-emerald-700' : 'text-slate-900'} />
            <div className="mt-2 space-y-0.5">
              <Line label={<span className="text-emerald-700">bizga:</span>} value={fmt(t.external.bizga)} cls="text-emerald-700" />
              <Line label={<span className="text-rose-700">bizning:</span>} value={fmt(t.external.bizning)} cls="text-rose-700" />
            </div>
            <div className="mt-auto pt-1 text-sm text-slate-500">{t.external.count} ta kontragent · bugungi holat</div>
          </Card>

          <Card tone="sky" title="Filiallararo saldo" onClick={() => open({ kind: 'interbranch' })}>
            <Big tone="sky" value={fmtSigned(t.interbranch.saldo)} />
            <div className="mt-2 space-y-0.5">
              <Line label="haqdor:" value={fmt(t.interbranch.haqdor)} cls="text-sky-800" />
              <Line label="qarzdor:" value={fmt(t.interbranch.qarzdor)} cls="text-sky-800" />
            </div>
            <div className="mt-auto pt-1 text-sm text-sky-700">bugungi holat</div>
          </Card>

          <Card title={<span className="normal-case">Yozilgan o&apos;quvchilar · {t.enrolled.current.year}</span>} onClick={() => open({ kind: 'enrolled', key: t.enrolled.current.year })}>
            <Big value={fmt(t.enrolled.current.count)} />
            <div className="text-sm text-slate-600">{branchName}</div>
            <div className="mt-auto pt-1 text-sm text-slate-500">Faol, Band va Vaqtincha band shartnomalar. Har bir o&apos;quvchi bir marta.</div>
          </Card>

          <Card title={<span className="normal-case">Yozilgan o&apos;quvchilar · {t.enrolled.next.year}</span>} onClick={() => open({ kind: 'enrolled', key: t.enrolled.next.year })}>
            <Big value={fmt(t.enrolled.next.count)} />
            <div className="text-sm text-slate-600">kelgusi o&apos;quv yili</div>
            <div className="mt-auto pt-1 text-sm text-slate-500">Kelgusi yil sinflariga yozilgan, shartnomasi faol o&apos;quvchilar.</div>
          </Card>

          <Card tone={runwayTone} title="Kassa yetish muddati" onClick={() => open({ kind: 'cash' })}>
            <Big tone={runwayTone} value={t.runway.months === null ? '—' : String(t.runway.months).replace('.', ',')} unit="oy" />
            <div className="mt-1 text-sm text-slate-700">o&apos;rtacha oylik chiqim: <span className="font-mono">{fmt(t.runway.monthlyOut)}</span></div>
            <div className="mt-auto pt-1 text-sm text-slate-500">tasdiqlangan kassa {fmt(t.runway.cash)} so&apos;m · oxirgi 90 kun asosida</div>
          </Card>

          <Card title="O'quvchi boshiga tushum" onClick={() => open({ kind: 'income' })}>
            <Big value={fmt(t.perStudent.value)} unit="so'm" />
            <div className="mt-1 text-sm text-slate-600">{d.period.days} kun · {fmt(t.perStudent.students)} o&apos;quvchi</div>
            <div className="mt-auto pt-1 text-sm text-slate-500">davr tushumi ÷ joriy o&apos;quvchilar soni</div>
          </Card>

          <Card tone="amber" title="Ketganlar" onClick={() => open({ kind: 'left' })}>
            <Big tone="amber" value={fmt(t.left.count)} unit="o'quvchi" />
            <div className="mt-1 flex justify-between text-sm text-amber-800">
              <span>oldingi davr: {t.left.prev}</span>
              <span className={t.left.diff > 0 ? 'font-semibold text-rose-600' : t.left.diff < 0 ? 'font-semibold text-emerald-600' : ''}>{t.left.diff > 0 ? `+${t.left.diff}` : t.left.diff}</span>
            </div>
            <div className="mt-auto flex justify-between pt-1 text-sm text-amber-700">
              <span>{d.period.days} kun</span>
              <span className="font-medium underline underline-offset-2">Ro&apos;yxat</span>
            </div>
          </Card>

          <Card title="Sig'im" onClick={() => open({ kind: 'capacity' })}>
            <Big value={`${fmt(t.capacity.enrolled)} / ${fmt(t.capacity.capacity)}`} unit="o'rin" />
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${t.capacity.fill >= 100 ? 'bg-rose-500' : t.capacity.fill >= 90 ? 'bg-amber-400' : 'bg-blue-600'}`} style={{ width: `${Math.min(100, t.capacity.fill)}%` }} />
            </div>
            <div className="mt-2 text-sm text-slate-600">band: <b>{fmtPct(t.capacity.fill)}</b> · bo&apos;sh o&apos;rin {fmt(t.capacity.free)}</div>
            <div className="mt-auto pt-1 text-sm text-slate-500">{t.capacity.classes} ta sinf · {t.enrolled.current.year}</div>
          </Card>
        </div>
      </Section>

      {/* ===== Qarz muddati ===== */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold text-slate-800">Qarz muddati</h3>
          <span className="text-sm text-slate-500">bugungi holat · {asOf} gacha</span>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-slate-100">
          <div className="lg:pr-6">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium uppercase tracking-wide text-slate-600">Bizga qarzdorlar (o&apos;quvchilar)</span>
              <Link href="/debtors" className="text-sm font-medium text-blue-700 underline underline-offset-2">Qarzdorlar</Link>
            </div>
            <div className="mb-2 mt-1 text-slate-900"><b>{fmt(d.aging.receivables.total)}</b> <span className="text-sm text-slate-500">so&apos;m jami</span></div>
            <BarList
              rows={d.aging.receivables.buckets.map((x) => ({ id: x.key, label: x.label, value: x.amount, display: fmt(x.amount), sub: `${x.count} ta`, bar: 'bg-amber-500' }))}
              max={Math.max(1, d.aging.receivables.total)}
              onSelect={(x) => open({ kind: 'receivables', key: x.id })}
            />
          </div>
          <div className="lg:pl-6">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium uppercase tracking-wide text-slate-600">Bizning qarzimiz (ta&apos;minotchilar)</span>
              <Link href="/expenses" className="text-sm font-medium text-blue-700 underline underline-offset-2">Xarajatlar</Link>
            </div>
            <div className="mb-2 mt-1 text-slate-900"><b>{fmt(d.aging.suppliers.total)}</b> <span className="text-sm text-slate-500">so&apos;m jami · hujjat sanasidan</span></div>
            <BarList
              rows={d.aging.suppliers.buckets.map((x) => ({ id: x.key, label: x.label, value: x.amount, display: fmt(x.amount), sub: `${x.count} ta`, bar: 'bg-rose-500' }))}
              max={Math.max(1, d.aging.suppliers.total)}
              onSelect={(x) => open({ kind: 'supplier-aging', key: x.id })}
            />
          </div>
        </div>
      </div>

      {/* ===== Davr natijasi ===== */}
      <Section title="Davr natijasi" note="tanlangan sana va filiallar bo'yicha">
        {(r.pending.count > 0 || r.incompleteExpenses > 0) && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <b>Hisob to&apos;liq bo&apos;lmasligi mumkin:</b>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {r.pending.count > 0 && (
                <li>
                  {r.pending.count} ta tasdiq kutayotgan tushum ({fmt(r.pending.sum)} so&apos;m) davr tushumiga qo&apos;shilmadi.{' '}
                  <button type="button" onClick={() => open({ kind: 'pending' })} className="font-medium underline underline-offset-2">Ro&apos;yxat</button>
                </li>
              )}
              {r.incompleteExpenses > 0 && (
                <li>
                  {r.incompleteExpenses} ta xarajat hujjati summasiz (noto&apos;liq).{' '}
                  <button type="button" onClick={() => open({ kind: 'expenses', key: 'INCOMPLETE' })} className="font-medium underline underline-offset-2">Manbani tekshirish</button>
                </li>
              )}
            </ul>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card tone="blue" title="Pul oqimi natijasi" onClick={() => open({ kind: 'cashflow' })}>
            <Big tone="blue" value={fmtSigned(r.net.value)} cls={r.net.value < 0 ? 'text-rose-600' : undefined} />
            <div className="mt-1 text-sm text-blue-800">tushumga nisbati {fmtPct(r.net.ratio)}</div>
            <div className="mt-auto flex justify-between pt-1 text-sm text-blue-800"><span>oldingi: <span className="font-mono">{fmt(r.net.prev)}</span></span><Delta value={r.net.change} /></div>
          </Card>
          <Card tone="emerald" title="Tushum" onClick={() => open({ kind: 'income' })}>
            <Big tone="emerald" value={fmt(r.income.value)} />
            <div className="mt-1 text-sm text-emerald-700">{r.income.count} ta tasdiqlangan to&apos;lov</div>
            <div className="mt-auto flex justify-between pt-1 text-sm text-emerald-700"><span>oldingi: <span className="font-mono">{fmt(r.income.prev)}</span></span><Delta value={r.income.change} /></div>
          </Card>
          <Card tone="rose" title="Xarajat to'lovlari" onClick={() => open({ kind: 'expense-payments' })}>
            <Big tone="rose" value={fmt(r.expense.value)} />
            <div className="mt-1 text-sm text-rose-700">ta&apos;minotchilarga to&apos;langan</div>
            <div className="mt-auto flex justify-between pt-1 text-sm text-rose-700"><span>oldingi: <span className="font-mono">{fmt(r.expense.prev)}</span></span><Delta value={r.expense.change} goodUp={false} /></div>
          </Card>
          <Card tone="amber" title="Berilgan maosh" onClick={() => open({ kind: 'salaries' })}>
            <Big tone="amber" value={fmt(r.salary.value)} />
            <div className="mt-1 text-sm text-amber-800">so&apos;m + dollar (kursda)</div>
            <div className="mt-auto flex justify-between pt-1 text-sm text-amber-800"><span>oldingi: <span className="font-mono">{fmt(r.salary.prev)}</span></span><Delta value={r.salary.change} goodUp={false} /></div>
          </Card>
          <Card title="Yangi shartnomalar" onClick={() => open({ kind: 'new-contracts' })}>
            <Big value={fmt(r.newContracts.count)} unit="ta" />
            <div className="mt-1 text-sm text-slate-600">to&apos;lanadigan: <span className="font-mono">{fmt(r.newContracts.sum)}</span></div>
            <div className="mt-auto flex justify-between pt-1 text-sm text-slate-500"><span>oldingi: {r.newContracts.prev}</span><Delta value={r.newContracts.change} /></div>
          </Card>
          <Card title="Yangi murojaatlar" onClick={() => open({ kind: 'leads' })}>
            <Big value={fmt(r.leads.count)} unit="ta" />
            <div className="mt-1 text-sm text-slate-600">shartnomaga aylangan: {r.leads.converted} · {fmtPct(r.leads.conversion)}</div>
            <div className="mt-auto flex justify-between pt-1 text-sm text-slate-500"><span>oldingi: {r.leads.prev}</span><Delta value={r.leads.change} /></div>
          </Card>
          <Card title="Tasdiq kutayotgan tushum" onClick={() => open({ kind: 'pending' })}>
            <Big value={fmt(r.pending.sum)} unit="so'm" />
            <div className="mt-1 text-sm text-slate-600">{r.pending.count} ta bank/karta to&apos;lovi</div>
            <div className="mt-auto pt-1 text-sm text-slate-500">tasdiqlangach tushumga qo&apos;shiladi</div>
          </Card>
          <Card title="Kunlik o'rtacha tushum" onClick={() => open({ kind: 'income' })}>
            <Big value={fmt(r.income.value / Math.max(1, d.period.days))} unit="so'm" />
            <div className="mt-1 text-sm text-slate-600">{d.period.days} kun bo&apos;yicha</div>
            <div className="mt-auto pt-1 text-sm text-slate-500">oldingi: <span className="font-mono">{fmt(r.income.prev / Math.max(1, d.period.days))}</span></div>
          </Card>
        </div>
      </Section>

      {/* ===== Pul oqimi grafigi ===== */}
      <div className="mt-4">
        <Panel
          title="Pul oqimi"
          right={
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-emerald-500" />Tushum</span>
              {split ? (
                <>
                  <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-rose-500" />Xarajat</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-orange-400" />Maosh</span>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-rose-500" />Chiqim (xarajat + maosh)</span>
              )}
            </div>
          }
        >
          <div className="-mt-1 mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-slate-500">{bucketLabel} · summalar jamlangan · ustunni bosing — batafsil</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSplit(!split)} aria-pressed={split} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${split ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>Batafsil grafik</button>
              <button type="button" onClick={() => setAsTable(!asTable)} aria-pressed={asTable} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${asTable ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>Jadval</button>
            </div>
          </div>
          {asTable ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="py-2 pr-3">Davr</th><th className="py-2 pr-3 text-right">Tushum</th><th className="py-2 pr-3 text-right">Xarajat</th><th className="py-2 pr-3 text-right">Maosh</th><th className="py-2 text-right">Natija</th></tr>
                </thead>
                <tbody>
                  {d.flow.buckets.map((b) => (
                    <tr key={b.from} onClick={() => open({ kind: 'cashflow', from: b.from, to: b.to })} className="cursor-pointer border-t border-slate-100 hover:bg-blue-50/50">
                      <td className="py-2 pr-3 text-slate-700">{rangeLabel(b.from, b.to)}</td>
                      <td className="py-2 pr-3 text-right font-mono text-[13px] text-emerald-700">{fmt(b.income)}</td>
                      <td className="py-2 pr-3 text-right font-mono text-[13px] text-rose-700">{fmt(b.expense)}</td>
                      <td className="py-2 pr-3 text-right font-mono text-[13px] text-orange-700">{fmt(b.salary)}</td>
                      <td className={`py-2 text-right font-mono text-[13px] font-semibold ${b.net < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{fmtSigned(b.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ColumnChart
              height={220}
              items={d.flow.buckets.map((b) => ({ id: b.from, label: fmtDay(b.from), title: rangeLabel(b.from, b.to), values: { income: b.income, outflow: b.outflow, expense: b.expense, salary: b.salary } }))}
              series={
                split
                  ? [
                      { key: 'income', label: 'Tushum', cls: 'bg-emerald-500', on: 'bg-emerald-600' },
                      { key: 'expense', label: 'Xarajat', cls: 'bg-rose-500', on: 'bg-rose-600', stack: 'out' },
                      { key: 'salary', label: 'Maosh', cls: 'bg-orange-400', on: 'bg-orange-500', stack: 'out' },
                    ]
                  : [
                      { key: 'income', label: 'Tushum', cls: 'bg-emerald-500', on: 'bg-emerald-600' },
                      { key: 'outflow', label: 'Chiqim', cls: 'bg-rose-500', on: 'bg-rose-600' },
                    ]
              }
              format={fmt}
              axis={fmtShort}
              extra={(it) => {
                const net = (it.values.income ?? 0) - (it.values.outflow ?? 0);
                return [{ label: 'Natija', value: fmtSigned(net), cls: net < 0 ? 'text-rose-300' : 'text-emerald-300' }];
              }}
              onSelect={(it) => {
                const b = d.flow.buckets.find((x) => x.from === it.id)!;
                open({ kind: 'cashflow', from: b.from, to: b.to });
              }}
            />
          )}
        </Panel>
      </div>

      {/* ===== O'quv jarayoni ===== */}
      <Section
        title="O'quv jarayoni"
        note={`tanlangan davr, filial${cls ? ' va sinf' : ''} bo'yicha`}
        right={
          <label className="flex w-full items-center gap-2 sm:w-auto">
            <span className="shrink-0 text-sm text-slate-500">Sinf:</span>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className={`${sel} sm:w-60`}>
              <option value="">Barcha sinflar</option>
              {d.classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        }
      >
        {!a ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-72 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        ) : (
        <div className={`grid grid-cols-1 gap-4 transition-opacity xl:grid-cols-2 ${academicStale ? 'opacity-70' : ''}`}>
          {/* Davomat */}
          <Panel
            title="Davomat"
            right={<button type="button" onClick={() => openA({ kind: 'attendance-classes' })} className="text-sm font-medium text-blue-700 underline underline-offset-2">{cls ? "Barcha o'quvchilar" : 'Barcha sinflar'}</button>}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${a.attendance.rate >= 90 ? 'text-emerald-700' : a.attendance.rate >= 80 ? 'text-amber-700' : 'text-rose-700'}`}>{a.attendance.total ? fmtPct(a.attendance.rate) : '—'}</span>
                  <Delta value={a.attendance.change} suffix=" p.p." />
                </div>
                <div className="text-sm text-slate-500">oldingi davr: {a.attendance.prev ? fmtPct(a.attendance.prev) : '—'} · {fmt(a.attendance.total)} ta belgi</div>
                <div className="mt-3">
                  <Donut
                    center={fmt(a.attendance.total)}
                    sub="belgi"
                    format={(n) => fmt(n)}
                    segments={[
                      { key: 'present', label: 'Bor', value: a.attendance.present, stroke: 'stroke-emerald-500', dot: 'bg-emerald-500' },
                      { key: 'late', label: 'Kechikkan', value: a.attendance.late, stroke: 'stroke-amber-400', dot: 'bg-amber-400' },
                      { key: 'absent', label: 'Sababsiz', value: a.attendance.absent, stroke: 'stroke-rose-500', dot: 'bg-rose-500' },
                      { key: 'excused', label: 'Sababli', value: a.attendance.excused, stroke: 'stroke-sky-400', dot: 'bg-sky-400' },
                    ]}
                    onSelect={(s) => openA({ kind: s.key === 'present' ? 'attendance-classes' : 'attendance-day' })}
                  />
                </div>
              </div>
              <div className="min-w-0">
                <div className="mb-1 text-sm font-medium text-slate-600">Eng past davomatli {cls ? "o'quvchilar" : 'sinflar'}</div>
                <BarList
                  limit={6}
                  max={100}
                  rows={(cls ? a.attendance.students : a.attendance.classes).map((c) => ({ id: c.id, label: c.name, value: c.rate, display: fmtPct(c.rate), sub: `${c.absent} yo'q`, bar: rateBar(c.rate) }))}
                  onSelect={(c) => (cls ? router.push(`/students/${c.id}`) : openA({ kind: 'attendance-class', key: c.id }))}
                  empty="Bu davrda davomat belgilanmagan"
                />
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-2 text-sm font-medium text-slate-600">{a.attendance.trendSize === 1 ? 'Kunlik' : `${a.attendance.trendSize} kunlik`} davomat — ustunni bosing: kelmaganlar ro&apos;yxati</div>
              <ColumnChart
                height={150}
                items={a.attendance.trend.map((x) => ({ id: x.from, label: fmtDay(x.from), title: rangeLabel(x.from, x.to), values: { rate: x.rate, absent: x.absent } }))}
                series={[{ key: 'rate', label: 'Davomat %', cls: 'bg-emerald-400', on: 'bg-emerald-600' }]}
                format={(n) => fmtPct(n)}
                axis={() => '100%'}
                extra={(it) => [{ label: "Yo'q", value: String(it.values.absent ?? 0), cls: 'text-rose-300' }]}
                onSelect={(it) => {
                  const x = a.attendance.trend.find((y) => y.from === it.id)!;
                  openA({ kind: 'attendance-day', from: x.from, to: x.to });
                }}
                empty="Bu davrda davomat belgilanmagan"
              />
            </div>
          </Panel>

          {/* Baho */}
          <Panel
            title="Baholar"
            right={<button type="button" onClick={() => openA({ kind: 'grades-classes' })} className="text-sm font-medium text-blue-700 underline underline-offset-2">{cls ? "Barcha o'quvchilar" : 'Barcha sinflar'}</button>}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${a.grades.average >= 4.5 ? 'text-emerald-700' : a.grades.average >= 3.5 ? 'text-sky-700' : a.grades.average ? 'text-amber-700' : 'text-slate-400'}`}>{a.grades.count ? String(a.grades.average).replace('.', ',') : '—'}</span>
                  <span className="text-sm text-slate-500">/ 5</span>
                  <Delta value={a.grades.change} suffix=" ball" />
                </div>
                <div className="text-sm text-slate-500">oldingi davr: {a.grades.prev ? String(a.grades.prev).replace('.', ',') : '—'} · {fmt(a.grades.count)} ta baho</div>
                <div className="text-sm text-slate-500">a&apos;lo (5) {fmtPct(a.grades.excellentPct)} · 2 va past {fmtPct(a.grades.failPct)}</div>
                <div className="mt-3 text-sm font-medium text-slate-600">Taqsimot — bosing: o&apos;quvchilar</div>
                <BarList
                  rows={(['5', '4', '3', '2', '1'] as const).map((k) => ({
                    id: k,
                    label: `"${k}"`,
                    value: a.grades.distribution[k],
                    display: fmt(a.grades.distribution[k]),
                    sub: a.grades.count ? fmtPct(Math.round((a.grades.distribution[k] / a.grades.count) * 1000) / 10) : '0%',
                    bar: k === '5' ? 'bg-emerald-500' : k === '4' ? 'bg-sky-500' : k === '3' ? 'bg-amber-400' : 'bg-rose-500',
                  }))}
                  onSelect={(x) => openA({ kind: 'grades-value', key: x.id })}
                />
              </div>
              <div className="min-w-0 space-y-4">
                <div>
                  <div className="mb-1 text-sm font-medium text-slate-600">Fanlar bo&apos;yicha o&apos;rtacha</div>
                  <BarList
                    limit={5}
                    max={5}
                    rows={a.grades.subjects.map((s) => ({ id: s.id, label: s.name, value: s.average, display: String(s.average).replace('.', ','), sub: `${s.count}`, bar: gradeBar(s.average) }))}
                    onSelect={(s) => openA({ kind: 'grades-subject', key: s.id })}
                    empty="Bu davrda baho qo'yilmagan"
                  />
                </div>
                <div>
                  <div className="mb-1 text-sm font-medium text-slate-600">Eng past o&apos;rtachali {cls ? "o'quvchilar" : 'sinflar'}</div>
                  <BarList
                    limit={4}
                    max={5}
                    rows={(cls ? a.grades.students : a.grades.classes).map((c) => ({ id: c.id, label: c.name, value: c.average, display: String(c.average).replace('.', ','), sub: `${c.count}`, bar: gradeBar(c.average) }))}
                    onSelect={(c) => (cls ? router.push(`/students/${c.id}`) : openA({ kind: 'grades-class', key: c.id }))}
                    empty="—"
                  />
                </div>
              </div>
            </div>
          </Panel>

          {/* Coin */}
          <Panel
            title="Coin (rag'bat ballari)"
            right={<button type="button" onClick={() => openA({ kind: 'coins' })} className="text-sm font-medium text-blue-700 underline underline-offset-2">Barcha o&apos;quvchilar</button>}
          >
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: "Qo'shildi", v: `+${fmt(a.coins.earned)}`, c: 'text-emerald-700' },
                { l: 'Ayirildi', v: `−${fmt(a.coins.spent)}`, c: 'text-rose-600' },
                { l: 'Natija', v: fmtSigned(a.coins.net), c: 'text-slate-900' },
              ].map((k) => (
                <button key={k.l} type="button" onClick={() => openA({ kind: 'coins' })} className="rounded-xl bg-slate-50 px-3 py-2 text-left hover:bg-slate-100">
                  <div className="text-xs uppercase tracking-wide text-slate-500">{k.l}</div>
                  <div className={`text-xl font-bold ${k.c}`}>{k.v}</div>
                </button>
              ))}
            </div>
            <div className="mt-1 text-sm text-slate-500">{a.coins.records} ta yozuv · {a.coins.students} ta o&apos;quvchi</div>
            <div className="mt-3">
              <ColumnChart
                height={140}
                items={a.coins.trend.map((x) => ({ id: x.from, label: fmtDay(x.from), title: rangeLabel(x.from, x.to), values: { earned: x.earned, spent: x.spent } }))}
                series={[
                  { key: 'earned', label: "Qo'shildi", cls: 'bg-emerald-400', on: 'bg-emerald-600' },
                  { key: 'spent', label: 'Ayirildi', cls: 'bg-rose-400', on: 'bg-rose-600' },
                ]}
                format={(n) => fmt(n)}
                axis={(n) => fmt(n)}
                onSelect={(it) => {
                  const x = a.coins.trend.find((y) => y.from === it.id)!;
                  openA({ kind: 'coins', from: x.from, to: x.to });
                }}
                empty="Bu davrda coin berilmagan"
              />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1 text-sm font-medium text-slate-600">Eng ko&apos;p coin olganlar</div>
                {a.coins.topStudents.length ? (
                  <ol className="space-y-0.5">
                    {a.coins.topStudents.map((s, i) => (
                      <li key={s.id}>
                        <Link href={`/students/${s.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                          <span className="w-4 text-slate-400">{i + 1}</span>
                          <span className="min-w-0 flex-1 truncate text-slate-700">{s.name}<span className="text-slate-400"> · {s.className ?? '—'}</span></span>
                          <span className="font-semibold text-emerald-700">+{fmt(s.earned)}</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="py-4 text-center text-sm text-slate-400">—</div>
                )}
              </div>
              <div className="min-w-0">
                <div className="mb-1 text-sm font-medium text-slate-600">{cls ? "O'quvchilar (natija)" : 'Sinflar (natija)'}</div>
                <BarList
                  limit={5}
                  rows={
                    cls
                      ? a.coins.studentList.map((s) => ({ id: s.id, label: s.name, value: Math.max(0, s.net), display: fmtSigned(s.net), sub: `+${s.earned}`, bar: 'bg-amber-400' }))
                      : a.coins.classes.map((c) => ({ id: c.id, label: c.name, value: Math.max(0, c.net), display: fmtSigned(c.net), sub: `${c.students} o'q.`, bar: 'bg-amber-400' }))
                  }
                  onSelect={(c) => (cls ? router.push(`/students/${c.id}`) : openA({ kind: 'coins-class', key: c.id }))}
                  empty="—"
                />
              </div>
            </div>
          </Panel>

          {/* Ahloq */}
          <Panel
            title={<>Ahloqiy baholar <span className="text-sm font-normal text-slate-500">· {a.behavior.monthLabel}</span></>}
            right={<button type="button" onClick={() => openA({ kind: 'behavior', key: 'all' })} className="text-sm font-medium text-blue-700 underline underline-offset-2">Barcha o&apos;quvchilar</button>}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${a.behavior.average >= 80 ? 'text-emerald-700' : a.behavior.average >= 50 ? 'text-amber-700' : 'text-rose-700'}`}>{String(a.behavior.average).replace('.', ',')}</span>
                  <span className="text-sm text-slate-500">/ {a.behavior.limit} o&apos;rtacha</span>
                </div>
                <div className="text-sm text-slate-500">{a.behavior.students} o&apos;quvchi · {a.behavior.withDeductions} tasidan ball ayirilgan · jami −{fmt(a.behavior.totalDeducted)}</div>
                <div className="mt-3">
                  <Donut
                    center={a.behavior.students}
                    sub="o'quvchi"
                    segments={[
                      { key: 'full', label: '100 (toza)', value: a.behavior.buckets.full, stroke: 'stroke-emerald-500', dot: 'bg-emerald-500' },
                      { key: 'good', label: '80–99', value: a.behavior.buckets.good, stroke: 'stroke-emerald-300', dot: 'bg-emerald-300' },
                      { key: 'mid', label: '50–79', value: a.behavior.buckets.mid, stroke: 'stroke-amber-400', dot: 'bg-amber-400' },
                      { key: 'low', label: '0–49', value: a.behavior.buckets.low, stroke: 'stroke-rose-500', dot: 'bg-rose-500' },
                    ]}
                    onSelect={(s) => openA({ kind: 'behavior', key: s.key })}
                  />
                </div>
              </div>
              <div className="min-w-0 space-y-4">
                <div>
                  <div className="mb-1 text-sm font-medium text-slate-600">Oxirgi 6 oy — o&apos;rtacha ball</div>
                  <ColumnChart
                    height={120}
                    items={a.behavior.history.map((h) => ({ id: h.month, label: h.label.slice(0, 3), title: h.label, values: { average: h.average } }))}
                    series={[{ key: 'average', label: "O'rtacha", cls: 'bg-violet-400', on: 'bg-violet-600' }]}
                    format={(n) => String(n).replace('.', ',')}
                    axis={() => String(a.behavior.limit)}
                    onSelect={(it) => {
                      const [y, m] = it.id.split('-').map(Number);
                      const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
                      openA({ kind: 'behavior', key: 'all', from: `${it.id}-01`, to: last });
                    }}
                  />
                </div>
                <div>
                  <div className="mb-1 text-sm font-medium text-slate-600">Eng past ballli {cls ? "o'quvchilar" : 'sinflar'}</div>
                  <BarList
                    limit={4}
                    max={a.behavior.limit}
                    rows={
                      cls
                        ? a.behavior.studentList.map((s) => ({ id: s.id, label: s.name, value: s.remaining, display: String(s.remaining), sub: s.deducted ? `−${s.deducted}` : '', bar: scoreBar(s.remaining) }))
                        : a.behavior.classes.map((c) => ({ id: c.id, label: c.name, value: c.average, display: String(c.average).replace('.', ','), sub: `−${c.deducted}`, bar: scoreBar(c.average) }))
                    }
                    onSelect={(c) => (cls ? router.push(`/students/${c.id}`) : openA({ kind: 'behavior-class', key: c.id }))}
                    empty="—"
                  />
                </div>
              </div>
            </div>
          </Panel>
        </div>
        )}
      </Section>
    </div>
  );
}
