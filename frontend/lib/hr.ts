import { api } from './api';

export type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
export type SalaryType = 'MONTHLY' | 'HOURLY' | 'PER_LESSON';

export interface Employee {
  id: string;
  status: EmployeeStatus;
  hireDate: string;
  fireDate?: string | null;
  user: { id: string; fullName: string; phone: string; email?: string | null };
  department?: { id: string; name: string } | null;
  position?: { id: string; name: string } | null;
  salary?: { type: SalaryType; baseRate: number } | null;
}

export interface Department {
  id: string;
  name: string;
  positions: { id: string; name: string }[];
  _count: { employees: number };
}

export const SALARY_LABEL: Record<SalaryType, string> = {
  MONTHLY: 'Oylik',
  HOURLY: 'Soatbay',
  PER_LESSON: 'Darsbay',
};
export const EMP_STATUS: Record<EmployeeStatus, { label: string; cls: string }> = {
  ACTIVE: { label: 'Faol', cls: 'bg-green-100 text-green-700' },
  ON_LEAVE: { label: "Ta'tilda", cls: 'bg-amber-100 text-amber-700' },
  TERMINATED: { label: "Bo'shagan", cls: 'bg-red-100 text-red-700' },
};

export interface XodimRow {
  id: string;
  fio: string;
  gender: 'MALE' | 'FEMALE' | null;
  phone: string;
  branch: string | null;
  department: string | null;
  position: string | null;
  card: string | null;
  status: EmployeeStatus;
  salaryType: SalaryType | null;
  baseRate: number | null;
}
export interface XodimlarResp {
  totals: { xodimlar: number; lavozimlar: number; telefonBor: number; kartaBor: number };
  data: XodimRow[];
}
export const GENDER_LABEL: Record<string, string> = { MALE: 'Erkak', FEMALE: 'Ayol' };

export interface LavozimRow {
  id: string;
  fio: string;
  phone: string;
  position: string | null;
  department: string;
  branch: string | null;
  hisobKitob: SalaryType | null;
  stavka: number | null;
  formal: boolean;
  status: EmployeeStatus;
}
export interface LavozimlarResp {
  totals: { jamiLavozimlar: number; faolLavozimlar: number; faolXodimlar: number; boshagan: number; asosiyHisobKitob: number };
  data: LavozimRow[];
}

export interface ShartnomaRow {
  id: string;
  date: string;
  number: string;
  xodim: string;
  position: string | null;
  type: string;
  employment: string | null;
  stavka: number | null;
  branch: string | null;
  status: string;
}
export interface ShartnomalarResp {
  totals: { jami: number; yaratilgan: number; ozgartirilgan: number; bekor: number };
  data: ShartnomaRow[];
}
export interface TolovRow {
  id: string;
  date: string;
  xodim: string;
  branch: string | null;
  kassa: string;
  somAmount: number;
  dollarAmount: number;
  dollarRate: number;
  jami: number;
  periodYear: number | null;
  periodMonth: number | null;
}
export interface TolovlarResp {
  totals: { somdaBerilgan: number; naqd: number; karta: number; bank: number; dollar: number; jami: number; count: number };
  data: TolovRow[];
}

export interface OylikRow {
  id: string;
  xodim: string;
  position: string | null;
  branch: string | null;
  department: string | null;
  ishlagan: number;
  bonusJarima: number;
  ovqat: number;
  jami: number;
  berildi: number;
  qoldiq: number;
  naqd: number;
  karta: number;
  confirmed: boolean;
}
export interface OylikListResp {
  totals: { jamiHisoblar: number; jamiSumma: number; naqd: number; karta: number; berilgan: number; ortiqcha: number; ovqatUshlanma: number };
  data: OylikRow[];
}
export interface OylikDetail {
  id: string;
  period: string;
  xodim: string;
  position: string | null;
  branch: string | null;
  department: string | null;
  ishchiKunlar: number;
  ishlaganKun: number;
  ishlaganSoat: number;
  asosiyOylik: number;
  kunlik: number;
  soatlikNarx: number;
  asosiyHisob: number;
  soatlikHisob: number;
  rasmiyHisob: number;
  soliqKim: string | null;
  kpi: number;
  bonus: number;
  ovqatPuli: number;
  tatilKartaga: number;
  tatilNaqd: number;
  ijara: number;
  transport: number;
  jarima: number;
  soliq: number;
  naqd: number;
  karta: number;
  hisoblangan: number;
  berildi: number;
  buOyBalansi: number;
  avvalgiQoldiq: number;
  oyYakuniBalans: number;
  confirmed: boolean;
  payments: { id: string; date: string; amount: number }[];
}

