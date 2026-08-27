'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ChevronRight, ShieldCheck, X, Plus, Pencil, Trash2 } from 'lucide-react';
import { registersApi, cur, type RegisterItem, type ReconcileResp } from '@/lib/registers';
import { flowAccountsApi, type FlowAccountInput } from '@/lib/flow-accounts';
import { financeApi } from '@/lib/finance';
import { crmApi } from '@/lib/crm';
import { usersApi } from '@/lib/users';

const KASSA_TURLARI = ['Naqd', 'Karta', 'Bank'];
const CARD_TYPES = ['Uzcard', 'Humo', 'Visa', 'Mastercard'];
const sel = 'rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand';
const inp = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand';

const fmt = (n: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n || 0);
const money = (n: number, currency = 'SOM') => (currency === 'USD' ? `$${fmt(n)}` : fmt(n));
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('ru-RU') : '—');
const errMsg = (e: any) => e?.response?.data?.message || e?.response?.data?.error || 'Xatolik yuz berdi';

export default function AccountsPage() {
  const [q, setQ] = useState('');
  const [branchId, setBranchId] = useState('');
  const [kassaTuri, setKassaTuri] = useState('');
  const [currency, setCurrency] = useState('');
  const [active, setActive] = useState('');
  const [mine, setMine] = useState(false);
  const [asOf, setAsOf] = useState('');
  const [showRec, setShowRec] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editFlow, setEditFlow] = useState<RegisterItem | null>(null);
  const [editMoliya, setEditMoliya] = useState<RegisterItem | null>(null);

  const qc = useQueryClient();
  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });
  const { data, isLoading } = useQuery({
    queryKey: ['registers', branchId, kassaTuri, currency, active, mine, asOf],
    queryFn: () =>
      registersApi.list({
        branchId: branchId || undefined,
        kassaTuri: kassaTuri || undefined,
        currency: currency || undefined,
        active: active || undefined,
        mine: mine ? 'true' : undefined,
        asOf: asOf || undefined,
      }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['registers'] });

  const del = useMutation({
    mutationFn: (r: RegisterItem) => (r.type === 'FLOW' ? flowAccountsApi.remove(r.id) : financeApi.deleteAccount(r.id)),
    onSuccess: refresh,
    onError: (e) => alert(errMsg(e)),
  });

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.registers ?? []).filter(
      (r) =>
        !s ||
        r.name.toLowerCase().includes(s) ||
        (r.branch ?? '').toLowerCase().includes(s) ||
        (r.bankName ?? '').toLowerCase().includes(s) ||
        (r.cardNumber ?? '').toLowerCase().includes(s) ||
        (r.cardHolder ?? '').toLowerCase().includes(s),
    );
  }, [data, q]);

  const kpi = useMemo(() => {
    const acc = { somStored: 0, usdStored: 0, somPendingOut: 0, somPendingNet: 0, usdPendingOut: 0, usdPendingNet: 0 };
    for (const r of data?.registers ?? []) {
      if (r.currency === 'USD') {
        acc.usdStored += r.storedBalance;
        acc.usdPendingOut += r.pendingOut;
        acc.usdPendingNet += r.pendingNet;
      } else {
        acc.somStored += r.storedBalance;
        acc.somPendingOut += r.pendingOut;
        acc.somPendingNet += r.pendingNet;
      }
    }
    return acc;
  }, [data]);

  return (
    <div className="p-6">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Hisoblar — Balans</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowRec(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"><ShieldCheck size={15} /> Balans tekshiruvi</button>
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"><Plus size={16} /> Yangi hisob</button>
        </div>
      </div>
      <p className="mb-5 text-sm text-slate-500">Har kassa va bank hisobi bo&apos;yicha hozirgi qoldiq</p>

      {showRec && <ReconcileModal onClose={() => setShowRec(false)} />}
      {creating && <FlowAccountModal branches={branches ?? []} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); refresh(); }} />}
      {editFlow && <FlowAccountModal edit={editFlow} branches={branches ?? []} onClose={() => setEditFlow(null)} onSaved={() => { setEditFlow(null); refresh(); }} />}
      {editMoliya && <MoliyaModal edit={editMoliya} onClose={() => setEditMoliya(null)} onSaved={() => { setEditMoliya(null); refresh(); }} />}

      {/* Filtrlar */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nomi, bank, karta, filial..." className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand" />
          </div>
          <label className="flex items-center gap-1.5 text-sm text-slate-500">Sana:
            <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className={sel} />
          </label>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={sel}>
            <option value="">Barcha filiallar</option>
            {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={kassaTuri} onChange={(e) => setKassaTuri(e.target.value)} className={sel}>
            <option value="">Kassa turi</option>
            {KASSA_TURLARI.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={sel}>
            <option value="">Valyuta</option>
            <option value="SOM">So&apos;m</option>
            <option value="USD">Dollar</option>
          </select>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1">
            {([['true', 'Faol'], ['false', 'Nofaol'], ['', 'Hammasi']] as const).map(([k, l]) => (
              <button key={l} onClick={() => setActive(k)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${active === k ? 'bg-brand text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{l}</button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-sm text-slate-500">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="rounded border-slate-300" /> Faqat mening kassalarim
          </label>
        </div>
      </div>

      {/* KPI */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Jami so'm (joriy qoldiq)" value={money(kpi.somStored)} tone="emerald" />
        <Kpi label="Bank/terminal pending" value={money(kpi.somPendingNet)} tone="amber"
          sub={`Chiqim: ${money(kpi.somPendingOut)} · Sof: ${money(kpi.somPendingNet)}`} />
        <Kpi label="Jami dollar (joriy qoldiq)" value={money(kpi.usdStored, 'USD')} tone="sky" />
        <Kpi label="Bank/terminal pending $" value={money(kpi.usdPendingNet, 'USD')} tone="slate"
          sub={`Chiqim: ${money(kpi.usdPendingOut, 'USD')} · Sof: ${money(kpi.usdPendingNet, 'USD')}`} />
      </div>

      {/* Jadval */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3">Hisob</th>
                <th className="px-5 py-3">Filial</th>
                <th className="px-5 py-3">Kassa turi</th>
                <th className="px-5 py-3 text-right">Joriy qoldiq</th>
                <th className="px-5 py-3 text-right">Bank/terminal pending</th>
                <th className="px-5 py-3 text-right">Tasdiq ta&apos;siri</th>
                <th className="px-5 py-3">Oxirgi harakat</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400">Yuklanmoqda…</td></tr>
              ) : rows.length ? rows.map((r) => (
                <tr key={`${r.type}-${r.id}`} className="border-b border-slate-50 last:border-0 hover:bg-brand/[0.03]">
                  <td className="px-5 py-3.5">
                    <Link href={`/accounts/${r.type}/${r.id}`} className="font-semibold text-slate-800 hover:text-brand">{r.name}</Link>
                    <div className="text-xs text-slate-400">{subtitle(r)}</div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{r.branch ?? '—'}</td>
                  <td className="px-5 py-3.5"><span className="text-slate-600">{r.kassaTuri ?? '—'}</span> <span className="text-[11px] text-slate-400">{r.currency === 'USD' ? 'USD' : 'UZS'}</span>{!r.active && <span className="ml-1 text-[11px] text-rose-400">· nofaol</span>}</td>
                  <td className={`px-5 py-3.5 text-right font-bold ${r.storedBalance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>{money(r.storedBalance, r.currency)}</td>
                  <td className="px-5 py-3.5 text-right">{r.pendingNet ? <span className="font-medium text-amber-600">{money(r.pendingNet, r.currency)}</span> : <span className="text-slate-300">—</span>}</td>
                  <td className="px-5 py-3.5 text-right">{r.drift ? <span className="font-medium text-rose-500" title="Saqlangan balans harakatlar yig'indisiga mos emas">{money(r.drift, r.currency)}</span> : <span className="text-slate-300">—</span>}</td>
                  <td className="px-5 py-3.5 text-slate-500">{fmtDate(r.lastMovement)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => (r.type === 'FLOW' ? setEditFlow(r) : setEditMoliya(r))} title="Tahrirlash" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand"><Pencil size={15} /></button>
                      <button onClick={() => { if (confirm(`"${r.name}" hisobini o'chirasizmi?`)) del.mutate(r); }} disabled={del.isPending} title="O'chirish" className="rounded p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"><Trash2 size={15} /></button>
                      <Link href={`/accounts/${r.type}/${r.id}`} className="rounded p-1.5 text-slate-300 hover:text-brand"><ChevronRight size={16} /></Link>
                    </div>
                  </td>
                </tr>
              )) : (<tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">Kassa topilmadi</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function subtitle(r: RegisterItem) {
  const parts: string[] = [];
  if (r.cardNumber) parts.push(r.cardNumber);
  if (r.cardHolder) parts.push(r.cardHolder);
  if (r.cardType) parts.push(r.cardType);
  if (r.bankName) parts.push(r.bankName);
  if (!parts.length) parts.push(r.type === 'FLOW' ? 'Pul oqimi' : 'Moliya');
  return parts.join(' · ');
}

const TONE: Record<string, { box: string; label: string; value: string }> = {
  emerald: { box: 'border-emerald-200 bg-emerald-50/50', label: 'text-emerald-600', value: 'text-emerald-700' },
  amber: { box: 'border-amber-200 bg-amber-50/60', label: 'text-amber-600', value: 'text-amber-700' },
  sky: { box: 'border-sky-200 bg-sky-50/50', label: 'text-sky-600', value: 'text-sky-700' },
  slate: { box: 'border-slate-200 bg-white', label: 'text-slate-400', value: 'text-slate-700' },
};
function Kpi({ label, value, tone, sub }: { label: string; value: string; tone: keyof typeof TONE; sub?: string }) {
  const c = TONE[tone];
  return (
    <div className={`rounded-xl border p-4 ${c.box}`}>
      <div className={`text-xs font-semibold uppercase tracking-wide ${c.label}`}>{label}</div>
      <div className={`mt-1 text-2xl font-bold ${c.value}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

/* ===== Yangi/tahrirlash hisob (FlowAccount) ===== */
function FlowAccountModal({ edit, branches, onClose, onSaved }: { edit?: RegisterItem; branches: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!edit;
  const { data: users } = useQuery({ queryKey: ['users-list'], queryFn: () => usersApi.list() });
  const [f, setF] = useState<FlowAccountInput>({
    name: edit?.name ?? '',
    branchId: edit?.branchId ?? '',
    kassaTuri: edit?.kassaTuri ?? 'Naqd',
    currency: edit?.currency ?? 'SOM',
    userId: edit?.userId ?? '',
    bankName: edit?.bankName ?? '',
    cardNumber: edit?.cardNumber ?? '',
    cardHolder: edit?.cardHolder ?? '',
    cardType: edit?.cardType ?? '',
    active: edit ? edit.active : true,
  });
  const [err, setErr] = useState('');
  const set = (patch: Partial<FlowAccountInput>) => setF((s) => ({ ...s, ...patch }));

  const save = useMutation({
    mutationFn: () => {
      const payload: FlowAccountInput = {
        name: f.name.trim(),
        branchId: f.branchId || undefined,
        kassaTuri: f.kassaTuri,
        currency: f.currency,
        userId: f.userId || '',
        bankName: f.bankName || '',
        cardNumber: f.cardNumber || '',
        cardHolder: f.cardHolder || '',
        cardType: f.cardType || '',
        ...(isEdit ? { active: f.active } : {}),
      };
      return isEdit ? flowAccountsApi.update(edit!.id, payload) : flowAccountsApi.create(payload);
    },
    onSuccess: onSaved,
    onError: (e: any) => setErr(errMsg(e)),
  });

  const showCard = f.kassaTuri === 'Karta' || f.kassaTuri === 'Bank';

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="mt-8 w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-800">{isEdit ? 'Hisobni tahrirlash' : 'Yangi hisob'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="space-y-3 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Nomi *</label>
            <input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="masalan: Maktab tushumi (BANK)" className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Filial</label>
              <select value={f.branchId} onChange={(e) => set({ branchId: e.target.value })} className={inp}>
                <option value="">—</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Egasi</label>
              <select value={f.userId} onChange={(e) => set({ userId: e.target.value })} className={inp}>
                <option value="">—</option>
                {users?.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Kassa turi</label>
              <select value={f.kassaTuri} onChange={(e) => set({ kassaTuri: e.target.value })} className={inp}>
                {KASSA_TURLARI.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Valyuta</label>
              <select value={f.currency} onChange={(e) => set({ currency: e.target.value })} className={inp} disabled={isEdit}>
                <option value="SOM">So&apos;m</option>
                <option value="USD">Dollar</option>
              </select>
            </div>
          </div>

          {showCard && (
            <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bank / karta (ixtiyoriy)</div>
              <input value={f.bankName} onChange={(e) => set({ bankName: e.target.value })} placeholder="Bank nomi/filiali (ATB KAPITALBANK ...)" className={inp} />
              <div className="grid grid-cols-2 gap-3">
                <input value={f.cardNumber} onChange={(e) => set({ cardNumber: e.target.value })} placeholder="Karta raqami" className={inp} />
                <select value={f.cardType} onChange={(e) => set({ cardType: e.target.value })} className={inp}>
                  <option value="">Karta turi</option>
                  {CARD_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <input value={f.cardHolder} onChange={(e) => set({ cardHolder: e.target.value })} placeholder="Karta egasi (F.I.Sh)" className={inp} />
            </div>
          )}

          {isEdit && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={f.active} onChange={(e) => set({ active: e.target.checked })} className="rounded border-slate-300" /> Faol
            </label>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          {err && <span className="mr-auto text-sm text-rose-500">{err}</span>}
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Bekor</button>
          <button onClick={() => { setErr(''); if (!f.name.trim()) return setErr('Nomi kerak'); save.mutate(); }} disabled={save.isPending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">Saqlash</button>
        </div>
      </div>
    </div>
  );
}

/* ===== Moliya kassa tahrirlash (nom + boshlang'ich qoldiq) ===== */
function MoliyaModal({ edit, onClose, onSaved }: { edit: RegisterItem; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(edit.name);
  const [opening, setOpening] = useState('');
  const [err, setErr] = useState('');
  const save = useMutation({
    mutationFn: () => financeApi.updateAccount(edit.id, { name: name.trim(), ...(opening !== '' ? { openingBalance: Number(opening) } : {}) }),
    onSuccess: onSaved,
    onError: (e: any) => setErr(errMsg(e)),
  });
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="mt-10 w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-800">Moliya kassani tahrirlash</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="space-y-3 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Nomi *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Boshlang&apos;ich qoldiq (o&apos;zgartirish uchun)</label>
            <input type="number" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder={`Hozirgi qoldiq: ${fmt(edit.storedBalance)}`} className={inp} />
            <p className="mt-1 text-[11px] text-slate-400">Bo&apos;sh qoldirsangiz — o&apos;zgarmaydi. O&apos;zgartirilsa, joriy qoldiq ham shu farqqa suriladi.</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          {err && <span className="mr-auto text-sm text-rose-500">{err}</span>}
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Bekor</button>
          <button onClick={() => { setErr(''); if (!name.trim()) return setErr('Nomi kerak'); save.mutate(); }} disabled={save.isPending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">Saqlash</button>
        </div>
      </div>
    </div>
  );
}

/* ===== Balans tekshiruvi ===== */
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
