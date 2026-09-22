import { BadRequestException } from '@nestjs/common';
import { ContractStatus, GradeType } from '@prisma/client';
import { addDays, dayFromStr, schoolToday, ymd } from '../../common/schedule-weeks';

/**
 * CEO dashboard uchun umumiy yordamchilar.
 *
 * Sana qoidalari (loyihadagi boshqa bo'limlar bilan bir xil):
 *  - "kun" sifatida saqlanadigan maydonlar (Payment.paidAt, ExpensePayment.paidAt, SalaryPayment.date,
 *    Attendance.date, Grade.date, dueDate) — Toshkent kuni UTC 00:00 da → [dayStart, dayEnd] oralig'i;
 *  - aniq vaqt maydonlari (createdAt, convertedAt, statusChangedAt) — Toshkent 00:00 → [instantStart, instantEnd].
 */

export const DAY_MS = 86_400_000;
const TZ_MS = 5 * 3600_000; // Toshkent UTC+5, yozgi vaqt yo'q

export interface Range {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD (kiradi)
}

export interface Ctx extends Range {
  days: number;
  prev: Range;
  today: string;
  branchId?: string;
  bucketDays: number;
}

/** Faol shartnoma deb sanaladigan holatlar: Faol (+to'liq to'langan), Band, Vaqtincha band */
export const ENROLLED_STATUSES: ContractStatus[] = ['ACTIVE', 'COMPLETED', 'SUSPENDED', 'TEMP_SUSPENDED'];
/** "Ketganlar": bekor qilgan, ketgan (aniqlashga) va nofaol bo'lganlar */
export const LEFT_STATUSES: ContractStatus[] = ['CANCELLED', 'LEFT', 'INACTIVE'];
/** Davr o'rtachasi uchun kundalik baholar (chorak/yillik yakuniy baholar ikki marta sanalmasin) */
export const GRADE_TYPES: GradeType[] = ['DAILY', 'HOMEWORK', 'EXAM'];
/** Baho shkalasi 1–5 — undan tashqaridagi qiymatlar (import xatolari) o'rtachani buzmasin */
export const GRADE_MIN = 1;
export const GRADE_MAX = 5;

export const dayStart = (s: string) => dayFromStr(s);
export const dayEnd = (s: string) => new Date(`${s.slice(0, 10)}T23:59:59.999Z`);
export const instantStart = (s: string) => new Date(dayStart(s).getTime() - TZ_MS);
export const instantEnd = (s: string) => new Date(dayEnd(s).getTime() - TZ_MS);

export const somEq = (amount?: number | null, usd?: number | null, rate?: number | null) =>
  (amount ?? 0) + (usd ?? 0) * (rate ?? 0);
export const round = (n: number, d = 0) => {
  const k = 10 ** d;
  return Math.round(n * k) / k;
};
export const pct = (a: number, b: number, d = 1) => (b ? round((a / b) * 100, d) : 0);
/** Oldingi davrga nisbatan o'zgarish, % (oldingi 0 bo'lsa — null) */
export const change = (cur: number, prev: number) => (prev ? round(((cur - prev) / Math.abs(prev)) * 100, 1) : null);

/** O'quv yili: iyundan boshlab keyingi yil qabuli (2026-09 → "2026-2027") — shartnomalar sahifasi bilan bir xil */
export function academicYearOf(day: string) {
  const [y, m] = day.split('-').map(Number);
  const s = m >= 6 ? y : y - 1;
  return `${s}-${s + 1}`;
}
export const nextAcademicYear = (year: string) => {
  const s = Number(year.slice(0, 4)) + 1;
  return `${s}-${s + 1}`;
};

/** Grafikdagi guruh uzunligi (kun): 30 kun → 3 kunlik guruhlar */
export const bucketSize = (days: number) => (days <= 10 ? 1 : days <= 31 ? 3 : days <= 93 ? 7 : days <= 200 ? 14 : 30);

