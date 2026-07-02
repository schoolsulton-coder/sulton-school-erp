'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Menu } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  sales: 'Sotuv menejeri',
  coordinator: 'Koordinator',
  teacher: 'Ustoz',
  curator: 'Kurator',
  student: "O'quvchi",
  guardian: 'Vasiy',
};

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const onLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <button onClick={onMenu} className="rounded-lg p-2 hover:bg-slate-100 md:hidden">
        <Menu size={20} />
      </button>

      <div className="ml-auto flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-medium">{user?.fullName}</div>
          <div className="text-xs text-slate-400">
            {user ? (ROLE_LABEL[user.role] ?? user.role) : ''}
          </div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
          {user?.fullName?.charAt(0) ?? '?'}
        </div>
        <button
          onClick={onLogout}
          title="Chiqish"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
