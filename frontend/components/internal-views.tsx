'use client';

import { som } from '@/lib/counterparties';
import { usd, type ItRow } from '@/lib/internal-transfers';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('uz-UZ');
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
const numFmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0));

function Status({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600 ring-1 ring-emerald-100">Tasdiqlandi</span>
  ) : (
    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600 ring-1 ring-amber-100">Kutilmoqda</span>
  );
}

const DateCell = ({ iso }: { iso: string }) => (
  <td className="whitespace-nowrap px-5 py-3.5">
    <div className="text-slate-600">{fmtDate(iso)}</div>
    <div className="text-xs text-slate-400">{fmtTime(iso)}</div>
  </td>
);

function Wrap({ children, cols, rows, loading }: { children: React.ReactNode; cols: number; rows: number; loading: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {children}
          {loading && <tbody><tr><td colSpan={cols} className="px-5 py-10 text-center text-slate-400">Yuklanmoqda...</td></tr></tbody>}
          {!loading && rows === 0 && <tbody><tr><td colSpan={cols} className="px-5 py-12 text-center text-slate-400">Yozuv yo&apos;q</td></tr></tbody>}
        </table>
      </div>
    </div>
  );
}

const thCls = 'border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400';
const trCls = 'cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-brand/[0.03]';

/* ===== So'm / Dollar ===== */
export function TransferTable({ rows, dollar, loading, onRow }: { rows: ItRow[]; dollar: boolean; loading: boolean; onRow?: (id: string) => void }) {
  return (
    <Wrap cols={7} rows={rows.length} loading={loading}>
      <thead>
        <tr className={thCls}>
          <th className="px-5 py-3">Sana</th>
          <th className="px-5 py-3">Filial</th>
          <th className="px-5 py-3">Jo&apos;natuvchi</th>
          <th className="px-5 py-3 text-center">→</th>
          <th className="px-5 py-3">Qabul qiluvchi</th>
          <th className="px-5 py-3">Kassa</th>
          <th className="px-5 py-3 text-right">Summa</th>
          <th className="px-5 py-3 text-center">Holati</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} onClick={() => onRow?.(r.id)} className={trCls}>
            <DateCell iso={r.date} />
            <td className="px-5 py-3.5 text-slate-500">{r.branch ?? '—'}</td>
            <td className="px-5 py-3.5 font-medium text-slate-800">{r.from ?? '—'}</td>
            <td className="px-5 py-3.5 text-center text-slate-300">→</td>
            <td className="px-5 py-3.5 font-medium text-slate-800">{r.to ?? '—'}</td>
            <td className="px-5 py-3.5 text-slate-500">{r.kassaTuri ?? '—'}</td>
            <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-slate-800">
              {dollar ? usd(r.dollarAmount) : som(r.somAmount)}
              {dollar && r.dollarRate > 0 && <div className="text-xs font-normal text-slate-400">@ {numFmt(r.dollarRate)}</div>}
            </td>
            <td className="px-5 py-3.5 text-center"><Status ok={r.confirmed} /></td>
          </tr>
        ))}
      </tbody>
    </Wrap>
  );
}

/* ===== Valyuta (ayirboshlash) ===== */
export function ValyutaTable({ rows, loading, onRow }: { rows: ItRow[]; loading: boolean; onRow?: (id: string) => void }) {
  return (
    <Wrap cols={6} rows={rows.length} loading={loading}>
      <thead>
        <tr className={thCls}>
          <th className="px-5 py-3">Sana</th>
          <th className="px-5 py-3">Filial</th>
          <th className="px-5 py-3 text-right">Dollar</th>
          <th className="px-5 py-3 text-right">Kurs</th>
          <th className="px-5 py-3 text-right">So&apos;m</th>
          <th className="px-5 py-3">Hisoblar</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} onClick={() => onRow?.(r.id)} className={trCls}>
            <DateCell iso={r.date} />
            <td className="px-5 py-3.5 font-medium text-slate-700">{r.branch ?? '—'}</td>
            <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-emerald-600">+{usd(r.dollarAmount)}</td>
            <td className="whitespace-nowrap px-5 py-3.5 text-right text-slate-500">{numFmt(r.dollarRate)}</td>
            <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-rose-600">−{som(r.somAmount)}</td>
            <td className="px-5 py-3.5 text-xs text-slate-500">
              <div><span className="text-slate-400">$</span> {r.to ?? '—'}</div>
              <div><span className="text-slate-400">so&apos;m</span> {r.from ?? '—'}</div>
            </td>
          </tr>
        ))}
      </tbody>
    </Wrap>
  );
}

/* ===== Pul (yo'qotish bilan) ===== */
export function PulTable({ rows, loading, onRow }: { rows: ItRow[]; loading: boolean; onRow?: (id: string) => void }) {
  return (
    <Wrap cols={7} rows={rows.length} loading={loading}>
      <thead>
        <tr className={thCls}>
          <th className="px-5 py-3">Sana</th>
          <th className="px-5 py-3">Filial</th>
          <th className="px-5 py-3">Valyuta</th>
          <th className="px-5 py-3">Manba</th>
          <th className="px-5 py-3 text-center">→</th>
          <th className="px-5 py-3">Maqsad</th>
          <th className="px-5 py-3 text-right">Summa</th>
          <th className="px-5 py-3 text-right">Yo&apos;qotish</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} onClick={() => onRow?.(r.id)} className={trCls}>
            <DateCell iso={r.date} />
            <td className="px-5 py-3.5 text-slate-500">{r.branch ?? '—'}</td>
            <td className="px-5 py-3.5 text-slate-500">So&apos;m</td>
            <td className="px-5 py-3.5 font-medium text-slate-800">{r.from ?? '—'}</td>
            <td className="px-5 py-3.5 text-center text-slate-300">→</td>
            <td className="px-5 py-3.5 font-medium text-slate-800">{r.to ?? '—'}</td>
            <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-slate-800">{som(r.somAmount)}</td>
            <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-rose-500">
              {r.loss > 0 ? `−${som(r.loss)}` : <span className="text-slate-300">—</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </Wrap>
  );
}
