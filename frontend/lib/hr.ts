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
export interface OylikStatus {
  hisoblangan: number;
  olingan: number;
  qoldiq: number;
  avvalgi: number;
  oyYakuni: number;
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
  soliq: number;
  rasmiy: number;
  kunlik: number;
  confirmed: boolean;
  hisobKitob: string | null;
  // inline tahrir
  ishchiKunlar: number;
  ishlaganKun: number;
  ishlaganSoat: number;
  asosiyOylik: number;
  soatlikNarx: number;
  kpi: number;
  bonus: number;
  ovqatPuli: number;
  ijara: number;
  transport: number;
  jarima: number;
  note: string | null;
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

export interface OylikPreviewRow {
  id: string;
  fio: string;
  position: string | null;
  hisobKitob: SalaryType | null;
  stavka: number | null;
  exists: boolean;
}
export interface OylikPreviewResp {
  ishchiKunlar: number;
  yaratiladi: number;
  allaqachonBor: number;
  data: OylikPreviewRow[];
}

export interface Oylik10Month {
  period: string;
  xodim: number;
  hisoblangan: number;
  tasdiqlangan: number;
  tasdiqlashga: number;
}
export interface Oylik10Resp {
  totals: { jami: number; ortacha: number; xodimlar: number; toldirilgan: number };
  months: Oylik10Month[];
}
export interface UmumiyResp {
  xodimlar: number;
  hisoblangan: number;
  berilgan: number;
  qoldiq: number;
  shartnomalar: number;
  period: string;
}

export const SHARTNOMA_TURLARI = [
  'Mehnat shartnomasi',
  'Ishga qabul qilish',
  "Ishdan bo'shash to'g'risida",
  "Qo'shimcha kelishuv",
  "Boshqa lavozimga o'tkazish",
  "Boshqa Stavkaga o'tkazish",
  "Homiladorlik va tug'ruq ta'tili berish",
  'Fuqarolik shartnomasi',
];
export const SHARTNOMA_HOLATLARI: { label: string; value: string }[] = [
  { label: 'Yaratish', value: 'YARATILGAN' },
  { label: "O'zgartirish", value: 'OZGARTIRILGAN' },
  { label: 'Bekor qilish', value: 'BEKOR' },
];
export const BANDLIK_TURLARI = ["To'liq stavka", 'Yarim stavka', '0.25 stavka', "O'rindoshlik"];
export const HISOB_KITOB_TURLARI = ['Kunbay', 'Soatbay', 'Ishbay', 'KPI'];
export interface EmployeeNote {
  id: string;
  text: string;
  createdAt: string;
  author?: { fullName: string } | null;
}

export const SOLIQ_KIM = ["O'zi", 'Kompaniya']; // O'zi -> rasmiy oylikdan 12% soliq; Kompaniya -> to'liq kartaga
// Xodim shaxsiy hujjat turlari (preset — yozib ham qo'shsa bo'ladi)
export const XODIM_DOC_TYPES = ['Pasport', 'Diplom', 'IELTS', 'TOEFL', 'TESOL', 'CELTA', 'C1', 'B2', 'Rezyume', 'Narkologik', 'Ruhiy', 'Sudlanmaganlik', 'Tibbiy ma\'lumotnoma', 'Boshqa'];
export const SHARTNOMA_TILLARI = ["O'zbekcha", 'Ruscha', 'Inglizcha'];

export interface LavozimKelishuv {
  hisobKitob: string | null;
  type: SalaryType;
  baseRate: number;
  rasmiyOyligi: number | null;
  soliqKim: string | null;
  startDate: string | null;
  endDate: string | null;
  note: string | null;
  formal: boolean;
}
export interface LavozimDetail {
  id: string;
  fio: string;
  phone: string | null;
  position: string | null;
  department: string | null;
  branch: string | null;
  formal: boolean;
  kimIshlaydi: string | null;
  employment: string | null;
  kelishuv: LavozimKelishuv | null;
  cards: { stavka: number; jamiHisob: number; jamiBerilgan: number; qoldiqBalans: number; oyCount: number; tolovCount: number };
  oylar: { id: string; period: string; hisoblangan: number; berilgan: number; qoldiq: number; davrBalansi: number; confirmed: boolean }[];
  hujjatlar: { id: string; type: string; number: string; date: string; status: string; stavka: number | null }[];
}

// Bitta kelishuv (joriy) maydonlari — create/edit uchun umumiy
export interface KelishuvForm {
  startDate: string;
  endDate: string;
  formal: boolean;
  hisobKitob: string; // Kunbay | Soatbay | Ishbay | KPI
  baseRate: string; // Kunbay/Ishbay/KPI = o'zgarmas oylik, Soatbay = soat narxi
  rasmiyOyligi: string;
  soliqKim: string;
  note: string;
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
  createShartnoma: (data: any) => api.post('/hr/shartnomalar', data).then((r) => r.data),
  createXodim: (data: any) => api.post('/hr/xodim', data).then((r) => r.data),
  createLavozim: (data: any) => api.post('/hr/lavozim', data).then((r) => r.data),
  updateKelishuv: (employeeId: string, data: any) => api.patch(`/hr/kelishuv/${employeeId}`, data).then((r) => r.data),
  lavozimDetail: (employeeId: string) => api.get<LavozimDetail>(`/hr/lavozim/${employeeId}/detail`).then((r) => r.data),
  tolovlar: (params?: { search?: string; branchId?: string; kassa?: string; year?: string; month?: string }) =>
    api.get<TolovlarResp>('/hr/tolovlar', { params }).then((r) => r.data),
  createTolov: (data: any) => api.post('/hr/tolovlar', data).then((r) => r.data),
  oylikStatus: (employeeId: string, period: string) =>
    api.get<OylikStatus>('/hr/oylik-status', { params: { employeeId, period } }).then((r) => r.data),
  oylikList: (params: { period: string; branchId?: string; search?: string }) =>
    api.get<OylikListResp>('/hr/oylik', { params }).then((r) => r.data),
  oylikPreview: (params: { period: string; branchId?: string; departmentId?: string }) =>
    api.get<OylikPreviewResp>('/hr/oylik-preview', { params }).then((r) => r.data),
  oylikHisoblash: (dto: { period: string; branchId?: string; departmentId?: string; ishchiKunlar?: number; employeeIds?: string[] }) =>
    api.post('/hr/oylik/hisoblash', dto).then((r) => r.data),
  oylikDetail: (id: string) => api.get<OylikDetail>(`/hr/oylik/${id}`).then((r) => r.data),
  oylikConfirm: (id: string, confirm: boolean) =>
    api.post(`/hr/oylik/${id}/confirm`, { confirm }).then((r) => r.data),
  updateOylik: (id: string, patch: Record<string, any>) =>
    api.patch(`/hr/oylik/${id}`, patch).then((r) => r.data),
  deleteOylik: (id: string) => api.delete(`/hr/oylik/${id}`).then((r) => r.data),
  oylik10: (academicYear: string, branchId?: string) =>
    api.get<Oylik10Resp>('/hr/oylik-10', { params: { academicYear, branchId } }).then((r) => r.data),
  maoshUmumiy: (period: string, branchId?: string) =>
    api.get<UmumiyResp>('/hr/maosh-umumiy', { params: { period, branchId } }).then((r) => r.data),
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
  deleteDocument: (docId: string) =>
    api.delete(`/hr/employees/documents/${docId}`).then((r) => r.data),
  notes: (id: string) => api.get<EmployeeNote[]>(`/hr/employees/${id}/notes`).then((r) => r.data),
  addNote: (id: string, text: string) => api.post(`/hr/employees/${id}/notes`, { text }).then((r) => r.data),
  deleteNote: (noteId: string) => api.delete(`/hr/employees/notes/${noteId}`).then((r) => r.data),

  departments: () => api.get<Department[]>('/hr/departments').then((r) => r.data),
  createDepartment: (name: string) =>
    api.post('/hr/departments', { name }).then((r) => r.data),
  positions: () => api.get('/hr/positions').then((r) => r.data),
  createPosition: (data: { name: string; departmentId?: string }) =>
    api.post('/hr/positions', data).then((r) => r.data),
};
