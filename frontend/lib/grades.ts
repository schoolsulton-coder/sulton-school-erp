import { api } from './api';

export type GradeType = 'DAILY' | 'HOMEWORK' | 'QUARTER' | 'SEMESTER' | 'YEAR' | 'EXAM';

export interface GradeCell {
  id: string;
  value: number;
  type: GradeType;
  date: string;
  comment?: string | null;
}

export interface GradebookRow {
  id: string;
  firstName: string;
  lastName: string;
  grades: GradeCell[];
  average: number;
}

export interface StudentGradeReport {
  overall: number;
  subjects: { subject: { id: string; name: string }; average: number; count: number }[];
  progress: { date: string; value: number; subject: string }[];
  totalGrades: number;
}

export interface MySubjects {
  canGradeAll: boolean;
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  assignments: { classId: string; className: string; subjectId: string; subjectName: string }[];
}

export const GRADE_TYPE_LABEL: Record<GradeType, string> = {
  DAILY: 'Kunlik',
  HOMEWORK: 'Uyga vazifa',
  EXAM: 'Nazorat',
  QUARTER: 'Chorak',
  YEAR: 'Yillik',
  SEMESTER: 'Yarim yillik',
};

// Jurnal selektorida ko'rinadigan turlar (tartib bilan)
export const GRADE_TYPES: { key: GradeType; label: string }[] = [
  { key: 'DAILY', label: 'Kunlik' },
  { key: 'HOMEWORK', label: 'Uy vazifa' },
  { key: 'EXAM', label: 'Nazorat' },
  { key: 'QUARTER', label: 'Chorak' },
  { key: 'YEAR', label: 'Yillik' },
];

export const CHORAK_OPTIONS = ['1-chorak', '2-chorak', '3-chorak', '4-chorak'];

export interface ClassStats {
  average: number;
  count: number;
  excellentPct: number;
  failPct: number;
  distribution: Record<string, number>; // {5:n,4:n,3:n,2:n,1:n}
  students: { id: string; name: string; average: number; count: number }[];
  bySubject: { name: string; average: number; count: number }[];
}

export const gradesApi = {
  mySubjects: () => api.get<MySubjects>('/grades/my-subjects').then((r) => r.data),
  classStats: (
    classId: string,
    params: { subjectId?: string; type?: string; from?: string; to?: string; period?: string },
  ) => api.get<ClassStats>(`/grades/class/${classId}/stats`, { params }).then((r) => r.data),
  gradebook: (classId: string, subjectId: string, type?: string) =>
    api
      .get<GradebookRow[]>(`/grades/class/${classId}/subject/${subjectId}`, { params: { type } })
      .then((r) => r.data),
  studentReport: (studentId: string) =>
    api.get<StudentGradeReport>(`/grades/student/${studentId}/report`).then((r) => r.data),
  bulk: (data: {
    subjectId: string;
    classId?: string;
    type?: GradeType;
    period?: string;
    date?: string;
    items: { studentId: string; value: number; comment?: string }[];
  }) => api.post<{ saved: number }>('/grades/bulk', data).then((r) => r.data),
  update: (id: string, data: { value?: number; comment?: string }) =>
    api.patch(`/grades/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/grades/${id}`).then((r) => r.data),
};

// 5 balli rang
export const gradeColor = (v: number) =>
  v >= 4.5 ? 'text-green-600' : v >= 3.5 ? 'text-sky-600' : v >= 2.5 ? 'text-amber-600' : 'text-red-600';

export const gradeBg = (v: number) =>
  v >= 4.5
    ? 'bg-green-100 text-green-700'
    : v >= 3.5
      ? 'bg-sky-100 text-sky-700'
      : v >= 2.5
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700';
