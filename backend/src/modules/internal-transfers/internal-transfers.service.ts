import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInternalTransferDto } from './dto/create-internal-transfer.dto';

type Flow = { name: string; kassaTuri: string; currency: string } | null;

@Injectable()
export class InternalTransfersService {
  constructor(private prisma: PrismaService) {}

  private label(a: Flow) {
    if (!a) return null;
    const cur = a.currency === 'USD' ? 'Dollar' : "So'm";
    return `${a.name} (${a.kassaTuri}) (${cur})`;
  }

  // Balans o'zgarishi (yo'nalish: +1 qo'llash, -1 bekor qilish)
  private async applyBalance(
    tx: any,
    t: { kind: string; fromAccountId?: string | null; toAccountId?: string | null; somAmount?: number | null; dollarAmount?: number | null; loss?: number | null },
    sign: 1 | -1,
  ) {
    const [fromAcc, toAcc] = await Promise.all([
      t.fromAccountId ? tx.flowAccount.findUnique({ where: { id: t.fromAccountId }, select: { currency: true } }) : null,
      t.toAccountId ? tx.flowAccount.findUnique({ where: { id: t.toAccountId }, select: { currency: true } }) : null,
    ]);
    const som = (t.somAmount ?? 0) * sign;
    const usd = (t.dollarAmount ?? 0) * sign;
    const loss = (t.loss ?? 0) * sign;
    const dec = async (id: string | null | undefined, amount: number) => {
      if (id && amount) await tx.flowAccount.update({ where: { id }, data: { balance: { decrement: amount } } });
    };
    const inc = async (id: string | null | undefined, amount: number) => {
      if (id && amount) await tx.flowAccount.update({ where: { id }, data: { balance: { increment: amount } } });
    };
    if (t.kind === 'SOM') {
      await dec(t.fromAccountId, som);
      await inc(t.toAccountId, som);
    } else if (t.kind === 'DOLLAR') {
      await dec(t.fromAccountId, usd);
      await inc(t.toAccountId, usd);
    } else if (t.kind === 'VALYUTA') {
      // Hisob valyutasiga qarab: olish (so'm chiqadi/dollar kiradi) yoki sotish (aksincha)
      await dec(t.fromAccountId, fromAcc?.currency === 'USD' ? usd : som);
      await inc(t.toAccountId, toAcc?.currency === 'USD' ? usd : som);
    } else if (t.kind === 'PUL') {
      // So'm yoki dollar — qaysi biri kiritilgan bo'lsa
      const amt = som || usd;
      const lo = loss; // yo'qotish (so'mda kiritiladi)
      await dec(t.fromAccountId, amt);
      await inc(t.toAccountId, amt - lo); // yo'qotish yetib bormaydi
    }
  }

  async list(params: { kind: string; from?: string; to?: string; search?: string; branchId?: string }) {
    const where: any = { kind: params.kind };
    if (params.branchId) where.branchId = params.branchId;
    if (params.from || params.to) {
      where.date = {};
      if (params.from) where.date.gte = new Date(params.from);
      if (params.to) where.date.lte = new Date(params.to);
    }

    const rows = await this.prisma.internalTransfer.findMany({
      where,
      include: {
        branch: { select: { name: true } },
        fromAccount: { select: { name: true, kassaTuri: true, currency: true } },
        toAccount: { select: { name: true, kassaTuri: true, currency: true } },
      },
      orderBy: { date: 'desc' },
      take: 500,
    });

    let data = rows.map((r) => ({
      id: r.id,
      date: r.date,
      branch: r.branch?.name ?? null,
      from: this.label(r.fromAccount),
      to: this.label(r.toAccount),
      kassaTuri: r.kassaTuri ?? r.fromAccount?.kassaTuri ?? null,
      somAmount: r.somAmount ?? 0,
      dollarAmount: r.dollarAmount ?? 0,
      dollarRate: r.dollarRate ?? 0,
      loss: r.loss ?? 0,
      confirmed: !!r.confirmedAt,
      note: r.note,
    }));

    if (params.search) {
      const q = params.search.toLowerCase();
      data = data.filter(
        (d) =>
          (d.from ?? '').toLowerCase().includes(q) ||
          (d.to ?? '').toLowerCase().includes(q) ||
          (d.branch ?? '').toLowerCase().includes(q) ||
          (d.note ?? '').toLowerCase().includes(q),
      );
    }

    const sum = (f: (d: (typeof data)[number]) => number) => data.reduce((s, d) => s + f(d), 0);
    let totals: Record<string, number> = { count: data.length };
    if (params.kind === 'SOM') totals.jamiSom = sum((d) => d.somAmount);
    else if (params.kind === 'DOLLAR') totals.jamiDollar = sum((d) => d.dollarAmount);
    else if (params.kind === 'VALYUTA') {
      totals.jamiDollar = sum((d) => d.dollarAmount);
      totals.jamiSom = sum((d) => d.somAmount);
    } else if (params.kind === 'PUL') {
      totals.jamiChiqim = sum((d) => d.somAmount);
      totals.jamiKirim = sum((d) => d.somAmount - d.loss);
      totals.yoqotish = sum((d) => d.loss);
    }

    return { totals, data };
  }

