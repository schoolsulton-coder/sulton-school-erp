'use client';

import { Menu } from 'lucide-react';
import { Logo } from './logo';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  return (
    // pt-[safe-area]: ilova sifatida o'rnatilganda (standalone) status bar ostiga kirmasin
    <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 py-2.5 pt-[calc(0.625rem_+_env(safe-area-inset-top))] sm:px-4 sm:py-3">
      <div className="flex min-w-0 items-center gap-2">
        <button onClick={onMenu} aria-label="Menyu" className="-ml-1 rounded-lg p-2 hover:bg-slate-100 md:hidden">
          <Menu size={20} />
        </button>
        <Logo className="h-6 w-6 shrink-0 text-brand" />
        <span className="truncate font-bold text-slate-800">Sulton School ERP</span>
      </div>
    </header>
  );
}
