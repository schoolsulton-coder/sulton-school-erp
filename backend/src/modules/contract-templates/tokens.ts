/**
 * Shartnoma shabloni uchun {{token}} o'rin egallovchilar katalogi.
 * PLACEHOLDERS — yagona manba (frontend ham shu ro'yxatni oladi).
 * buildTokens — shartnoma ma'lumotlaridan real qiymatlarni yasaydi.
 */

export interface PlaceholderDef {
  key: string;
  label: string;
  sample: string;
  group: string;
}

export const PLACEHOLDERS: PlaceholderDef[] = [
  // Shartnoma
  { key: 'shartnoma_raqami', label: 'Shartnoma raqami', sample: 'SHRT-2025-0001', group: 'Shartnoma' },
  { key: 'shartnoma_sana', label: 'Shartnoma sanasi', sample: '01.09.2025', group: 'Shartnoma' },
  { key: 'oquv_yili', label: "O'quv yili", sample: '2025-2026', group: 'Shartnoma' },
  { key: 'filial', label: 'Filial', sample: 'Bosh filial', group: 'Shartnoma' },
  { key: 'sinf', label: 'Sinf', sample: '5-A', group: 'Shartnoma' },
  // O'quvchi
  { key: 'oquvchi_fio', label: "O'quvchi F.I.O", sample: 'Aliyev Ali Valievich', group: "O'quvchi" },
  { key: 'oquvchi_familiya', label: 'Familiya', sample: 'Aliyev', group: "O'quvchi" },
  { key: 'oquvchi_ism', label: 'Ism', sample: 'Ali', group: "O'quvchi" },
  { key: 'oquvchi_sharif', label: 'Sharifi', sample: 'Valievich', group: "O'quvchi" },
  { key: 'oquvchi_tugilgan_sana', label: "Tug'ilgan sana", sample: '15.03.2015', group: "O'quvchi" },
  { key: 'oquvchi_tugilgan_kun', label: "Tug'ilgan kun", sample: '15', group: "O'quvchi" },
  { key: 'oquvchi_tugilgan_oy', label: "Tug'ilgan oy", sample: 'mart', group: "O'quvchi" },
  { key: 'oquvchi_tugilgan_yil', label: "Tug'ilgan yil", sample: '2015', group: "O'quvchi" },
  { key: 'oquvchi_manzil', label: 'Manzil', sample: "Toshkent sh., Yunusobod t.", group: "O'quvchi" },
  // Vasiy
  { key: 'vasiy_fio', label: 'Vasiy F.I.O', sample: 'Aliyev Vali', group: 'Vasiy' },
  { key: 'vasiy_telefon', label: 'Vasiy telefon', sample: '+998 90 123 45 67', group: 'Vasiy' },
  { key: 'vasiy_passport', label: 'Vasiy passport', sample: 'AA 1234567', group: 'Vasiy' },
  { key: 'vasiy_turi', label: "Kim bo'ladi (ota/ona)", sample: 'ota', group: 'Vasiy' },
  // To'lov
  { key: 'oylik_tolov', label: "Oylik to'lov", sample: "1 500 000 so'm", group: "To'lov" },
  { key: 'yillik_tolov', label: "Yillik (jami) to'lov", sample: "13 500 000 so'm", group: "To'lov" },
  { key: 'jami_summa', label: 'Jami summa', sample: "13 500 000 so'm", group: "To'lov" },
  { key: 'oylar_soni', label: 'Oylar soni', sample: '9', group: "To'lov" },
  { key: 'tolov_jadvali', label: "To'lov jadvali (jadval)", sample: '[jadval]', group: "To'lov" },
  // Boshqa
  { key: 'bugungi_sana', label: 'Bugungi sana', sample: '31.07.2026', group: 'Boshqa' },
  { key: 'maktab_nomi', label: 'Maktab nomi', sample: 'Sulton School xususiy maktabi', group: 'Boshqa' },
];

export const SCHOOL_NAME = 'Sulton School xususiy maktabi';

const UZ_MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

const money = (n: number) =>
  new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0)) + " so'm";

