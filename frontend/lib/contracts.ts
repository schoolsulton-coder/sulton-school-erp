import { api } from './api';

export interface ContractListItem {
  id: string;
  number: string;
  student: { id: string; firstName: string; lastName: string };
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  monthlyAmount: number;
  total: number;
  paid: number;
  debt: number;
  overdueCount: number;
}

export interface Installment {
  id: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
}

export interface Discount {
  id: string;
  name: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
}

export interface PaymentRow {
  id: string;
  amount: number;
  method: string;
  paidAt: string;
  note?: string | null;
  student?: { firstName: string; lastName: string } | null;
  contract?: { number: string } | null;
}

export interface ContractOverviewRow {
  id: string;
  number: string;
  createdAt: string;
  student: {
    firstName: string;
    lastName: string;
    class?: { name: string; language?: string | null } | null;
  };
  branch?: string | null;
  academicYear?: string | null;
  type: 'MONTHLY' | 'YEARLY';
  status: string;
  overdue: boolean;
  original: number;
  discount: number;
  payable: number;
  monthly: number;
  paymentsSum: number;
}

export interface ContractsOverview {
  stats: {
    total: number;
    monthly: number;
    yearly: number;
    suspended: number;
    tempSuspended: number;
    overdue: number;
    left: number;
    other: number;
    payableSum: number;
    paymentsSum: number;
  };
  rows: ContractOverviewRow[];
}

export const contractsApi = {
  overview: () => api.get<ContractsOverview>('/contracts/overview').then((r) => r.data),
  list: (status?: string) =>
    api
      .get<ContractListItem[]>('/contracts', { params: { status } })
      .then((r) => r.data),
  get: (id: string) => api.get(`/contracts/${id}`).then((r) => r.data),
  create: (data: {
    studentId: string;
    startDate: string;
    months: number;
    monthlyAmount: number;
    discountId?: string;
    dueDay?: number;
    type?: 'MONTHLY' | 'YEARLY';
  }) => api.post('/contracts', data).then((r) => r.data),
  addPayment: (
    id: string,
    data: { amount: number; method: string; note?: string },
  ) => api.post(`/contracts/${id}/payments`, data).then((r) => r.data),
  cancel: (id: string) =>
    api.patch(`/contracts/${id}/cancel`).then((r) => r.data),

  recentPayments: () =>
    api
      .get<PaymentRow[]>('/contracts/payments')
      .then((r) => r.data),
  discounts: () =>
    api.get<Discount[]>('/contracts/discounts').then((r) => r.data),
  createDiscount: (data: { name: string; type: 'PERCENT' | 'FIXED'; value: number }) =>
    api.post('/contracts/discounts', data).then((r) => r.data),

  /** PDF'ni blob sifatida olib, yangi oynada ochadi (auth header bilan) */
  openPdf: async (id: string, number: string) => {
    const res = await api.get(`/contracts/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(
      new Blob([res.data], { type: 'application/pdf' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.download = `${number}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },
};

export const money = (n: number) =>
  new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0)) + " so'm";
