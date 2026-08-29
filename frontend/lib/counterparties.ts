import { api } from './api';

export type CpCategory =
  | 'OLDI_BERDICHI'
  | 'OLDI_BERDI'
  | 'INVESTOR'
  | 'INVESTITSIYA';

export const CP_TABS: { key: CpCategory; label: string }[] = [
  { key: 'OLDI_BERDICHI', label: 'Oldi-berdichilar' },
  { key: 'OLDI_BERDI', label: 'Oldi-berdilar' },
  { key: 'INVESTOR', label: 'Investorlar' },
  { key: 'INVESTITSIYA', label: 'Investitsiyalar' },
];

// Oldi-berdi tranzaksiya sababi (maqbul ro'yxat — keyin sozlanadi)
export const SABAB_OPTIONS = [
  'Qarz berildi',
  'Qarz olindi',
  'Qarz qaytarildi',
  'Qarz qaytarib olindi',
  'Boshqa',
];

export interface CounterpartyRow {
  id: string;
  name: string;
  branch: { id: string; name: string } | null;
  branches: { id: string; name: string }[];
  category: CpCategory;
  filiallararo: boolean;
  pairId: string | null;
  pairName: string | null;
  pairBranch: string | null;
  note: string | null;
  tranzaksiya: number;
  kirim: number;
  chiqim: number;
  balans: number;
}

// Kassa turi (so'm/dollar) va investitsiya turi (maqbul ro'yxatlar)
export const KASSA_TURI = ['Naqd', 'Karta', 'Bank'];
export const INVEST_TYPES = ['Ulush kiritish', 'Qo\'shimcha kapital', 'Dividend', 'Boshqa'];
export const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

export interface CounterpartyList {
  totals: { shaxslar: number; jamiKirim: number; jamiChiqim: number; balans: number };
  data: CounterpartyRow[];
}

export interface CpEntry {
  id: string;
  direction: 'IN' | 'OUT';
  amount: number;
  date: string;
  note: string | null;
}

export interface CounterpartyDetail {
  id: string;
  name: string;
  branch: { id: string; name: string } | null;
  category: CpCategory;
  note: string | null;
  entries: CpEntry[];
}

export interface EntryInput {
  direction: 'IN' | 'OUT';
  somAmount?: number;
  dollarAmount?: number;
  dollarRate?: number;
  sabab?: string;
  kassaTuri?: string;
  accountId?: string;
  somFlowAccountId?: string;
  dollarKassaTuri?: string;
  dollarFlowAccountId?: string;
  capex?: number;
  operation?: number;
  branchId?: string;
  periodYear?: number;
  periodMonth?: number;
  academicYear?: string;
  investType?: string;
  date?: string;
  note?: string;
}

export interface TransferInput {
  fromId: string;
  toId: string;
  somAmount?: number;
  dollarAmount?: number;
  dollarRate?: number;
  fromSomAccountId?: string;
  toSomAccountId?: string;
  fromDollarAccountId?: string;
  toDollarAccountId?: string;
  date?: string;
  note?: string;
}

export interface EntryRow {
  id: string;
  date: string;
  direction: 'IN' | 'OUT';
  sabab: string | null;
  note: string | null;
  counterparty: string;
  branch: string | null;
  hisob: string | null;
  investType: string | null;
  periodYear: number | null;
  periodMonth: number | null;
  academicYear: string | null;
  amount: number;
  confirmed: boolean;
}
export interface EntriesResp {
  totals: { count: number; kirim: number; chiqim: number; balans: number };
  data: EntryRow[];
}

export interface TransferRow {
  id: string;
  date: string;
  from: string | null;
  fromHisob: string | null;
  to: string | null;
  toHisob: string | null;
  note: string | null;
  amount: number;
  nosoz: boolean;
}
export interface TransfersResp {
  totals: { count: number; jami: number; nosoz: number };
  data: TransferRow[];
}