  private userLabel(u: { fullName: string; email: string | null } | null) {
    if (!u) return null;
    return u.email ?? u.fullName;
  }

  async create(dto: CreateInternalTransferDto, userId?: string) {
    if (dto.fromAccountId === dto.toAccountId) throw new BadRequestException('Bir xil hisob tanlandi');
    const [from, to] = await Promise.all([
      this.prisma.flowAccount.findUnique({ where: { id: dto.fromAccountId } }),
      this.prisma.flowAccount.findUnique({ where: { id: dto.toAccountId } }),
    ]);
    if (!from || !to) throw new NotFoundException('Hisob topilmadi');

    const som = dto.somAmount ?? 0;
    const usd = dto.dollarAmount ?? 0;
    if (som <= 0 && usd <= 0) throw new BadRequestException("Summa noto'g'ri");

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.internalTransfer.create({
        data: {
          kind: dto.kind,
          branchId: dto.branchId ?? from.branchId,
          fromAccountId: dto.fromAccountId,
          toAccountId: dto.toAccountId,
          kassaTuri: dto.kassaTuri,
          somAmount: som || null,
          dollarAmount: usd || null,
          dollarRate: usd > 0 ? dto.dollarRate ?? null : null,
          loss: dto.loss || null,
          confirmedAt: new Date(), // yaratilganda tasdiqlangan
          confirmedById: userId || null,
          createdById: userId || null,
          updatedById: userId || null,
          date: dto.date ? new Date(dto.date) : new Date(),
          note: dto.note,
        },
      });
      await this.applyBalance(tx, { ...created }, 1);
      return created;
    });
  }

  async confirm(id: string, userId: string | undefined, confirm: boolean) {
    const t = await this.prisma.internalTransfer.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Topilmadi');
    return this.prisma.internalTransfer.update({
      where: { id },
      data: confirm
        ? { confirmedAt: new Date(), confirmedById: userId || null }
        : { confirmedAt: null, confirmedById: null },
    });
  }

  // ===== Bitta o'tkazma detali =====
  async detail(id: string) {
    const t = await this.prisma.internalTransfer.findUnique({
      where: { id },
      include: {
        branch: { select: { name: true } },
        fromAccount: { select: { name: true, kassaTuri: true, currency: true } },
        toAccount: { select: { name: true, kassaTuri: true, currency: true } },
        createdBy: { select: { fullName: true, email: true } },
        updatedBy: { select: { fullName: true, email: true } },
        confirmedBy: { select: { fullName: true, email: true } },
      },
    });
    if (!t) throw new NotFoundException('Topilmadi');
    return {
      id: t.id,
      kind: t.kind,
      date: t.date,
      branch: t.branch?.name ?? null,
      kassaTuri: t.kassaTuri,
      from: this.label(t.fromAccount),
      to: this.label(t.toAccount),
      fromKassa: t.fromAccount?.kassaTuri ?? null,
      toKassa: t.toAccount?.kassaTuri ?? null,
      fromCur: t.fromAccount?.currency ?? null,
      toCur: t.toAccount?.currency ?? null,
      somAmount: t.somAmount ?? 0,
      dollarAmount: t.dollarAmount ?? 0,
      dollarRate: t.dollarRate ?? 0,
      loss: t.loss ?? 0,
      note: t.note,
      confirmed: !!t.confirmedAt,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      createdBy: this.userLabel(t.createdBy),
      updatedBy: this.userLabel(t.updatedBy),
      confirmedBy: this.userLabel(t.confirmedBy),
    };
  }

  async remove(id: string) {
    const t = await this.prisma.internalTransfer.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Topilmadi');
    return this.prisma.$transaction(async (tx) => {
      await this.applyBalance(tx, { ...t }, -1); // balansni qaytarish
      await tx.internalTransfer.delete({ where: { id } });
      return { ok: true };
    });
  }
}
