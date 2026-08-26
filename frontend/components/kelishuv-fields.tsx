'use client';

import { HISOB_KITOB_TURLARI, SOLIQ_KIM, type KelishuvForm } from '@/lib/hr';

const lbl = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500';
const inp = 'w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white';
const req = <span className="text-rose-500">*</span>;

export const emptyKelishuv = (): KelishuvForm => ({
  startDate: '', endDate: '', formal: false, hisobKitob: 'Kunbay',
  baseRate: '', rasmiyOyligi: '', soliqKim: '', note: '',
});

/** Kelishuvni tekshirish — xatolik matni yoki '' */
export function validateKelishuv(v: KelishuvForm): string {
  if (!v.startDate) return 'Boshlanish sanasini kiriting';
  if (!v.hisobKitob) return 'Hisob-kitob turini tanlang';
  if (v.baseRate === '' || Number(v.baseRate) <= 0) {
    return v.hisobKitob === 'Soatbay' ? 'Soatbay narxini kiriting' : "O'zgarmas oylikni kiriting";
  }
  if (v.formal && (v.rasmiyOyligi === '' || Number(v.rasmiyOyligi) <= 0)) return 'Rasmiy oyligini kiriting';
  return '';
}

export function KelishuvFields({ value, onChange }: { value: KelishuvForm; onChange: (v: KelishuvForm) => void }) {
  const set = (k: keyof KelishuvForm, v: any) => onChange({ ...value, [k]: v });
  const isHourly = value.hisobKitob === 'Soatbay';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Boshlanish sanasi {req}</label>
          <input type="date" value={value.startDate} onChange={(e) => set('startDate', e.target.value)} className={inp} />
        </div>
        <div>
          <label className={lbl}>Tugash sanasi</label>
          <input type="date" value={value.endDate} onChange={(e) => set('endDate', e.target.value)} className={inp} />
          <p className="mt-1 text-xs text-slate-400">Bo&apos;sh qoldirilsa, joriy kelishuv</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Rasmiylik</label>
          <select value={value.formal ? '1' : '0'} onChange={(e) => set('formal', e.target.value === '1')} className={inp}>
            <option value="0">Norasmiy</option>
            <option value="1">Rasmiy</option>
          </select>
        </div>
        {value.formal && (
          <div>
            <label className={lbl}>Soliqni kim to&apos;laydi</label>
            <select value={value.soliqKim} onChange={(e) => set('soliqKim', e.target.value)} className={inp}>
              <option value="">—</option>
              {SOLIQ_KIM.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className={lbl}>Hisob-kitob turi {req}</label>
        <div className="flex flex-wrap gap-2">
          {HISOB_KITOB_TURLARI.map((h) => (
            <button key={h} type="button" onClick={() => set('hisobKitob', h)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${value.hisobKitob === h ? 'border-brand bg-brand/5 text-brand' : 'border-slate-200 text-slate-500'}`}>
              {h}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {isHourly ? (
          <div>
            <label className={lbl}>Soatbay narxi (soat) {req}</label>
            <input type="number" value={value.baseRate} onChange={(e) => set('baseRate', e.target.value)} className={inp} />
          </div>
        ) : (
          <div>
            <label className={lbl}>O&apos;zgarmas oylik (oy) {req}</label>
            <input type="number" value={value.baseRate} onChange={(e) => set('baseRate', e.target.value)} className={inp} />
            <p className="mt-1 text-xs text-slate-400">{value.hisobKitob === 'KPI' ? 'Asosiy (KPI qo\'lda hisoblanadi)' : 'Ixtiyoriy'}</p>
          </div>
        )}
        {value.formal && (
          <div>
            <label className={lbl}>Rasmiy oyligi {req}</label>
            <input type="number" value={value.rasmiyOyligi} onChange={(e) => set('rasmiyOyligi', e.target.value)} className={inp} />
          </div>
        )}
      </div>

      <div>
        <label className={lbl}>Izoh</label>
        <input value={value.note} onChange={(e) => set('note', e.target.value)} className={inp} />
      </div>

      <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
        Shartnoma hujjatlari (Mehnat shartnomasi, orderlar va h.k.) — Kelishuvdan tashqarida, <b>Hujjatlar</b> bo&apos;limida boshqariladi. PDF har bir hujjat uchun alohida yaratiladi.
      </div>
    </div>
  );
}
