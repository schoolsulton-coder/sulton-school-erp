/**
 * Kadrlar hujjatlari (ishga qabul buyrug'i, mehnat shartnomasi) uchun
 * {{token}} o'rin egallovchilar katalogi va qiymat yasovchi.
 * O'quvchi shartnomasidagi tokens.ts bilan bir xil uslubda ishlaydi.
 */
import { numToUzWords } from './tokens';

export interface PlaceholderDef {
  key: string;
  label: string;
  sample: string;
  group: string;
}

/** Tashkilot rekvizitlari — hujjat "shapka"si va imzolar uchun */
export const ORG_NAME = '"Sulton School" MCHJ';
export const ORG_DIRECTOR = 'B.M.Tursunboyev';
export const ORG_DIRECTOR_FULL = 'Tursunboyev Bakirjon Muhammadjon o‘g‘li';
export const ORG_ADDRESS = "Toshkent viloyati Angren shahar Mustaqillik MFY 101-uy";
export const ORG_CITY = 'Angren sh.';

export const HR_PLACEHOLDERS: PlaceholderDef[] = [
  // Hujjat
  { key: 'hujjat_raqami', label: 'Hujjat/buyruq raqami', sample: '60/2', group: 'Hujjat' },
  { key: 'hujjat_turi', label: 'Hujjat turi', sample: 'Mehnat shartnomasi', group: 'Hujjat' },
  { key: 'sana', label: 'Sana', sample: '27.07.2026', group: 'Hujjat' },
  { key: 'sana_kun', label: 'Sana — kun', sample: '27', group: 'Hujjat' },
  { key: 'sana_oy', label: 'Sana — oy (so\'z)', sample: 'iyul', group: 'Hujjat' },
  { key: 'sana_oy_raqam', label: 'Sana — oy (raqam)', sample: '07', group: 'Hujjat' },
  { key: 'sana_yil', label: 'Sana — yil', sample: '2026', group: 'Hujjat' },
  { key: 'tugash_sana', label: 'Tugash / 2-sana', sample: '27.07.2027', group: 'Hujjat' },
  { key: 'tugash_yil', label: 'Tugash — yil', sample: '2027', group: 'Hujjat' },
  { key: 'kelish_sana', label: 'Kelish sanasi (K.sana)', sample: '01.08.2026', group: 'Hujjat' },
  { key: 'sinov_muddati', label: 'Sinov muddati (K.kuni)', sample: '3 oy', group: 'Hujjat' },
  { key: 'modda', label: 'Modda', sample: '160-modda 1-bandi', group: 'Hujjat' },
  { key: 'shartnoma_tili', label: 'Shartnoma tili', sample: "o'zbek", group: 'Hujjat' },
  { key: 'bugungi_sana', label: 'Bugungi sana', sample: '29.08.2026', group: 'Hujjat' },

  // Xodim
  { key: 'xodim_fio', label: 'Xodim F.I.SH.', sample: 'Sodiqova Yulduz Abdulhakimovna', group: 'Xodim' },
  { key: 'xodim_familiya', label: 'Familiya', sample: 'Sodiqova', group: 'Xodim' },
  { key: 'xodim_ism', label: 'Ism', sample: 'Yulduz', group: 'Xodim' },
  { key: 'xodim_sharif', label: 'Otasining ismi', sample: 'Abdulhakimovna', group: 'Xodim' },
  { key: 'xodim_tugilgan_sana', label: "Tug'ilgan sana", sample: '12.05.1995', group: 'Xodim' },
  { key: 'xodim_telefon', label: 'Telefon', sample: '+998 90 123 45 67', group: 'Xodim' },
  { key: 'xodim_manzil', label: 'Manzil', sample: 'Angren sh., Mustaqillik MFY', group: 'Xodim' },
  { key: 'xodim_passport', label: 'Passport', sample: 'AA 1234567', group: 'Xodim' },
  { key: 'xodim_stir', label: 'STIR', sample: '123456789', group: 'Xodim' },
  { key: 'xodim_ish_boshlagan', label: 'Ishga kirgan sana', sample: '01.09.2025', group: 'Xodim' },

  // Lavozim
  { key: 'lavozim', label: 'Lavozim', sample: "Boshlang'ich sinf o'qituvchisi", group: 'Lavozim' },
  { key: 'bolim', label: "Bo'lim", sample: "Boshlang'ich ta'lim", group: 'Lavozim' },
  { key: 'bandlik_turi', label: 'Bandlik turi', sample: 'To\'liq stavka', group: 'Lavozim' },
  { key: 'stavka', label: 'Stavka', sample: '1', group: 'Lavozim' },
  { key: 'stavka_matn', label: "Stavka (so'z bilan)", sample: 'bir', group: 'Lavozim' },
  { key: 'qoshimcha_lavozim', label: "Qo'shimcha lavozim", sample: 'Sinf rahbari', group: 'Lavozim' },
  { key: 'qoshimcha_stavka', label: "Qo'shimcha stavka", sample: '0.5', group: 'Lavozim' },
  { key: 'filial', label: 'Filial', sample: 'Bosh filial', group: 'Lavozim' },

  // Tashkilot
  { key: 'maktab_nomi', label: 'Tashkilot nomi', sample: ORG_NAME, group: 'Tashkilot' },
  { key: 'direktor', label: 'Direktor (qisqa)', sample: ORG_DIRECTOR, group: 'Tashkilot' },
  { key: 'direktor_toliq', label: "Direktor (to'liq F.I.SH.)", sample: ORG_DIRECTOR_FULL, group: 'Tashkilot' },
  { key: 'tashkilot_manzili', label: 'Tashkilot manzili', sample: ORG_ADDRESS, group: 'Tashkilot' },
  { key: 'shahar', label: 'Shahar', sample: ORG_CITY, group: 'Tashkilot' },
];

