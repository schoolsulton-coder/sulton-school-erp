import { api } from './api';

export type ItKind = 'SOM' | 'DOLLAR' | 'VALYUTA' | 'PUL';

export const IT_TABS: { key: ItKind; label: string }[] = [
  { key: 'SOM', label: "So'm" },
  { key: 'DOLLAR', label: 'Dollar' },
  { key: 'VALYUTA', label: 'Valyuta' },
  { key: 'PUL', label: 'Pul' },
];

export interface ItRow {
  id: string;
  date: string;
  branch: string | null;
  from: string | null;
  to: string | null;
  kassaTuri: string | null;
  somAmount: number;
  dollarAmount: number;
  dollarRate: number;
  loss: number;
  confirmed: boolean;
  note: string | null;
}
export interface ItResp {
  totals: Record<string, number>;
  data: ItRow[];
}

export interface ItInput {
  kind: ItKind;
  branchId?: string;
  fromAccountId: string;
  toAccountId: string;
  kassaTuri?: string;
  somAmount?: number;
  dollarAmount?: number;
  dollarRate?: number;
  loss?: number;
  date?: string;
  note?: string;
}

export interface ItDetail {
  id: string;
  kind: ItKind;
  date: string;
  branch: string | null;
  kassaTuri: string | null;
  from: string | null;
  to: string | null;
  fromKassa: string | null;
  toKassa: string | null;
  fromCur: 'SOM' | 'USD' | null;
  toCur: 'SOM' | 'USD' | null;
  somAmount: number;
  dollarAmount: number;
  dollarRate: number;
  loss: number;
  note: string | null;
  confirmed: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  confirmedBy: string | null;
}

export const internalTransfersApi = {
  list: (params: { kind: string; from?: string; to?: string; search?: string; branchId?: string }) =>
    api.get<ItResp>('/internal-transfers', { params }).then((r) => r.data),
  detail: (id: string) => api.get<ItDetail>(`/internal-transfers/${id}`).then((r) => r.data),
  create: (data: ItInput) => api.post('/internal-transfers', data).then((r) => r.data),
  confirm: (id: string, confirm: boolean) =>
    api.post(`/internal-transfers/${id}/confirm`, { confirm }).then((r) => r.data),
  remove: (id: string) => api.delete(`/internal-transfers/${id}`).then((r) => r.data),
};

export const usd = (n: number) => '$' + new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0));
