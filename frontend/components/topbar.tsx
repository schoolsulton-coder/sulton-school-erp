'use client';

import { useState } from 'react';
import { Menu, Bell, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const qc = useQueryClient();
  const [syncedAt] = useState(() => Date.now());
  const [, force] = useState(0);

  const minsAgo = Math.max(0, Math.round((Date.now() - syncedAt) / 60000));
  const label = minsAgo === 0 ? 'hozir' : `${minsAgo} daq oldin`;

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <button onClick={onMenu} className="rounded-lg p-2 hover:bg-slate-100 md:hidden">
          <Menu size={20} />
        </button>
        <span className="font-bold text-slate-800">RS — ERP</span>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
          <Bell size={16} />
          <span className="hidden sm:inline">Yangiliklar</span>
          <span className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
            99+
          </span>
        </button>
        <button
          onClick={() => {
            qc.invalidateQueries();
            force((n) => n + 1);
          }}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50"
          title="Yangilash"
        >
          <RefreshCw size={15} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      </div>
    </header>
  );
}
