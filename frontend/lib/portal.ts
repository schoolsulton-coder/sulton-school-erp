import { api } from './api';

/** Ota-ona / o'quvchi portali — API va ko'rsatish yordamchilari */

export interface ChildCard {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  photo: string | null;
  classId: string | null;
  className: string | null;
  branch: string | null;
}

export interface ChildOverview extends ChildCard {
  gradeAvg: number;
  gradeScale: number;
  attendanceRate: number | null;
  behaviorRemaining: number;
  behaviorLimit: number;
  homeworkPending: number;
  debt: number;
  overdue: number;
}

export interface GradeRow {
  id: string;
  subject: string;
  value: number;
  type: string;
  typeLabel: string;
  period: string | null;
  comment: string | null;
  teacher: string | null;
  date: string;
}
export interface GradesData {
  scale: number;
  average: number;
  count: number;
  periods: string[];
  subjects: { id: string; name: string; average: number; count: number; best: number; worst: number }[];
  list: GradeRow[];
  trend: { date: string; value: number; subject: string }[];
}

export interface AttendanceData {
  month: string;
  monthLabel: string;
  months: { month: string; label: string }[];
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number | null;
  days: { date: string; status: string | null; note: string | null; isFuture: boolean }[];
  issues: { date: string; status: string; note: string | null }[];
}

export interface BehaviorData {
  month: string;
  monthLabel: string;
  limit: number;
  deducted: number;
  remaining: number;
  records: { id: string; type: string; points: number; description: string; author: string | null; date: string }[];
  history: { month: string; label: string; deducted: number; remaining: number }[];
  coins: { balance: number; records: { id: string; amount: number; reason: string; date: string }[] };
}

export interface HomeworkItem {
  id: string;
  title: string;
  subject: string;
  teacher: string | null;
  type: string;
  description: string | null;
  dueDate: string;
  status: string;
  statusLabel: string;
  grade: number | null;
  teacherNote: string | null;
  submittedAt: string | null;
  overdue: boolean;
  done: boolean;
}
export interface HomeworkData {
  list: HomeworkItem[];
  counts: { pending: number; overdue: number; submitted: number; checked: number };
}

export interface LessonRow {
  id: string;
  subject: string;
  startTime: string;
  endTime: string;
  room: string | null;
  teachers: string[];
}
export interface ScheduleDayRow {
  weekday: number;
  label: string;
  date: string | null;
  isToday: boolean;
  lessons: LessonRow[];
}
export interface ScheduleData {
  className: string | null;
  today: string;
  weeks: { id: string; startDate: string; endDate: string; isCurrent: boolean }[];
  week: { id: string; startDate: string; endDate: string; isCurrent: boolean } | null;
  days: ScheduleDayRow[];
}

export interface PaymentsData {
  debt: number;
  overdue: number;
  next: { dueDate: string; amount: number } | null;
  contracts: {
    id: string;
    number: string;
    status: string;
    monthlyAmount: number;
    installments: { id: string; dueDate: string; amount: number; paidAmount: number; remaining: number; status: string; overdue: boolean }[];
  }[];
  payments: { id: string; amount: number; method: string; date: string; confirmed: boolean }[];
}

export interface SummaryData {
  student: ChildCard;
  today: string;
  grades: { scale: number; average: number; count: number; subjects: GradesData['subjects']; recent: GradeRow[] };
  attendance: {
    month: string;
    monthLabel: string;
    rate: number | null;
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
    todayStatus: string | null;
  };
  behavior: { month: string; monthLabel: string; limit: number; remaining: number; deducted: number; records: number; coins: number };
  homework: { pending: number; overdue: number; next: HomeworkItem | null };
  schedule: {
    weekId: string | null;
    today: { label: string; date: string | null; lessons: LessonRow[] } | null;
    next: { label: string; date: string | null; lessons: LessonRow[] } | null;
  };
  payments: { debt: number; overdue: number; next: { dueDate: string; amount: number } | null };
}

const base = (studentId: string) => `/portal/student/${studentId}`;

export const portalApi = {
  children: () => api.get<ChildCard[]>('/portal/children').then((r) => r.data),
  overview: () => api.get<ChildOverview[]>('/portal/overview').then((r) => r.data),
  summary: (id: string) => api.get<SummaryData>(`${base(id)}/summary`).then((r) => r.data),
  grades: (id: string, params: { period?: string; subjectId?: string } = {}) =>
    api.get<GradesData>(`${base(id)}/grades`, { params }).then((r) => r.data),
  attendance: (id: string, month?: string) =>
    api.get<AttendanceData>(`${base(id)}/attendance`, { params: { month } }).then((r) => r.data),
  behavior: (id: string, month?: string) =>
    api.get<BehaviorData>(`${base(id)}/behavior`, { params: { month } }).then((r) => r.data),
  homework: (id: string) => api.get<HomeworkData>(`${base(id)}/homework`).then((r) => r.data),
  schedule: (id: string, weekId?: string) =>
    api.get<ScheduleData>(`${base(id)}/schedule`, { params: { weekId } }).then((r) => r.data),
  payments: (id: string) => api.get<PaymentsData>(`${base(id)}/payments`).then((r) => r.data),
};

