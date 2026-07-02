import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT access token'ni tekshiradi. Har bir himoyalangan endpoint'da ishlatiladi.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
