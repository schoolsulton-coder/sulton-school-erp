import { api } from './api';

export type GradeType = 'DAILY' | 'QUARTER' | 'SEMESTER' | 'YEAR' | 'EXAM';

export interface GradebookRow {
  id: string;
  firstName: string;
  lastName: string;
  grades: { id: string; value: number; type: GradeType; date: string; comment?: string | null }[];
  average: number;
}

export interface StudentGradeReport {
  overall: number;
  subjects: { subject: { id: string; name: string }; average: number; count: number }[];
  progress: { date: string; value: number; subject: string }[];
  totalGrades: number;
}

export const GRADE_TYPE_LABEL: Record<GradeType, string> = {
  DAILY: 'Kunlik',
  QUARTER: 'Chorak',
  SEMESTER: 'Yarim yillik',
  YEAR: 'Yillik',
  EXAM: 'Imtihon',
};

export const gradesApi = {
  gradebook: (classId: string, subjectId: string) =>
    api.get<GradebookRow[]>(`/grades/class/${classId}/subject/${subjectId}`).then((r) => r.data),
  studentReport: (studentId: string) =>
    api.get<StudentGradeReport>(`/grades/student/${studentId}/report`).then((r) => r.data),
  bulk: (data: {
    subjectId: string;
    type?: GradeType;
    period?: string;
    date?: string;
    items: { studentId: string; value: number; comment?: string }[];
  }) => api.post('/grades/bulk', data).then((r) => r.data),
  remove: (id: string) => api.delete(`/grades/${id}`).then((r) => r.data),
};

export const gradeColor = (v: number) =>
  v >= 85 ? 'text-green-600' : v >= 70 ? 'text-brand' : v >= 55 ? 'text-amber-600' : 'text-red-600';
