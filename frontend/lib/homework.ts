import { api } from './api';

export type SubmissionStatus =
  | 'ASSIGNED'
  | 'SUBMITTED'
  | 'CHECKED'
  | 'LATE'
  | 'MISSING';

export interface HomeworkListItem {
  id: string;
  title: string;
  subject: { name: string };
  className: string;
  dueDate: string;
  total: number;
  submitted: number;
  checked: number;
}

export interface Submission {
  id: string;
  status: SubmissionStatus;
  grade?: number | null;
  teacherNote?: string | null;
  comment?: string | null;
  files: string[];
  submittedAt?: string | null;
  student: { id: string; firstName: string; lastName: string };
}

export interface HomeworkDetail {
  id: string;
  title: string;
  description?: string | null;
  dueDate: string;
  attachments: string[];
  subject: { id: string; name: string };
  class: { id: string; name: string };
  submissions: Submission[];
  counts: { total: number; submitted: number; checked: number; missing: number };
}

export const SUB_STATUS: Record<SubmissionStatus, { label: string; cls: string }> = {
  ASSIGNED: { label: 'Berilgan', cls: 'bg-slate-100 text-slate-600' },
  SUBMITTED: { label: 'Topshirilgan', cls: 'bg-blue-100 text-brand' },
  CHECKED: { label: 'Tekshirilgan', cls: 'bg-green-100 text-green-700' },
  LATE: { label: 'Kech topshirilgan', cls: 'bg-amber-100 text-amber-700' },
  MISSING: { label: 'Topshirilmagan', cls: 'bg-red-100 text-red-700' },
};

export const homeworkApi = {
  list: (params?: { classId?: string }) =>
    api.get<HomeworkListItem[]>('/homework', { params }).then((r) => r.data),
  get: (id: string) =>
    api.get<HomeworkDetail>(`/homework/${id}`).then((r) => r.data),
  create: (data: {
    classId: string;
    subjectId: string;
    title: string;
    description?: string;
    dueDate: string;
  }) => api.post('/homework', data).then((r) => r.data),
  submit: (id: string, data: { studentId: string; comment?: string; files?: string[] }) =>
    api.post(`/homework/${id}/submit`, data).then((r) => r.data),
  grade: (
    submissionId: string,
    data: { grade?: number; teacherNote?: string; status?: SubmissionStatus },
  ) => api.patch(`/homework/submissions/${submissionId}/grade`, data).then((r) => r.data),
};
