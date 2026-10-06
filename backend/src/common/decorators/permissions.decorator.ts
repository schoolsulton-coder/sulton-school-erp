import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Endpoint uchun kerakli ruxsatlarni belgilaydi.
 * Misol: @Permissions('students.create')
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const PERMISSIONS_ANY_KEY = 'permissions_any';

/**
 * Ro'yxatdagi ruxsatlardan BITTASI yetarli (OR).
 * Misol: @PermissionsAny('finance.view', 'contracts.view') — kassa ro'yxatini
 * moliyachi ham, to'lov kirituvchi administrator ham o'qiy oladi.
 */
export const PermissionsAny = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_ANY_KEY, permissions);
