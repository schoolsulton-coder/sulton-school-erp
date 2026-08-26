import { api } from './api';

export interface BehaviorRecord {
  id: string;
  type: 'POSITIVE' | 'NEGATIVE';
  points: number;
  description: string;
  date: string;
  createdAt?: string;
  student: { id: string; firstName: string; lastName: string; class?: { name: string } | null };
  author?: { fullName: string } | null;
}

export interface BehaviorStats {
  total: number;
  posCount: number;
  negCount: number;
  posPoints: number;
  negPoints: number;
  net: number;
  students: { id: string; name: string; positive: number; negative: number; score: number }[];
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
  list: (params?: { studentId?: string; type?: string; classId?: string; from?: string; to?: string }) =>
    api.get<BehaviorRecord[]>('/behavior', { params }).then((r) => r.data),
  classStats: (classId: string, from?: string, to?: string) =>
    api.get<BehaviorStats>(`/behavior/class/${classId}/stats`, { params: { from, to } }).then((r) => r.data),
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
