import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreatePositionDto } from './dto/create-position.dto';
import { HireEmployeeDto } from './dto/hire-employee.dto';
import { SetSalaryDto } from './dto/set-salary.dto';
import { TerminateDto } from './dto/terminate.dto';
import { AddDocumentDto } from './dto/add-document.dto';

@Injectable()
export class HrService {
  constructor(private prisma: PrismaService) {}

  // ===== Bo'limlar =====
  listDepartments() {
    return this.prisma.department.findMany({
      include: {
        positions: true,
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  createDepartment(dto: CreateDepartmentDto) {
    return this.prisma.department.create({ data: dto });
  }

  // ===== Lavozimlar =====
  listPositions() {
    return this.prisma.position.findMany({
      include: { department: true },
      orderBy: { name: 'asc' },
    });
  }

  createPosition(dto: CreatePositionDto) {
    return this.prisma.position.create({ data: dto });
  }

  // ===== Xodimlar =====
  listEmployees(params: { status?: string; departmentId?: string }) {
    return this.prisma.employee.findMany({
      where: {
        ...(params.status ? { status: params.status as any } : {}),
        ...(params.departmentId ? { departmentId: params.departmentId } : {}),
      },
      include: {
        user: { select: { id: true, fullName: true, phone: true } },
        department: true,
        position: true,
        salary: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ===== Maoshlar · Xodimlar (boy ro'yxat + jamlanma) =====
  async xodimlar(params: { search?: string; branchId?: string }) {
    const where: any = {};
    if (params.branchId) where.branchId = params.branchId;
    if (params.search) {
      where.user = {
        OR: [
          { fullName: { contains: params.search, mode: 'insensitive' } },
          { phone: { contains: params.search } },
        ],
      };
    }

    const [rows, xodimlar, lavozimlar, kartaBor, telefonBor] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        include: {
          user: { select: { fullName: true, phone: true } },
          department: { select: { name: true } },
          position: { select: { name: true } },
          branch: { select: { id: true, name: true } },
          salary: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      this.prisma.employee.count(),
      this.prisma.position.count(),
      this.prisma.employee.count({ where: { cardNumber: { not: null } } }),
      this.prisma.employee.count({ where: { user: { phone: { not: '' } } } }),
    ]);

    const data = rows.map((e) => ({
      id: e.id,
      fio: e.user.fullName,
      gender: e.gender,
      phone: e.user.phone,
      branch: e.branch?.name ?? null,
      department: e.department?.name ?? null,
      position: e.position?.name ?? null,
      card: e.cardNumber,
      status: e.status,
      salaryType: e.salary?.type ?? null,
      baseRate: e.salary?.baseRate ?? null,
    }));

    return { totals: { xodimlar, lavozimlar, telefonBor, kartaBor }, data };
  }

  async getEmployee(id: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, phone: true, email: true } },
        department: true,
        position: true,
        salary: true,
        documents: true,
        payrollItems: {
          include: { payrollRun: true },
          orderBy: { id: 'desc' },
          take: 12,
        },
      },
    });
    if (!emp) throw new NotFoundException('Xodim topilmadi');
    return emp;
  }

  /** Ishga qabul: login + xodim + stavka (bitta tranzaksiyada) */
  async hire(dto: HireEmployeeDto) {
    const exists = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (exists) throw new ConflictException('Bu telefon allaqachon mavjud');

    const hashed = await argon2.hash(dto.password);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: dto.fullName,
          phone: dto.phone,
          password: hashed,
          roleId: dto.roleId,
        },
      });
      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          departmentId: dto.departmentId,
          positionId: dto.positionId,
          hireDate: new Date(dto.hireDate),
        },
      });
      if (dto.salaryType && dto.baseRate != null) {
        await tx.salary.create({
          data: {
            employeeId: employee.id,
            type: dto.salaryType,
            baseRate: dto.baseRate,
          },
        });
      }
      return employee;
    });
  }

  async setSalary(id: string, dto: SetSalaryDto) {
    await this.getEmployee(id);
    return this.prisma.salary.upsert({
      where: { employeeId: id },
      update: { type: dto.type, baseRate: dto.baseRate },
      create: { employeeId: id, type: dto.type, baseRate: dto.baseRate },
    });
  }

  async terminate(id: string, dto: TerminateDto) {
    await this.getEmployee(id);
    return this.prisma.employee.update({
      where: { id },
      data: {
        fireDate: dto.fireDate ? new Date(dto.fireDate) : new Date(),
        status: 'TERMINATED',
      },
    });
  }

  async addDocument(id: string, dto: AddDocumentDto) {
    await this.getEmployee(id);
    return this.prisma.employeeDocument.create({
      data: { employeeId: id, ...dto },
    });
  }
}
