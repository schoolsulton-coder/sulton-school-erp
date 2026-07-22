import { api } from './api';

export type ExpenseStatus = 'INCOMPLETE' | 'UNPAID' | 'PARTIAL' | 'CLOSED' | 'EXCESS';

export const EXPENSE_STATUS_LABEL: Record<ExpenseStatus, string> = {
  INCOMPLETE: "Noto'liq",
  UNPAID: "To'lovsiz",
  PARTIAL: 'Qisman',
  CLOSED: 'Yopilgan',
  EXCESS: 'Ortiqcha',
};
export const EXPENSE_STATUS_COLOR: Record<ExpenseStatus, string> = {
  INCOMPLETE: 'bg-slate-100 text-slate-500 ring-slate-200',
  UNPAID: 'bg-rose-50 text-rose-600 ring-rose-200',
  PARTIAL: 'bg-amber-50 text-amber-600 ring-amber-200',
  CLOSED: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
  EXCESS: 'bg-indigo-50 text-indigo-600 ring-indigo-200',
};

export interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  branchId?: string | null;
}

export interface ExpenseRow {
  id: string;
  number: number;
  date: string;
  department?: string | null;
  academicYear?: string | null;
  note?: string | null;
  supplier: { id: string; name: string };
  branch: { id: string; name: string };
  itemsCount: number;
  total: number;
  paid: number;
  remaining: number;
  status: ExpenseStatus;
}

export interface ExpenseCounts {
  all: number;
  open: number;
  unpaid: number;
  partial: number;
  excess: number;
  incomplete: number;
  closed: number;
}

export interface ExpenseListResponse {
  data: ExpenseRow[];
  counts: ExpenseCounts;
  stats: { jami: number; tolangan: number; qarz: number; avans: number };
}

export interface SupplierBalance {
  id: string;
  name: string;
  phone?: string | null;
  branch?: string | null;
  expensesCount: number;
  totalPurchase: number;
  totalPaid: number;
  remaining: number;
}
export interface SupplierBalancesResponse {
  data: SupplierBalance[];
  stats: { count: number; jamiXarid: number; jamiTolov: number; qarz: number; avans: number };
}

export interface SupplierExpenseRow {
  id: string;
  number: number;
  date: string;
  name: string;
  department?: string | null;
  branch?: { id: string; name: string } | null;
  itemsCount: number;
  total: number;
  paid: number;
  remaining: number;
  status: ExpenseStatus;
}
export interface SupplierDetailResponse {
  supplier: { id: string; name: string; phone?: string | null; branch?: { id: string; name: string } | null; status: string };
  stats: { count: number; jamiXarid: number; jamiTolov: number; qoldiq: number };
  expenses: SupplierExpenseRow[];
}

export interface ExpenseLine {
  id: string;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  subCategory?: string | null;
  name: string;
  quantity: number;
  price: number;
  note?: string | null;
}

export interface ExpensePayment {
  id: string;
  amount: number;
  method: string;
  accountId?: string | null;
  account?: { id: string; name: string } | null;
  dollarAmount?: number | null;
  dollarRate?: number | null;
  dollarMethod?: string | null;
  dollarAccountId?: string | null;
  dollarAccount?: { id: string; name: string } | null;
  paidAt: string;
  isRefund: boolean;
  note?: string | null;
}

export interface ExpenseDetail {
  id: string;
  number: number;
  date: string;
  department?: string | null;
  academicYear?: string | null;
  note?: string | null;
  supplier: { id: string; name: string; phone?: string | null };
  branch: { id: string; name: string };
  lines: ExpenseLine[];
  payments: ExpensePayment[];
  total: number;
  paid: number;
  remaining: number;
  status: ExpenseStatus;
}

export interface ExpenseFilters {
  status?: string;
  branchId?: string;
  supplierId?: string;
  search?: string;
  from?: string;
  to?: string;
  academicYear?: string;
}

export interface ExpensePaymentInput {
  amount?: number;
  method: string;
  accountId?: string;
  dollarAmount?: number;
  dollarRate?: number;
  dollarMethod?: string;
  dollarAccountId?: string;
  paidAt?: string;
  isRefund?: boolean;
  note?: string;
}

export interface LineInput {
  categoryId?: string;
  subCategory?: string;
  name: string;
  quantity?: number;
  price?: number;
  note?: string;
}

export const expensesApi = {
  list: (params?: ExpenseFilters) =>
    api.get<ExpenseListResponse>('/expenses', { params }).then((r) => r.data),
  get: (id: string) => api.get<ExpenseDetail>(`/expenses/${id}`).then((r) => r.data),
  create: (data: {
    supplierId: string;
    branchId: string;
    department?: string;
    date?: string;
    academicYear?: string;
    note?: string;
  }) => api.post<ExpenseRow>('/expenses', data).then((r) => r.data),
  update: (id: string, data: Partial<{ supplierId: string; branchId: string; department: string; date: string; academicYear: string; note: string }>) =>
    api.patch(`/expenses/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/expenses/${id}`).then((r) => r.data),

  addLine: (id: string, data: LineInput) =>
    api.post(`/expenses/${id}/lines`, data).then((r) => r.data),
  addLinesBulk: (id: string, lines: LineInput[]) =>
    api.post(`/expenses/${id}/lines/bulk`, { lines }).then((r) => r.data),
  updateLine: (lineId: string, data: Partial<LineInput>) =>
    api.patch(`/expenses/lines/${lineId}`, data).then((r) => r.data),
  removeLine: (lineId: string) => api.delete(`/expenses/lines/${lineId}`).then((r) => r.data),

  addPayment: (id: string, data: ExpensePaymentInput) =>
    api.post(`/expenses/${id}/payments`, data).then((r) => r.data),
  updatePayment: (paymentId: string, data: ExpensePaymentInput) =>
    api.patch(`/expenses/payments/${paymentId}`, data).then((r) => r.data),
  removePayment: (paymentId: string) => api.delete(`/expenses/payments/${paymentId}`).then((r) => r.data),

  suppliers: (branchId?: string) =>
    api.get<Supplier[]>('/expenses/suppliers', { params: { branchId } }).then((r) => r.data),
  supplierBalances: (params?: { branchId?: string; search?: string }) =>
    api.get<SupplierBalancesResponse>('/expenses/suppliers/balances', { params }).then((r) => r.data),
  supplierDetail: (id: string, params?: { search?: string; branchId?: string; from?: string; to?: string }) =>
    api.get<SupplierDetailResponse>(`/expenses/suppliers/${id}`, { params }).then((r) => r.data),
  createSupplier: (data: { name: string; phone?: string; branchId?: string }) =>
    api.post<Supplier>('/expenses/suppliers', data).then((r) => r.data),
  updateSupplier: (id: string, data: { name: string; phone?: string; branchId?: string }) =>
    api.patch<Supplier>(`/expenses/suppliers/${id}`, data).then((r) => r.data),
  removeSupplier: (id: string) => api.delete(`/expenses/suppliers/${id}`).then((r) => r.data),
};

export const money = (n: number) =>
  new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0));
