import { api } from './api';

export type AttStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface ClassDayRow {
  id: string;
  firstName: string;
  lastName: string;
  status: AttStatus | null;
  note: string | null;
}

export interface AttReport {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number;
  records?: { date: string; status: AttStatus; note?: string | null }[];
}

export const ATT_STATUS: Record<AttStatus, { label: string; cls: string; active: string }> = {
  PRESENT: { label: 'Bor', cls: 'text-green-700', active: 'bg-green-600 text-white' },
  ABSENT: { label: "Yo'q", cls: 'text-red-700', active: 'bg-red-600 text-white' },
  LATE: { label: 'Kechikkan', cls: 'text-amber-700', active: 'bg-amber-500 text-white' },
  EXCUSED: { label: 'Sababli', cls: 'text-brand', active: 'bg-brand text-white' },
};

export const attendanceApi = {
  classDay: (classId: string, date: string) =>
    api.get<ClassDayRow[]>(`/attendance/class/${classId}`, { params: { date } }).then((r) => r.data),
  mark: (data: {
    classId: string;
    date: string;
    records: { studentId: string; status: AttStatus; note?: string }[];
  }) => api.post('/attendance/mark', data).then((r) => r.data),
  classStats: (classId: string, from?: string, to?: string) =>
    api.get<AttReport>(`/attendance/class/${classId}/stats`, { params: { from, to } }).then((r) => r.data),
  studentReport: (studentId: string, month?: string) =>
    api.get<AttReport>(`/attendance/student/${studentId}`, { params: { month } }).then((r) => r.data),
};
