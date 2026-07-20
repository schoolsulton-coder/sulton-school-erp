'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Search, ArrowRight } from 'lucide-react';
import { paymentsApi, money, KASSA_TYPES } from '@/lib/payments';
import { financeApi } from '@/lib/finance';
import { crmApi } from '@/lib/crm';

const fmtNum = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0));
// Local sana (UTC emas) — UZ da tunda kun surilib ketmasligi uchun
const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayStr = () => localDate(new Date());
const dayOffset = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localDate(d);
};

export function NewPaymentModal({
  studentId: initStudentId,
  onClose,
  onSaved,
}: {
  studentId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [studentId, setStudentId] = useState(initStudentId ?? '');
  const [studentLabel, setStudentLabel] = useState('');
  const [q, setQ] = useState('');
  const [payYear, setPayYear] = useState('');

  const [date, setDate] = useState(todayStr());
  const [isRefund, setIsRefund] = useState(false);
  const [method, setMethod] = useState('Naqd');
  const [accountId, setAccountId] = useState('');
  const [type, setType] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [warn, setWarn] = useState('');

  const [perMonth, setPerMonth] = useState<Record<string, number>>({});
  const [quick, setQuick] = useState('');
  const [freeAmount, setFreeAmount] = useState('');

  const { data: years } = useQuery({ queryKey: ['academic-years'], queryFn: crmApi.academicYears });
  useEffect(() => { if (!payYear && years?.length) setPayYear(years[0].name); }, [years, payYear]);
  const { data: hits } = useQuery({
    queryKey: ['student-search', payYear, q],
    queryFn: () => crmApi.searchStudents(q, payYear),
    enabled: !initStudentId && !studentId && !!payYear,
  });
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: financeApi.accounts });
  const { data: schedule } = useQuery({
    queryKey: ['pay-schedule', studentId],
    queryFn: () => paymentsApi.schedule(studentId),
    enabled: !!studentId,
  });

  const debt = schedule?.debt ?? 0;
  const installments = schedule?.installments ?? [];
  const hasContract = !!schedule?.contract;

  // Refund yoki shartnomasiz — erkin summa; aks holda oylarga taqsimlash
  const useFree = !hasContract || isRefund;
  const total = useFree
    ? Number(freeAmount) || 0
    : installments.reduce((s, i) => s + (perMonth[i.id] || 0), 0);
  const newRemaining = isRefund ? debt + total : Math.max(0, debt - total);

  const st = schedule?.student;
  const headerName = (st ? `${st.lastName} ${st.firstName}` : studentLabel) || 'O‘quvchi tanlang';
  const headerSub = [
    schedule?.contract?.number,
    st?.class ? `${st.class.name}${st.class.language ? ` (${st.class.language})` : ''}` : null,
  ].filter(Boolean).join(' · ');

  // Hisobni kassa turiga qarab ajratamiz (nom bo'yicha)
  const accKind = (name?: string) => {
    const s = (name ?? '').toLowerCase();
    if (s.includes('bank')) return 'Bank';
    if (['karta', 'terminal', 'plastik', 'click', 'payme', 'uzcard', 'humo'].some((k) => s.includes(k))) return 'Karta';
    return 'Naqd';
  };
  const filteredAccounts = (accounts ?? []).filter((a) => accKind(a.name) === method);
  // Kassa turi o'zgarsa: bitta hisob bo'lsa — avtomat tanlaymiz; aks holda mos kelmaydiganini tozalaymiz
  useEffect(() => {
    if (filteredAccounts.length === 1) setAccountId(filteredAccounts[0].id);
    else if (accountId && !filteredAccounts.some((a) => a.id === accountId)) setAccountId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, accounts]);

  const spreadQuick = () => {
    let pool = Number(quick) || 0;
    const next: Record<string, number> = {};
    for (const i of installments) {
      const pay = Math.min(i.remaining, Math.max(0, pool));
      if (pay > 0) next[i.id] = pay;
      pool -= pay;
    }
    setPerMonth(next);
  };
  const fillAll = () => {
    const next: Record<string, number> = {};
    for (const i of installments) if (i.remaining > 0) next[i.id] = i.remaining;
    setPerMonth(next);
    setQuick(String(debt));
  };
  const setMonth = (id: string, remaining: number, v: string) => {
    const raw = Number(v) || 0;
    setWarn(raw > remaining ? `Bu oy qoldig‘idan ko‘p — max ${fmtNum(remaining)} so‘m` : '');
    setPerMonth((m) => ({ ...m, [id]: Math.max(0, Math.min(raw, remaining)) }));
  };

  const save = useMutation({
    mutationFn: () => {
      const allocations = installments
        .filter((i) => (perMonth[i.id] || 0) > 0)
        .map((i) => ({ installmentId: i.id, amount: perMonth[i.id] }));
      return paymentsApi.create({
        contractId: schedule?.contract?.id,
        studentId: hasContract ? undefined : studentId,
        amount: total,
        method,
        type: method === 'Karta' ? type || undefined : undefined,
        cardLast4: method === 'Karta' ? cardLast4 || undefined : undefined,
        accountId: accountId || undefined,
        paidAt: date,
        note: note || undefined,
        isRefund,
        allocations: hasContract && !isRefund ? allocations : undefined,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments'] }); onSaved(); },
    onError: (e: any) =>
      setError(
        Array.isArray(e?.response?.data?.message)
          ? e.response.data.message.join(', ')
          : e?.response?.data?.message ?? 'Xatolik yuz berdi',
      ),
  });

  const inputCls =
    'w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="my-6 w-full max-w-[1120px] rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        {/* Sarlavha */}
        <div className="flex items-start justify-between border-b border-slate-100 px-7 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Maktab · Yangi to‘lov</div>
            <h2 className="text-xl font-bold text-slate-800">{headerName}</h2>
            {headerSub && <div className="text-sm text-slate-400">{headerSub}</div>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={20} /></button>
        </div>

        {/* Qidirish */}
        {!initStudentId && !studentId && (
          <div className="space-y-3 px-7 py-4">
            <div>
              <Label>O‘quv yili</Label>
              <select value={payYear} onChange={(e) => setPayYear(e.target.value)} className={inputCls + ' cursor-pointer'}>
                {years?.length ? years.map((y) => <option key={y.id} value={y.name}>{y.name}</option>) : <option value="">Yuklanmoqda...</option>}
              </select>
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism bo‘yicha qidirish (ixtiyoriy)..." className={inputCls + ' pl-9'} />
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
              {(hits?.length ?? 0) > 0 ? (
                hits!.map((s) => (
                  <button key={s.id} onClick={() => { setStudentId(s.id); setStudentLabel(`${s.lastName} ${s.firstName}`); }} className="flex w-full items-center justify-between border-b border-slate-50 px-4 py-2.5 text-left text-sm last:border-0 hover:bg-brand/[0.03]">
                    <span className="font-medium text-slate-700">{s.lastName} {s.firstName}</span>
                    <span className="text-xs text-slate-400">{s.class?.name ?? '—'}</span>
                  </button>
                ))
              ) : (
                <p className="px-4 py-6 text-center text-sm text-slate-400">{payYear ? 'O‘quvchi topilmadi' : 'Avval o‘quv yilini tanlang'}</p>
              )}
            </div>
          </div>
        )}

        {studentId && (
          <div className="px-7 pb-6 pt-5">
            {/* Kartochkalar */}
            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SummaryCard tone="rose" label="Joriy qarzdorlik" value={money(debt)} />
              <SummaryCard tone="emerald" label={isRefund ? 'Bu qaytarish' : 'Bu to‘lov'} value={money(total)} />
              <SummaryCard tone="amber" label="Yangi qoldiq" value={money(newRemaining)} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
              {/* Chap */}
              <div className="space-y-4">
                <div>
                  <Label>Sana</Label>
                  <div className="flex gap-2">
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                    <button onClick={() => setDate(todayStr())} className="whitespace-nowrap rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50">Bugun</button>
                    <button onClick={() => setDate(dayOffset(-1))} className="whitespace-nowrap rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50">Kecha</button>
                  </div>
                </div>

                <label className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-sm">
                  <input type="checkbox" checked={isRefund} onChange={(e) => setIsRefund(e.target.checked)} className="mt-0.5" />
                  <span><b>Qaytarish (−) rejimi</b><span className="block text-xs text-slate-400">Pul qaytarilsa belgilang. Qarzdorlik oshadi.</span></span>
                </label>

                <div>
                  <Label>Kassa turi</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {KASSA_TYPES.map((k) => (
                      <button key={k} onClick={() => setMethod(k)} className={`rounded-lg border py-2.5 text-sm font-medium transition ${method === k ? 'border-brand bg-brand text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{k}</button>
                    ))}
                  </div>
                </div>

                {method === 'Karta' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>To‘lov turi</Label><input value={type} onChange={(e) => setType(e.target.value)} className={inputCls} placeholder="Click / Payme..." /></div>
                    <div><Label>Karta 4 raqami</Label><input value={cardLast4} onChange={(e) => setCardLast4(e.target.value)} maxLength={4} className={inputCls} placeholder="6651" /></div>
                  </div>
                )}

                <div><Label>Hisob <span className="text-rose-500">*</span></Label>
                  <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputCls + ' cursor-pointer'}>
                    <option value="">Tanlang...</option>
                    {filteredAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  {filteredAccounts.length === 0 && (
                    <p className="mt-1 text-xs text-amber-500">Bu kassa turi ({method}) uchun hisob yo‘q — “Hisoblar” bo‘limidan qo‘shing.</p>
                  )}
                </div>

                <div><Label>Izoh (ixtiyoriy)</Label><input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="Hammasi uchun bitta izoh..." /></div>

                {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

                <button onClick={() => { setError(''); if (total <= 0) return setError('To‘lov summasini kiriting'); if (!accountId) return setError('Hisobni tanlang'); save.mutate(); }} disabled={save.isPending || total <= 0 || !accountId} className="w-full rounded-xl bg-brand py-3 font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-50">
                  {save.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
                <button onClick={onClose} className="w-full text-sm text-slate-400 hover:text-slate-600">Bekor qilish</button>
              </div>

              {/* O'ng */}
              <div>
                {useFree ? (
                  <div className="rounded-2xl border border-slate-200 p-5">
                    <Label>{isRefund ? 'Qaytariladigan summa' : 'To‘lov summasi'}</Label>
                    <input type="number" min={0} value={freeAmount} onChange={(e) => setFreeAmount(e.target.value)} className={inputCls} placeholder="Summa..." />
                    <p className="mt-2 text-xs text-amber-500">
                      {isRefund
                        ? 'Qaytarish oylarga bog‘lanmaydi — qarzdorlik shu summaga oshadi.'
                        : 'Bu o‘quvchida faol shartnoma yo‘q — to‘lov oylarga bog‘lanmaydi.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Tezkor taqsimlash */}
                    <div className="mb-4 rounded-2xl bg-brand/5 p-4">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Tezkor taqsimlash</div>
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <input type="number" min={0} max={debt} value={quick} onChange={(e) => { const raw = Number(e.target.value) || 0; setWarn(raw > debt ? `Qarzdorlikdan ko‘p kiritib bo‘lmaydi — max ${fmtNum(debt)} so‘m` : ''); setQuick(String(Math.min(raw, debt))); }} placeholder={`Umumiy summa (max ${fmtNum(debt)})...`} className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-12 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">so‘m</span>
                        </div>
                        <button onClick={spreadQuick} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">Oylarga taqsimlash <ArrowRight size={15} /></button>
                        <button onClick={fillAll} className="whitespace-nowrap text-sm font-semibold text-brand hover:underline">Hammasini to‘liq</button>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">Eng eski qarzdorlikdan boshlab har oyning qoldig‘iga qarab to‘ldiriladi. Har oyni alohida ham o‘zgartira olasiz.</p>
                      {warn && <p className="mt-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-600">⚠ {warn}</p>}
                    </div>

                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Oylar bo‘yicha to‘lov</div>
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <div className="max-h-[48vh] overflow-y-auto">
                        <table className="w-full text-[13px]">
                          <thead className="sticky top-0 bg-slate-50">
                            <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              <th className="px-3 py-1.5">Oy</th>
                              <th className="px-3 py-1.5 text-right">To‘lanadigan</th>
                              <th className="px-3 py-1.5 text-right">To‘langan</th>
                              <th className="px-3 py-1.5 text-right">Qoldiq</th>
                              <th className="px-3 py-1.5 text-right">To‘lov</th>
                            </tr>
                          </thead>
                          <tbody>
                            {installments.map((i) => (
                              <tr key={i.id} className="border-t border-slate-50">
                                <td className="px-3 py-1 font-semibold text-slate-700">{i.monthLabel}</td>
                                <td className="px-3 py-1 text-right text-slate-400">{fmtNum(i.amount)}</td>
                                <td className="px-3 py-1 text-right text-emerald-600">{i.paidAmount > 0 ? fmtNum(i.paidAmount) : '—'}</td>
                                <td className="px-3 py-1 text-right">
                                  {i.remaining === 0 ? (
                                    <span className="inline-flex rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">✓ to‘liq</span>
                                  ) : (
                                    <span className="font-medium text-slate-700">{fmtNum(i.remaining)}</span>
                                  )}
                                </td>
                                <td className="px-3 py-1 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {i.remaining > 0 && (
                                      <button onClick={() => setMonth(i.id, i.remaining, String(i.remaining))} className="text-[10px] text-brand hover:underline">to‘liq</button>
                                    )}
                                    <input type="number" min={0} max={i.remaining} disabled={i.remaining === 0} value={perMonth[i.id] ?? ''} onChange={(e) => setMonth(i.id, i.remaining, e.target.value)} placeholder="0" className="w-20 rounded-md border border-slate-200 bg-slate-50/60 px-2 py-1 text-right text-[13px] outline-none focus:border-brand focus:bg-white disabled:bg-slate-50 disabled:opacity-40" />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-slate-100 bg-slate-50">
                              <td className="px-3 py-2 font-semibold text-slate-600" colSpan={4}>Jami:</td>
                              <td className="px-3 py-2 text-right text-sm font-bold text-emerald-600">{fmtNum(total)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</span>;
}

const TONE: Record<string, string> = {
  rose: 'bg-rose-50 ring-rose-100 text-rose-600',
  emerald: 'bg-emerald-50 ring-emerald-100 text-emerald-600',
  amber: 'bg-amber-50 ring-amber-100 text-amber-600',
};
function SummaryCard({ tone, label, value }: { tone: keyof typeof TONE; label: string; value: string }) {
  return (
    <div className={`rounded-2xl px-5 py-4 ring-1 ${TONE[tone]}`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
