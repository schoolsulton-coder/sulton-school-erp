import { api } from './api';

/** Har o'quvchiga oyiga beriladigan ahloqiy ball — qoidabuzarlik uchun shundan ayiriladi */
export const BEHAVIOR_LIMIT = 100;

const UZ_MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

/** Joriy oy (Toshkent vaqti) — "YYYY-MM" */
export const currentMonth = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' }).slice(0, 7);

/** "2026-09" → "Sentabr 2026" */
export const monthLabelOf = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return `${UZ_MONTHS[(m || 1) - 1]} ${y}`;
};

/** Ballga qarab rang: 80+ yashil, 50+ sariq, qolgani qizil */
export const scoreTone = (r: number) =>
  r >= 80 ? 'text-emerald-600' : r >= 50 ? 'text-amber-600' : 'text-red-600';
export const scoreBar = (r: number) =>
  r >= 80 ? 'bg-emerald-500' : r >= 50 ? 'bg-amber-500' : 'bg-red-500';

export interface BehaviorRecord {
  id: string;
  /** NEGATIVE — ayirish; POSITIVE — eski yozuv (ballga ta'sir qilmaydi) */
  type: 'POSITIVE' | 'NEGATIVE';
  points: number;
  description: string;
  date: string;
  createdAt?: string;
  student: { id: string; firstName: string; lastName: string; class?: { name: string } | null };
  author?: { fullName: string } | null;
}

/** Bir oylik ball holati */
export interface BehaviorMonthly {
  month: string; // "2026-09"
  monthLabel: string; // "Sentabr 2026"
  limit: number; // 100
  deducted: number;
  remaining: number;
}

export interface BehaviorSummary extends BehaviorMonthly {
  score: number;
  count: number;
  history: BehaviorMonthly[]; // joriy oydan orqaga 6 oy
  records: BehaviorRecord[];
}

export interface BehaviorStats {
  month: string;
  monthLabel: string;
  limit: number;
  students: number;
  averageRemaining: number;
  totalDeducted: number;
  withDeductions: number;
  records: number;
  buckets: { full: number; good: number; mid: number; low: number };
  ranking: { id: string; name: string; deducted: number; remaining: number; records: number }[];
}

export interface RankingItem {
  id: string;
  firstName: string;
  lastName: string;
  deducted: number;
  remaining: number;
  score: number;
}

export const behaviorApi = {
  list: (params?: { studentId?: string; type?: string; classId?: string; from?: string; to?: string }) =>
    api.get<BehaviorRecord[]>('/behavior', { params }).then((r) => r.data),
  classStats: (classId: string, month?: string) =>
    api.get<BehaviorStats>(`/behavior/class/${classId}/stats`, { params: { month } }).then((r) => r.data),
  studentSummary: (studentId: string, month?: string) =>
    api.get<BehaviorSummary>(`/behavior/student/${studentId}`, { params: { month } }).then((r) => r.data),
  /** Ball ayirish (oylik 100 balldan) */
  create: (data: { studentId: string; points: number; description: string; date?: string }) =>
    api
      .post<BehaviorRecord & { monthly: BehaviorMonthly }>('/behavior', { ...data, type: 'NEGATIVE' })
      .then((r) => r.data),
  classRanking: (classId: string) =>
    api.get<RankingItem[]>(`/behavior/class/${classId}/ranking`).then((r) => r.data),
  remove: (id: string) => api.delete(`/behavior/${id}`).then((r) => r.data),
};
