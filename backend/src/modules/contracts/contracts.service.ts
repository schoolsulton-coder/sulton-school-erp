import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PdfService } from './pdf.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { UpdateInstallmentDto } from './dto/update-installment.dto';
import { CreateFromLeadDto } from './dto/create-from-lead.dto';
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

  // ===== Qabul (lead) kartasidan shartnoma tuzish — ATOMIK =====
  // O'quvchisi bo'lmagan lead shu tranzaksiya ichida o'quvchiga aylantiriladi,
  // shartnoma yaratiladi va lead "Shartnoma tuzdi" bosqichiga o'tkaziladi.
  async createFromLead(leadId: string, dto: CreateFromLeadDto) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { student: { select: { id: true } }, stage: true },
    });
    if (!lead) throw new NotFoundException('Murojaat topilmadi');

    // "Tasdiqlanmagan" lead'dan to'g'ridan-to'g'ri shartnoma tuzib bo'lmaydi —
    // avval vasiy(ism+tel) va talaba ismi to'ldirilishi shart (server tomonida ham kafolat)
    if (/tasdiq/i.test(lead.stage?.name ?? '')) {
      const missing: string[] = [];
      if (!lead.fullName?.trim()) missing.push('Talaba ismi');
      if (!lead.guardianName?.trim()) missing.push('Vasiy ismi');
      if (!lead.phone?.trim()) missing.push('Vasiy telefoni');
      if (missing.length) {
        throw new BadRequestException(`Avval to'ldiring: ${missing.join(', ')}`);
      }
    }

    const start = new Date(dto.startDate);
    const dueDay = dto.dueDay ?? 5;
    const monthly =
      dto.discountAmount != null
        ? Math.max(0, dto.monthlyAmount - dto.discountAmount)
        : dto.monthlyAmount;

    const installments: { dueDate: Date; amount: number }[] = [];
    let endDate = start;
    for (let i = 0; i < dto.months; i++) {
      const due = new Date(start.getFullYear(), start.getMonth() + i, dueDay);
      endDate = due;
      installments.push({ dueDate: due, amount: monthly });
    }

    const number = await this.nextNumber(start.getFullYear());
    const stages = await this.prisma.leadStage.findMany();
    const doneStage = stages.find((s) => /tuzdi|tuzildi/i.test(s.name));

    return this.prisma.$transaction(
      async (tx) => {
        let studentId = lead.student?.id;

        if (!studentId) {
          // Lead -> o'quvchi (convert logikasi shu yerda, atomik)
          const parts = lead.fullName.trim().split(/\s+/);
          const firstName = parts[0] || lead.fullName;
          const lastName = parts.slice(1).join(' ') || firstName;
          const student = await tx.student.create({
            data: {
              firstName,
              lastName,
              classId: dto.classId || null,
              branchId: dto.branchId || null,
              admissionDate: new Date(),
              status: 'ACTIVE',
            },
          });
          const guardian = await tx.guardian.create({
            data: {
              fullName: lead.guardianName ?? lead.fullName,
              phone: lead.phone,
              relation: 'ota-ona',
            },
          });
          await tx.studentGuardian.create({
            data: { studentId: student.id, guardianId: guardian.id, isPrimary: true },
          });
          studentId = student.id;
        } else {
          // Mavjud o'quvchi — takroriy shartnoma yaratilmasin
          // (eskirgan ko'rinish / ikki tab / "Orqaga" tugmasi orqali qayta yuborish).
          const existing = await tx.contract.count({ where: { studentId } });
          if (existing > 0) {
            throw new BadRequestException(
              "Bu o'quvchi uchun shartnoma allaqachon tuzilgan.",
            );
          }
          // tanlangan sinf/filialni yangilash
          if (dto.classId || dto.branchId) {
            await tx.student.update({
              where: { id: studentId },
              data: {
                ...(dto.classId ? { classId: dto.classId } : {}),
                ...(dto.branchId ? { branchId: dto.branchId } : {}),
              },
            });
          }
        }

        const contract = await tx.contract.create({
          data: {
            number,
            studentId,
            startDate: start,
            endDate,
            monthlyAmount: dto.monthlyAmount,
            type: dto.type ?? 'MONTHLY',
            status: 'ACTIVE',
            installments: { create: installments },
          },
          include: { installments: { orderBy: { dueDate: 'asc' } } },
        });

        // Lead'ni o'quvchiga bog'lash + "Shartnoma tuzdi" bosqichiga o'tkazish
        await tx.lead.update({
          where: { id: leadId },
          data: {
            studentId,
            ...(lead.student?.id ? {} : { convertedAt: new Date() }),
            ...(doneStage ? { stageId: doneStage.id } : {}),
          },
        });

        return contract;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
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
            class: {
              select: {
                id: true,
                name: true,
                language: true,
                academicYear: true,
                gradeLevel: true,
              },
            },
            branch: { select: { id: true, name: true } },
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

    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    const cash = /naqd|nal/i.test(dto.method || '');
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          studentId: contract.studentId,
          contractId: id,
          accountId: dto.accountId || null,
          amount: dto.amount,
          method: dto.method,
          paidAt,
          // Naqd — avtomat tasdiqlangan; bank/karta — tasdiq kutadi
          confirmedAt: cash ? paidAt : null,
          note: dto.note,
        },
      });

      // To'lov kassaga (Account) tushadi — balansni oshiramiz
      if (payment.accountId) {
        await tx.account.update({
          where: { id: payment.accountId },
          data: { balance: { increment: payment.amount } },
        });
      }

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

  // ===== Shartnoma statusini oylarga qarab avtomat moslash (ACTIVE <-> COMPLETED) =====
  // Qo'lda qo'yilgan boshqa statuslarga (SUSPENDED, LEFT, CANCELLED, ...) tegilmaydi.
  private async syncContractStatus(contractId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const contract = await db.contract.findUnique({
      where: { id: contractId },
      select: { status: true, installments: { select: { status: true } } },
    });
    if (!contract || !contract.installments.length) return;
    const allPaid = contract.installments.every((i) => i.status === 'PAID');
    if (allPaid && contract.status === 'ACTIVE') {
      await db.contract.update({ where: { id: contractId }, data: { status: 'COMPLETED' } });
    } else if (!allPaid && contract.status === 'COMPLETED') {
      await db.contract.update({ where: { id: contractId }, data: { status: 'ACTIVE' } });
    }
  }

  // ===== Shartnomani tahrirlash (status, tur, sinf, sanalar, oylik narx) =====
  async update(id: string, dto: UpdateContractDto) {
    const contract = await this.prisma.contract.findUnique({ where: { id } });
    if (!contract) throw new NotFoundException('Shartnoma topilmadi');

    // O'quvchi darajasidagi o'zgarishlar (sinf / filial belgilash)
    const studentData: any = {};
    if (dto.classId !== undefined) studentData.classId = dto.classId || null;
    if (dto.branchId !== undefined) studentData.branchId = dto.branchId || null;

    // Shartnoma darajasidagi o'zgarishlar
    const data: any = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.monthlyAmount !== undefined) data.monthlyAmount = dto.monthlyAmount;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined)
      data.endDate = dto.endDate ? new Date(dto.endDate) : null;

    // O'quvchi va shartnoma o'zgarishlari — atomik (bittasi tushib qolmasin)
    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(studentData).length) {
        await tx.student.update({
          where: { id: contract.studentId },
          data: studentData,
        });
      }
      if (Object.keys(data).length) {
        await tx.contract.update({ where: { id }, data });
      }
    });

    return this.findOne(id);
  }

  // ===== Shartnomani o'chirish (installment + to'lov + taqsimotlari bilan) =====
  async remove(id: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id } });
    if (!contract) throw new NotFoundException('Shartnoma topilmadi');

    await this.prisma.$transaction(
      async (tx) => {
        // Balansga ta'sir qiluvchi qatorlarni AYNAN shu tranzaksiya ichida o'qiymiz
        // (aks holda o'qish bilan o'chirish orasida yangi to'lov tushsa — balans buziladi).
        const payments = await tx.payment.findMany({
          where: { contractId: id },
          select: {
            accountId: true,
            amount: true,
            isRefund: true,
            confirmedAt: true,
          },
        });

        // Tasdiqlangan to'lov bo'lsa — o'chirishni bloklaymiz (tekshiruvni buzmaslik uchun)
        if (payments.some((p) => p.confirmedAt)) {
          throw new BadRequestException(
            "Shartnomada tasdiqlangan to'lov(lar) mavjud. Avval ularning tasdig'ini bekor qiling.",
          );
        }

        // Har bir to'lov uchun kassa (account) balansini teskari qaytarish
        for (const p of payments) {
          if (p.accountId) {
            await tx.account.update({
              where: { id: p.accountId },
              data: { balance: { increment: p.isRefund ? p.amount : -p.amount } },
            });
          }
        }
        // To'lovlar o'chirilganda taqsimotlari (allocations) cascade bilan ketadi;
        // shartnoma o'chirilganda installment'lar cascade bilan ketadi.
        await tx.payment.deleteMany({ where: { contractId: id } });
        await tx.contract.delete({ where: { id } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return { ok: true };
  }

  // ===== Bitta oy (installment) summasini tahrirlash =====
  async updateInstallment(
    id: string,
    instId: string,
    dto: UpdateInstallmentDto,
  ) {
    const inst = await this.prisma.contractInstallment.findFirst({
      where: { id: instId, contractId: id },
    });
    if (!inst) throw new NotFoundException('Oy topilmadi');

    // To'langan summadan past qilib bo'lmaydi (aks holda salbiy qarz / yo'qolgan pul)
    if (dto.amount != null && dto.amount < inst.paidAmount) {
      throw new BadRequestException(
        `Summani to'langan summadan (${inst.paidAmount}) past qilib bo'lmaydi. Avval to'lovni bekor qiling.`,
      );
    }

    const amount = dto.amount ?? inst.amount;
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : inst.dueDate;
    const paid = inst.paidAmount;

    // to'langan summa + muddatga qarab statusni qayta hisoblash
    // (recompute bilan bir xil: PAID > OVERDUE > PARTIAL > PENDING)
    let status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
    if (amount > 0 && paid >= amount) status = 'PAID';
    else if (dueDate < new Date()) status = 'OVERDUE';
    else if (paid > 0) status = 'PARTIAL';
    else status = 'PENDING';

    await this.prisma.contractInstallment.update({
      where: { id: instId },
      data: { amount, dueDate, status },
    });
    await this.syncContractStatus(id);
    return this.findOne(id);
  }

  // ===== Bitta oyni (installment) o'chirish =====
  async removeInstallment(id: string, instId: string) {
    const inst = await this.prisma.contractInstallment.findFirst({
      where: { id: instId, contractId: id },
    });
    if (!inst) throw new NotFoundException('Oy topilmadi');

    // To'lov qilingan / taqsimlangan oyni o'chirib bo'lmaydi (pul yo'qolmasligi uchun)
    const allocCount = await this.prisma.paymentAllocation.count({
      where: { installmentId: instId },
    });
    if (inst.paidAmount > 0 || allocCount > 0) {
      throw new BadRequestException(
        "To'lov qilingan oyni o'chirib bo'lmaydi. Avval shu oyga tegishli to'lovni bekor qiling.",
      );
    }

    await this.prisma.contractInstallment.delete({ where: { id: instId } });
    await this.syncContractStatus(id);
    return this.findOne(id);
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