const isDay = (s?: string): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export function resolveCtx(q: { from?: string; to?: string; branchId?: string }): Ctx {
  const today = ymd(schoolToday());
  const to = isDay(q.to) ? q.to : today;
  const from = isDay(q.from) ? q.from : ymd(addDays(dayFromStr(to), -29));
  if (from > to) throw new BadRequestException("Boshlanish sanasi tugash sanasidan keyin bo'lmasin");
  const days = Math.round((dayFromStr(to).getTime() - dayFromStr(from).getTime()) / DAY_MS) + 1;
  if (days > 731) throw new BadRequestException('Davr 2 yildan oshmasin');
  const prevTo = ymd(addDays(dayFromStr(from), -1));
  const prevFrom = ymd(addDays(dayFromStr(prevTo), -(days - 1)));
  return {
    from,
    to,
    days,
    prev: { from: prevFrom, to: prevTo },
    today,
    branchId: q.branchId || undefined,
    bucketDays: bucketSize(days),
  };
}

export function makeBuckets(from: string, to: string, size: number): Range[] {
  const out: Range[] = [];
  const end = dayFromStr(to);
  let cur = dayFromStr(from);
  while (cur <= end) {
    const last = addDays(cur, size - 1);
    const bEnd = last > end ? end : last;
    out.push({ from: ymd(cur), to: ymd(bEnd) });
    cur = addDays(bEnd, 1);
  }
  return out;
}

/** Sana qaysi guruhga tushadi (UTC kuni bo'yicha — filtr bilan bir xil) */
export const bucketIndex = (d: Date, from: string, size: number, count: number) =>
  Math.min(count - 1, Math.max(0, Math.floor((d.getTime() - dayFromStr(from).getTime()) / DAY_MS / size)));

/** Davomat foizi — davomat bo'limi bilan bir xil: sababli (EXCUSED) maxrajdan chiqariladi */
export interface AttCount {
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
}
export const attBlank = (): AttCount => ({ total: 0, present: 0, late: 0, absent: 0, excused: 0 });
export function attAdd(acc: AttCount, status: string, n: number) {
  acc.total += n;
  const k = status.toLowerCase() as keyof AttCount;
  if (k in acc && k !== 'total') acc[k] += n;
}
export function attRate(c: AttCount, d = 0) {
  const denom = c.total - c.excused;
  return denom > 0 ? round(((c.present + c.late) / denom) * 100, d) : c.total > 0 ? 100 : 0;
}

/** Xarajat hujjati holati — xarajatlar bo'limi bilan bir xil qoida */
export type ExpenseStatus = 'INCOMPLETE' | 'UNPAID' | 'PARTIAL' | 'CLOSED' | 'EXCESS';
export function expenseStatus(total: number, paid: number): ExpenseStatus {
  if (total <= 0) return 'INCOMPLETE';
  if (paid <= 0) return 'UNPAID';
  if (paid > total + 0.001) return 'EXCESS';
  if (paid >= total - 0.001) return 'CLOSED';
  return 'PARTIAL';
}
export const EXPENSE_STATUS_LABEL: Record<ExpenseStatus, string> = {
  INCOMPLETE: "Noto'liq",
  UNPAID: "To'lovsiz",
  PARTIAL: 'Qisman',
  CLOSED: 'Yopilgan',
  EXCESS: 'Ortiqcha',
};

/** Hujjat yoshi bo'yicha guruh (kun) */
export function ageBucket(days: number) {
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}
export const AGE_BUCKETS = [
  { key: '0-30', label: '0–30 kun' },
  { key: '31-60', label: '31–60 kun' },
  { key: '61-90', label: '61–90 kun' },
  { key: '90+', label: "90 kundan ko'p" },
];

/** "2026-09" + (-1) → "2026-08" */
export function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Ogohlantirishlar matni uchun: 1 112 811 641 → "1,1 mlrd so'm" */
export function shortMoney(n: number) {
  const a = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  const fmt = (v: number) => (Math.round(v * 10) / 10).toString().replace('.', ',');
  if (a >= 1e9) return `${sign}${fmt(a / 1e9)} mlrd so'm`;
  if (a >= 1e6) return `${sign}${fmt(a / 1e6)} mln so'm`;
  if (a >= 1e3) return `${sign}${fmt(a / 1e3)} ming so'm`;
  return `${sign}${Math.round(a)} so'm`;
}

export const fullName = (s: { lastName: string; firstName: string }) => `${s.lastName} ${s.firstName}`;
