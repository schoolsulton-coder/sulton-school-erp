import { api } from './api';

export type StudentStatus = 'ACTIVE' | 'GRADUATED' | 'EXPELLED' | 'ARCHIVED';

export interface StudentListItem {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  photo?: string | null;
  status: StudentStatus;
  class?: { id: string; name: string } | null;
}

export interface Guardian {
  id: string;
  fullName: string;
  phone: string;
  relation?: string | null;
}

export interface StudentListResponse {
  data: StudentListItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const STATUS_LABEL: Record<StudentStatus, string> = {
  ACTIVE: 'Faol',
  GRADUATED: 'Bitirgan',
  EXPELLED: 'Chetlatilgan',
  ARCHIVED: 'Arxiv',
};
export const STATUS_COLOR: Record<StudentStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  GRADUATED: 'bg-blue-100 text-brand',
  EXPELLED: 'bg-red-100 text-red-700',
  ARCHIVED: 'bg-slate-100 text-slate-500',
};

export const studentsApi = {
  list: (params: { page?: number; search?: string }) =>
    api
      .get<StudentListResponse>('/students', { params })
      .then((r) => r.data),
  get: (id: string) => api.get(`/students/${id}`).then((r) => r.data),
  create: (data: {
    firstName: string;
    lastName: string;
    middleName?: string;
    birthDate?: string;
    gender?: 'MALE' | 'FEMALE';
    address?: string;
    classId?: string;
  }) => api.post('/students', data).then((r) => r.data),
  update: (id: string, data: any) =>
    api.patch(`/students/${id}`, data).then((r) => r.data),
  addGuardian: (
    id: string,
    data: { fullName: string; phone: string; relation?: string; isPrimary?: boolean },
  ) => api.post(`/students/${id}/guardians`, data).then((r) => r.data),
  removeGuardian: (id: string, guardianId: string) =>
    api.delete(`/students/${id}/guardians/${guardianId}`).then((r) => r.data),

  // Portal login akkauntlari
  createAccount: (id: string, data: { phone: string; password: string }) =>
    api.post(`/students/${id}/account`, data).then((r) => r.data),
  createGuardianAccount: (guardianId: string, data: { phone?: string; password: string }) =>
    api.post(`/students/guardians/${guardianId}/account`, data).then((r) => r.data),
};
