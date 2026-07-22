import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BulkExpenseLinesDto,
  CreateExpenseDto,
  CreateExpensePaymentDto,
  CreateSupplierDto,
  ExpenseLineDto,
  UpdateExpenseDto,
} from './dto/expense.dto';

export type ExpenseStatus =
  | 'INCOMPLETE' // Noto'liq — line yo'q
  | 'UNPAID' // To'lovsiz
  | 'PARTIAL' // Qisman
  | 'CLOSED' // Yopilgan
  | 'EXCESS'; // Ortiqcha

/** To'lovning so'mdagi to'liq qiymati (so'm qismi + dollar ekvivalenti) */
function paymentSom(p: { amount: number; dollarAmount?: number | null; dollarRate?: number | null }) {
  return (p.amount || 0) + (p.dollarAmount || 0) * (p.dollarRate || 0);
}

function computeStatus(total: number, paid: number): ExpenseStatus {
  if (total <= 0) return 'INCOMPLETE';
  if (paid <= 0) return 'UNPAID';
  if (paid > total + 0.001) return 'EXCESS';
  if (paid >= total - 0.001) return 'CLOSED';
  return 'PARTIAL';
}

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  // ===== Ta'minotchilar =====
  listSuppliers(branchId?: string) {
    return this.prisma.supplier.findMany({
      where: branchId ? { OR: [{ branchId }, { branchId: null }] } : {},
      orderBy: { name: 'asc' },
    });
  }

  createSupplier(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: { name: dto.name, phone: dto.phone, branchId: dto.branchId || null },
    });
  }

  /** Ta'minotchilar balansi: xaridlar, to'lovlar, qoldiq (qarz/avans) */
  async supplierBalances(filters: { branchId?: string; search?: string }) {
    const where: Prisma.SupplierWhereInput = {};
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.search) where.name = { contains: filters.search, mode: 'insensitive' };

    const suppliers = await this.prisma.supplier.findMany({
      where,
      include: { branch: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
    const ids = suppliers.map((s) => s.id);
    const expenses = ids.length
      ? await this.prisma.expense.findMany({
          where: { supplierId: { in: ids } },
          select: {
            supplierId: true,
            lines: { select: { quantity: true, price: true } },
            payments: { select: { amount: true, isRefund: true, dollarAmount: true, dollarRate: true } },
          },
        })
      : [];

    const agg = new Map<string, { count: number; purchase: number; paid: number }>();
    for (const e of expenses) {
      const total = e.lines.reduce((s, l) => s + l.quantity * l.price, 0);
      const paid = e.payments.reduce((s, p) => s + (p.isRefund ? -paymentSom(p) : paymentSom(p)), 0);
      const cur = agg.get(e.supplierId) ?? { count: 0, purchase: 0, paid: 0 };
      cur.count += 1;
      cur.purchase += total;
      cur.paid += paid;
      agg.set(e.supplierId, cur);
    }

    const data = suppliers.map((s) => {
      const a = agg.get(s.id) ?? { count: 0, purchase: 0, paid: 0 };
      return {
        id: s.id,
        name: s.name,
        phone: s.phone,
        branch: s.branch?.name ?? null,
        expensesCount: a.count,
        totalPurchase: a.purchase,
        totalPaid: a.paid,
        remaining: a.purchase - a.paid,
      };
    });
    data.sort((a, b) => b.remaining - a.remaining);

    const jamiXarid = data.reduce((s, d) => s + d.totalPurchase, 0);
    const jamiTolov = data.reduce((s, d) => s + d.totalPaid, 0);
    const qarz = data.reduce((s, d) => s + Math.max(d.remaining, 0), 0);
    const avans = data.reduce((s, d) => s + Math.max(-d.remaining, 0), 0);

    return { data, stats: { count: suppliers.length, jamiXarid, jamiTolov, qarz, avans } };
  }

  async supplierDetail(id: string, filters: { search?: string; branchId?: string; from?: string; to?: string }) {
    const s = await this.prisma.supplier.findUnique({
      where: { id },
      include: { branch: { select: { id: true, name: true } } },
    });
    if (!s) throw new NotFoundException("Ta'minotchi topilmadi");

    const where: Prisma.ExpenseWhereInput = { supplierId: id };
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from + 'T00:00:00');
      if (filters.to) where.date.lte = new Date(filters.to + 'T23:59:59.999');
    }
    if (filters.search) {
      where.OR = [
        { note: { contains: filters.search, mode: 'insensitive' } },
        { department: { contains: filters.search, mode: 'insensitive' } },
        { lines: { some: { name: { contains: filters.search, mode: 'insensitive' } } } },
      ];
    }

    const rows = await this.prisma.expense.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        lines: { select: { name: true, quantity: true, price: true } },
        payments: { select: { amount: true, isRefund: true, dollarAmount: true, dollarRate: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
    });

    const expenses = rows.map((e) => {
      const total = e.lines.reduce((sm, l) => sm + l.quantity * l.price, 0);
      const paid = e.payments.reduce((sm, p) => sm + (p.isRefund ? -paymentSom(p) : paymentSom(p)), 0);
      return {
        id: e.id,
        number: e.number,
        date: e.date,
        name: e.note || e.lines[0]?.name || '—',
        department: e.department,
        branch: e.branch,
        itemsCount: e.lines.length,
        total,
        paid,
        remaining: total - paid,
        status: computeStatus(total, paid),
      };
    });

    const jamiXarid = expenses.reduce((sm, e) => sm + e.total, 0);
    const jamiTolov = expenses.reduce((sm, e) => sm + e.paid, 0);
    return {
      supplier: { id: s.id, name: s.name, phone: s.phone, branch: s.branch, status: 'Faol' },
      stats: { count: expenses.length, jamiXarid, jamiTolov, qoldiq: jamiXarid - jamiTolov },
      expenses,
    };
  }

  async updateSupplier(id: string, dto: CreateSupplierDto) {
    const s = await this.prisma.supplier.findUnique({ where: { id } });
    if (!s) throw new NotFoundException("Ta'minotchi topilmadi");
    return this.prisma.supplier.update({
      where: { id },
      data: {
        name: dto.name ?? s.name,
        phone: dto.phone !== undefined ? dto.phone || null : s.phone,
        branchId: dto.branchId !== undefined ? dto.branchId || null : s.branchId,
      },
    });
  }

  async removeSupplier(id: string) {
    const count = await this.prisma.expense.count({ where: { supplierId: id } });
    if (count > 0) {
      throw new BadRequestException("Ta'minotchida xarajatlar bor — avval ularni o'chiring");
    }
    return this.prisma.supplier.delete({ where: { id } });
  }

  // ===== Xarajatlar ro'yxati + statistika + status tablari =====
  async list(filters: {
    status?: string;
    branchId?: string;
    supplierId?: string;
    search?: string;
    from?: string;
    to?: string;
    academicYear?: string;
  }) {
    const where: Prisma.ExpenseWhereInput = {};
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.supplierId) where.supplierId = filters.supplierId;
    if (filters.academicYear) where.academicYear = filters.academicYear;
    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from + 'T00:00:00');
      if (filters.to) where.date.lte = new Date(filters.to + 'T23:59:59.999');
    }
    if (filters.search) {
      where.OR = [
        { supplier: { name: { contains: filters.search, mode: 'insensitive' } } },
        { note: { contains: filters.search, mode: 'insensitive' } },
        { department: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.expense.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        lines: { select: { quantity: true, price: true } },
        payments: { select: { amount: true, isRefund: true, dollarAmount: true, dollarRate: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
      take: 1000,
    });

    const enriched = rows.map((e) => {
      const total = e.lines.reduce((s, l) => s + l.quantity * l.price, 0);
      const paid = e.payments.reduce((s, p) => s + (p.isRefund ? -paymentSom(p) : paymentSom(p)), 0);
      return {
        id: e.id,
        number: e.number,
        date: e.date,
        department: e.department,
        academicYear: e.academicYear,
        note: e.note,
        supplier: e.supplier,
        branch: e.branch,
        itemsCount: e.lines.length,
        total,
        paid,
        remaining: total - paid,
        status: computeStatus(total, paid),
      };
    });

    const openSet: ExpenseStatus[] = ['INCOMPLETE', 'UNPAID', 'PARTIAL'];
    const counts = {
      all: enriched.length,
      open: enriched.filter((e) => openSet.includes(e.status)).length,
      unpaid: enriched.filter((e) => e.status === 'UNPAID').length,
      partial: enriched.filter((e) => e.status === 'PARTIAL').length,
      excess: enriched.filter((e) => e.status === 'EXCESS').length,
      incomplete: enriched.filter((e) => e.status === 'INCOMPLETE').length,
      closed: enriched.filter((e) => e.status === 'CLOSED').length,
    };

    const jami = enriched.reduce((s, e) => s + e.total, 0);
    const qarz = enriched.reduce((s, e) => s + Math.max(e.total - e.paid, 0), 0);
    const avans = enriched.reduce((s, e) => s + Math.max(e.paid - e.total, 0), 0);
    const stats = { jami, tolangan: jami - qarz + avans, qarz, avans };

    const st = (filters.status ?? 'all').toLowerCase();
    const data =
      st === 'all'
        ? enriched
        : st === 'open'
          ? enriched.filter((e) => openSet.includes(e.status))
          : enriched.filter((e) => e.status === st.toUpperCase());

    return { data, counts, stats };
  }

  async get(id: string) {
    const e = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        branch: { select: { id: true, name: true } },
        lines: {
          include: { category: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
        payments: {
          include: {
            account: { select: { id: true, name: true } },
            dollarAccount: { select: { id: true, name: true } },
          },
          orderBy: { paidAt: 'asc' },
        },
      },
    });
    if (!e) throw new NotFoundException('Xarajat topilmadi');
    const total = e.lines.reduce((s, l) => s + l.quantity * l.price, 0);
    const paid = e.payments.reduce((s, p) => s + (p.isRefund ? -paymentSom(p) : paymentSom(p)), 0);
    return { ...e, total, paid, remaining: total - paid, status: computeStatus(total, paid) };
  }

  create(dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        supplierId: dto.supplierId,
        branchId: dto.branchId,
        department: dto.department || null,
        academicYear: dto.academicYear || null,
        note: dto.note || null,
        date: dto.date ? new Date(dto.date) : new Date(),
      },
    });
  }

  async update(id: string, dto: UpdateExpenseDto) {
    await this.ensure(id);
    return this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.supplierId ? { supplierId: dto.supplierId } : {}),
        ...(dto.branchId ? { branchId: dto.branchId } : {}),
        ...(dto.department !== undefined ? { department: dto.department || null } : {}),
        ...(dto.academicYear !== undefined ? { academicYear: dto.academicYear || null } : {}),
        ...(dto.note !== undefined ? { note: dto.note || null } : {}),
        ...(dto.date ? { date: new Date(dto.date) } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.ensure(id);
    // To'lovlar kassa balansiga ta'sir qilgan — o'chirishda tiklaymiz
    const payments = await this.prisma.expensePayment.findMany({ where: { expenseId: id } });
    return this.prisma.$transaction(async (tx) => {
      for (const p of payments) {
        const somPart = p.amount || 0;
        const dollarSom = (p.dollarAmount || 0) * (p.dollarRate || 0);
        const sign = p.isRefund ? 1 : -1;
        if (p.accountId && somPart > 0) {
          await tx.account.update({ where: { id: p.accountId }, data: { balance: { increment: -sign * somPart } } });
        }
        if (p.dollarAccountId && dollarSom > 0) {
          await tx.account.update({ where: { id: p.dollarAccountId }, data: { balance: { increment: -sign * dollarSom } } });
        }
      }
      return tx.expense.delete({ where: { id } });
    });
  }

  // ===== Line'lar =====
  async addLine(expenseId: string, dto: ExpenseLineDto) {
    await this.ensure(expenseId);
    return this.prisma.expenseLine.create({
      data: {
        expenseId,
        categoryId: dto.categoryId || null,
        subCategory: dto.subCategory || null,
        name: dto.name,
        quantity: dto.quantity ?? 1,
        price: dto.price ?? 0,
        note: dto.note || null,
      },
    });
  }

  async addLinesBulk(expenseId: string, dto: BulkExpenseLinesDto) {
    await this.ensure(expenseId);
    const valid = (dto.lines ?? []).filter((l) => l.name && l.name.trim());
    if (valid.length === 0) throw new BadRequestException('Kamida bitta qator (nomi bilan) kerak');
    await this.prisma.expenseLine.createMany({
      data: valid.map((l) => ({
        expenseId,
        categoryId: l.categoryId || null,
        subCategory: l.subCategory || null,
        name: l.name,
        quantity: l.quantity ?? 1,
        price: l.price ?? 0,
        note: l.note || null,
      })),
    });
    return { created: valid.length };
  }

  async updateLine(lineId: string, dto: ExpenseLineDto) {
    const line = await this.prisma.expenseLine.findUnique({ where: { id: lineId } });
    if (!line) throw new NotFoundException('Qator topilmadi');
    return this.prisma.expenseLine.update({
      where: { id: lineId },
      data: {
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId || null } : {}),
        ...(dto.subCategory !== undefined ? { subCategory: dto.subCategory || null } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.note !== undefined ? { note: dto.note || null } : {}),
      },
    });
  }

  async removeLine(lineId: string) {
    const line = await this.prisma.expenseLine.findUnique({ where: { id: lineId } });
    if (!line) throw new NotFoundException('Qator topilmadi');
    return this.prisma.expenseLine.delete({ where: { id: lineId } });
  }

  // ===== To'lovlar =====
  async addPayment(expenseId: string, dto: CreateExpensePaymentDto) {
    await this.ensure(expenseId);
    const somPart = dto.amount || 0;
    const dollarSom = (dto.dollarAmount || 0) * (dto.dollarRate || 0);
    if (somPart + dollarSom <= 0) {
      throw new BadRequestException("Summa kiriting (so'm yoki dollar)");
    }
    const isRefund = dto.isRefund ?? false;
    const sign = isRefund ? 1 : -1; // oddiy to'lov kassadan chiqadi (-), qaytarish kiradi (+)
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.expensePayment.create({
        data: {
          expenseId,
          amount: somPart,
          method: dto.method,
          accountId: dto.accountId || null,
          dollarAmount: dto.dollarAmount || null,
          dollarRate: dto.dollarRate || null,
          dollarMethod: dto.dollarMethod || null,
          dollarAccountId: dto.dollarAccountId || null,
          isRefund,
          note: dto.note || null,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        },
      });
      if (payment.accountId && somPart > 0) {
        await tx.account.update({ where: { id: payment.accountId }, data: { balance: { increment: sign * somPart } } });
      }
      if (payment.dollarAccountId && dollarSom > 0) {
        await tx.account.update({ where: { id: payment.dollarAccountId }, data: { balance: { increment: sign * dollarSom } } });
      }
      return payment;
    });
  }

  async updatePayment(paymentId: string, dto: CreateExpensePaymentDto) {
    const old = await this.prisma.expensePayment.findUnique({ where: { id: paymentId } });
    if (!old) throw new NotFoundException("To'lov topilmadi");

    const amount = dto.amount ?? old.amount;
    const method = dto.method ?? old.method;
    const accountId = dto.accountId !== undefined ? dto.accountId || null : old.accountId;
    const dollarAmount = dto.dollarAmount !== undefined ? dto.dollarAmount || null : old.dollarAmount;
    const dollarRate = dto.dollarRate !== undefined ? dto.dollarRate || null : old.dollarRate;
    const dollarMethod = dto.dollarMethod !== undefined ? dto.dollarMethod || null : old.dollarMethod;
    const dollarAccountId = dto.dollarAccountId !== undefined ? dto.dollarAccountId || null : old.dollarAccountId;
    const isRefund = dto.isRefund ?? old.isRefund;
    const paidAt = dto.paidAt ? new Date(dto.paidAt) : old.paidAt;
    const note = dto.note !== undefined ? dto.note || null : old.note;

    const newSom = amount || 0;
    const newDollarSom = (dollarAmount || 0) * (dollarRate || 0);
    if (newSom + newDollarSom <= 0) throw new BadRequestException("Summa kiriting (so'm yoki dollar)");

    return this.prisma.$transaction(async (tx) => {
      // Eski ta'sirni teskari qaytaramiz
      const oldSom = old.amount || 0;
      const oldDollarSom = (old.dollarAmount || 0) * (old.dollarRate || 0);
      const oldSign = old.isRefund ? 1 : -1;
      if (old.accountId && oldSom > 0) await tx.account.update({ where: { id: old.accountId }, data: { balance: { increment: -oldSign * oldSom } } });
      if (old.dollarAccountId && oldDollarSom > 0) await tx.account.update({ where: { id: old.dollarAccountId }, data: { balance: { increment: -oldSign * oldDollarSom } } });
      // Yangi ta'sirni qo'llaymiz
      const newSign = isRefund ? 1 : -1;
      if (accountId && newSom > 0) await tx.account.update({ where: { id: accountId }, data: { balance: { increment: newSign * newSom } } });
      if (dollarAccountId && newDollarSom > 0) await tx.account.update({ where: { id: dollarAccountId }, data: { balance: { increment: newSign * newDollarSom } } });
      return tx.expensePayment.update({
        where: { id: paymentId },
        data: { amount: newSom, method, accountId, dollarAmount, dollarRate, dollarMethod, dollarAccountId, isRefund, paidAt, note },
      });
    });
  }

  async removePayment(paymentId: string) {
    const p = await this.prisma.expensePayment.findUnique({ where: { id: paymentId } });
    if (!p) throw new NotFoundException("To'lov topilmadi");
    const somPart = p.amount || 0;
    const dollarSom = (p.dollarAmount || 0) * (p.dollarRate || 0);
    const sign = p.isRefund ? 1 : -1;
    return this.prisma.$transaction(async (tx) => {
      // Asl ta'sirni teskari qaytaramiz
      if (p.accountId && somPart > 0) {
        await tx.account.update({ where: { id: p.accountId }, data: { balance: { increment: -sign * somPart } } });
      }
      if (p.dollarAccountId && dollarSom > 0) {
        await tx.account.update({ where: { id: p.dollarAccountId }, data: { balance: { increment: -sign * dollarSom } } });
      }
      return tx.expensePayment.delete({ where: { id: paymentId } });
    });
  }

  private async ensure(id: string) {
    const e = await this.prisma.expense.findUnique({ where: { id }, select: { id: true } });
    if (!e) throw new NotFoundException('Xarajat topilmadi');
    return e;
  }
}
