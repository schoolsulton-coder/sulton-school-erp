import { api } from './api';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export interface ManagedUser {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  status: UserStatus;
  role: { id: string; name: string; slug: string };
  subject?: { id: string; name: string } | null;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  permissionCount: number;
  userCount: number;
}

export interface RoleDetail {
  id: string;
  name: string;
  slug: string;
  permissionSlugs: string[];
}

export interface PermissionGroup {
  group: string;
  items: { slug: string; name: string }[];
}

export const usersApi = {
  list: (params?: { search?: string; roleId?: string }) =>
    api.get<ManagedUser[]>('/users', { params }).then((r) => r.data),
  create: (data: {
    fullName: string;
    phone: string;
    email?: string;
    password: string;
    roleId: string;
    subjectId?: string;
  }) => api.post('/users', data).then((r) => r.data),
  update: (
    id: string,
    data: Partial<ManagedUser> & { roleId?: string; subjectId?: string | null },
  ) => api.patch(`/users/${id}`, data).then((r) => r.data),
  resetPassword: (id: string, password: string) =>
    api.patch(`/users/${id}/password`, { password }).then((r) => r.data),
  setStatus: (id: string, status: UserStatus) =>
    api.patch(`/users/${id}/status`, { status }).then((r) => r.data),

  roles: () => api.get<Role[]>('/roles').then((r) => r.data),
  role: (id: string) => api.get<RoleDetail>(`/roles/${id}`).then((r) => r.data),
  permissions: () =>
    api.get<PermissionGroup[]>('/permissions').then((r) => r.data),
  updateRolePermissions: (id: string, permissions: string[]) =>
    api.patch(`/roles/${id}/permissions`, { permissions }).then((r) => r.data),
};

/** Ustoz ko'rinishi: ismdan "(ustoz)" olib tashlanadi va fani qo'shiladi. */
export function teacherLabel(t: ManagedUser): string {
  const name = t.fullName.replace(/\s*\(ustoz\)\s*$/i, '').trim();
  return t.subject?.name ? `${name} — ${t.subject.name}` : name;
}

// ----- Tarjima yordamchilari -----
export const GROUP_LABEL: Record<string, string> = {
  students: "O'quvchilar",
  crm: 'CRM',
  classes: 'Sinflar',
  contracts: 'Shartnoma',
  finance: 'Moliya',
  hr: 'HR',
  payroll: 'Oylik',
  grades: 'Baholash',
  attendance: 'Davomat',
  homework: 'Vazifa',
  behavior: 'Ahloq',
  users: 'Foydalanuvchilar',
  reports: 'Hisobotlar',
};
export const ACTION_LABEL: Record<string, string> = {
  view: "ko'rish",
  create: "qo'shish",
  update: 'tahrirlash',
  delete: "o'chirish",
};
export const STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: 'Faol',
  INACTIVE: 'Nofaol',
  BLOCKED: 'Bloklangan',
};
export const STATUS_COLOR: Record<UserStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-slate-100 text-slate-500',
  BLOCKED: 'bg-red-100 text-red-700',
};
