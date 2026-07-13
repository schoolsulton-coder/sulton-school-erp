import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PdfService } from './pdf.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { renderContractHtml } from './contract-template';

type DiscountRow = { type: 'PERCENT' | 'FIXED'; value: number; name: string };

@Injectable()
export class ContractsService {
  constructor(
    private prisma: PrismaService,
    private pdf: PdfService,
  ) {}

  // ===== Chegirmalar =====
  listDiscounts() {
    return this.prisma.discount.findMany({ orderBy: { name: 'asc' } });
  }

  createDiscount(dto: CreateDiscountDto) {
    return this.prisma.discount.create({ data: dto });
  }

  private applyDiscount(amount: number, d: DiscountRow | null): number {
    if (!d) return amount;
    if (d.type === 'PERCENT') return Math.round(amount * (1 - d.value / 100));
    return Math.max(0, amount - d.value); // FIXED — oylikdan ayiriladi
  }

  // ===== Shartnoma raqami: SHRT-YYYY-NNNN =====
  private async nextNumber(year: number): Promise<string> {
    const from = new Date(year, 0, 1);
    const to = new Date(year + 1, 0, 1);
    const count = await this.prisma.contract.count({
      where: { createdAt: { gte: from, lt: to } },
    });
    return `SHRT-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  // ===== Yaratish + oyma-oy jadval =====
  async create(dto: CreateContractDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException("O'quvchi topilmadi");

    const discount = dto.discountId
      ? await this.prisma.discount.findUnique({ where: { id: dto.discountId } })
      : null;

    const start = new Date(dto.startDate);
    const dueDay = dto.dueDay ?? 5;
    // Chegirma: to'g'ridan-to'g'ri summa berilsa oyiga ayriladi, aks holda Discount entity
    const monthly =
      dto.discountAmount != null
        ? Math.max(0, dto.monthlyAmount - dto.discountAmount)
        : this.applyDiscount(dto.monthlyAmount, discount as DiscountRow | null);

    const installments: { dueDate: Date; amount: number }[] = [];
    let endDate = start;
    for (let i = 0; i < dto.months; i++) {
      const due = new Date(start.getFullYear(), start.getMonth() + i, dueDay);
      endDate = due;
      installments.push({ dueDate: due, amount: monthly });
    }

    const number = await this.nextNumber(start.getFullYear());

    return this.prisma.contract.create({
      data: {
        number,
        studentId: dto.studentId,
        startDate: start,
        endDate,
        monthlyAmount: dto.monthlyAmount,
        type: dto.type ?? 'MONTHLY',
        discountId: dto.discountId,
        status: 'ACTIVE',
        installments: { create: installments },
      },
      include: { installments: { orderBy: { dueDate: 'asc' } } },
    });
  }

  // ===== Barcha to'lovlar (To'lovlar sahifasi) =====
  recentPayments() {
    return this.prisma.payment.findMany({
      include: {
        student: { select: { firstName: true, lastName: true } },
        contract: { select: { number: true } },
      },
      orderBy: { paidAt: 'desc' },
      take: 200,
    });
  }

  // ===== Ro'yxat =====
  async findAll(params: { status?: string; studentId?: string }) {
    const contracts = await this.prisma.contract.findMany({
      where: {
        ...(params.status ? { status: params.status as any } : {}),
        ...(params.studentId ? { studentId: params.studentId } : {}),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        installments: { select: { amount: true, paidAmount: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return contracts.map((c) => {
      const total = c.installments.reduce((s, i) => s + i.amount, 0);
      const paid = c.installments.reduce((s, i) => s + i.paidAmount, 0);
      const overdue = c.installments.filter((i) => i.status === 'OVERDUE').length;
      return {
        id: c.id,
        number: c.number,
        student: c.student,
        status: c.status,
        monthlyAmount: c.monthlyAmount,
        total,
        paid,
        debt: total - paid,
        overdueCount: overdue,
      };
    });
  }

  // ===== Boy ko'rinish: stat plitkalar + qatorlar =====
  async overview() {
    const contracts = await this.prisma.contract.findMany({
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            branch: { select: { name: true } },
            class: { select: { name: true, language: true, academicYear: true } },
          },
        },
        installments: { select: { amount: true, paidAmount: true, status: true } },
        payments: { select: { amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = contracts.map((c) => {
      const months = Math.max(1, c.installments.length);
      const payable = c.installments.reduce((s, i) => s + i.amount, 0);
      const original = Math.round(c.monthlyAmount * months); // asl narx (chegirmasiz)
      const discount = Math.max(0, original - payable); // chegirma summasi
      const monthly = Math.round(payable / months);
      const paymentsSum = c.payments.reduce((s, p) => s + p.amount, 0);
      const overdue = c.installments.some((i) => i.status === 'OVERDUE');
      return {
        id: c.id,
        number: c.number,
        createdAt: c.createdAt,
        student: {
          firstName: c.student.firstName,
          lastName: c.student.lastName,
          class: c.student.class
            ? { name: c.student.class.name, language: c.student.class.language }
            : null,
        },
        branch: c.student.branch?.name ?? null,
        academicYear: c.student.class?.academicYear ?? null,
        type: c.type,
        status: c.status,
        overdue,
        original,
        discount,
        payable,
        monthly,
        paymentsSum,
      };
    });

    const cnt = (fn: (r: (typeof rows)[number]) => boolean) => rows.filter(fn).length;
    const stats = {
      total: rows.length,
      monthly: cnt((r) => r.type === 'MONTHLY'),
      yearly: cnt((r) => r.type === 'YEARLY'),
      suspended: cnt((r) => r.status === 'SUSPENDED'),
      tempSuspended: cnt((r) => r.status === 'TEMP_SUSPENDED'),
      overdue: cnt((r) => r.overdue),
      left: cnt((r) => r.status === 'LEFT'),
      other: cnt((r) => ['OTHER', 'DRAFT', 'COMPLETED', 'CANCELLED'].includes(r.status)),
      payableSum: rows.reduce((s, r) => s + r.payable, 0),
      paymentsSum: rows.reduce((s, r) => s + r.paymentsSum, 0),
    };

    return { stats, rows };
  }

  async findOne(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            guardians: { include: { guardian: true } },
            class: { select: { name: true, language: true, academicYear: true } },
            branch: { select: { name: true } },
          },
        },
        discount: true,
        installments: { orderBy: { dueDate: 'asc' } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });
    if (!contract) throw new NotFoundException('Shartnoma topilmadi');
    return contract;
  }

  // ===== To'lov qabul qilish + installment'larga taqsimlash =====
  async addPayment(id: string, dto: CreatePaymentDto) {
    const contract = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          studentId: contract.studentId,
          contractId: id,
          amount: dto.amount,
          method: dto.method,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
          note: dto.note,
        },
      });

      // eng eski to'lanmagan installment'lardan boshlab taqsimlash
      let remaining = dto.amount;
      const pending = await tx.contractInstallment.findMany({
        where: { contractId: id, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
        orderBy: { dueDate: 'asc' },
      });

      for (const inst of pending) {
        if (remaining <= 0) break;
        const need = inst.amount - inst.paidAmount;
        const pay = Math.min(need, remaining);
        remaining -= pay;
        const newPaid = inst.paidAmount + pay;
        await tx.contractInstallment.update({
          where: { id: inst.id },
          data: {
            paidAmount: newPaid,
            status: newPaid >= inst.amount ? 'PAID' : 'PARTIAL',
          },
        });
      }

      // barcha installment to'langan bo'lsa — shartnoma yopiladi
      const unpaid = await tx.contractInstallment.count({
        where: { contractId: id, status: { not: 'PAID' } },
      });
      if (unpaid === 0) {
        await tx.contract.update({
          where: { id },
          data: { status: 'COMPLETED' },
        });
      }

      return { payment, creditLeft: remaining };
    });
  }

  // ===== Muddati o'tgan to'lovlarni belgilash (cron chaqiradi) =====
  async markOverdue() {
    const res = await this.prisma.contractInstallment.updateMany({
      where: {
        dueDate: { lt: new Date() },
        status: { in: ['PENDING', 'PARTIAL'] },
      },
      data: { status: 'OVERDUE' },
    });
    return { updated: res.count };
  }

  async cancel(id: string) {
    await this.findOne(id);
    return this.prisma.contract.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // ===== PDF =====
  async generatePdf(id: string): Promise<{ buffer: Buffer; number: string }> {
    const c = await this.findOne(id);
    const primaryGuardian =
      c.student.guardians.find((g) => g.isPrimary)?.guardian ??
      c.student.guardians[0]?.guardian;

    const discountLabel = c.discount
      ? c.discount.type === 'PERCENT'
        ? `${c.discount.value}%`
        : `${c.discount.value} so'm`
      : null;

    const html = renderContractHtml({
      number: c.number,
      date: c.startDate.toLocaleDateString('uz-UZ'),
      student: {
        firstName: c.student.firstName,
        lastName: c.student.lastName,
        middleName: c.student.middleName,
      },
      guardianName: primaryGuardian?.fullName,
      guardianPhone: primaryGuardian?.phone,
      monthlyAmount: c.monthlyAmount,
      discountLabel,
      months: c.installments.length,
      installments: c.installments.map((i, idx) => ({
        index: idx + 1,
        dueDate: i.dueDate.toLocaleDateString('uz-UZ'),
        amount: i.amount,
      })),
      total: c.installments.reduce((s, i) => s + i.amount, 0),
    });

    const buffer = await this.pdf.fromHtml(html);
    return { buffer, number: c.number };
  }
}
