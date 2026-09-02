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

export const canSeeAcademic = (role?: string): boolean =>
  !!role && ACADEMIC_ROLES.includes(role);
