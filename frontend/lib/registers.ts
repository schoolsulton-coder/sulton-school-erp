import { api } from './api';

export interface RegisterItem {
  id: string;
  type: 'ACCOUNT' | 'FLOW';
  name: string;
  currency: 'SOM' | 'USD';
  kassaTuri: string | null;
  branch: string | null;
  branchId: string | null;
  storedBalance: number;
  active: boolean;
}
export interface RegisterListResp {
  registers: RegisterItem[];
  totals: { somBalance: number; usdBalance: number; count: number };
}

export interface RegisterMovement {
  date: string;
  source: string;
  label: string;
  direction: 'IN' | 'OUT';
  amount: number;
  currency: 'SOM' | 'USD';
  confirmed: boolean;
  refType: string;
  refId: string;
  counterparty: string;
  note: string | null;
  runningBalance: number;
}
export interface RegisterDetail {
  register: { id: string; type: string; name: string; currency: string; kassaTuri: string | null; branch: string | null; storedBalance: number };
  period: { from: string | null; to: string | null };
  balances: { opening: number; totalIn: number; totalOut: number; closing: number; liveBalance: number; confirmedBalance: number; pendingIn: number; pendingOut: number; allIn: number; allOut: number };
  incomeBreakdown: { label: string; count: number; total: number }[];
  expenseBreakdown: { label: string; count: number; total: number }[];
  transactions: RegisterMovement[];
  count: number;
}

export const registersApi = {
  list: (params?: { type?: string; branchId?: string; active?: string }) =>
    api.get<RegisterListResp>('/finance/registers', { params }).then((r) => r.data),
  detail: (type: string, id: string, params?: { from?: string; to?: string; limit?: number }) =>
    api.get<RegisterDetail>(`/finance/registers/${type}/${id}/detail`, { params }).then((r) => r.data),
};

/** Valyutaga qarab summa formati (SOM: so'm, USD: $) */
export const cur = (n: number, currency = 'SOM') => {
  const v = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(Math.round((n || 0) * 10) / 10);
  return currency === 'USD' ? `$${v}` : `${v}`;
};
