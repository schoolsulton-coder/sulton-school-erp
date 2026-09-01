/**
 * VAQTINCHALIK ochiq rejim — dasturning barcha oynalari va ma'lumotlari
 * har qanday xodimga ochiq (frontend juftligi: `frontend/lib/rbac.ts`).
 *
 * O'quvchi/vasiy portal akkauntlari bundan mustasno — ular o'z kabinetida qoladi.
 * Rollar bo'yicha qat'iy cheklovni qaytarish: `.env` da RBAC_STRICT=true.
 */

/** O'z kabinetida qoladigan rollar — ochiq rejim ularga tegmaydi. */
export const PORTAL_ROLES = ['student', 'guardian'];

export function isOpenAccess(role?: string): boolean {
  if (process.env.RBAC_STRICT === 'true') return false;
  return !!role && !PORTAL_ROLES.includes(role);
}
