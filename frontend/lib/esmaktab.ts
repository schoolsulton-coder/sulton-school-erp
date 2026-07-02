import { api } from './api';

export interface SyncLog {
  id: string;
  entity: string;
  direction: string;
  status: string;
  message?: string | null;
  createdAt: string;
}

async function downloadXlsx(url: string, params: any, filename: string) {
  const res = await api.get(url, { params, responseType: 'blob' });
  const blob = new Blob([res.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = `${filename}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(objUrl), 10_000);
}

export const esmaktabApi = {
  exportStudents: (classId?: string) =>
    downloadXlsx('/esmaktab/export/students', { classId }, 'oquvchilar'),
  exportGrades: (classId: string, period?: string) =>
    downloadXlsx('/esmaktab/export/grades', { classId, period }, 'baholar'),
  exportAttendance: (classId: string, month?: string) =>
    downloadXlsx('/esmaktab/export/attendance', { classId, month }, 'davomat'),
  sync: (entity: string) =>
    api.post('/esmaktab/sync', { entity }).then((r) => r.data),
  logs: () => api.get<SyncLog[]>('/esmaktab/logs').then((r) => r.data),
  status: () =>
    api.get<{ apiConfigured: boolean }>('/esmaktab/status').then((r) => r.data),
};
