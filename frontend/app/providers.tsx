'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { PWAInstall } from '@/components/pwa-install';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 30 soniya "toza" oyna: ma'lumot deyarli real vaqt qoladi
            // (sozlamadagi o'zgarish yarim daqiqada hamma joyda ko'rinadi),
            // ammo har oyna almashganda hamma so'rov qaytadan ketmaydi —
            // 1GB serverga tushadigan takroriy yuk keskin kamayadi.
            staleTime: 30_000,
            // 'always' emas: mount'da faqat eskirgan (stale) so'rov qayta yuklanadi.
            refetchOnMount: true,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      {children}
      <PWAInstall />
    </QueryClientProvider>
  );
}
