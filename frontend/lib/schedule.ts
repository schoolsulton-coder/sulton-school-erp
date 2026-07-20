// Dars jadvali uchun umumiy yordamchilar

/** Standart dars soatlari (para). Qo'shishda faqat bo'sh slotlar ko'rsatiladi. */
export const PERIODS: { start: string; end: string }[] = [
  { start: '08:30', end: '09:15' },
  { start: '09:20', end: '10:05' },
  { start: '10:15', end: '11:00' },
  { start: '11:10', end: '11:55' },
  { start: '12:05', end: '12:50' },
  { start: '13:00', end: '13:45' },
  { start: '14:00', end: '14:45' },
  { start: '15:00', end: '15:45' },
];

/** Hafta kunlari — Yakshanbasiz (1=Dushanba ... 6=Shanba) */
export const WEEKDAYS: { n: number; label: string }[] = [
  { n: 1, label: 'Dushanba' },
  { n: 2, label: 'Seshanba' },
  { n: 3, label: 'Chorshanba' },
  { n: 4, label: 'Payshanba' },
  { n: 5, label: 'Juma' },
  { n: 6, label: 'Shanba' },
];

/** Vaqtni "HH:MM" ko'rinishiga keltiradi ("010:15" -> "10:15") */
export function normTime(t?: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hh = String(parseInt(h, 10) || 0).padStart(2, '0');
  const mm = String(parseInt(m ?? '0', 10) || 0).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Para raqamini vaqt bo'yicha topadi (1-based), topilmasa 0 */
export function periodIndex(start: string): number {
  const s = normTime(start);
  const i = PERIODS.findIndex((p) => p.start === s);
  return i === -1 ? 0 : i + 1;
}
