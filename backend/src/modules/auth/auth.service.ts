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

  private async signAccess(user: { id: string; role: { slug: string }; permissions: string[] }) {
    return this.jwt.signAsync(
      { sub: user.id, role: user.role.slug, permissions: user.permissions },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: process.env.JWT_ACCESS_TTL ?? '1h' },
    );
  }

  private userView(user: any, permissions: string[]) {
    return {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      role: user.role.slug,
      permissions,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.login, dto.password);
    const permissions = user.role.permissions.map((rp) => rp.permission.slug);

    const accessToken = await this.signAccess({ id: user.id, role: user.role, permissions });
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: process.env.JWT_REFRESH_TTL ?? '30d' },
    );

    return { accessToken, refreshToken, user: this.userView(user, permissions) };
  }

  // Refresh token orqali yangi access token (foydalanuvchi doim qaytadan yuklanadi —
  // rol/ruxsatlar yangilanadi). Stateless: bir nechta qurilma bir vaqtda kira oladi.
  async refresh(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('Refresh token yo‘q');
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException('Sessiya muddati tugagan');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Foydalanuvchi faol emas');
    }
    const permissions = user.role.permissions.map((rp) => rp.permission.slug);
    const accessToken = await this.signAccess({ id: user.id, role: user.role, permissions });
    return { accessToken, user: this.userView(user, permissions) };
  }
}