const UZ_MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

const d2 = (n: number) => String(n).padStart(2, '0');
const fmtDate = (d?: Date | null) =>
  d ? `${d2(d.getDate())}.${d2(d.getMonth() + 1)}.${d.getFullYear()}` : '';

/** EmploymentContract (employee + user + position + department + branch bilan) → token qiymatlari */
export function buildHrTokens(c: any): Record<string, string> {
  const emp = c.employee ?? {};
  const user = emp.user ?? {};
  const fio: string = user.fullName ?? '';
  const [familiya = '', ism = '', sharif = ''] = fio.split(/\s+/);
  const date: Date | null = c.date ? new Date(c.date) : null;
  const passport = [emp.passportSeriya, emp.passportRaqam].filter(Boolean).join(' ');

  return {
    // Hujjat
    hujjat_raqami: c.number && c.number !== '—' ? c.number : '',
    hujjat_turi: c.type ?? '',
    sana: fmtDate(date),
    sana_kun: date ? d2(date.getDate()) : '',
    sana_oy: date ? UZ_MONTHS[date.getMonth()] : '',
    sana_oy_raqam: date ? d2(date.getMonth() + 1) : '',
    sana_yil: date ? String(date.getFullYear()) : '',
    tugash_sana: fmtDate(c.date2 ? new Date(c.date2) : null),
    tugash_yil: c.date2 ? String(new Date(c.date2).getFullYear()) : '',
    kelish_sana: fmtDate(c.kelishSana ? new Date(c.kelishSana) : null),
    sinov_muddati: c.kKuni ?? '',
    modda: c.modda ?? '',
    shartnoma_tili: c.til ?? '',
    bugungi_sana: fmtDate(new Date()),

    // Xodim
    xodim_fio: fio,
    xodim_familiya: familiya,
    xodim_ism: ism,
    xodim_sharif: sharif || emp.middleName || '',
    xodim_tugilgan_sana: fmtDate(emp.birthDate ? new Date(emp.birthDate) : null),
    xodim_telefon: user.phone ?? '',
    xodim_manzil: emp.address ?? '',
    xodim_passport: passport,
    xodim_stir: emp.stir ?? '',
    xodim_ish_boshlagan: fmtDate(emp.hireDate ? new Date(emp.hireDate) : null),

    // Lavozim
    lavozim: emp.position?.name ?? '',
    bolim: emp.department?.name ?? '',
    bandlik_turi: c.employment ?? emp.employment ?? '',
    stavka: c.stavka != null ? String(c.stavka) : '',
    stavka_matn: c.stavka != null ? numToUzWords(c.stavka) : '',
    qoshimcha_lavozim: c.qoshimchaLavozim ?? '',
    qoshimcha_stavka: c.qoshimchaStavka != null ? String(c.qoshimchaStavka) : '',
    filial: c.branch?.name ?? emp.branch?.name ?? '',

    // Tashkilot
    maktab_nomi: ORG_NAME,
    direktor: ORG_DIRECTOR,
    direktor_toliq: ORG_DIRECTOR_FULL,
    tashkilot_manzili: ORG_ADDRESS,
    shahar: ORG_CITY,
  };
}
