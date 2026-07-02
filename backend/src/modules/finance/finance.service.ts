import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransferDto } from './dto/transfer.dto';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // ===== Kassalar =====
  listAccounts() {
    return this.prisma.account.findMany({ orderBy: { name: 'asc' } });
  }

  createAccount(dto: CreateAccountDto) {
    return this.prisma.account.create({
      data: { name: dto.name, balance: dto.balance ?? 0 },
    });
  }

  // ===== Kategoriyalar =====
  listCategories(type?: string) {
    return this.prisma.financeCategory.findMany({
      where: type ? { type: type as any } : {},
      orderBy: { name: 'asc' },
    });
  }

  createCategory(dto: CreateCategoryDto) {
    return this.prisma.financeCategory.create({ data: dto });
  }

  // ===== Tranzaksiyalar (kirim / chiqim / investitsiya) =====
  async createTransaction(dto: CreateTransactionDto) {
    const account = await this.prisma.account.findUnique({
      where: { id: dto.accountId },
    });
    if (!account) throw new NotFoundException('Kassa topilmadi');

    // EXPENSE — qoldiqdan ayiriladi; INCOME/INVESTMENT — qo'shiladi
    const delta = dto.type === 'EXPENSE' ? -dto.amount : dto.amount;

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          type: dto.type,
          amount: dto.amount,
          accountId: dto.accountId,
          categoryId: dto.categoryId,
          date: dto.date ? new Date(dto.date) : new Date(),
          description: dto.description,
        },
      });
      await tx.account.update({
        where: { id: dto.accountId },
        data: { balance: { increment: delta } },
      });
      return transaction;
    });
  }

  async listTransactions(params: {
    type?: string;
    accountId?: string;
    from?: string;
    to?: string;
  }) {
    const where: any = {};
    if (params.type) where.type = params.type;
    if (params.accountId) where.accountId = params.accountId;
    if (params.from || params.to) {
      where.date = {};
      if (params.from) where.date.gte = new Date(params.from);
      if (params.to) where.date.lte = new Date(params.to);
    }
    return this.prisma.transaction.findMany({
      where,
      include: { account: true, category: true },
      orderBy: { date: 'desc' },
      take: 200,
    });
  }

  // ===== Ichki o'tkazma =====
  async transfer(dto: TransferDto) {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException('Bir xil kassa tanlandi');
    }
    const [from, to] = await Promise.all([
      this.prisma.account.findUnique({ where: { id: dto.fromAccountId } }),
      this.prisma.account.findUnique({ where: { id: dto.toAccountId } }),
    ]);
    if (!from || !to) throw new NotFoundException('Kassa topilmadi');
    if (from.balance < dto.amount) {
      throw new BadRequestException("Yuboruvchi kassada mablag' yetarli emas");
    }

    const date = dto.date ? new Date(dto.date) : new Date();
    return this.prisma.$transaction(async (tx) => {
      // ikkala kassa ledgeri uchun ikkita yozuv (TRANSFER — hisobotda neytral)
      await tx.transaction.create({
        data: {
          type: 'TRANSFER',
          amount: dto.amount,
          accountId: dto.fromAccountId,
          date,
          description: `→ ${to.name}${dto.description ? ` (${dto.description})` : ''}`,
        },
      });
      await tx.transaction.create({
        data: {
          type: 'TRANSFER',
          amount: dto.amount,
          accountId: dto.toAccountId,
          date,
          description: `← ${from.name}${dto.description ? ` (${dto.description})` : ''}`,
        },
      });
      await tx.account.update({
        where: { id: dto.fromAccountId },
        data: { balance: { decrement: dto.amount } },
      });
      await tx.account.update({
        where: { id: dto.toAccountId },
        data: { balance: { increment: dto.amount } },
      });
      return { ok: true };
    });
  }

  // ===== Umumiy holat =====
  async summary() {
    const accounts = await this.prisma.account.findMany();
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const cf = await this.cashFlow(from.toISOString(), to.toISOString());

    return {
      totalBalance,
      accounts,
      month: {
        income: cf.totalIncome,
        expense: cf.expense,
        net: cf.net,
      },
    };
  }

  // ===== Cash Flow — shartnoma to'lovlari + tranzaksiyalar =====
  async cashFlow(fromIso?: string, toIso?: string) {
    const now = new Date();
    const from = fromIso
      ? new Date(fromIso)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = toIso ? new Date(toIso) : now;

    // 1) Shartnoma to'lovlari (asosiy daromad)
    const payments = await this.prisma.payment.findMany({
      where: { paidAt: { gte: from, lte: to } },
      select: { amount: true },
    });
    const contractIncome = payments.reduce((s, p) => s + p.amount, 0);

    // 2) Moliya tranzaksiyalari
    const txns = await this.prisma.transaction.findMany({
      where: { date: { gte: from, lte: to } },
      include: { category: true },
    });

    let otherIncome = 0;
    let investment = 0;
    let expense = 0;
    const expenseByCategory: Record<string, number> = {};

    for (const t of txns) {
      if (t.type === 'INCOME') otherIncome += t.amount;
      else if (t.type === 'INVESTMENT') investment += t.amount;
      else if (t.type === 'EXPENSE') {
        expense += t.amount;
        const key = t.category?.name ?? 'Boshqa';
        expenseByCategory[key] = (expenseByCategory[key] ?? 0) + t.amount;
      }
      // TRANSFER — neytral, hisobga olinmaydi
    }

    const totalIncome = contractIncome + otherIncome + investment;

    return {
      period: { from, to },
      income: {
        contract: contractIncome,
        other: otherIncome,
        investment,
      },
      totalIncome,
      expense,
      expenseByCategory,
      net: totalIncome - expense,
    };
  }
}
