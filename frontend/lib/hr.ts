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

export const hrApi = {
  employees: (params?: { status?: string; departmentId?: string }) =>
    api.get<Employee[]>('/hr/employees', { params }).then((r) => r.data),
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
