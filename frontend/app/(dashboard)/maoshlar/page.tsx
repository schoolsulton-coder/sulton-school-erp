'use client';

import { useState } from 'react';
import { XodimlarTab, LavozimlarTab, ShartnomalarTab } from '@/components/maoshlar-tabs';

const TABS = ['Umumiy', 'Xodimlar', 'Lavozimlar', 'Oylik hisob', '10 oylik', "To'lovlar", 'Shartnomalar'] as const;
type Tab = (typeof TABS)[number];

export default function MaoshlarPage() {
  const [tab, setTab] = useState<Tab>('Xodimlar');

  return (
    <div className="min-h-full bg-slate-50/60 p-6">
      <div className="mb-3 text-sm text-slate-400">Moliya · <span className="font-semibold text-slate-700">Maoshlar</span></div>

      <div className="mb-4">
        <div className="inline-flex flex-wrap gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
          {TABS.map((tb) => (
            <button key={tb} onClick={() => setTab(tb)} className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${tab === tb ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {tb}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Xodimlar' ? (
        <XodimlarTab />
      ) : tab === 'Lavozimlar' ? (
        <LavozimlarTab />
      ) : tab === 'Shartnomalar' ? (
        <ShartnomalarTab />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm">
          «{tab}» — keyingi bosqichda tayyor bo&apos;ladi
        </div>
      )}
    </div>
  );
}
