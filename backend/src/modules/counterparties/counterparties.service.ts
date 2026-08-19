import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCounterpartyDto } from './dto/create-counterparty.dto';
import { CreateEntryDto } from './dto/create-entry.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';

@Injectable()
export class CounterpartiesService {
  constructor(private prisma: PrismaService) {}

  // Ro'yxat + har kontragent bo'yicha jamlanma (kirim/chiqim/balans/tranzaksiya)
  async list(params: {
    category?: string;
    branchId?: string;
    search?: string;
    filiallararo?: boolean;
  }) {
    const where: any = {};
    if (params.category) where.category = params.category;
    if (params.branchId) where.branchId = params.branchId;
    if (typeof params.filiallararo === 'boolean') where.filiallararo = params.filiallararo;
    if (params.search) where.name = { contains: params.search, mode: 'insensitive' };

    const rows = await this.prisma.counterparty.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        branchLinks: { include: { branch: { select: { id: true, name: true } } } },
        entries: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = rows.map((c) => {
      const kirim = c.entries
        .filter((e) => e.direction === 'IN')
        .reduce((s, e) => s + e.amount, 0);
      const chiqim = c.entries
        .filter((e) => e.direction === 'OUT')
        .reduce((s, e) => s + e.amount, 0);
      return {
        id: c.id,
        name: c.name,
        branch: c.branch,
        branches: c.branchLinks.map((l) => l.branch), // investorlar uchun ko'p filial
        category: c.category,
        filiallararo: c.filiallararo,
        pairId: c.pairId,
        note: c.note,
        tranzaksiya: c.entries.length,
        kirim,
        chiqim,
        balans: chiqim - kirim, // musbat = bizning foydamizga (yashil)
      };
    });

    // Balans bo'yicha kamayish tartibida (skrinshotdek)
    data.sort((a, b) => b.balans - a.balans);

    const jamiKirim = data.reduce((s, d) => s + d.kirim, 0);
    const jamiChiqim = data.reduce((s, d) => s + d.chiqim, 0);

    return {
      totals: {
        shaxslar: data.length,
        jamiKirim,
        jamiChiqim,
        balans: jamiChiqim - jamiKirim,
      },
      data,
    };
  }

