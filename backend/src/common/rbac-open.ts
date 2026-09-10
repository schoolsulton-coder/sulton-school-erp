/**
 * VAQTINCHALIK ochiq rejim — dasturning barcha oynalari va ma'lumotlari
 * har qanday xodimga ochiq (frontend juftligi: `frontend/lib/rbac.ts`).
 *
 * O'quvchi/vasiy portal akkauntlari bundan mustasno — ular o'z kabinetida qoladi.
 * Rollar bo'yicha qat'iy cheklovni qaytarish: `.env` da RBAC_STRICT=true.
 */

/** O'z kabinetida qoladigan rollar — ochiq rejim ularga tegmaydi. */
export const PORTAL_ROLES = ['student', 'guardian'];

/**
 * Faqat o'ziga biriktirilgan sinflar bilan ishlaydigan rollar.
 * Ochiq rejim bularga "hamma sinf" huquqini bermaydi — Baholash/Davomat/Vazifalar
 * oynalarida ustoz o'z sinflarini (ClassTeacher + dars jadvali) ko'radi.
 */
export const OWN_CLASSES_ROLES = ['teacher', 'curator', 'coordinator'];

export function isOpenAccess(role?: string): boolean {
  if (process.env.RBAC_STRICT === 'true') return false;
  return !!role && !PORTAL_ROLES.includes(role);
}

/** Ochiq rejimda ham hamma sinfni ko'ra oladimi (ustoz/kurator/koordinator — yo'q) */
export function canSeeAllClasses(role?: string): boolean {
  return isOpenAccess(role) && !!role && !OWN_CLASSES_ROLES.includes(role);
}
