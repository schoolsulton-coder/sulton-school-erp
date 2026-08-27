'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Search, ChevronRight, ShieldCheck, X } from 'lucide-react';
import { registersApi, cur, type RegisterItem, type ReconcileResp } from '@/lib/registers';
import { crmApi } from '@/lib/crm';

const sel = 'rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand';

export default function AccountsPage() {
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [branchId, setBranchId] = useState('');
  const [active, setActive] = useState('');
  const [showRec, setShowRec] = useState(false);

  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data, isLoading } = useQuery({
    queryKey: ['registers', type, branchId, active],
    queryFn: () => registersApi.list({ type: type || undefined, branchId: branchId || undefined, active: active || undefined }),
  });

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.registers ?? []).filter((r) => !s || r.name.toLowerCase().includes(s) || (r.branch ?? '').toLowerCase().includes(s));
  }, [data, q]);

  return (
    <div className="p-6">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Hisoblar — Balans</h1>
        <button onClick={() => setShowRec(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"><ShieldCheck size={15} /> Balans tekshiruvi</button>
      </div>
      <p className="mb-5 text-sm text-slate-500">Har kassa va bank hisobi bo&apos;yicha hozirgi qoldiq</p>
      {showRec && <ReconcileModal onClose={() => setShowRec(false)} />}

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nomi, filial..." className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand" />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} className={sel}>
          <option value="">Barcha turlar</option>
          <option value="ACCOUNT">Moliya kassa</option>
          <option value="FLOW">Pul oqimi kassa</option>
        </select>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={sel}>
          <option value="">Barcha filiallar</option>
          {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={active} onChange={(e) => setActive(e.target.value)} className={sel}>
          <option value="">Hammasi</option>
          <option value="true">Faol</option>
          <option value="false">Nofaol</option>
        </select>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Kpi label="Jami so'm" value={cur(data?.totals.somBalance ?? 0, 'SOM')} cls="text-emerald-600" />
        <Kpi label="Jami dollar" value={cur(data?.totals.usdBalance ?? 0, 'USD')} cls="text-sky-600" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3">Hisob</th>
                <th className="px-5 py-3">Filial</th>
                <th className="px-5 py-3">Kassa turi</th>
                <th className="px-5 py-3 text-right">Qoldiq</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">Yuklanmoqda…</td></tr>
              ) : rows.length ? rows.map((r: RegisterItem) => (
                <tr key={`${r.type}-${r.id}`} className="border-b border-slate-50 last:border-0 hover:bg-brand/[0.03]">
                  <td className="px-5 py-3.5">
                    <Link href={`/accounts/${r.type}/${r.id}`} className="font-semibold text-slate-800 hover:text-brand">{r.name}</Link>
                    <div className="text-xs text-slate-400">{r.type === 'FLOW' ? 'Pul oqimi' : 'Moliya'}{!r.active ? ' · nofaol' : ''}</div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{r.branch ?? '—'}</td>
                  <td className="px-5 py-3.5"><span className="text-slate-600">{r.kassaTuri ?? '—'}</span> <span className="text-[11px] text-slate-400">{r.currency}</span></td>
                  <td className={`px-5 py-3.5 text-right font-bold ${r.storedBalance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>{cur(r.storedBalance, r.currency)}</td>
                  <td className="px-5 py-3.5 text-right"><Link href={`/accounts/${r.type}/${r.id}`} className="text-slate-300 hover:text-brand"><ChevronRight size={16} /></Link></td>
                </tr>
              )) : (<tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">Kassa topilmadi</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${cls ?? 'text-slate-800'}`}>{value}</div>
    </div>
  );
}

function ReconcileModal({ onClose }: { onClose: () => void }) {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['reconcile-check'],
    queryFn: () => registersApi.reconcile('check'),
  });
  const run = useMutation({
    mutationFn: (mode: 'adopt' | 'apply') => registersApi.reconcile(mode),
    onSuccess: () => refetch(),
  });
  const d: ReconcileResp | undefined = data;
  const rows = d?.drifted ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="mt-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-800">Balans tekshiruvi</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <p className="text-sm text-slate-500">To&apos;g&apos;ri balans = boshlang&apos;ich qoldiq + barcha harakatlar. Farq (drift) bo&apos;lsa quyida ko&apos;rinadi.</p>
          {isLoading ? (
            <div className="py-8 text-center text-slate-400">Tekshirilmoqda…</div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-400">Tekshirildi</div><div className="text-xl font-bold text-slate-800">{d?.checked ?? 0}</div></div>
                <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-400">Farqli</div><div className={`text-xl font-bold ${(d?.driftedCount ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{d?.driftedCount ?? 0}</div></div>
                <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-400">Jami farq</div><div className="text-xl font-bold text-slate-800">{cur(d?.totalDriftAbs ?? 0, 'SOM')}</div></div>
              </div>

              {rows.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase text-slate-400">
                      <tr><th className="px-3 py-2">Hisob</th><th className="px-3 py-2 text-right">Boshlang&apos;ich</th><th className="px-3 py-2 text-right">Harakatlar</th><th className="px-3 py-2 text-right">Saqlangan</th><th className="px-3 py-2 text-right">To&apos;g&apos;ri</th><th className="px-3 py-2 text-right">Farq</th></tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={`${r.type}-${r.id}`} className="border-t border-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-700">{r.name}</td>
                          <td className="px-3 py-2 text-right text-slate-500">{cur(r.opening, r.currency)}</td>
                          <td className="px-3 py-2 text-right text-slate-500">{cur(r.net, r.currency)}</td>
                          <td className="px-3 py-2 text-right text-slate-500">{cur(r.stored, r.currency)}</td>
                          <td className="px-3 py-2 text-right font-medium text-slate-700">{cur(r.correct, r.currency)}</td>
                          <td className={`px-3 py-2 text-right font-bold ${r.drift < 0 ? 'text-rose-600' : 'text-amber-600'}`}>{cur(r.drift, r.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl bg-emerald-50 py-6 text-center text-sm font-medium text-emerald-700">Barcha balanslar mos ✓</div>
              )}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            onClick={() => { if (confirm("Hozirgi balanslar to'g'ri deb qabul qilinsinmi? (boshlang'ich qoldiq shunga moslanadi, balans o'zgarmaydi)")) run.mutate('adopt'); }}
            disabled={run.isPending || isFetching}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >Hozirgi balansni asos qil</button>
          <button
            onClick={() => { if (confirm('Balanslar boshlang\'ich + harakatlar bo\'yicha to\'g\'rilansinmi? Saqlangan qiymatlar o\'zgaradi.')) run.mutate('apply'); }}
            disabled={run.isPending || isFetching || rows.length === 0}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >Balanslarni to&apos;g&apos;rilash</button>
        </div>
      </div>
    </div>
  );
}
