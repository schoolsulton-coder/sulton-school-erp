import { api } from './api';

export type PayrollStatus = 'DRAFT' | 'APPROVED' | 'PAID';

export interface PayrollRun {
  id: string;
  period: string;
  status: PayrollStatus;
  _count: { items: number };
}

export interface PayrollItem {
  id: string;
  base: number;
  bonus: number;
  penalty: number;
  total: number;
  status: PayrollStatus;
  employee: {
    user: { fullName: string };
    position?: { name: string } | null;
  };
}

export interface PayrollRunDetail {
  id: string;
  period: string;
  status: PayrollStatus;
  totalSum: number;
  items: PayrollItem[];
}

export const PAYROLL_STATUS: Record<PayrollStatus, { label: string; cls: string }> = {
  DRAFT: { label: 'Qoralama', cls: 'bg-slate-100 text-slate-600' },
  APPROVED: { label: 'Tasdiqlangan', cls: 'bg-blue-100 text-brand' },
  PAID: { label: "To'langan", cls: 'bg-green-100 text-green-700' },
};

export const payrollApi = {
  runs: () => api.get<PayrollRun[]>('/payroll/runs').then((r) => r.data),
  createRun: (period: string) =>
    api.post('/payroll/runs', { period }).then((r) => r.data),
  getRun: (id: string) =>
    api.get<PayrollRunDetail>(`/payroll/runs/${id}`).then((r) => r.data),
  updateItem: (itemId: string, data: { bonus?: number; penalty?: number }) =>
    api.patch(`/payroll/items/${itemId}`, data).then((r) => r.data),
  approve: (id: string) =>
    api.patch(`/payroll/runs/${id}/approve`).then((r) => r.data),
  pay: (id: string) => api.patch(`/payroll/runs/${id}/pay`).then((r) => r.data),
  openVedomost: async (id: string, period: string) => {
    const res = await api.get(`/payroll/runs/${id}/vedomost`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.download = `vedomost-${period}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },
};
