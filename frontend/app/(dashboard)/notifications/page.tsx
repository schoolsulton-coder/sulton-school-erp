'use client';

import { useQuery } from '@tanstack/react-query';
import {
  notificationsApi,
  CHANNEL_LABEL,
  STATUS_COLOR,
  type NotificationRow,
} from '@/lib/notifications';

export default function NotificationsPage() {
  const { data: status } = useQuery({ queryKey: ['notify-status'], queryFn: notificationsApi.status });
  const { data: log } = useQuery({ queryKey: ['notify-log'], queryFn: notificationsApi.recent });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Bildirishnomalar</h1>
        <p className="text-sm text-slate-500">Telegram va SMS xabarlari jurnali</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Integratsiya holati */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Integratsiya holati</h2>
          <StatusRow label="Telegram bot" on={!!status?.telegram} />
          <StatusRow label="SMS (Eskiz.uz)" on={!!status?.sms} />
          <p className="mt-3 text-xs text-slate-400">
            O&apos;chiq bo&apos;lsa, backend <code>.env</code> da TELEGRAM_BOT_TOKEN /
            ESKIZ_EMAIL sozlang.
          </p>
        </div>

        {/* Telegram yo'riqnoma */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
          <h2 className="mb-2 font-semibold">🤖 Ota-onani Telegram botga ulash</h2>
          <ol className="list-inside list-decimal space-y-1 text-sm text-slate-600">
            <li>Ota-ona/o&apos;quvchiga <b>portal logini</b> yaratiladi (o&apos;quvchi sahifasida).</li>
            <li>Maktab Telegram botini oching va <b>/start</b> yuboring.</li>
            <li>“📱 Telefonni ulashish” tugmasini bosing — raqam tizimdagi login bilan moslashtiriladi.</li>
            <li>Tayyor! Davomat, baho va to&apos;lov bo&apos;yicha xabarlar avtomatik keladi.</li>
          </ol>
          <p className="mt-2 text-xs text-slate-400">
            Davomat “Yo&apos;q/Kechikkan” belgilanganda ota-onaga avtomatik bildirishnoma yuboriladi.
          </p>
        </div>
      </div>

      {/* Jurnal */}
      <h2 className="mb-3 text-lg font-semibold">So&apos;nggi xabarlar</h2>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Sana</th>
              <th className="px-4 py-2">Qabul qiluvchi</th>
              <th className="px-4 py-2">Kanal</th>
              <th className="px-4 py-2">Xabar</th>
              <th className="px-4 py-2">Holat</th>
            </tr>
          </thead>
          <tbody>
            {log?.map((n: NotificationRow) => (
              <tr key={n.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-500">{new Date(n.createdAt).toLocaleString('uz-UZ')}</td>
                <td className="px-4 py-2">{n.user?.fullName ?? '—'}</td>
                <td className="px-4 py-2">{CHANNEL_LABEL[n.channel]}</td>
                <td className="px-4 py-2 text-slate-600">
                  {n.title && <b>{n.title}: </b>}{n.body}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[n.status]}`}>
                    {n.status}
                  </span>
                </td>
              </tr>
            ))}
            {!log?.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Hali xabar yo&apos;q</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusRow({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span>{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs ${on ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
        {on ? '● Ulangan' : '○ O‘chiq'}
      </span>
    </div>
  );
}
