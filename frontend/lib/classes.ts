import { api } from './api';

export interface ClassRow {
  id: string;
  name: string;
  gradeLevel: number;
  academicYear: string;
  capacity: number;
  room?: string | null;
  studentCount: number;
  fillPercent: number;
  teachers: { teacher: { id: string; fullName: string }; isCurator: boolean }[];
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
  subject: Subject;
}

export interface ScheduleDay {
  weekday: number;
  label: string;
  lessons: Lesson[];
}

export const classesApi = {
  list: (academicYear?: string) =>
    api
      .get<ClassRow[]>('/classes', { params: { academicYear } })
      .then((r) => r.data),
  get: (id: string) => api.get(`/classes/${id}`).then((r) => r.data),
  create: (data: {
    name: string;
    gradeLevel: number;
    academicYear: string;
    capacity?: number;
    room?: string;
  }) => api.post<ClassRow>('/classes', data).then((r) => r.data),
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
  }) => api.post<Lesson>('/schedule', data).then((r) => r.data),
  removeLesson: (id: string) =>
    api.delete(`/schedule/${id}`).then((r) => r.data),

  // fanlar
  subjects: () => api.get<Subject[]>('/subjects').then((r) => r.data),
};
