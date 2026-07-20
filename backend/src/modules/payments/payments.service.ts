import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InstallmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

const UZ_MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];
const monthLabel = (d: Date) => `${UZ_MONTHS[d.getMonth()]} ${d.getFullYear()}`;

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  // ===== Ro'yxat + statistika + filtrlar =====
  async list(filters: {
    search?: string;
    from?: string;
    to?: string;
    method?: string;
    type?: string;
    accountId?: string;
    confirmed?: string;
    branchId?: string;
    academicYear?: string;
    studentId?: string;
  }) {
    const where: Prisma.PaymentWhereInput = {};

    if (filters.from || filters.to) {
      where.paidAt = {};
      if (filters.from) where.paidAt.gte = new Date(filters.from + 'T00:00:00');
      if (filters.to) where.paidAt.lte = new Date(filters.to + 'T23:59:59.999');
    }
    if (filters.method) where.method = filters.method;
    if (filters.type) where.type = filters.type;
    if (filters.accountId) where.accountId = filters.accountId;
    if (filters.confirmed === 'true') where.confirmedAt = { not: null };
    if (filters.confirmed === 'false') where.confirmedAt = null;
    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.branchId || filters.academicYear) {
      where.student = {};
      if (filters.branchId) where.student.branchId = filters.branchId;
      if (filters.academicYear)
        where.student.class = { academicYear: filters.academicYear };
    }
    if (filters.search) {
      where.OR = [
        { student: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { student: { lastName: { contains: filters.search, mode: 'insensitive' } } },
        { contract: { number: { contains: filters.search, mode: 'insensitive' } } },
        { note: { contains: filters.search, mode: 'insensitive' } },
        { cardLast4: { contains: filters.search } },
      ];
    }

    // Stats — BUTUN mos to'plamdan (yengil maydonlar); ko'rsatiladigan qatorlar cheklangan
    const [statRows, data] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        select: { amount: true, method: true, isRefund: true, confirmedAt: true },
      }),
      this.prisma.payment.findMany({
        where,
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
          contract: { select: { number: true } },
          account: { select: { id: true, name: true } },
        },
        orderBy: { paidAt: 'desc' },
        take: 1000,
      }),
    ]);

    const signed = (p: { amount: number; isRefund: boolean }) =>
      p.isRefund ? -p.amount : p.amount;
    const kind = (m?: string | null) => {
      const s = (m ?? '').toLowerCase();
      if (s.includes('naqd') || s.includes('nal')) return 'naqd';
      if (s.includes('bank')) return 'bank';
      return 'karta';
    };
    const sumBy = (fn: (p: (typeof statRows)[number]) => boolean) =>
      statRows.filter(fn).reduce((s, p) => s + signed(p), 0);

    const stats = {
      count: statRows.length,
      total: statRows.reduce((s, p) => s + signed(p), 0),
      naqd: sumBy((p) => kind(p.method) === 'naqd'),
      karta: sumBy((p) => kind(p.method) === 'karta'),
      bank: sumBy((p) => kind(p.method) === 'bank'),
      // Tasdiqlash faqat bank/karta uchun — naqd tasdiq talab qilmaydi
      unconfirmedCount: statRows.filter(
        (p) => kind(p.method) !== 'naqd' && !p.confirmedAt,
      ).length,
      unconfirmedSum: statRows
        .filter((p) => kind(p.method) !== 'naqd' && !p.confirmedAt)
        .reduce((s, p) => s + signed(p), 0),
      shown: data.length,
    };

    return { stats, data };
  }

  // ===== Bitta to'lov (detail) =====
  async get(id: string) {
    const p = await this.prisma.payment.findUnique({
      where: { id },
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
        contract: { select: { id: true, number: true } },
        account: { select: { id: true, name: true } },
      },
    });
    if (!p) throw new NotFoundException('To‘lov topilmadi');

    const ids = [p.createdById, p.updatedById].filter(Boolean) as string[];
    const users = ids.length
      ? await this.prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, fullName: true },
        })
      : [];
    const umap = new Map(users.map((u) => [u.id, u.fullName]));

    return {
      ...p,
      createdByName: p.createdById ? (umap.get(p.createdById) ?? null) : null,
      updatedByName: p.updatedById ? (umap.get(p.updatedById) ?? null) : null,
    };
  }

  // ===== Yaratish =====
  async create(dto: CreatePaymentDto, userId?: string) {
    let studentId = dto.studentId;
    if (dto.contractId) {
      const c = await this.prisma.contract.findUnique({
        where: { id: dto.contractId },
        select: { studentId: true },
      });
      if (!c) throw new NotFoundException('Shartnoma topilmadi');
      studentId = c.studentId;
    }
    if (!studentId)
      throw new BadRequestException('studentId yoki contractId kerak');

    return this.prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.create({
          data: {
            studentId,
            contractId: dto.contractId || null,
            accountId: dto.accountId || null,
            amount: dto.amount,
            method: dto.method,
            type: dto.type || null,
            cardLast4: dto.cardLast4 || null,
            isRefund: dto.isRefund ?? false,
            paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
            note: dto.note || null,
            confirmedAt: null, // to'lov tasdiqlanmagan holatda boshlanadi
            createdById: userId ?? null,
            updatedById: userId ?? null,
          },
        });

        if (dto.allocations?.length && dto.contractId && !dto.isRefund) {
          const rows = dto.allocations
            .filter((a) => a.amount > 0)
            .map((a) => ({
              paymentId: payment.id,
              installmentId: a.installmentId,
              amount: a.amount,
            }));
          if (rows.length) await tx.paymentAllocation.createMany({ data: rows });
        }

        if (dto.contractId) await this.recompute(tx, dto.contractId);
        if (payment.accountId) {
          await tx.account.update({
            where: { id: payment.accountId },
            data: {
              balance: { increment: payment.isRefund ? -payment.amount : payment.amount },
            },
          });
        }
        return payment;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  // ===== Tahrirlash =====
  async update(id: string, dto: UpdatePaymentDto, userId?: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const old = await tx.payment.findUnique({ where: { id } });
        if (!old) throw new NotFoundException('To‘lov topilmadi');
        if (old.confirmedAt) {
          throw new BadRequestException(
            'Tasdiqlangan to‘lovni tahrirlab bo‘lmaydi. Avval tasdiqni bekor qiling.',
          );
        }

        // eski hisob ta'sirini bekor qilamiz
        if (old.accountId) {
          await tx.account.update({
            where: { id: old.accountId },
            data: { balance: { increment: old.isRefund ? old.amount : -old.amount } },
          });
        }

        const newAccountId =
          dto.accountId !== undefined ? dto.accountId || null : old.accountId;

        const updated = await tx.payment.update({
          where: { id },
          data: {
            amount: dto.amount ?? old.amount,
            method: dto.method ?? old.method,
            type: dto.type !== undefined ? dto.type || null : old.type,
            accountId: newAccountId,
            cardLast4: dto.cardLast4 !== undefined ? dto.cardLast4 || null : old.cardLast4,
            note: dto.note !== undefined ? dto.note || null : old.note,
            isRefund: dto.isRefund ?? old.isRefund,
            paidAt: dto.paidAt ? new Date(dto.paidAt) : old.paidAt,
            updatedById: userId ?? null,
            updateCount: { increment: 1 },
          },
        });

        if (dto.amount !== undefined && dto.amount !== old.amount) {
          await tx.paymentAllocation.deleteMany({ where: { paymentId: id } });
        }

        if (updated.accountId) {
          await tx.account.update({
            where: { id: updated.accountId },
            data: {
              balance: { increment: updated.isRefund ? -updated.amount : updated.amount },
            },
          });
        }

        if (updated.contractId) await this.recompute(tx, updated.contractId);
        if (old.contractId && old.contractId !== updated.contractId) {
          await this.recompute(tx, old.contractId);
        }
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  // ===== Tasdiqlash / bekor qilish (toggle) =====
  async confirm(id: string, date?: string, userId?: string) {
    const p = await this.prisma.payment.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('To‘lov topilmadi');
    const next = p.confirmedAt ? null : date ? new Date(date) : new Date();
    return this.prisma.payment.update({
      where: { id },
      data: { confirmedAt: next, updatedById: userId ?? null },
    });
  }

  // ===== O'chirish =====
  async remove(id: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const p = await tx.payment.findUnique({ where: { id } });
        if (!p) throw new NotFoundException('To‘lov topilmadi');
        if (p.confirmedAt) {
          throw new BadRequestException(
            'Tasdiqlangan to‘lovni o‘chirib bo‘lmaydi. Avval tasdiqni bekor qiling.',
          );
        }
        if (p.accountId) {
          await tx.account.update({
            where: { id: p.accountId },
            data: { balance: { increment: p.isRefund ? p.amount : -p.amount } },
          });
        }
        await tx.payment.delete({ where: { id } });
        if (p.contractId) await this.recompute(tx, p.contractId);
        return { ok: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  // ===== O'quvchi to'lov jadvali (yangi to'lov modali uchun) =====
  async studentSchedule(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        class: { select: { name: true, language: true } },
      },
    });

    const include = { installments: { orderBy: { dueDate: 'asc' as const } } };
    // Faol shartnomani afzal ko'ramiz; bo'lmasa — eng oxirgi bekor qilinmagan
    const contract =
      (await this.prisma.contract.findFirst({
        where: { studentId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        include,
      })) ??
      (await this.prisma.contract.findFirst({
        where: { studentId, status: { notIn: ['CANCELLED'] } },
        orderBy: { createdAt: 'desc' },
        include,
      }));

    if (!contract) return { student, contract: null, debt: 0, installments: [] };

    const installments = contract.installments.map((i) => ({
      id: i.id,
      monthLabel: monthLabel(i.dueDate),
      dueDate: i.dueDate,
      amount: i.amount,
      paidAmount: i.paidAmount,
      remaining: Math.max(0, i.amount - i.paidAmount),
      status: i.status,
    }));
    const debt = installments.reduce((s, i) => s + i.remaining, 0);

    return {
      student,
      contract: { id: contract.id, number: contract.number },
      debt,
      installments,
    };
  }

  // ===== Installment'larni to'lovlardan qayta hisoblash =====
  // Qo'lda taqsimlangan to'lovlar aniq oyga, qolganlari eng eskidan; refundlar kamaytiradi.
  private async recompute(tx: Prisma.TransactionClient, contractId: string) {
    const installments = await tx.contractInstallment.findMany({
      where: { contractId },
      orderBy: { dueDate: 'asc' },
    });
    const payments = await tx.payment.findMany({
      where: { contractId, isRefund: false },
      orderBy: { paidAt: 'asc' },
      include: { allocations: true },
    });

    const paid = new Map<string, number>(installments.map((i) => [i.id, 0]));
    const cap = new Map<string, number>(installments.map((i) => [i.id, i.amount]));

    for (const p of payments) {
      if (p.allocations.length) {
        for (const a of p.allocations) {
          if (!cap.has(a.installmentId)) continue;
          const cur = paid.get(a.installmentId) ?? 0;
          paid.set(a.installmentId, Math.min(cap.get(a.installmentId)!, cur + a.amount));
        }
      } else {
        let pool = p.amount;
        for (const inst of installments) {
          if (pool <= 0) break;
          const cur = paid.get(inst.id) ?? 0;
          const room = inst.amount - cur;
          const pay = Math.min(room, pool);
          if (pay > 0) {
            paid.set(inst.id, cur + pay);
            pool -= pay;
          }
        }
      }
    }

    // Qaytarishlar (refund) to'langan summani kamaytiradi — eng yangi oydan boshlab (qarzdorlik oshadi)
    const refunds = await tx.payment.findMany({
      where: { contractId, isRefund: true },
      select: { amount: true },
    });
    let refundPool = refunds.reduce((s, p) => s + p.amount, 0);
    for (let k = installments.length - 1; k >= 0 && refundPool > 0; k--) {
      const inst = installments[k];
      const cur = paid.get(inst.id) ?? 0;
      const take = Math.min(cur, refundPool);
      if (take > 0) {
        paid.set(inst.id, cur - take);
        refundPool -= take;
      }
    }

    const now = new Date();
    for (const inst of installments) {
      const p = paid.get(inst.id) ?? 0;
      let status: InstallmentStatus = 'PENDING';
      if (p >= inst.amount) status = 'PAID';
      else if (p > 0) status = 'PARTIAL';
      if (status !== 'PAID' && inst.dueDate < now) status = 'OVERDUE';
      await tx.contractInstallment.update({
        where: { id: inst.id },
        data: { paidAmount: p, status },
      });
    }

    const unpaid = await tx.contractInstallment.count({
      where: { contractId, status: { not: 'PAID' } },
    });
    const contract = await tx.contract.findUnique({
      where: { id: contractId },
      select: { status: true },
    });
    if (contract && ['ACTIVE', 'COMPLETED'].includes(contract.status)) {
      await tx.contract.update({
        where: { id: contractId },
        data: { status: unpaid === 0 ? 'COMPLETED' : 'ACTIVE' },
      });
    }
  }
}
