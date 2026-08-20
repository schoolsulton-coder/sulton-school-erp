'use client';

import { som, MONTHS, type EntryRow, type TransferRow } from '@/lib/counterparties';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('uz-UZ');
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

function TuriBadge({ dir }: { dir: 'IN' | 'OUT' }) {
  return dir === 'IN' ? (
    <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">Kirim</span>
  ) : (
    <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">Chiqim</span>
  );
}

const signed = (dir: 'IN' | 'OUT', amount: number) => (dir === 'IN' ? `+${som(amount)}` : `−${som(amount)}`);

/* ===== Yozuvlar jadvali (Oldi-berdilar / Investitsiyalar) ===== */
export function EntriesTable({ rows, isInvestor, loading, onRow }: { rows: EntryRow[]; isInvestor: boolean; loading: boolean; onRow?: (id: string) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3">Sana</th>
              <th className="px-5 py-3">Turi</th>
              <th className="px-5 py-3">{isInvestor ? 'Investor' : 'Oldi-berdichi'}</th>
              <th className="px-5 py-3">{isInvestor ? 'Investitsiya turi / Izoh' : 'Sabab / Izoh'}</th>
              <th className="px-5 py-3">Filial / Hisob</th>
              <th className="px-5 py-3 text-right">Summa</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">Yuklanmoqda...</td></tr>
            ) : rows.length ? (
              rows.map((e) => (
                <tr key={e.id} onClick={() => onRow?.(e.id)} className="cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-brand/[0.03]">
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <div className="text-slate-600">{fmtDate(e.date)}</div>
                    <div className="text-xs text-slate-400">{fmtTime(e.date)}</div>
                  </td>
                  <td className="px-5 py-3.5"><TuriBadge dir={e.direction} /></td>
                  <td className="px-5 py-3.5 font-semibold text-slate-800">{e.counterparty}</td>
                  <td className="px-5 py-3.5">
                    {isInvestor ? (
                      <>
                        {e.investType && <div className="text-slate-700">{e.investType}</div>}
                        {e.academicYear && <div className="text-xs text-slate-400">O&apos;quv yili: {e.academicYear}</div>}
                        {e.periodMonth && e.periodYear && (
                          <div className="text-xs font-medium text-sky-600">
                            {MONTHS[e.periodMonth - 1]} {e.periodYear} uchun
                          </div>
                        )}
                        {e.note && <div className="text-xs text-slate-400">{e.note}</div>}
                      </>
                    ) : (
                      <>
                        {e.sabab && <div className="text-slate-700">{e.sabab}</div>}
                        {e.note && <div className="text-xs text-slate-400">{e.note}</div>}
                      </>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-slate-600">{e.branch ?? '—'}</div>
                    {e.hisob && <div className="text-xs text-slate-400">{e.hisob}</div>}
                  </td>
                  <td className={`whitespace-nowrap px-5 py-3.5 text-right font-semibold ${e.direction === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {signed(e.direction, e.amount)}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Yozuv yo&apos;q</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===== Transferlar jadvali ===== */
export function TransfersTable({ rows, loading, onRow }: { rows: TransferRow[]; loading: boolean; onRow?: (pairId: string) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3">Sana</th>
              <th className="px-5 py-3">Jo&apos;natuvchi</th>
              <th className="px-5 py-3 text-center">→</th>
              <th className="px-5 py-3">Qabul qiluvchi</th>
              <th className="px-5 py-3">Izoh</th>
              <th className="px-5 py-3 text-right">Summa</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">Yuklanmoqda...</td></tr>
            ) : rows.length ? (
              rows.map((t) => (
                <tr key={t.id} onClick={() => onRow?.(t.id)} className={`cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-brand/[0.03] ${t.nosoz ? 'bg-rose-50/40' : ''}`}>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <div className="text-slate-600">{fmtDate(t.date)}</div>
                    <div className="text-xs text-slate-400">{fmtTime(t.date)}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-slate-800">{t.from ?? <span className="text-rose-500">— yo&apos;q</span>}</div>
                    {t.fromHisob && <div className="text-xs text-slate-400">{t.fromHisob}</div>}
                  </td>
                  <td className="px-5 py-3.5 text-center text-slate-300">→</td>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-slate-800">{t.to ?? <span className="text-rose-500">— yo&apos;q</span>}</div>
                    {t.toHisob && <div className="text-xs text-slate-400">{t.toHisob}</div>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{t.note ?? '—'}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-slate-800">{som(t.amount)}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Transfer yo&apos;q</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
