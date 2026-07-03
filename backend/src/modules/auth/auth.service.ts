import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async validateUser(login: string, password: string) {
    // Login — telefon yoki email
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ phone: login }, { email: login }] },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Login yoki parol noto‘g‘ri');
    }

    const ok = await argon2.verify(user.password, password);
    if (!ok) {
      throw new UnauthorizedException('Login yoki parol noto‘g‘ri');
    }
    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.login, dto.password);
    const permissions = user.role.permissions.map((rp) => rp.permission.slug);

    const payload = {
      sub: user.id,
      role: user.role.slug,
      permissions,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_TTL ?? '15m',
    });
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_TTL ?? '7d',
      },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role.slug,
        permissions,
      },
    };
  }
}
