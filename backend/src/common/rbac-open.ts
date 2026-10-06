/**
 * Rollar bo'yicha kirish qoidalari (frontend juftligi: `frontend/lib/rbac.ts`).
 *
 *  - Owner/Superadmin — hamma oyna va ma'lumot.
 *  - Administrator, koordinator, ustoz, kurator — FAQAT o'z ruxsatlari doirasida.
 *  - Qolgan xodim rollari — hozircha ochiq rejimda (`.env` da RBAC_STRICT=true bilan yopiladi).
 *  - O'quvchi/vasiy — faqat portal.
 */

/** O'z kabinetida qoladigan rollar — ERP oynalari ularga ochilmaydi. */
export const PORTAL_ROLES = ['student', 'guardian'];

/** Hamma oyna va ma'lumot ochiq bo'ladigan rollar. */
export const FULL_ACCESS_ROLES = ['superadmin', 'owner'];

/**
 * Faqat o'ziga biriktirilgan sinflar bilan ishlaydigan rollar.
 * Baholash/Davomat/Vazifa/Ahloq oynalarida ular o'z sinflarini ko'radi
 * (ClassTeacher + dars jadvali orqali).
 */
export const OWN_CLASSES_ROLES = ['teacher', 'curator', 'coordinator'];

/**
 * Ruxsatlari qat'iy tekshiriladigan rollar — ochiq rejim bularga tegmaydi.
 * Administrator shu ro'yxatda: u faqat qabul, shartnoma/to'lov va o'quvchi
 * oynalarini ko'radi.
 */
export const STRICT_ROLES = ['admin', ...OWN_CLASSES_ROLES];

/** Ochiq rejim (vaqtinchalik): ruxsat tekshirilmasdan hamma narsa ochiq */
export function isOpenAccess(role?: string): boolean {
  if (process.env.RBAC_STRICT === 'true') return false;
  if (!role || PORTAL_ROLES.includes(role)) return false;
  return !STRICT_ROLES.includes(role);
}

/** Hamma sinfni ko'ra oladimi (ustoz/kurator/koordinator — faqat o'zinikini) */
export function canSeeAllClasses(role?: string): boolean {
  if (!role) return false;
  if (FULL_ACCESS_ROLES.includes(role)) return true;
  return isOpenAccess(role) && !OWN_CLASSES_ROLES.includes(role);
}
