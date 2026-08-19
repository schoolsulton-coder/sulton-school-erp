'use client';

import { useQuery } from '@tanstack/react-query';
import { flowAccountsApi, flowAccountLabel, type Currency } from '@/lib/flow-accounts';
import { inp } from './flow-ui';

/** Filial + valyuta bo'yicha tashqi hisoblar */
export function useFlowAccounts(branchId: string | undefined, currency: Currency) {
  return useQuery({
    queryKey: ['flow-accounts', branchId ?? '', currency],
    queryFn: () => flowAccountsApi.list({ branchId: branchId || undefined, currency, active: 'true' }),
    enabled: !!branchId,
  });
}

/** HISOB tanlash — filial + valyuta (+ ixtiyoriy kassa turi) bo'yicha filtrlangan */
export function HisobSelect({
  branchId,
  currency,
  kassaTuri,
  value,
  onChange,
}: {
  branchId: string | undefined;
  currency: Currency;
  kassaTuri?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { data } = useFlowAccounts(branchId, currency);
  const opts = (data ?? []).filter((a) => !kassaTuri || a.kassaTuri === kassaTuri);
  return (
    <div>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inp} disabled={!branchId}>
        <option value="">{!branchId ? 'Avval filial' : opts.length ? 'Hisob —' : 'Hisob topilmadi'}</option>
        {opts.map((a) => (
          <option key={a.id} value={a.id}>
            {flowAccountLabel(a)}
          </option>
        ))}
      </select>
      {branchId && !opts.length && (
        <p className="mt-1 text-xs text-amber-600">Bu filialda mos {currency === 'USD' ? 'Dollar' : "So'm"} hisob topilmadi</p>
      )}
    </div>
  );
}
