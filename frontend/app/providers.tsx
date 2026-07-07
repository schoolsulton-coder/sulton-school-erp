'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Reference ma'lumot (filial, o'quv yili...) doim yangi bo'lsin —
            // sozlamalarda o'zgargani ochiq sahifada ham darhol ko'rinadi.
            staleTime: 0,
            refetchOnMount: 'always',
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
