import { api } from './api';

export interface NotificationRow {
  id: string;
  channel: 'TELEGRAM' | 'SMS' | 'PUSH' | 'IN_APP';
  title?: string | null;
  body: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  sentAt?: string | null;
  createdAt: string;
  user?: { fullName: string } | null;
}

export interface NotifyStatus {
  telegram: boolean;
  sms: boolean;
}

export const CHANNEL_LABEL: Record<string, string> = {
  TELEGRAM: 'Telegram',
  SMS: 'SMS',
  PUSH: 'Push',
  IN_APP: 'Ilova ichida',
};
export const STATUS_COLOR: Record<string, string> = {
  SENT: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  QUEUED: 'bg-slate-100 text-slate-600',
};

export const notificationsApi = {
  recent: () => api.get<NotificationRow[]>('/notifications').then((r) => r.data),
  status: () => api.get<NotifyStatus>('/notifications/status').then((r) => r.data),
};