/** Toshkent vaqti bo'yicha yil/oy/kun (off-by-one bo'lmasin) */
function tashkentParts(d: Date): { y: string; m: string; day: string } {
  const s = new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' }); // yyyy-mm-dd
  const [y, m, day] = s.split('-');
  return { y, m, day };
}
const fmtDate = (d: Date) => {
  const { y, m, day } = tashkentParts(d);
  return `${day}.${m}.${y}`;
};

const esc = (s: string) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Bugungi sana (Toshkent) — argsiz new Date() ishlatiladi (runtime, workflow emas) */
function today(): Date {
  return new Date();
}

/**
 * Shartnoma (findOne natijasi) → {{token}} qiymatlari.
 * Noma'lum/bo'sh maydonlar bo'sh string bo'ladi (shablon "—" qo'ymaydi, tinch).
 */
export function buildTokens(c: any): Record<string, string> {
  const st = c.student ?? {};
  const cls = st.class ?? null;
  const branch = st.branch ?? null;
  const guardians: any[] = st.guardians ?? [];
  const primary =
    guardians.find((g) => g.isPrimary)?.guardian ?? guardians[0]?.guardian ?? null;

  const installments: any[] = c.installments ?? [];
  const totalSum = installments.reduce((s, i) => s + (i.amount || 0), 0);
  const months = installments.length;

  const birth = st.birthDate ? new Date(st.birthDate) : null;
  const bp = birth ? tashkentParts(birth) : null;

  const fio = [st.lastName, st.firstName, st.middleName].filter(Boolean).join(' ');

  const tdStyle = 'border:1px solid #999;padding:4px 8px';
  const rows = installments
    .map(
      (i, idx) =>
        `<tr><td style="${tdStyle};text-align:center">${idx + 1}</td><td style="${tdStyle}">${fmtDate(i.dueDate)}</td><td style="${tdStyle};text-align:right">${money(i.amount)}</td></tr>`,
    )
    .join('');
  const jadval = installments.length
    ? `<table style="width:100%;border-collapse:collapse;margin:8px 0"><thead><tr><th style="${tdStyle};text-align:center">№</th><th style="${tdStyle};text-align:left">To'lov sanasi</th><th style="${tdStyle};text-align:right">Summa</th></tr></thead><tbody>${rows}</tbody></table>`
    : '';

  return {
    shartnoma_raqami: esc(c.number ?? ''),
    shartnoma_sana: c.startDate ? fmtDate(c.startDate) : '',
    oquv_yili: esc(cls?.academicYear ?? ''),
    filial: esc(branch?.name ?? ''),
    sinf: esc(cls?.name ?? ''),
    oquvchi_fio: esc(fio),
    oquvchi_familiya: esc(st.lastName ?? ''),
    oquvchi_ism: esc(st.firstName ?? ''),
    oquvchi_sharif: esc(st.middleName ?? ''),
    oquvchi_tugilgan_sana: birth ? fmtDate(birth) : '',
    oquvchi_tugilgan_kun: bp ? bp.day : '',
    oquvchi_tugilgan_oy: bp ? UZ_MONTHS[Number(bp.m) - 1] ?? '' : '',
    oquvchi_tugilgan_yil: bp ? bp.y : '',
    oquvchi_manzil: esc(st.address ?? ''),
    vasiy_fio: esc(primary?.fullName ?? ''),
    vasiy_telefon: esc(primary?.phone ?? ''),
    vasiy_passport: esc(primary?.passport ?? ''),
    vasiy_turi: esc(primary?.relation ?? ''),
    oylik_tolov: money(c.monthlyAmount ?? 0),
    yillik_tolov: money(totalSum),
    jami_summa: money(totalSum),
    oylar_soni: String(months),
    tolov_jadvali: jadval,
    bugungi_sana: fmtDate(today()),
    maktab_nomi: SCHOOL_NAME,
  };
}

/** HTML ichidagi {{token}} larni almashtiradi. Noma'lum token asl holicha qoladi. */
export function fillPlaceholders(html: string, tokens: Record<string, string>): string {
  return html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (m, key) =>
    Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] : m,
  );
}
