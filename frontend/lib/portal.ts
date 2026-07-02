import { api } from './api';
import type { StudentGradeReport } from './grades';
import type { AttReport } from './attendance';

export interface OverviewCard {
  id: string;
  firstName: string;
  lastName: string;
  className: string | null;
  gradeAvg: number;
  attendanceRate: number;
  behaviorScore: number;
  homeworkPending: number;
  debt: number;
}

export interface PortalDetail {
  grades: StudentGradeReport;
  attendance: AttReport;
  behavior: {
    score: number;
    positive: number;
    negative: number;
    count: number;
    records: { id: string; type: string; points: number; description: string; date: string }[];
  };
  submissions: {
    id: string;
    status: string;
    grade?: number | null;
    homework: { title: string; dueDate: string; subject: { name: string } };
  }[];
  contracts: {
    id: string;
    number: string;
    installments: { id: string; dueDate: string; amount: number; paidAmount: number; status: string }[];
  }[];
}

export const portalApi = {
  overview: () => api.get<OverviewCard[]>('/portal/overview').then((r) => r.data),
  detail: (studentId: string) =>
    api.get<PortalDetail>(`/portal/student/${studentId}`).then((r) => r.data),
};