  async get(id: string) {
    const c = await this.prisma.counterparty.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        entries: { orderBy: { date: 'desc' } },
      },
    });
    if (!c) throw new NotFoundException('Kontragent topilmadi');
    return c;
  }

  async create(dto: CreateCounterpartyDto) {
    const branchIds = (dto.branchIds ?? []).filter(Boolean);
    const cp = await this.prisma.counterparty.create({
      data: {
        name: dto.name,
        branchId: dto.branchId,
        category: dto.category ?? 'OLDI_BERDICHI',
        filiallararo: dto.filiallararo ?? false,
        pairId: dto.pairId || null,
        note: dto.note,
        ...(branchIds.length
          ? { branchLinks: { create: branchIds.map((branchId) => ({ branchId })) } }
          : {}),
      },
    });
    // Juftlikni ikki tomonlama bog'lash
    if (dto.pairId) {
      await this.prisma.counterparty
        .update({ where: { id: dto.pairId }, data: { pairId: cp.id } })
        .catch(() => undefined);
    }
    return cp;
  }

  async addEntry(counterpartyId: string, dto: CreateEntryDto) {
    const c = await this.prisma.counterparty.findUnique({
      where: { id: counterpartyId },
    });
    if (!c) throw new NotFoundException('Kontragent topilmadi');

    const som = dto.somAmount ?? 0;
    const usd = dto.dollarAmount ?? 0;
    const rate = dto.dollarRate ?? 0;
    const amount = som + usd * rate; // so'm ekvivalenti
    if (amount <= 0) throw new BadRequestException("Summa noto'g'ri");

    const sign = dto.direction === 'IN' ? 1 : -1; // IN = hisobga kirim (+), OUT = chiqim (−)

    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.counterpartyEntry.create({
        data: {
          counterpartyId,
          direction: dto.direction,
          amount,
          somAmount: som || null,
          dollarAmount: usd || null,
          dollarRate: usd > 0 ? rate : null,
          sabab: dto.sabab,
          kassaTuri: dto.kassaTuri,
          accountId: dto.accountId || null,
          somFlowAccountId: dto.somFlowAccountId || null,
          dollarKassaTuri: dto.dollarKassaTuri,
          dollarFlowAccountId: dto.dollarFlowAccountId || null,
          capex: dto.capex,
          operation: dto.operation,
          branchId: dto.branchId || null,
          periodYear: dto.periodYear,
          periodMonth: dto.periodMonth,
          academicYear: dto.academicYear,
          investType: dto.investType,
          date: dto.date ? new Date(dto.date) : new Date(),
          note: dto.note,
        },
      });
      // Tashqi hisob balansini yangilash (so'm hisob so'mda, dollar hisob dollarda)
      if (dto.somFlowAccountId && som) {
        await tx.flowAccount.update({
          where: { id: dto.somFlowAccountId },
          data: { balance: { increment: sign * som } },
        });
      }
      if (dto.dollarFlowAccountId && usd) {
        await tx.flowAccount.update({
          where: { id: dto.dollarFlowAccountId },
          data: { balance: { increment: sign * usd } },
        });
      }
      return entry;
    });
  }

  // Transfer: jo'natuvchi (OUT) → qabul qiluvchi (IN), bitta transferPairId bilan
  async transfer(dto: CreateTransferDto) {
    if (dto.fromId === dto.toId) {
      throw new BadRequestException('Bir xil kontragent tanlandi');
    }
    const [from, to] = await Promise.all([
      this.prisma.counterparty.findUnique({ where: { id: dto.fromId } }),
      this.prisma.counterparty.findUnique({ where: { id: dto.toId } }),
    ]);
    if (!from || !to) throw new NotFoundException('Kontragent topilmadi');

    const som = dto.somAmount ?? 0;
    const usd = dto.dollarAmount ?? 0;
    const rate = dto.dollarRate ?? 0;
    const amount = som + usd * rate;
    if (amount <= 0) throw new BadRequestException("Summa noto'g'ri");

    const pairId = randomUUID();
    const date = dto.date ? new Date(dto.date) : new Date();
    const shared = {
      amount,
      somAmount: som || null,
      dollarAmount: usd || null,
      dollarRate: usd > 0 ? rate : null,
      transferPairId: pairId,
      date,
      note: dto.note,
    };

    return this.prisma.$transaction(async (tx) => {
      // Jo'natuvchi (OUT) — o'z hisoblari bilan
      await tx.counterpartyEntry.create({
        data: {
          counterpartyId: dto.fromId,
          direction: 'OUT',
          ...shared,
          somFlowAccountId: dto.fromSomAccountId || null,
          dollarFlowAccountId: dto.fromDollarAccountId || null,
        },
      });
      // Qabul qiluvchi (IN) — o'z hisoblari bilan
      await tx.counterpartyEntry.create({
        data: {
          counterpartyId: dto.toId,
          direction: 'IN',
          ...shared,
          somFlowAccountId: dto.toSomAccountId || null,
          dollarFlowAccountId: dto.toDollarAccountId || null,
        },
      });
      // Balanslar: jo'natuvchidan chiqim (−), qabul qiluvchiga kirim (+)
      if (dto.fromSomAccountId && som) {
        await tx.flowAccount.update({ where: { id: dto.fromSomAccountId }, data: { balance: { decrement: som } } });
      }
      if (dto.toSomAccountId && som) {
        await tx.flowAccount.update({ where: { id: dto.toSomAccountId }, data: { balance: { increment: som } } });
      }
      if (dto.fromDollarAccountId && usd) {
        await tx.flowAccount.update({ where: { id: dto.fromDollarAccountId }, data: { balance: { decrement: usd } } });
      }
      if (dto.toDollarAccountId && usd) {
        await tx.flowAccount.update({ where: { id: dto.toDollarAccountId }, data: { balance: { increment: usd } } });
      }
      return { ok: true };
    });
  }

  async remove(id: string) {
    await this.prisma.counterparty.delete({ where: { id } });
    return { ok: true };
  }
}
