import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string; // user id
  role: string; // rol slug
  permissions: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'change_me_access_secret',
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
