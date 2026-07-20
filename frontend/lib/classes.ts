import { api } from './api';

export interface ClassRow {
  id: string;
  name: string;
  gradeLevel: number;
  academicYear: string;
  capacity: number;
  room?: string | null;
  language?: string | null;
  status?: string | null;
  telegramGroup?: string | null;
  branchId?: string | null;
  branch?: { id: string; name: string } | null;
  studentCount: number;
  freeSeats: number;
  fillPercent: number;
  teachers: { teacher: { id: string; fullName: string }; isCurator: boolean }[];
}

export interface ClassInput {
  name: string;
  gradeLevel: number;
  academicYear: string;
  capacity?: number;
  room?: string;
  language?: string;
  branchId?: string;
  status?: string;
  telegramGroup?: string;
}

export interface Subject {
  id: string;
  name: string;
  code?: string | null;
}

export interface Lesson {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  room?: string | null;
  teacherId?: string | null;
  subject: Subject;
}

export interface ScheduleDay {
  weekday: number;
  label: string;
  lessons: Lesson[];
}

export interface SubjectNormRow {
  id: string;
  subjectId: string;
  subjectName: string;
  weeklyHours: number; // haftalik reja soati
  placed: number; // jadvalga qo'yilgan soat
}

export const classesApi = {
  list: (academicYear?: string) =>
    api
      .get<ClassRow[]>('/classes', { params: { academicYear } })
      .then((r) => r.data),
  get: (id: string) => api.get(`/classes/${id}`).then((r) => r.data),
  create: (data: ClassInput) =>
    api.post<ClassRow>('/classes', data).then((r) => r.data),
  update: (id: string, data: Partial<ClassInput>) =>
    api.patch<ClassRow>(`/classes/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/classes/${id}`).then((r) => r.data),

  // jadval
  schedule: (classId: string) =>
    api.get<ScheduleDay[]>(`/classes/${classId}/schedule`).then((r) => r.data),
  addLesson: (data: {
    classId: string;
    subjectId: string;
    weekday: number;
    startTime: string;
    endTime: string;
    room?: string;
    teacherId?: string;
  }) => api.post<Lesson>('/schedule', data).then((r) => r.data),
  updateLesson: (
    id: string,
    data: {
      subjectId?: string;
      weekday?: number;
      startTime?: string;
      endTime?: string;
      room?: string;
      teacherId?: string;
    },
  ) => api.patch<Lesson>(`/schedule/${id}`, data).then((r) => r.data),
  removeLesson: (id: string) =>
    api.delete(`/schedule/${id}`).then((r) => r.data),

  // fanlar
  subjects: () => api.get<Subject[]>('/subjects').then((r) => r.data),

  // fan normasi (haftalik soat reja)
  norms: (classId: string) =>
    api.get<SubjectNormRow[]>(`/classes/${classId}/norms`).then((r) => r.data),
  setNorm: (classId: string, data: { subjectId: string; weeklyHours: number }) =>
    api.post(`/classes/${classId}/norms`, data).then((r) => r.data),
  removeNorm: (id: string) =>
    api.delete(`/norms/${id}`).then((r) => r.data),
};