export interface EntryDetail {
  id: string; date: string; direction: 'IN' | 'OUT'; title: string; sabab: string | null; note: string | null;
  counterparty: { id: string; name: string; isInvestor: boolean }; branch: string | null;
  somAmount: number | null; dollarAmount: number | null; dollarRate: number | null; amount: number;
  kassaTuri: string | null; somHisob: string | null; dollarKassaTuri: string | null; dollarHisob: string | null;
  investType: string | null; academicYear: string | null; periodYear: number | null; periodMonth: number | null;
  capex: number | null; operation: number | null;
  isTransfer: boolean; confirmedAt: string | null; confirmedBy: string | null;
  createdAt: string; updatedAt: string; createdBy: string | null; updatedBy: string | null;
}
export interface TransferDetail {
  id: string; date: string; amount: number; somAmount: number | null; dollarAmount: number | null; dollarRate: number | null;
  from: { id: string; name: string } | null; fromBranch: string | null; fromSomHisob: string | null; fromDollarHisob: string | null; fromSomKassa: string | null;
  to: { id: string; name: string } | null; toBranch: string | null; toSomHisob: string | null; toDollarHisob: string | null; toSomKassa: string | null;
  note: string | null; confirmedAt: string | null; confirmedBy: string | null;
  createdAt: string; updatedAt: string; createdBy: string | null; updatedBy: string | null;
}
export interface OpRow {
  id: string; date: string; direction: 'IN' | 'OUT'; type: 'TRANZAKSIYA' | 'TRANSFER' | 'INVESTITSIYA';
  transferPairId: string | null; sabab: string | null; note: string | null; investType: string | null;
  academicYear: string | null; periodYear: number | null; periodMonth: number | null;
  capex: number | null; operation: number | null; hisob: string | null; amount: number; balans: number;
}
export interface EntityDetail {
  id: string; name: string; branch: string | null; branches: string[]; category: CpCategory; filiallararo: boolean;
  pairName: string | null; pairBranch: string | null;
  totals: { operatsiyalar: number; tranzaksiya: number; transfer: number; sotuv: number; kirim: number; chiqim: number; balans: number; capex: number; operation: number };
  operations: OpRow[];
}

export const counterpartiesApi = {
  list: (params?: { category?: string; branchId?: string; search?: string; filiallararo?: string }) =>
    api.get<CounterpartyList>('/counterparties', { params }).then((r) => r.data),
  entryDetail: (id: string) => api.get<EntryDetail>(`/counterparties/entries/${id}`).then((r) => r.data),
  transferDetail: (pairId: string) => api.get<TransferDetail>(`/counterparties/transfers/${pairId}`).then((r) => r.data),
  confirmEntry: (id: string, confirm: boolean) =>
    api.post(`/counterparties/entries/${id}/confirm`, { confirm }).then((r) => r.data),
  confirmTransfer: (pairId: string, confirm: boolean) =>
    api.post(`/counterparties/transfers/${pairId}/confirm`, { confirm }).then((r) => r.data),
  removeEntry: (id: string) => api.delete(`/counterparties/entries/${id}`).then((r) => r.data),
  removeTransfer: (pairId: string) => api.delete(`/counterparties/transfers/${pairId}`).then((r) => r.data),
  detail: (id: string) => api.get<EntityDetail>(`/counterparties/${id}/detail`).then((r) => r.data),
  entriesList: (params: { scope: string; from?: string; to?: string; search?: string; branchId?: string }) =>
    api.get<EntriesResp>('/counterparties/entries', { params }).then((r) => r.data),
  transfersList: (params?: { from?: string; to?: string; search?: string; branchId?: string }) =>
    api.get<TransfersResp>('/counterparties/transfers', { params }).then((r) => r.data),
  get: (id: string) => api.get<CounterpartyDetail>(`/counterparties/${id}`).then((r) => r.data),
  create: (data: {
    name: string;
    branchId?: string;
    category?: string;
    filiallararo?: boolean;
    branchIds?: string[];
    pairId?: string;
    note?: string;
  }) => api.post('/counterparties', data).then((r) => r.data),
  addEntry: (id: string, data: EntryInput) =>
    api.post(`/counterparties/${id}/entries`, data).then((r) => r.data),
  transfer: (data: TransferInput) =>
    api.post('/counterparties/transfer/create', data).then((r) => r.data),
  remove: (id: string) => api.delete(`/counterparties/${id}`).then((r) => r.data),
};

/** So'm — kerak bo'lsa 2 xonagacha kasr (skrinshotdek: 126 012 608,5) */
export const som = (n: number) =>
  new Intl.NumberFormat('uz-UZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n || 0) + " so'm";
