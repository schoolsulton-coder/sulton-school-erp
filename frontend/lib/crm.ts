import { api } from './api';

export interface Manager {
  id: string;
  fullName: string;
}

export interface Lead {
  id: string;
  fullName: string;
  phone: string;
  source?: string | null;
  childAge?: number | null;
  note?: string | null;
  stageId: string;
  manager?: Manager | null;
  convertedAt?: string | null;
  createdAt: string;
}

export interface Stage {
  id: string;
  name: string;
  order: number;
  color?: string | null;
  leads: Lead[];
}

export type VisitStatus = 'PLANNED' | 'ARRIVED' | 'NO_SHOW' | 'CANCELLED';

export interface Visit {
  id: string;
  fullName: string;
  phone: string;
  filial?: string | null;
  gradeLevel?: number | null;
  whoComes?: string | null;
  scheduledAt?: string | null;
  crmUpdatedAt?: string | null;
  createdAt: string;
  visitStatus: VisitStatus;
  manager?: Manager | null;
  stage?: { name: string } | null;
}

export interface VisitsResponse {
  total: number;
  filials: string[];
  data: Visit[];
}

export interface CrmStats {
  total: number;
  converted: number;
  conversionRate: number;
  funnel: { stage: string; count: number }[];
  byFilial: { name: string; count: number }[];
  bySource: { name: string; count: number }[];
  byManager: { name: string; count: number }[];
}

export interface YearlyRow {
  year: number;
  leads: number;
  converted: number;
  conversionRate: number;
}

export interface GuardianRow {
  id: string;
  fullName: string;
  phone: string;
  relation?: string | null;
  user?: { id: string } | null;
  students: {
    student: {
      id: string;
      firstName: string;
      lastName: string;
      class?: { name: string } | null;
    };
  }[];
}

export interface PlanRow {
  id: string;
  academicYear: string;
  filial?: string | null;
  gradeLevel: number;
  plannedCount: number;
}

export interface ProgressRow extends PlanRow {
  actual: number;
  percent: number;
}

export const crmApi = {
  // Funnel (Qabul)
  board: () => api.get<Stage[]>('/crm/board').then((r) => r.data),
  stats: () => api.get<CrmStats>('/crm/stats').then((r) => r.data),
  createLead: (data: {
    fullName: string;
    phone: string;
    source?: string;
    childAge?: number;
    note?: string;
    scheduledAt?: string;
    filial?: string;
    gradeLevel?: number;
    whoComes?: string;
  }) => api.post<Lead>('/crm/leads', data).then((r) => r.data),
  moveStage: (id: string, stageId: string) =>
    api.patch(`/crm/leads/${id}/stage`, { stageId }).then((r) => r.data),
  convert: (id: string, data: { firstName?: string; lastName?: string }) =>
    api.post(`/crm/leads/${id}/convert`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/crm/leads/${id}`).then((r) => r.data),

  // Tashriflar (rejadagi / real)
  visits: (params: { status?: string; search?: string; filial?: string; from?: string }) =>
    api.get<VisitsResponse>('/crm/visits', { params }).then((r) => r.data),
  markVisit: (id: string, status: VisitStatus, visitedAt?: string) =>
    api.patch(`/crm/leads/${id}/visit`, { status, visitedAt }).then((r) => r.data),

  // Yillik / Vasiylar / Reja
  yearly: () => api.get<YearlyRow[]>('/crm/yearly').then((r) => r.data),
  guardians: () => api.get<GuardianRow[]>('/crm/guardians').then((r) => r.data),
  listPlans: (academicYear?: string) =>
    api.get<PlanRow[]>('/crm/admission-plans', { params: { academicYear } }).then((r) => r.data),
  progress: (academicYear?: string) =>
    api
      .get<ProgressRow[]>('/crm/admission-plans/progress', { params: { academicYear } })
      .then((r) => r.data),
  createPlan: (data: {
    academicYear: string;
    filial?: string;
    gradeLevel: number;
    plannedCount: number;
  }) => api.post('/crm/admission-plans', data).then((r) => r.data),
};

export const WHO_OPTIONS = ['Ota va farzand', 'Ona va farzand', 'Ota', 'Ona', 'Vasiy'];
