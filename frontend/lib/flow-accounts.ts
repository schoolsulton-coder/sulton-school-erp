import { api } from './api';

export type Currency = 'SOM' | 'USD';

export const CURRENCIES: { key: Currency; label: string }[] = [
  { key: 'SOM', label: "So'm" },
  { key: 'USD', label: 'Dollar' },
];

export interface FlowAccount {
  id: string;
  name: string;
  branch: { id: string; name: string } | null;
  user: { id: string; fullName: string } | null;
  currency: Currency;
  kassaTuri: string;
  balance: number;
  active: boolean;
  bankName: string | null;
  cardNumber: string | null;
  cardHolder: string | null;
  cardType: string | null;
}

export interface FlowAccountInput {
  name: string;
  branchId?: string;
  currency?: string;
  kassaTuri?: string;
  userId?: string;
  active?: boolean;
  bankName?: string;
  cardNumber?: string;
  cardHolder?: string;
  cardType?: string;
}

export const flowAccountsApi = {
  list: (params?: { branchId?: string; currency?: string; userId?: string; active?: string }) =>
    api.get<FlowAccount[]>('/flow-accounts', { params }).then((r) => r.data),
  create: (data: FlowAccountInput) =>
    api.post<FlowAccount>('/flow-accounts', data).then((r) => r.data),
  update: (id: string, data: Partial<FlowAccountInput>) =>
    api.patch(`/flow-accounts/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/flow-accounts/${id}`).then((r) => r.data),
};

/** Hisob yorlig'i: "Bosh ofis (Naqd) (So'm)" ko'rinishida */
export const flowAccountLabel = (a: FlowAccount) => {
  const cur = a.currency === 'USD' ? 'Dollar' : "So'm";
  return `${a.name} (${a.kassaTuri}) (${cur})`;
};
