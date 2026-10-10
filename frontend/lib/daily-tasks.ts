import { api } from './api';

export interface DailyTask {
  id: string;
  title: string;
  coins: number;
  sort: number;
  active: boolean;
  classId: string | null;
  className: string | null;
  scope: 'school' | 'class';
}

export interface BoardStudent {
  id: string;
  name: string;
  done: string[]; // bajarilgan vazifa id'lari
  doneCount: number;
  coins: number;
}

export interface DailyBoard {
  date: string;
  today: string;
  class: { id: string; name: string };
  tasks: DailyTask[];
  students: BoardStudent[];
  totals: {
    students: number;
    tasks: number;
    done: number;
    possible: number;
    coins: number;
    maxCoins: number;
    perStudentMax: number;
  };
}

export interface DailyTaskClass {
  id: string;
  name: string;
  students: number;
}

export interface DailyStats {
  from: string;
  to: string;
  days: string[];
  tasks: (DailyTask & { done: number; coins: number; possible: number; percent: number })[];
  students: {
    id: string;
    name: string;
    done: number;
    coins: number;
    possible: number;
    percent: number;
  }[];
  daily: { date: string; done: number; coins: number }[];
  totals: { done: number; coins: number; possible: number; students: number; tasks: number };
}

export interface StudentDay {
  studentId: string;
  date: string;
  done: string[];
  coins: number;
}

export const dailyTasksApi = {
  myClasses: () => api.get<DailyTaskClass[]>('/daily-tasks/my-classes').then((r) => r.data),
  tasks: (classId?: string, all?: boolean) =>
    api.get<DailyTask[]>('/daily-tasks/tasks', { params: { classId, all } }).then((r) => r.data),
  createTask: (data: { title: string; coins: number; classId?: string }) =>
    api.post<DailyTask>('/daily-tasks/tasks', data).then((r) => r.data),
  updateTask: (id: string, data: { title?: string; coins?: number; active?: boolean; sort?: number }) =>
    api.patch<DailyTask>(`/daily-tasks/tasks/${id}`, data).then((r) => r.data),
  removeTask: (id: string) => api.delete(`/daily-tasks/tasks/${id}`).then((r) => r.data),

  board: (classId: string, date: string) =>
    api.get<DailyBoard>('/daily-tasks/board', { params: { classId, date } }).then((r) => r.data),
  mark: (data: { studentId: string; taskId: string; date: string; done: boolean }) =>
    api.post<StudentDay>('/daily-tasks/mark', data).then((r) => r.data),
  markAll: (data: { studentId: string; date: string; done: boolean }) =>
    api.post<StudentDay>('/daily-tasks/mark-all', data).then((r) => r.data),
  markBulk: (data: { date: string; items: { studentId: string; taskId: string; done: boolean }[] }) =>
    api.post<{ count: number }>('/daily-tasks/mark-bulk', data).then((r) => r.data),
  notify: (data: { classId: string; date: string }) =>
    api.post<{ sent: number; students: number }>('/daily-tasks/notify', data).then((r) => r.data),

  stats: (classId: string, from?: string, to?: string) =>
    api.get<DailyStats>('/daily-tasks/stats', { params: { classId, from, to } }).then((r) => r.data),
};

/** Maktab (Toshkent) kuni — backend bilan bir xil */
export const schoolToday = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });

/** "2026-10-10" → "10.10.2026" */
export const fmtDay = (iso: string) => iso.slice(0, 10).split('-').reverse().join('.');

/** "2026-10-10" → "Shanba, 10-okt" */
const WEEK = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const MONTH = ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek'];
export function dayLabel(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00.000Z`);
  return `${WEEK[d.getUTCDay()]}, ${d.getUTCDate()}-${MONTH[d.getUTCMonth()]}`;
}

/** Kunni surish: shiftDay('2026-10-10', -1) → '2026-10-09' */
export function shiftDay(iso: string, delta: number) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Bajarilish foiziga qarab rang */
export function doneTone(percent: number) {
  if (percent >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-600', soft: 'bg-emerald-50' };
  if (percent >= 50) return { bar: 'bg-amber-500', text: 'text-amber-600', soft: 'bg-amber-50' };
  if (percent > 0) return { bar: 'bg-orange-500', text: 'text-orange-600', soft: 'bg-orange-50' };
  return { bar: 'bg-slate-300', text: 'text-slate-400', soft: 'bg-slate-50' };
}

/** Uzun vazifa nomidan ustun sarlavhasi uchun qisqa yozuv */
export function shortTitle(title: string, words = 2) {
  const parts = title.replace(/\s*\(.*?\)\s*/g, ' ').trim().split(/\s+/);
  return parts.slice(0, words).join(' ');
}
