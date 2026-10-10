/**
 * Menyu va tugmalar ko'rinishi (backend juftligi: `backend/src/common/rbac-open.ts`).
 *
 *  - Owner/Superadmin — hamma oyna;
 *  - Administrator, koordinator, ustoz, kurator — FAQAT o'z ruxsatlari;
 *  - qolgan xodim rollari — hozircha ochiq rejimda (SHOW_ALL_MENUS);
 *  - o'quvchi/vasiy — portal.
 *
 * Hamma rolni ruxsat bo'yicha cheklash uchun SHOW_ALL_MENUS = false
 * (backend tomonda: `.env` da RBAC_STRICT=true).
 */
export const SHOW_ALL_MENUS = true;

/**
 * Ruxsatlari qat'iy tekshiriladigan rollar — ochiq rejim bularga tegmaydi.
 * Administrator: qabul, shartnoma/to'lov, o'quvchi oynalari.
 * Koordinator/ustoz/kurator: o'quv jarayoni va faqat o'z sinflari.
 */
export const STRICT_ROLES = ['admin', 'coordinator', 'teacher', 'curator'];

/** O'z kabinetida qoladigan rollar — bu yerdagi qoidalar ularga tegmaydi. */
export const PORTAL_ROLES = ['student', 'guardian'];

/**
 * "O'quv jarayoni" — ochiq rejimdan MUSTASNO bo'lim: faqat shu rollarga ko'rinadi
 * (chap menuda ochilgan ro'yxat holida), qolganlarda menyudan butunlay yashiriladi.
 */
export const ACADEMIC_SECTION = "O'quv jarayoni";
export const ACADEMIC_ROLES = ['coordinator', 'teacher', 'curator'];

/** To'liq kirish rollari — hamma narsani ko'radi (O'quv jarayoni ham). */
export const FULL_ACCESS_ROLES = ['superadmin', 'owner'];

/** To'liq kirish rollari kirgandan keyin tushadigan sahifa */
export const FULL_ACCESS_HOME = '/dashboard';

/**
 * Akademik rollar (ustoz/kurator/koordinator) menyusida FAQAT shu ikki bo'lim bo'ladi.
 * Qolgan hamma narsa (Qabulxona, moliya, maoshlar, hisobotlar, sozlamalar) yashiriladi.
 */
export const ACADEMIC_SECTIONS = ["Ma'lumotlar", ACADEMIC_SECTION];

/** Akademik rol kirgandan keyin tushadigan sahifa */
export const ACADEMIC_HOME = '/students';

export const canSeeAcademic = (role?: string): boolean =>
  !!role && ACADEMIC_ROLES.includes(role);

/**
 * Hamma sinf bilan ishlay oladimi (backend juftligi: rbac-open.ts canSeeAllClasses).
 * Ustoz/kurator/koordinator — faqat o'z sinflari, shuning uchun ular maktab
 * bo'yicha umumiy sozlamalarga tegmaydi.
 */
export const canSeeAllClasses = (role?: string): boolean =>
  !!role &&
  !PORTAL_ROLES.includes(role) &&
  (FULL_ACCESS_ROLES.includes(role) || !ACADEMIC_ROLES.includes(role));

/** "O'quv jarayoni" oynalarining ruxsatlari */
export const ACADEMIC_PERMS = [
  'grades.view',
  'attendance.view',
  'homework.view',
  'behavior.view',
];

/**
 * "O'quv jarayoni" bo'limini menyuda ko'rsatish: akademik rollar, to'liq kirish
 * rollari YOKI ruxsatlar ro'yxatida akademik ruxsati bor rol (Administrator,
 * akademik bo'lim rahbari).
 *
 * Ochiq rejim bu yerda ishlamaydi — aks holda sotuv/hisobchi kabi rollarga ham
 * o'quv jarayoni ko'rinib ketardi, shuning uchun ruxsatlar ro'yxati tekshiriladi.
 */
export const canSeeAcademicSection = (
  role?: string,
  permissions?: string[],
): boolean =>
  canSeeAcademic(role) ||
  (!!role && FULL_ACCESS_ROLES.includes(role)) ||
  (permissions ?? []).some((p) => ACADEMIC_PERMS.includes(p));