export const CONTRACT_STATUS: Record<string, { label: string; cls: string }> = {
  YARATILGAN: { label: 'Yaratilgan', cls: 'bg-emerald-50 text-emerald-600' },
  OZGARTIRILGAN: { label: "O'zgartirilgan", cls: 'bg-amber-50 text-amber-600' },
  BEKOR: { label: 'Bekor qilingan', cls: 'bg-rose-50 text-rose-600' },
};

export const hrApi = {
  employees: (params?: { status?: string; departmentId?: string }) =>
    api.get<Employee[]>('/hr/employees', { params }).then((r) => r.data),
  xodimlar: (params?: { search?: string; branchId?: string }) =>
    api.get<XodimlarResp>('/hr/xodimlar', { params }).then((r) => r.data),
  lavozimlar: (params?: { search?: string; branchId?: string; departmentId?: string; status?: string }) =>
    api.get<LavozimlarResp>('/hr/lavozimlar', { params }).then((r) => r.data),
  shartnomalar: (params?: { search?: string; branchId?: string; type?: string; employment?: string }) =>
    api.get<ShartnomalarResp>('/hr/shartnomalar', { params }).then((r) => r.data),
  tolovlar: (params?: { search?: string; branchId?: string; kassa?: string; year?: string; month?: string }) =>
    api.get<TolovlarResp>('/hr/tolovlar', { params }).then((r) => r.data),
  oylikList: (params: { period: string; branchId?: string; search?: string }) =>
    api.get<OylikListResp>('/hr/oylik', { params }).then((r) => r.data),
  oylikHisoblash: (period: string, branchId?: string) =>
    api.post('/hr/oylik/hisoblash', null, { params: { period, branchId } }).then((r) => r.data),
  oylikDetail: (id: string) => api.get<OylikDetail>(`/hr/oylik/${id}`).then((r) => r.data),
  oylikConfirm: (id: string, confirm: boolean) =>
    api.post(`/hr/oylik/${id}/confirm`, { confirm }).then((r) => r.data),
  employee: (id: string) => api.get(`/hr/employees/${id}`).then((r) => r.data),
  hire: (data: {
    fullName: string;
    phone: string;
    password: string;
    roleId: string;
    hireDate: string;
    departmentId?: string;
    positionId?: string;
    salaryType?: SalaryType;
    baseRate?: number;
  }) => api.post('/hr/employees', data).then((r) => r.data),
  setSalary: (id: string, data: { type: SalaryType; baseRate: number }) =>
    api.patch(`/hr/employees/${id}/salary`, data).then((r) => r.data),
  terminate: (id: string, fireDate?: string) =>
    api.patch(`/hr/employees/${id}/terminate`, { fireDate }).then((r) => r.data),
  addDocument: (id: string, data: { type: string; fileName: string; filePath: string }) =>
    api.post(`/hr/employees/${id}/documents`, data).then((r) => r.data),

  departments: () => api.get<Department[]>('/hr/departments').then((r) => r.data),
  createDepartment: (name: string) =>
    api.post('/hr/departments', { name }).then((r) => r.data),
  positions: () => api.get('/hr/positions').then((r) => r.data),
  createPosition: (data: { name: string; departmentId?: string }) =>
    api.post('/hr/positions', data).then((r) => r.data),
};
