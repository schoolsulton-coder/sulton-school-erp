import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SAFE_SELECT = {
  id: true,
  fullName: true,
  phone: true,
  email: true,
  avatar: true,
  status: true,
  createdAt: true,
  role: { select: { id: true, name: true, slug: true } },
  subject: { select: { id: true, name: true } },
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ===== Foydalanuvchilar =====
  listUsers(params: { search?: string; roleId?: string }) {
    const where: any = {};
    if (params.roleId) where.roleId = params.roleId;
    if (params.search) {
      where.OR = [
        { fullName: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search } },
      ];
    }
    return this.prisma.user.findMany({
      where,
      select: SAFE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createUser(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (exists) throw new ConflictException('Bu telefon allaqachon mavjud');

    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });
    if (!role) throw new NotFoundException('Rol topilmadi');

    return this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email,
        roleId: dto.roleId,
        subjectId: dto.subjectId || null,
        password: await argon2.hash(dto.password),
      },
      select: SAFE_SELECT,
    });
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    await this.ensureUser(id);
    if (dto.phone) {
      const other = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (other && other.id !== id) {
        throw new ConflictException('Bu telefon boshqa foydalanuvchida');
      }
    }
    return this.prisma.user.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.subjectId !== undefined ? { subjectId: dto.subjectId || null } : {}),
      },
      select: SAFE_SELECT,
    });
  }

  async resetPassword(id: string, password: string) {
    await this.ensureUser(id);
    await this.prisma.user.update({
      where: { id },
      data: { password: await argon2.hash(password) },
    });
    return { ok: true };
  }

  async setStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED') {
    await this.ensureUser(id);
    return this.prisma.user.update({
      where: { id },
      data: { status },
      select: SAFE_SELECT,
    });
  }

  private async ensureUser(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('Foydalanuvchi topilmadi');
    return u;
  }

  // ===== Rollar va ruxsatlar =====
  async listRoles() {
    const roles = await this.prisma.role.findMany({
      include: { _count: { select: { permissions: true, users: true } } },
      orderBy: { name: 'asc' },
    });
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      permissionCount: r._count.permissions,
      userCount: r._count.users,
    }));
  }

  async getRole(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException('Rol topilmadi');
    return {
      id: role.id,
      name: role.name,
      slug: role.slug,
      permissionSlugs: role.permissions.map((p) => p.permission.slug),
    };
  }

  async listPermissions() {
    const perms = await this.prisma.permission.findMany({
      orderBy: [{ group: 'asc' }, { slug: 'asc' }],
    });
    // guruhlash
    const grouped: Record<string, { slug: string; name: string }[]> = {};
    for (const p of perms) {
      (grouped[p.group] ??= []).push({ slug: p.slug, name: p.name });
    }
    return Object.entries(grouped).map(([group, items]) => ({ group, items }));
  }

  async updateRolePermissions(roleId: string, slugs: string[]) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Rol topilmadi');
    if (role.slug === 'admin') {
      throw new BadRequestException(
        'Administrator rolining ruxsatlarini o‘zgartirib bo‘lmaydi',
      );
    }

    const permissions = await this.prisma.permission.findMany({
      where: { slug: { in: slugs } },
      select: { id: true },
    });

    return this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (permissions.length) {
        await tx.rolePermission.createMany({
          data: permissions.map((p) => ({ roleId, permissionId: p.id })),
        });
      }
      return { assigned: permissions.length };
    });
  }
}
