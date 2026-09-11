import { api } from './api';

export interface CoinRecord {
  id: string;
  amount: number; // musbat — qo'shildi, manfiy — ayirildi
  reason: string;
  date: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    class?: { name: string } | null;
  };
  author?: { fullName: string } | null;
}

export interface CoinRankingItem {
  id: string;
  name: string;
  earned: number;
  spent: number;
  balance: number;
  count: number;
}

export interface CoinStats {
  students: number;
  earned: number;
  spent: number;
  balance: number;
  average: number;
  ranking: CoinRankingItem[];
}

export const coinsApi = {
  list: (params?: { classId?: string; studentId?: string; from?: string; to?: string }) =>
    api.get<CoinRecord[]>('/coins', { params }).then((r) => r.data),
  create: (data: { studentId: string; amount: number; reason: string; date?: string }) =>
    api.post<CoinRecord>('/coins', data).then((r) => r.data),
  remove: (id: string) => api.delete(`/coins/${id}`).then((r) => r.data),
  classStats: (classId: string, from?: string, to?: string) =>
    api
      .get<CoinStats>(`/coins/class/${classId}/stats`, { params: { from, to } })
      .then((r) => r.data),
  student: (studentId: string) =>
    api
      .get<{ balance: number; records: CoinRecord[] }>(`/coins/student/${studentId}`)
      .then((r) => r.data),
};
