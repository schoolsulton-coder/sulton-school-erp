import { api } from './api';

export interface BehaviorRecord {
  id: string;
  type: 'POSITIVE' | 'NEGATIVE';
  points: number;
  description: string;
  date: string;
  student: { id: string; firstName: string; lastName: string };
  author?: { fullName: string } | null;
}

export interface RankingItem {
  id: string;
  firstName: string;
  lastName: string;
  positive: number;
  negative: number;
  score: number;
}

export const behaviorApi = {
  list: (params?: { studentId?: string; type?: string }) =>
    api.get<BehaviorRecord[]>('/behavior', { params }).then((r) => r.data),
  create: (data: {
    studentId: string;
    type: 'POSITIVE' | 'NEGATIVE';
    points: number;
    description: string;
  }) => api.post('/behavior', data).then((r) => r.data),
  classRanking: (classId: string) =>
    api.get<RankingItem[]>(`/behavior/class/${classId}/ranking`).then((r) => r.data),
  remove: (id: string) => api.delete(`/behavior/${id}`).then((r) => r.data),
};
