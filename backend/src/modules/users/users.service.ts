import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { PORTAL_ROLES } from '../../common/rbac-open';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Foydalanuvchini o'chira oladigan rollar (ochiq rejim bunga tegmaydi)
const DELETE_ROLES = ['superadmin', 'admin'];

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

  /** Foydalanuvchi kartochkasi — batafsil ma'lumot + faoliyat statistikasi */
  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...SAFE_SELECT,
        updatedAt: true,
        taughtClasses: {
          select: { isCurator: true, class: { select: { id: true, name: true } } },
        },
        employee: {
          select: {
            id: true,
            hireDate: true,
            status: true,
            formal: true,
            departmentId: true,
            department: { select: { id: true, name: true } },
            position: { select: { id: true, name: true } },
            branch: { select: { id: true, name: true } },
            branchLinks: { select: { branch: { select: { id: true, name: true } } } },
          },
        },
        _count: {
          select: {
            givenGrades: true,
            givenHomeworks: true,
            markedAttendances: true,
            behaviorRecords: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    // Dars jadvalidagi darslar (Schedule'da User bilan bevosita bog'liqlik yo'q)
    const lessons = await this.prisma.schedule.count({ where: { teacherId: id } });

    return {
      ...user,
      classes: user.taughtClasses.map((t) => ({
        id: t.class.id,
        name: t.class.name,
        isCurator: t.isCurator,
      })),
      taughtClasses: undefined,
      stats: {
        lessons,
        grades: user._count.givenGrades,
        homeworks: user._count.givenHomeworks,
        attendances: user._count.markedAttendances,
        behavior: user._count.behaviorRecords,
      },
      _count: undefined,
    };
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

    const user = await this.prisma.user.create({
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

    // Xodim kartasi (Maoshlar → Xodimlar) avtomatik ochiladi — portal akkauntlaridan tashqari
    await this.ensureEmployeeCard(user.id, role.slug);

    return user;
  }

  /** Foydalanuvchiga xodim kartasi bo'lmasa — yaratadi (xato bo'lsa user yaratish buzilmaydi) */
  private async ensureEmployeeCard(userId: string, roleSlug: string) {
    if (PORTAL_ROLES.includes(roleSlug)) return;
    try {
      const exists = await this.prisma.employee.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (exists) return;
      await this.prisma.employee.create({ data: { userId, hireDate: new Date() } });
    } catch {
      // karta ochilmasa ham foydalanuvchi yaratilgan bo'ladi — Xodimlar oynasidan qo'lda qo'shiladi
    }
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
    const { departmentId, branchIds, ...userDto } = dto;

    // Rol portal (o'quvchi/vasiy) dan xodim roliga o'zgarsa — xodim kartasi ochiladi
    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
        select: { slug: true },
      });
      if (role) await this.ensureEmployeeCard(id, role.slug);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...userDto,
        ...(dto.subjectId !== undefined ? { subjectId: dto.subjectId || null } : {}),
      },
      select: SAFE_SELECT,
    });

    // Bo'lim/filiallar xodim kartasida saqlanadi — karta bo'lmasa, jim o'tkazib yuboriladi
    if (departmentId !== undefined || branchIds !== undefined) {
      const employee = await this.prisma.employee.findUnique({
        where: { userId: id },
        select: { id: true },
      });
      if (employee) {
        if (departmentId !== undefined) {
          await this.prisma.employee.update({
            where: { id: employee.id },
            data: { departmentId: departmentId || null },
          });
        }
        if (branchIds !== undefined) {
          await this.prisma.employeeBranch.deleteMany({ where: { employeeId: employee.id } });
          if (branchIds.length) {
            await this.prisma.employeeBranch.createMany({
              data: branchIds.map((branchId) => ({ employeeId: employee.id, branchId })),
              skipDuplicates: true,
            });
            // Asosiy filial — ro'yxatdagi birinchisi
            await this.prisma.employee.update({
              where: { id: employee.id },
              data: { branchId: branchIds[0] },
            });
          }
        }
      }
    }

    return user;
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

  /**
   * Foydalanuvchini butunlay o'chirish — faqat admin/superadmin.
   * Bog'liq yozuvi bo'lsa o'chirilmaydi (bloklash tavsiya etiladi).
   */
  async deleteUser(id: string, current?: { id?: string; role?: string }) {
    if (!current?.role || !DELETE_ROLES.includes(current.role)) {
      throw new ForbiddenException(
        "Foydalanuvchini faqat administrator yoki superadmin o'chira oladi",
      );
    }
    await this.ensureUser(id);
    if (current.id && current.id === id) {
      throw new ConflictException("O'z hisobingizni o'chira olmaysiz");
    }
    try {
      await this.prisma.user.delete({ where: { id } });
      return { ok: true };
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(
          "Bu foydalanuvchi tizimda ma'lumot qoldirgan (baho, davomat, to'lov va h.k.) — " +
            "o'chirib bo'lmaydi. O'rniga «Bloklash» dan foydalaning.",
        );
      }
      throw e;
    }
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
