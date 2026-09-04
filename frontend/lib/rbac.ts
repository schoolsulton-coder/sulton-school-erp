/**
 * VAQTINCHALIK: dasturning barcha oynalari har qanday xodimga ko'rinadi —
 * menyu, tab va tugmalardagi ruxsat filtri o'chirilgan (`useAuthStore.can`).
 *
 * Portal akkauntlari (o'quvchi/vasiy) bundan mustasno: ular baribir /portal ga
 * yo'naltiriladi, ERP oynalari ularga ochilmaydi.
 *
 * Rollar bo'yicha cheklovni qaytarish uchun — shu qiymatni `false` qiling
 * (backend tomonda: `.env` da RBAC_STRICT=true).
 */
export const SHOW_ALL_MENUS = true;

/** O'z kabinetida qoladigan rollar — bu yerdagi qoidalar ularga tegmaydi. */
export const PORTAL_ROLES = ['student', 'guardian'];

/**
 * "O'quv jarayoni" — ochiq rejimdan MUSTASNO bo'lim: faqat shu rollarga ko'rinadi
 * (chap menuda ochilgan ro'yxat holida), qolganlarda menyudan butunlay yashiriladi.
 */
export const ACADEMIC_SECTION = "O'quv jarayoni";
export const ACADEMIC_ROLES = ['coordinator', 'teacher', 'curator'];

/** To'liq kirish rollari — hamma narsani ko'radi (O'quv jarayoni ham). */
export const FULL_ACCESS_ROLES = ['superadmin', 'admin', 'owner'];

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
 * "O'quv jarayoni" bo'limini menyuda ko'rsatish:
 * akademik rollar YOKI to'liq kirish rollari (superadmin/admin/owner).
 */
export const canSeeAcademicSection = (role?: string): boolean =>
  canSeeAcademic(role) || (!!role && FULL_ACCESS_ROLES.includes(role));
