import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string; // user id
  role: string; // rol slug
  permissions: string[];
}

function requiredAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_ACCESS_SECRET .env da yo'q — tokenlarni xavfsiz tekshirish mumkin emas",
    );
  }
  if (process.env.NODE_ENV === 'production' && /change_me|CHANGE_ME/.test(secret)) {
    throw new Error(
      "JWT_ACCESS_SECRET namunadagi qiymatda qolgan — uzun tasodifiy satr qo'ying",
    );
  }
  return secret;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Standart qiymatga tushish xavfli: repo ochiq, kalit hammaga ma'lum bo'lardi.
      // Kalit yo'q bo'lsa tizim ishga tushmaydi (token imzolash ham baribir ishlamaydi).
      secretOrKey: requiredAccessSecret(),
    });
  }

  async validate(payload: JwtPayload) {
    // request.user ga shu obyekt yoziladi
    return {
      id: payload.sub,
      role: payload.role,
      permissions: payload.permissions,
    };
  }
}