// ===== Ko'rsatish yordamchilari =====

export const num = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0));
export const money = (n: number) => `${num(n)} so'm`;
export const dec = (n: number) => String(n).replace('.', ',');
/** "2026-09-23" → "23.09.2026" */
export const fmtDate = (s: string) => s.slice(0, 10).split('-').reverse().join('.');
/** "2026-09-23" → "23 sentabr" */
const MONTHS_GEN = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
export const fmtDay = (s: string) => {
  const [, m, d] = s.slice(0, 10).split('-');
  return `${Number(d)} ${MONTHS_GEN[Number(m) - 1]}`;
};
export const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
/** Nisbiy muddat: "bugun", "ertaga", "3 kun qoldi", "2 kun kechikdi" */
export const dueLabel = (date: string, today = todayStr()) => {
  const d = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  if (d === 0) return 'bugun';
  if (d === 1) return 'ertaga';
  if (d === -1) return 'kecha';
  return d > 0 ? `${d} kun qoldi` : `${-d} kun kechikdi`;
};

export type Tone = 'emerald' | 'sky' | 'amber' | 'rose' | 'violet' | 'slate' | 'brand';
export const TONE: Record<Tone, { text: string; bg: string; soft: string; ring: string; bar: string }> = {
  emerald: { text: 'text-emerald-700', bg: 'bg-emerald-500', soft: 'bg-emerald-50 text-emerald-700', ring: 'stroke-emerald-500', bar: 'bg-emerald-500' },
  sky: { text: 'text-sky-700', bg: 'bg-sky-500', soft: 'bg-sky-50 text-sky-700', ring: 'stroke-sky-500', bar: 'bg-sky-500' },
  amber: { text: 'text-amber-700', bg: 'bg-amber-500', soft: 'bg-amber-50 text-amber-700', ring: 'stroke-amber-500', bar: 'bg-amber-500' },
  rose: { text: 'text-rose-700', bg: 'bg-rose-500', soft: 'bg-rose-50 text-rose-700', ring: 'stroke-rose-500', bar: 'bg-rose-500' },
  violet: { text: 'text-violet-700', bg: 'bg-violet-500', soft: 'bg-violet-50 text-violet-700', ring: 'stroke-violet-500', bar: 'bg-violet-500' },
  slate: { text: 'text-slate-600', bg: 'bg-slate-400', soft: 'bg-slate-100 text-slate-600', ring: 'stroke-slate-300', bar: 'bg-slate-400' },
  brand: { text: 'text-brand', bg: 'bg-brand', soft: 'bg-brand/10 text-brand', ring: 'stroke-brand', bar: 'bg-brand' },
};

/** Baho rangi — shkalaga qarab (5 yoki 100 ballik) */
export const gradeTone = (value: number, scale: number): Tone => {
  const pct = scale === 100 ? value : (value / 5) * 100;
  if (!value) return 'slate';
  return pct >= 90 ? 'emerald' : pct >= 75 ? 'sky' : pct >= 60 ? 'amber' : 'rose';
};
export const rateTone = (rate: number | null): Tone => (rate === null ? 'slate' : rate >= 90 ? 'emerald' : rate >= 80 ? 'amber' : 'rose');
export const behaviorTone = (remaining: number, limit: number): Tone => {
  const pct = limit ? (remaining / limit) * 100 : 0;
  return pct >= 80 ? 'emerald' : pct >= 50 ? 'amber' : 'rose';
};

export const ATT: Record<string, { label: string; tone: Tone; short: string }> = {
  PRESENT: { label: 'Bor', tone: 'emerald', short: 'B' },
  LATE: { label: 'Kechikdi', tone: 'amber', short: 'K' },
  ABSENT: { label: "Yo'q", tone: 'rose', short: 'Y' },
  EXCUSED: { label: 'Sababli', tone: 'sky', short: 'S' },
};
export const HW: Record<string, { label: string; tone: Tone }> = {
  ASSIGNED: { label: 'Berilgan', tone: 'slate' },
  SUBMITTED: { label: 'Topshirilgan', tone: 'sky' },
  CHECKED: { label: 'Baholangan', tone: 'emerald' },
  MISSING: { label: 'Topshirilmagan', tone: 'rose' },
};
