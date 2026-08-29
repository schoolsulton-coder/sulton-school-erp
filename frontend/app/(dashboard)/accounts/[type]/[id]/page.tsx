'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { registersApi, cur, type RegisterMovement } from '@/lib/registers';
import { financeApi } from '@/lib/finance';

const errMsg = (e: any) =>
  e?.response?.data?.message || e?.response?.data?.error || "O'chirishda xatolik yuz berdi";

const inp = 'rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand';
const fmtTime = (iso: string) => new Date(iso).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function RegisterDetailPage() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  // Sukut bo'yicha hamma harakat ko'rinadi (maktab to'lovi, oldi-berdi, investitsiya, maosh...)
  const [tab, setTab] = useState<'confirmed' | 'pending' | 'all'>('all');

  const { data: d, isLoading } = useQuery({
    queryKey: ['register-detail', type, id, from, to],
    queryFn: () => registersApi.detail(type, id, { from: from || undefined, to: to || undefined }),
  });

  const qc = useQueryClient();
  const router = useRouter();
  const canDelete = type === 'ACCOUNT'; // Moliya kassa — o'chirish/tahrir shu yerda

  const delTx = useMutation({
    mutationFn: (refId: string) => financeApi.deleteTransaction(refId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['register-detail', type, id] });
      qc.invalidateQueries({ queryKey: ['registers'] });
    },
    onError: (e) => alert(errMsg(e)),
  });

  const delAccount = useMutation({
    mutationFn: () => financeApi.deleteAccount(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registers'] });
      router.push('/accounts');
    },
    onError: (e) => alert(errMsg(e)),
  });

  const ccy = d?.register.currency ?? 'SOM';
  const inMax = useMemo(() => Math.max(1, ...(d?.incomeBreakdown.map((x) => x.total) ?? [1])), [d]);
  const outMax = useMemo(() => Math.max(1, ...(d?.expenseBreakdown.map((x) => x.total) ?? [1])), [d]);
  const inSum = d?.incomeBreakdown.reduce((s, x) => s + x.total, 0) ?? 0;
  const outSum = d?.expenseBreakdown.reduce((s, x) => s + x.total, 0) ?? 0;

  const txs = useMemo(() => {
    if (!d) return [];
    return d.transactions.filter((t) => tab === 'all' || (tab === 'confirmed' ? t.confirmed : !t.confirmed));
  }, [d, tab]);

  if (isLoading || !d) return <div className="p-8 text-slate-400">Yuklanmoqda…</div>;
  const b = d.balances;

  return (
    <div className="p-6">
      <Link href="/accounts" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand"><ArrowLeft size={15} /> Hisoblar</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{d.register.name}</h1>
          <p className="mb-5 text-sm text-slate-500">{d.register.kassaTuri ?? 'Moliya'}{d.register.branch ? ` · ${d.register.branch}` : ''} · {ccy}</p>
        </div>
        {canDelete && (
          <button
            onClick={() => { if (confirm(`"${d.register.name}" hisobini butunlay o'chirasizmi?`)) delAccount.mutate(); }}
            disabled={delAccount.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-500 hover:bg-rose-50 disabled:opacity-50"
          >
            <Trash2 size={15} /> Hisobni o&apos;chirish
          </button>
        )}
      </div>

      {/* Kartalar */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Jami kirim</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">+ {cur(b.allIn, ccy)}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-rose-600">Jami chiqim</div>
          <div className="mt-1 text-2xl font-bold text-rose-700">− {cur(b.allOut, ccy)}</div>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-sky-600">Joriy balans</div>
          <div className="mt-1 text-2xl font-bold text-slate-800">{cur(b.liveBalance, ccy)}</div>
          {(b.pendingIn > 0 || b.pendingOut > 0) && <div className="text-[11px] text-amber-600">Kutilmoqda: +{cur(b.pendingIn, ccy)} / −{cur(b.pendingOut, ccy)}</div>}
        </div>
      </div>

      {/* Davr balansi */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-1 text-sm font-semibold text-slate-700">Davr balansi</div>
        <p className="mb-3 text-xs text-slate-400">Tanlangan davr ichidagi kirim − chiqim. Joriy balansdan mustaqil.</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">Dan:</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inp} />
          <span className="text-sm text-slate-500">Gacha:</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inp} />
          {(from || to) && <button onClick={() => { setFrom(''); setTo(''); }} className="px-2 py-1 text-sm text-slate-500 hover:text-slate-700">Tozalash</button>}
        </div>
        {(from || to) && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Mini label="Ochilish" value={cur(b.opening, ccy)} />
            <Mini label="Kirim" value={`+ ${cur(b.totalIn, ccy)}`} cls="text-emerald-600" />
            <Mini label="Chiqim" value={`− ${cur(b.totalOut, ccy)}`} cls="text-rose-600" />
            <Mini label="Yopilish" value={cur(b.closing, ccy)} cls="font-bold" />
          </div>
        )}
      </div>

      {/* Manbalar */}
      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Breakdown title="Kirim manbalari" items={d.incomeBreakdown} max={inMax} sum={inSum} ccy={ccy} color="bg-emerald-400" />
        <Breakdown title="Chiqim manbalari" items={d.expenseBreakdown} max={outMax} sum={outSum} ccy={ccy} color="bg-rose-400" />
      </div>

      {/* Tranzaksiyalar */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-700">Tranzaksiyalar ({txs.length})</h3>
          <div className="flex gap-1 text-xs">
            {([['all', 'Hammasi'], ['confirmed', 'Tasdiqlangan'], ['pending', 'Tasdiqlanmagan']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-2.5 py-1 font-medium ${tab === k ? 'bg-brand text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-y border-slate-100 bg-slate-50/60 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-2.5">Sana</th>
                <th className="px-5 py-2.5">Manba</th>
                <th className="px-5 py-2.5">Izoh</th>
                <th className="px-5 py-2.5 text-right">Kirim</th>
                <th className="px-5 py-2.5 text-right">Chiqim</th>
                <th className="px-5 py-2.5 text-right">Balans</th>
                <th className="px-5 py-2.5 text-center">Status</th>
                <th className="px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t: RegisterMovement, i: number) => (
                <tr key={t.refType + t.refId + i} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3 text-xs text-slate-500">{fmtTime(t.date)}</td>
                  <td className="px-5 py-3"><span className="font-medium text-brand">{t.label}</span></td>
                  <td className="max-w-[280px] truncate px-5 py-3 text-slate-600" title={`${t.counterparty}${t.note ? ' · ' + t.note : ''}`}>{t.counterparty !== '—' ? t.counterparty : ''}{t.note ? ` · ${t.note}` : ''}</td>
                  <td className="px-5 py-3 text-right font-medium text-emerald-600">{t.direction === 'IN' ? cur(t.amount, t.currency) : '—'}</td>
                  <td className="px-5 py-3 text-right font-medium text-rose-600">{t.direction === 'OUT' ? cur(t.amount, t.currency) : '—'}</td>
                  <td className="px-5 py-3 text-right text-slate-500">{cur(t.runningBalance, ccy)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${t.confirmed ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{t.confirmed ? 'Tasdiqlangan' : 'Kutilmoqda'}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {canDelete && t.refType === 'Transaction' && (
                      <button
                        onClick={() => {
                          const msg = t.label === "Ichki o'tkazma"
                            ? "Ichki o'tkazma o'chirilsinmi? Ikkala kassada ham balans qaytariladi."
                            : "Tranzaksiya o'chirilsinmi? Kassa balansi qaytariladi.";
                          if (confirm(msg)) delTx.mutate(t.refId);
                        }}
                        disabled={delTx.isPending}
                        title="O'chirish"
                        className="rounded p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!txs.length && <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400">Tranzaksiya yo&apos;q</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-[11px] uppercase text-slate-400">{label}</div>
      <div className={`text-sm text-slate-700 ${cls ?? ''}`}>{value}</div>
    </div>
  );
}

function Breakdown({ title, items, max, sum, ccy, color }: { title: string; items: { label: string; count: number; total: number }[]; max: number; sum: number; ccy: string; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      <div className="space-y-2.5">
        {items.map((x) => (
          <div key={x.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{x.label} <span className="text-xs text-slate-400">({x.count})</span></span>
              <span className="font-medium text-slate-700">{cur(x.total, ccy)} <span className="text-xs text-slate-400">{sum > 0 ? Math.round((x.total / sum) * 100) : 0}%</span></span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${(x.total / max) * 100}%` }} /></div>
          </div>
        ))}
        {!items.length && <p className="py-3 text-center text-sm text-slate-400">Ma&apos;lumot yo&apos;q</p>}
      </div>
    </div>
  );
}
