import { api } from './api';

export type CellState = 'paid' | 'partial' | 'unpaid';

export interface DebtCell {
  key: string; // YYYY-MM
  amount: number;
  paid: number;
  remaining: number;
  state: CellState;
  overdue: boolean;
}

export interface DebtorRow {
  contractId: string;
  number: string;
  studentId: string;
  firstName: string;
  lastName: string;
  className: string | null;
  academicYear: string | null;
  branchId: string | null;
  branchName: string | null;
  startDate: string;
  status: string;
  total: number;
  paid: number;
  debt: number;
  overdueMonths: number;
  cells: DebtCell[];
  lastContact: { type: string; note: string; createdAt: string; author: string | null } | null;
  contactCount: number;
  contactedToday: boolean;
}

export interface DebtorsData {
  rows: DebtorRow[];
  branches: { id: string; name: string }[];
  academicYears: string[];
  stats: { debtors: number; contactedToday: number };
  today: string;
}

export interface DebtorContact {
  id: string;
  type: string;
  note: string;
  createdAt: string;
  author: { fullName: string } | null;
}

export const CONTACT_TYPES = [
  { key: 'CALL', label: "Qo'ng'iroq" },
  { key: 'TELEGRAM', label: 'Telegram' },
  { key: 'SMS', label: 'SMS' },
  { key: 'MEETING', label: 'Uchrashuv' },
  { key: 'OTHER', label: 'Boshqa' },
];
export const contactTypeLabel = (t: string) =>
  CONTACT_TYPES.find((x) => x.key === t)?.label ?? 'Boshqa';

export const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'Ishda', cls: 'bg-green-100 text-green-700' },
  COMPLETED: { label: 'Yakunlangan', cls: 'bg-slate-100 text-slate-600' },
  SUSPENDED: { label: 'Band', cls: 'bg-amber-100 text-amber-700' },
  TEMP_SUSPENDED: { label: 'Vaqtincha band', cls: 'bg-amber-100 text-amber-700' },
  LEFT: { label: 'Ketgan', cls: 'bg-red-100 text-red-700' },
  OTHER: { label: 'Boshqa', cls: 'bg-slate-100 text-slate-600' },
};

export const debtorsApi = {
  list: () => api.get<DebtorsData>('/debtors').then((r) => r.data),
  contacts: (studentId: string) =>
    api.get<DebtorContact[]>(`/debtors/${studentId}/contacts`).then((r) => r.data),
  addContact: (studentId: string, data: { type: string; note: string }) =>
    api.post<DebtorContact>(`/debtors/${studentId}/contacts`, data).then((r) => r.data),
  removeContact: (id: string) => api.delete(`/debtors/contacts/${id}`).then((r) => r.data),
};

const MONTHS_UZ = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

/** Oy ustunlarini satrlar cellslaridan tuzadi (sana bo'yicha o'sish tartibida) */
export function buildMonthColumns(rows: DebtorRow[]): { key: string; label: string; year: string }[] {
  const set = new Set<string>();
  rows.forEach((r) => r.cells.forEach((c) => set.add(c.key)));
  return [...set].sort().map((key) => {
    const [y, m] = key.split('-');
    return { key, label: MONTHS_UZ[Number(m) - 1] ?? m, year: y };
  });
}

export const money = (n: number) =>
  new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0)) + " so'm";

/** Ixcham summa: 2.7M / 340K / 500 */
export const moneyShort = (n: number) => {
  const v = Math.round(n || 0);
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return (Number.isInteger(m) ? m.toString() : m.toFixed(1)) + 'M';
  }
  if (v >= 1_000) return Math.round(v / 1000) + 'K';
  return String(v);
};

export function daysAgo(iso: string): number {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}
export function daysAgoLabel(iso: string): string {
  const d = daysAgo(iso);
  return d === 0 ? 'Bugun' : `${d} kun oldin`;
}

export function fmtDate(iso: string): string {
  const s = new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
  const [y, m, d] = s.split('-');
  return `${d}.${m}.${y}`;
}
