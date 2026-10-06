import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_ANY_KEY,
  PERMISSIONS_KEY,
} from '../decorators/permissions.decorator';
import { FULL_ACCESS_ROLES, isOpenAccess } from '../rbac-open';

/**
 * RBAC: endpoint uchun kerakli ruxsat foydalanuvchida bor-yo'qligini tekshiradi.
 * Foydalanuvchi ruxsatlari JWT payload'ida (`permissions: string[]`) keladi.
 *
 *  - Owner/Superadmin — hamma narsa ochiq;
 *  - Administrator/koordinator/ustoz/kurator — faqat o'z ruxsatlari (rbac-open.ts);
 *  - qolgan xodim rollari — hozircha ochiq rejimda (RBAC_STRICT=true bilan yopiladi).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const anyOf = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_ANY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if ((!required || required.length === 0) && (!anyOf || anyOf.length === 0)) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Avtorizatsiya talab qilinadi');

    // Owner/Superadmin — hamma narsaga ruxsat
    if (FULL_ACCESS_ROLES.includes(user.role)) return true;

    if (isOpenAccess(user.role)) return true;

    const userPermissions: string[] = user.permissions ?? [];
    if (required?.length && !required.every((p) => userPermissions.includes(p))) {
      throw new ForbiddenException('Bu amal uchun ruxsat yo‘q');
    }
    if (anyOf?.length && !anyOf.some((p) => userPermissions.includes(p))) {
      throw new ForbiddenException('Bu amal uchun ruxsat yo‘q');
    }
    return true;
  }
}
