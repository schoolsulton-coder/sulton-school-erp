import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { AddGuardianDto } from './dto/add-guardian.dto';
import { CreateAccountDto } from './dto/create-account.dto';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    classId?: string;
    status?: string;
  }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;

    const where: any = {};
    if (params.classId) where.classId = params.classId;
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { class: { select: { id: true, name: true } } },
        orderBy: { lastName: 'asc' },
      }),
      this.prisma.student.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        class: true,
        guardians: { include: { guardian: true } },
        documents: true,
        contracts: {
          select: { id: true, number: true, status: true, monthlyAmount: true },
        },
      },
    });
    if (!student) throw new NotFoundException("O'quvchi topilmadi");
    return student;
  }

  create(dto: CreateStudentDto) {
    return this.prisma.student.create({
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      },
    });
  }

  async update(id: string, dto: UpdateStudentDto) {
    await this.findOne(id);
    return this.prisma.student.update({
      where: { id },
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      },
    });
  }

  // ---- Vasiylar ----
  async addGuardian(id: string, dto: AddGuardianDto) {
    await this.findOne(id);
    const guardian = await this.prisma.guardian.create({
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        relation: dto.relation,
      },
    });
    await this.prisma.studentGuardian.create({
      data: {
        studentId: id,
        guardianId: guardian.id,
        isPrimary: dto.isPrimary ?? false,
      },
    });
    return guardian;
  }

  async removeGuardian(id: string, guardianId: string) {
    return this.prisma.studentGuardian.delete({
      where: { studentId_guardianId: { studentId: id, guardianId } },
    });
  }

  // ---- Login akkaunt provisioning (portal uchun) ----
  private async roleId(slug: string) {
    const role = await this.prisma.role.findUnique({ where: { slug } });
    if (!role) throw new NotFoundException(`"${slug}" roli topilmadi (seed?)`);
    return role.id;
  }

  /** O'quvchiga login akkaunt yaratish va biriktirish */
  async createStudentAccount(id: string, dto: CreateAccountDto) {
    const student = await this.findOne(id);
    if (student.userId) throw new ConflictException("O'quvchida akkaunt allaqachon bor");
    if (!dto.phone) throw new BadRequestException('Login uchun telefon kerak');

    const exists = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (exists) throw new ConflictException('Bu telefon allaqachon mavjud');

    const user = await this.prisma.user.create({
      data: {
        fullName: `${student.lastName} ${student.firstName}`,
        phone: dto.phone,
        password: await argon2.hash(dto.password),
        roleId: await this.roleId('student'),
      },
    });
    await this.prisma.student.update({
      where: { id },
      data: { userId: user.id },
    });
    return { ok: true, userId: user.id, login: dto.phone };
  }

  /** Vasiyga login akkaunt yaratish (guardian.phone bo'yicha) */
  async createGuardianAccount(guardianId: string, dto: CreateAccountDto) {
    const guardian = await this.prisma.guardian.findUnique({ where: { id: guardianId } });
    if (!guardian) throw new NotFoundException('Vasiy topilmadi');
    if (guardian.userId) throw new ConflictException('Vasiyda akkaunt allaqachon bor');

    const phone = dto.phone ?? guardian.phone;
    const exists = await this.prisma.user.findUnique({ where: { phone } });
    if (exists) throw new ConflictException('Bu telefon allaqachon mavjud');

    const user = await this.prisma.user.create({
      data: {
        fullName: guardian.fullName,
        phone,
        password: await argon2.hash(dto.password),
        roleId: await this.roleId('guardian'),
      },
    });
    await this.prisma.guardian.update({
      where: { id: guardianId },
      data: { userId: user.id },
    });
    return { ok: true, userId: user.id, login: phone };
  }

  async remove(id: string) {
    await this.findOne(id);
    // soft-delete: arxivga o'tkazamiz
    return this.prisma.student.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }
}
