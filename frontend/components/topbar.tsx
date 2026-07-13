'use client';

import { Menu } from 'lucide-react';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <button onClick={onMenu} className="rounded-lg p-2 hover:bg-slate-100 md:hidden">
          <Menu size={20} />
        </button>
        <span className="font-bold text-slate-800">RS — ERP</span>
      </div>
    </header>
  );
}
