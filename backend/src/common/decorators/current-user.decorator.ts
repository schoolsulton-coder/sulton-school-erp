import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * So'rov egasini (JWT'dan) qaytaradi.
 * Misol: getProfile(@CurrentUser() user) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
