'use client';

import { Fragment, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Trash2, CheckCircle2, SlidersHorizontal, Calendar,
  ChevronDown, ChevronRight, X,
} from 'lucide-react';
import { paymentsApi, money, type PaymentListRow, type PaymentFilters } from '@/lib/payments';
import { crmApi } from '@/lib/crm';
import { financeApi } from '@/lib/finance';
import { NewPaymentModal } from '@/components/payment-form';
import { PaymentDetailModal } from '@/components/payment-detail';

const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const UZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const isCash = (m?: string | null) => /naqd|nal/i.test(m ?? '');
const localDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
function dateHead(key: string) {
  const d = new Date(key + 'T00:00:00');
  const isToday = d.toDateString() === new Date().toDateString();
  return {
    label: `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`,
    weekday: WEEKDAYS[d.getDay()].toUpperCase(),
    isToday,
  };
}
const initials = (last?: string, first?: string) =>
  `${(last ?? '').charAt(0)}${(first ?? '').charAt(0)}`.toUpperCase() || '—';

export default function PaymentsPage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<PaymentFilters>({});
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const notify = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(''), 2500); };

  const { data } = useQuery({
    queryKey: ['payments', filters, search],
    queryFn: () => paymentsApi.list({ ...filters, search: search || undefined }),
  });
  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data: years } = useQuery({ queryKey: ['academic-years'], queryFn: crmApi.academicYears });
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: financeApi.accounts });
  const [draft, setDraft] = useState<PaymentFilters>({});
  const setD = (patch: Partial<PaymentFilters>) => setDraft((d) => ({ ...d, ...patch }));

  const remove = useMutation({
    mutationFn: (id: string) => paymentsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments'] }); notify('To‘lov o‘chirildi'); },
    onError: (e: any) => notify(e?.response?.data?.message ?? 'Xatolik'),
  });

  const rows = data?.data ?? [];
  const stats = data?.stats;
  const types = useMemo(() => Array.from(new Set(rows.map((r) => r.type).filter(Boolean) as string[])), [rows]);
  const draftCount = Object.values(draft).filter(Boolean).length;

  // Tanlanganlardan tasdiqlanadiganlar (bank/karta, tasdiqlanmagan)
  // Tasdiq kutayotgan (naqd emas, tasdiqlanmagan) to'lovlar
  const pending = useMemo(
    () => rows.filter((p) => !p.confirmedAt && !isCash(p.method)),
    [rows],
  );
  const confirmable = useMemo(
    () => pending.filter((p) => selected.has(p.id)),
    [pending, selected],
  );
  const allSelected = pending.length > 0 && pending.every((p) => selected.has(p.id));
  const toggleAll = () =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (allSelected) pending.forEach((p) => n.delete(p.id));
      else pending.forEach((p) => n.add(p.id));
      return n;
    });

  const bulkConfirm = useMutation({
    mutationFn: async () => { await Promise.all(confirmable.map((p) => paymentsApi.confirm(p.id))); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments'] }); setSelected(new Set()); notify(`${confirmable.length} ta tasdiqlandi`); },
  });
  // Qatordan to'g'ridan-to'g'ri bitta to'lovni tasdiqlash
  const confirmOne = useMutation({
    mutationFn: (id: string) => paymentsApi.confirm(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments'] }); notify("To'lov tasdiqlandi"); },
  });

  const groups = useMemo(() => {
    const g: Record<string, PaymentListRow[]> = {};
    for (const p of rows) (g[localDay(p.paidAt)] ??= []).push(p);
    return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  const set = (patch: Partial<PaymentFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const activeChips: { key: keyof PaymentFilters; label: string }[] = [];
  if (filters.method) activeChips.push({ key: 'method', label: filters.method });
  if (filters.confirmed) activeChips.push({ key: 'confirmed', label: filters.confirmed === 'true' ? 'Tasdiqlangan' : 'Tasdiqlanmagan' });
  if (filters.branchId) activeChips.push({ key: 'branchId', label: branches?.find((b) => b.id === filters.branchId)?.name ?? 'Filial' });
  if (filters.from) activeChips.push({ key: 'from', label: `${filters.from} dan` });
  if (filters.to) activeChips.push({ key: 'to', label: `${filters.to} gacha` });

  const toggleSel = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleCollapse = (k: string) => setCollapsed((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  return (
    <div className="min-h-full bg-slate-50/60 p-6">
      {/* Sarlavha */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Maktab to‘lovlari</h1>
          <p className="text-sm text-slate-400">{stats?.count ?? 0} ta to‘lov topildi</p>
        </div>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark">
          <Plus size={18} /> To‘lov qo‘shish
        </button>
      </div>

      {/* Stat kartochkalar */}
      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Stat tone="blue" label="Jami (filtr)" value={money(stats?.total ?? 0)} />
        <Stat tone="emerald" label="Naqd" value={money(stats?.naqd ?? 0)} />
        <Stat tone="amber" label="Karta / terminal" value={money(stats?.karta ?? 0)} />
        <Stat tone="slate" label="Bank" value={money(stats?.bank ?? 0)} />
        <Stat tone="rose" label="Tasdiqlanmagan" value={`${stats?.unconfirmedCount ?? 0} ta`} sub={money(stats?.unconfirmedSum ?? 0)} />
      </div>

      {/* Qidiruv + Filterlar + Tasdiqlash */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="O‘quvchi, shartnoma №, RRN, izoh..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
        </div>
        <button onClick={() => { setDraft(filters); setShowFilters(true); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
          <SlidersHorizontal size={16} /> Filterlar
          {activeChips.length > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-xs text-white">{activeChips.length}</span>}
        </button>
        <button
          onClick={() => confirmable.length && bulkConfirm.mutate()}
          disabled={confirmable.length === 0 || bulkConfirm.isPending}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          <CheckCircle2 size={16} /> Tasdiqlash{confirmable.length > 0 ? ` (${confirmable.length})` : ''}
        </button>
      </div>

      {/* Faol filtr chiplari */}
      {activeChips.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {activeChips.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
              {c.label}
              <button onClick={() => set({ [c.key]: undefined } as Partial<PaymentFilters>)} className="text-slate-400 hover:text-slate-600"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}

      {/* Kunlik reyestr paneli */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-white text-brand shadow-sm"><Calendar size={18} /></div>
          <div>
            <div className="text-sm font-semibold text-slate-700">Kunlik reyestr</div>
            <div className="text-xs text-slate-400">Kun bo‘yicha jami barcha qatorlardan hisoblanadi.</div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Sana bo‘yicha guruhlangan
        </span>
      </div>

      {/* Jadval */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={pending.length === 0} title="Tasdiq kutayotganlarni belgilash" className="h-4 w-4 rounded border-slate-300 disabled:opacity-40" />
                </th>
                <th className="px-4 py-3">Sana</th>
                <th className="px-4 py-3">O‘quvchi</th>
                <th className="px-4 py-3 text-right">Summa</th>
                <th className="px-4 py-3">Filial · Yil</th>
                <th className="px-4 py-3">Kassa / Type</th>
                <th className="px-4 py-3">Terminal / Tasdiq</th>
                <th className="px-4 py-3">Hisob</th>
                <th className="px-4 py-3">Izoh</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {groups.map(([key, list]) => {
                const h = dateHead(key);
                const isCol = collapsed.has(key);
                const dayTotal = list.reduce((s, p) => s + (p.isRefund ? -p.amount : p.amount), 0);
                return (
                  <Fragment key={key}>
                    <tr className="border-l-2 border-brand bg-slate-50/60">
                      <td className="px-4 py-2.5">
                        <button onClick={() => toggleCollapse(key)} className="text-slate-400 hover:text-slate-600">
                          {isCol ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                      <td colSpan={5} className="py-2.5 pr-4 text-sm">
                        <span className="font-bold text-slate-700">{h.label}</span>
                        <span className="ml-1.5 text-slate-400">{h.isToday ? 'BUGUN' : h.weekday}</span>
                        <span className="ml-3 rounded-lg bg-slate-200/70 px-2 py-0.5 text-xs font-semibold text-slate-500">Kun bo‘yicha {list.length} ta</span>
                        <span className="ml-3 text-xs font-medium text-emerald-600">✓ To‘liq shu sahifada</span>
                      </td>
                      <td colSpan={4} className="px-4 py-2.5 text-right">
                        <span className="text-xs uppercase tracking-wide text-slate-400">Kun tushumi</span>{' '}
                        <span className="font-bold text-emerald-600">{money(dayTotal)}</span>
                      </td>
                    </tr>
                    {!isCol && list.map((p) => (
                      <tr key={p.id} onClick={() => setDetailId(p.id)} className="cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-brand/[0.03]">
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSel(p.id)} className="h-4 w-4 rounded border-slate-300" />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                          <div>{h.label}</div>
                          <div className="text-xs text-slate-400">{fmtTime(p.paidAt)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand">{initials(p.student?.lastName, p.student?.firstName)}</div>
                            <div>
                              <div className="font-medium text-slate-700">{p.student ? `${p.student.lastName} ${p.student.firstName}` : '—'}</div>
                              <div className="text-xs text-slate-400">{p.contract?.number ?? ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${p.isRefund ? 'text-rose-600' : 'text-emerald-600'}`}>{p.isRefund ? '− ' : ''}{money(p.amount)}</td>
                        <td className="px-4 py-3">
                          <div className="text-slate-600">{p.student?.branch?.name ?? '—'}</div>
                          <div className="text-xs text-slate-400">
                            {[p.student?.class?.academicYear, UZ_MONTHS[new Date(p.paidAt).getMonth()]].filter(Boolean).join(' · ')}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{p.method}</span>
                          {p.type && <div className="mt-0.5 text-xs text-slate-400">{p.type}</div>}
                        </td>
                        <td className="px-4 py-3">
                          {p.cardLast4 && <div className="text-[11px] uppercase text-slate-400">RRN: <span className="text-slate-500">{p.cardLast4}</span></div>}
                          <div className="mt-0.5">
                            {p.confirmedAt ? (
                              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600 ring-1 ring-emerald-200">Tasdiqlangan</span>
                            ) : isCash(p.method) ? (
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400">Naqd</span>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); confirmOne.mutate(p.id); }}
                                disabled={confirmOne.isPending}
                                title="To'lovni tasdiqlash"
                                className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600 ring-1 ring-amber-200 transition hover:bg-emerald-50 hover:text-emerald-600 hover:ring-emerald-200 disabled:opacity-50"
                              >
                                <CheckCircle2 size={12} /> Tasdiqlash
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="max-w-[160px] truncate px-4 py-3 text-xs text-slate-500" title={p.account?.name ?? ''}>{p.account?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{p.note ?? '—'}</td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => { if (window.confirm("To'lovni o'chirasizmi?")) remove.mutate(p.id); }} className="grid h-7 w-7 place-items-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500">
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
              {!rows.length && <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">To‘lov topilmadi</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filtr paneli (drawer) */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowFilters(false)}>
          <div onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Filterlar</h2>
                <p className="text-xs text-slate-400">{draftCount} ta faol</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setDraft({})} className="text-sm font-medium text-rose-500 hover:underline">Tozalash</button>
                <button onClick={() => setShowFilters(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
              </div>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <FilterField label="Filial">
                <select value={draft.branchId ?? ''} onChange={(e) => setD({ branchId: e.target.value || undefined })} className={fsel}>
                  <option value="">Barcha filiallar</option>
                  {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </FilterField>
              <FilterField label="O‘quv yili">
                <select value={draft.academicYear ?? ''} onChange={(e) => setD({ academicYear: e.target.value || undefined })} className={fsel}>
                  <option value="">Barcha yillar</option>
                  {years?.map((y) => <option key={y.id} value={y.name}>{y.name}</option>)}
                </select>
              </FilterField>
              <FilterField label="Kassa">
                <select value={draft.method ?? ''} onChange={(e) => setD({ method: e.target.value || undefined })} className={fsel}>
                  <option value="">Barcha kassa</option><option value="Naqd">Naqd</option><option value="Bank">Bank</option><option value="Karta">Karta</option>
                </select>
              </FilterField>
              <FilterField label="To‘lov turi">
                <select value={draft.type ?? ''} onChange={(e) => setD({ type: e.target.value || undefined })} className={fsel}>
                  <option value="">Barcha turlar</option>
                  {types.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </FilterField>
              <FilterField label="Hisob">
                <select value={draft.accountId ?? ''} onChange={(e) => setD({ accountId: e.target.value || undefined })} className={fsel}>
                  <option value="">Barcha hisoblar</option>
                  {accounts?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </FilterField>
              <FilterField label="Tasdiq holati">
                <select value={draft.confirmed ?? ''} onChange={(e) => setD({ confirmed: e.target.value || undefined })} className={fsel}>
                  <option value="">Barcha</option><option value="true">Tasdiqlangan</option><option value="false">Tasdiqlanmagan</option>
                </select>
              </FilterField>
              <div className="grid grid-cols-2 gap-3">
                <FilterField label="Sanadan"><input type="date" value={draft.from ?? ''} onChange={(e) => setD({ from: e.target.value || undefined })} className={fsel} /></FilterField>
                <FilterField label="Sanagacha"><input type="date" value={draft.to ?? ''} onChange={(e) => setD({ to: e.target.value || undefined })} className={fsel} /></FilterField>
              </div>
            </div>
            <div className="border-t border-slate-100 p-4">
              <button onClick={() => { setFilters(draft); setShowFilters(false); }} className="w-full rounded-xl bg-brand py-3 font-semibold text-white shadow-sm transition hover:bg-brand-dark">Qo‘llash</button>
            </div>
          </div>
        </div>
      )}

      {showNew && <NewPaymentModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); notify('✓ To‘lov saqlandi'); }} />}
      {detailId && <PaymentDetailModal id={detailId} onClose={() => setDetailId(null)} onChanged={() => { qc.invalidateQueries({ queryKey: ['payments'] }); notify('✓ Saqlandi'); }} />}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-white shadow-xl">
          <CheckCircle2 size={16} className="text-emerald-400" /> {toast}
        </div>
      )}
    </div>
  );
}

const TONES: Record<string, string> = {
  blue: 'border-blue-100 bg-blue-50/50 text-slate-800',
  emerald: 'border-emerald-200 bg-emerald-50/60 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50/60 text-amber-700',
  slate: 'border-slate-200 bg-white text-slate-800',
  rose: 'border-rose-200 bg-rose-50/60 text-rose-600',
};
function Stat({ tone, label, value, sub }: { tone: keyof typeof TONES; label: string; value: string; sub?: string }) {
  return (
    <div className={`rounded-2xl border px-5 py-4 ${TONES[tone]}`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
      {sub && <div className="text-xs opacity-70">{sub}</div>}
    </div>
  );
}

const fsel = 'w-full rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-2 text-sm text-slate-600 outline-none focus:border-brand focus:bg-white';
function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}
