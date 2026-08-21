'use client';

import { useState } from 'react';
import { XodimlarTab, LavozimlarTab, ShartnomalarTab, TolovlarTab } from '@/components/maoshlar-tabs';
import { OylikHisobTab } from '@/components/oylik-hisob';
import { Oylik10Tab, UmumiyTab } from '@/components/oylik-report';

const TABS = ['Umumiy', 'Xodimlar', 'Lavozimlar', 'Oylik hisob', '10 oylik', "To'lovlar", 'Shartnomalar'] as const;
type Tab = (typeof TABS)[number];

export default function MaoshlarPage() {
  const [tab, setTab] = useState<Tab>('Umumiy');

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

      {tab === 'Umumiy' ? (
        <UmumiyTab />
      ) : tab === 'Xodimlar' ? (
        <XodimlarTab />
      ) : tab === 'Oylik hisob' ? (
        <OylikHisobTab />
      ) : tab === '10 oylik' ? (
        <Oylik10Tab />
      ) : tab === 'Lavozimlar' ? (
        <LavozimlarTab />
      ) : tab === 'Shartnomalar' ? (
        <ShartnomalarTab />
      ) : (
        <TolovlarTab />
      )}
    </div>
  );
}
