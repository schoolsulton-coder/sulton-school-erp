import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { isOpenAccess } from '../rbac-open';

/**
 * RBAC: endpoint uchun kerakli ruxsat foydalanuvchida bor-yo'qligini tekshiradi.
 * Foydalanuvchi ruxsatlari JWT payload'ida (`permissions: string[]`) keladi.
 * Administrator (`admin`) — barcha ruxsatlarga ega.
 *
 * VAQTINCHALIK ochiq rejim: dasturning barcha oynalari hamma xodimga ochiq —
 * tizimga kirgan har qanday foydalanuvchi (o'quvchi/vasiydan tashqari) barcha
 * endpointlardan foydalana oladi (frontend'dagi SHOW_ALL_MENUS bilan juft).
 * Rollar bo'yicha qat'iy cheklovni qaytarish: `.env` da RBAC_STRICT=true.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Avtorizatsiya talab qilinadi');

    if (user.role === 'superadmin') return true;

    if (isOpenAccess(user.role)) return true;

    const userPermissions: string[] = user.permissions ?? [];
    const hasAll = required.every((p) => userPermissions.includes(p));
    if (!hasAll) {
      throw new ForbiddenException('Bu amal uchun ruxsat yo‘q');
    }
    return true;
  }
}
