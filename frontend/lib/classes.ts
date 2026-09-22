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
  _count?: { schedules: number; norms: number };
}

export interface Lesson {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  room?: string | null;
  /** asosiy (birinchi) ustoz — eski maydon */
  teacherId?: string | null;
  /** darsning barcha ustozlari */
  teachers?: { id: string; fullName: string }[];
  subject: Subject;
}

export interface ScheduleDay {
  weekday: number;
  label: string;
  lessons: Lesson[];
}

/** Dars jadvali haftasi (butun maktab uchun) */
export interface ScheduleWeek {
  id: string;
  startDate: string; // "2026-09-14" (Dushanba)
  endDate: string; // "2026-09-19"
  note?: string | null;
  lessons: number; // shu haftadagi darslar soni
  isCurrent: boolean;
}

export interface ScheduleWeeksResp {
  today: string;
  activeWeekId: string | null;
  weeks: ScheduleWeek[];
}

export interface CopyWeekResult {
  targetWeekId: string;
  startDate: string;
  endDate: string;
  copied: number;
  removed: number;
}

export interface SubjectNormRow {
  id: string;
  subjectId: string;
  subjectName: string;
  weeklyHours: number; // haftalik reja soati
  placed: number; // jadvalga qo'yilgan soat
}

/** Band slot — jadval to'ldirishda bo'sh paralarni hisoblash uchun */
export interface BusySlot {
  id?: string; // dars id — sudrab ko'chirish/o'chirish uchun (faqat shu sinf darslarida)
  subjectId?: string; // qaysi fan — mavjud joylashuvni tahrirlash uchun
  teacherId?: string | null;
  teacherIds?: string[];
  weekday: number;
  start: string; // "08:30"
  label: string; // band sabab: fan nomi yoki "Sinf · Fan"
  teacher?: string | null; // sinf band bo'lsa — o'sha darsning ustozi
}

export interface BulkResult {
  created: number;
  skipped: { weekday: number; startTime: string; reason: string }[];
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

  // sinfga ustoz/kurator biriktirish
  assignTeacher: (classId: string, data: { teacherId: string; isCurator?: boolean }) =>
    api.post(`/classes/${classId}/teachers`, data).then((r) => r.data),
  removeTeacher: (classId: string, teacherId: string) =>
    api.delete(`/classes/${classId}/teachers/${teacherId}`).then((r) => r.data),

  // jadval
  // jadval haftalari
  weeks: () => api.get<ScheduleWeeksResp>('/schedule/weeks').then((r) => r.data),
  createWeek: (data: { startDate: string; endDate?: string; note?: string; copyFromWeekId?: string }) =>
    api
      .post<{ id: string; startDate: string; endDate: string; copied: number }>('/schedule/weeks', data)
      .then((r) => r.data),
  updateWeek: (id: string, data: { endDate?: string; note?: string }) =>
    api.patch(`/schedule/weeks/${id}`, data).then((r) => r.data),
  removeWeek: (id: string) =>
    api.delete<{ ok: boolean; removedLessons: number }>(`/schedule/weeks/${id}`).then((r) => r.data),
  copyWeek: (
    id: string,
    data: {
      targetWeekId?: string;
      targetStartDate?: string;
      targetEndDate?: string;
      classId?: string;
      replace?: boolean;
    },
  ) => api.post<CopyWeekResult>(`/schedule/weeks/${id}/copy`, data).then((r) => r.data),

  schedule: (classId: string, weekId?: string) =>
    api
      .get<ScheduleDay[]>(`/classes/${classId}/schedule`, { params: { weekId: weekId || undefined } })
      .then((r) => r.data),
  addLesson: (data: {
    classId: string;
    subjectId: string;
    weekday: number;
    startTime: string;
    endTime: string;
    room?: string;
    teacherId?: string;
    teacherIds?: string[];
    weekId?: string;
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
      teacherIds?: string[];
    },
  ) => api.patch<Lesson>(`/schedule/${id}`, data).then((r) => r.data),
  removeLesson: (id: string) =>
    api.delete(`/schedule/${id}`).then((r) => r.data),

  // bo'sh slotlar (sinf + ustoz) va bittada joylash
  availability: (classId: string, teacherId?: string, weekId?: string) =>
    api
      .get<{ classBusy: BusySlot[]; teacherBusy: BusySlot[] }>(
        '/schedule/availability',
        { params: { classId, teacherId: teacherId || undefined, weekId: weekId || undefined } },
      )
      .then((r) => r.data),
  bulkAddLessons: (data: {
    classId: string;
    subjectId: string;
    teacherId?: string;
    teacherIds?: string[];
    room?: string;
    weekId?: string;
    slots: { weekday: number; startTime: string; endTime: string }[];
  }) => api.post<BulkResult>('/schedule/bulk', data).then((r) => r.data),

  // fanlar
  subjects: () => api.get<Subject[]>('/subjects').then((r) => r.data),
  createSubject: (data: { name: string; code?: string }) =>
    api.post<Subject>('/subjects', data).then((r) => r.data),
  updateSubject: (id: string, data: { name: string; code?: string }) =>
    api.patch<Subject>(`/subjects/${id}`, data).then((r) => r.data),
  removeSubject: (id: string) =>
    api.delete(`/subjects/${id}`).then((r) => r.data),

  // fan normasi (haftalik soat reja)
  norms: (classId: string, weekId?: string) =>
    api
      .get<SubjectNormRow[]>(`/classes/${classId}/norms`, { params: { weekId: weekId || undefined } })
      .then((r) => r.data),
  setNorm: (classId: string, data: { subjectId: string; weeklyHours: number }) =>
    api.post(`/classes/${classId}/norms`, data).then((r) => r.data),
  removeNorm: (id: string) =>
    api.delete(`/norms/${id}`).then((r) => r.data),
};
