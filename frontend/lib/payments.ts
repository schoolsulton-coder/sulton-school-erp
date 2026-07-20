import { api } from './api';

export interface PaymentStudent {
  id: string;
  firstName: string;
  lastName: string;
  branch?: { name: string } | null;
  class?: { name: string; language?: string | null; academicYear?: string | null } | null;
}

export interface PaymentListRow {
  id: string;
  amount: number;
  method: string;
  type?: string | null;
  cardLast4?: string | null;
  isRefund: boolean;
  paidAt: string;
  note?: string | null;
  confirmedAt?: string | null;
  student?: PaymentStudent | null;
  contract?: { number: string } | null;
  account?: { id: string; name: string } | null;
}

export interface PaymentStats {
  count: number;
  total: number;
  naqd: number;
  karta: number;
  bank: number;
  unconfirmedCount: number;
  unconfirmedSum: number;
}

export interface PaymentsResponse {
  stats: PaymentStats;
  data: PaymentListRow[];
}

export interface ScheduleInstallment {
  id: string;
  monthLabel: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  remaining: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
}

export interface StudentSchedule {
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    class?: { name: string; language?: string | null } | null;
  } | null;
  contract: { id: string; number: string } | null;
  debt: number;
  installments: ScheduleInstallment[];
}

export interface PaymentDetail extends PaymentListRow {
  contractId?: string | null;
  contract?: { id: string; number: string } | null;
  createdAt: string;
  updatedAt: string;
  updateCount: number;
  createdByName?: string | null;
  updatedByName?: string | null;
}

export interface PaymentInput {
  contractId?: string;
  studentId?: string;
  amount: number;
  method: string;
  type?: string;
  accountId?: string;
  cardLast4?: string;
  paidAt?: string;
  note?: string;
  isRefund?: boolean;
  confirmedAt?: string;
  allocations?: { installmentId: string; amount: number }[];
}

export interface PaymentFilters {
  search?: string;
  from?: string;
  to?: string;
  method?: string;
  type?: string;
  accountId?: string;
  confirmed?: string;
  branchId?: string;
  academicYear?: string;
  studentId?: string;
}

export const paymentsApi = {
  list: (filters?: PaymentFilters) =>
    api.get<PaymentsResponse>('/payments', { params: filters }).then((r) => r.data),
  get: (id: string) =>
    api.get<PaymentDetail>(`/payments/${id}`).then((r) => r.data),
  schedule: (studentId: string) =>
    api
      .get<StudentSchedule>(`/payments/student/${studentId}/schedule`)
      .then((r) => r.data),
  create: (data: PaymentInput) =>
    api.post('/payments', data).then((r) => r.data),
  update: (id: string, data: Partial<PaymentInput>) =>
    api.patch(`/payments/${id}`, data).then((r) => r.data),
  confirm: (id: string, date?: string) =>
    api.patch(`/payments/${id}/confirm`, { date }).then((r) => r.data),
  remove: (id: string) => api.delete(`/payments/${id}`).then((r) => r.data),
};

export const money = (n: number) =>
  new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0)) + " so'm";

export const KASSA_TYPES = ['Naqd', 'Bank', 'Karta'];
