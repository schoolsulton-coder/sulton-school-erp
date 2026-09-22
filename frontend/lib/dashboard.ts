import { api } from './api';

export interface DashParams {
  from?: string;
  to?: string;
  branchId?: string;
}

interface Change {
  value: number;
  prev: number;
  change: number | null;
}
export interface FlowBucket {
  from: string;
  to: string;
  income: number;
  expense: number;
  salary: number;
  outflow: number;
  net: number;
}
export interface DashAlert {
  level: 'danger' | 'warning' | 'info';
  title: string;
  text: string;
  kind: string;
  key?: string;
}
export interface AgingBucket {
  key: string;
  label: string;
  amount: number;
  count: number;
}

export interface CeoDashboard {
  generatedAt: string;
  period: { from: string; to: string; days: number; prevFrom: string; prevTo: string; bucketDays: number };
  branchId: string | null;
  branches: { id: string; name: string }[];
  /** joriy o'quv yili sinflari (filial bo'yicha) — O'quv jarayoni sinf filtri */
  classes: { id: string; name: string }[];
  alerts: DashAlert[];
  today: {
    cash: { som: number; usd: number; somPending: number; usdPending: number; somConfirmed: number; usdConfirmed: number; accounts: number };
    receivables: { overdue: number; dueTotal: number; ratio: number; debt: number; contracts: number; students: number };
    suppliers: { qarz: number; avans: number; farq: number; balances: number };
    expenseControl: { open: number; unpaid: number; partial: number; excess: number; incomplete: number; qarz: number; avans: number };
    external: { saldo: number; bizga: number; bizning: number; count: number };
    interbranch: { saldo: number; haqdor: number; qarzdor: number; count: number };
    enrolled: { current: { year: string; count: number }; next: { year: string; count: number } };
    runway: { months: number | null; monthlyOut: number; cash: number };
    perStudent: { value: number; income: number; students: number };
    left: { count: number; prev: number; diff: number };
    capacity: { enrolled: number; capacity: number; free: number; fill: number; classes: number };
  };
  aging: {
    receivables: { total: number; buckets: AgingBucket[] };
    suppliers: { total: number; buckets: AgingBucket[] };
  };
  result: {
    income: Change & { count: number };
    expense: Change;
    salary: Change;
    net: Change & { ratio: number };
    pending: { count: number; sum: number };
    incompleteExpenses: number;
    newContracts: { count: number; prev: number; change: number | null; sum: number };
    leads: { count: number; prev: number; change: number | null; converted: number; conversion: number };
  };
  flow: { bucketDays: number; buckets: FlowBucket[] };
  academic: {
    attendance: {
      rate: number;
      prev: number;
      change: number | null;
      total: number;
      present: number;
      late: number;
      absent: number;
      excused: number;
      trendSize: number;
      trend: { from: string; to: string; rate: number; total: number; absent: number; late: number; excused: number }[];
      classes: { id: string; name: string; rate: number; total: number; absent: number; late: number }[];
      /** sinf tanlanganda — o'quvchilar kesimi */
      students: { id: string; name: string; rate: number; total: number; absent: number; late: number }[];
    };
    grades: {
      average: number;
      prev: number;
      change: number | null;
      count: number;
      distribution: Record<'5' | '4' | '3' | '2' | '1', number>;
      excellentPct: number;
      failPct: number;
      subjects: { id: string; name: string; average: number; count: number }[];
      classes: { id: string; name: string; average: number; count: number }[];
      students: { id: string; name: string; average: number; count: number }[];
    };
    coins: {
      earned: number;
      spent: number;
      net: number;
      records: number;
      students: number;
      trend: { from: string; to: string; earned: number; spent: number }[];
      topStudents: { id: string; name: string; className: string | null; earned: number; spent: number; net: number }[];
      classes: { id: string; name: string; earned: number; spent: number; net: number; students: number }[];
      studentList: { id: string; name: string; className: string | null; earned: number; spent: number; net: number }[];
    };
    behavior: {
      month: string;
      monthLabel: string;
      limit: number;
      students: number;
      average: number;
      totalDeducted: number;
      withDeductions: number;
      buckets: { full: number; good: number; mid: number; low: number };
      classes: { id: string; name: string; students: number; deducted: number; average: number }[];
      studentList: { id: string; name: string; remaining: number; deducted: number }[];
      history: { month: string; label: string; average: number }[];
    };
  };
}

export type AcademicData = CeoDashboard['academic'] & { scope?: { classId: string; className: string } | null };

export type ColType = 'text' | 'money' | 'int' | 'num' | 'pct' | 'date' | 'badge';
export interface DetailData {
  title: string;
  subtitle?: string;
  columns: { key: string; label: string; type?: ColType }[];
  rows: (Record<string, string | number | null> & { _href?: string; _tone?: string; _drill?: string })[];
  total: number;
  truncated: boolean;
  summary?: { label: string; value: string | number; type?: ColType }[];
}

/** Detal oynasini ochish uchun so'rov: kind (+ key), ixtiyoriy boshqa sana oralig'i (grafik ustuni) */
export interface DetailReq {
  kind: string;
  key?: string;
  /** O'quv jarayoni sinf filtri */
  classId?: string;
  from?: string;
  to?: string;
}

export const dashboardApi = {
  ceo: (p: DashParams) => api.get<CeoDashboard>('/dashboard/ceo', { params: p }).then((r) => r.data),
  academic: (p: DashParams & { classId: string }) =>
    api.get<AcademicData>('/dashboard/ceo/academic', { params: p }).then((r) => r.data),
  detail: (p: DashParams & DetailReq) => api.get<DetailData>('/dashboard/ceo/detail', { params: p }).then((r) => r.data),
  exportXlsx: async (p: DashParams) => {
    const res = await api.get('/dashboard/ceo/export', { params: p, responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ceo-dashboard_${p.from ?? ''}_${p.to ?? ''}.xlsx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },
};

// ===== Formatlash =====
/** 1 112 811 641 — bo'shliq bilan (qatorga bo'linmaydi) */
export const fmt = (n: number, d = 0) => {
  const v = Number.isFinite(n) ? n : 0;
  const [i, f] = Math.abs(v).toFixed(d).split('.');
  const s = i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${v < 0 ? '−' : ''}${s}${f ? `,${f}` : ''}`;
};
export const fmtSigned = (n: number) => (n > 0 ? `+${fmt(n)}` : fmt(n));
/** 1 112 811 641 → "1,1 mlrd" */
export const fmtShort = (n: number) => {
  const a = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  const r = (v: number) => (Math.round(v * 10) / 10).toString().replace('.', ',');
  if (a >= 1e9) return `${sign}${r(a / 1e9)} mlrd`;
  if (a >= 1e6) return `${sign}${r(a / 1e6)} mln`;
  if (a >= 1e3) return `${sign}${r(a / 1e3)} ming`;
  return `${sign}${Math.round(a)}`;
};
export const fmtDate = (s: string) => s.slice(0, 10).split('-').reverse().join('.');
export const fmtDay = (s: string) => {
  const [, m, d] = s.slice(0, 10).split('-');
  return `${d}.${m}`;
};
export const fmtPct = (n: number) => `${String(n).replace('.', ',')}%`;

// ===== Sana yordamchilari (Toshkent kuni) =====
export const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
export const addDaysStr = (s: string, n: number) => {
  const d = new Date(`${s}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
