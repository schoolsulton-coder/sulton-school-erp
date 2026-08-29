import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFlowAccountDto, UpdateFlowAccountDto } from './dto/flow-account.dto';

@Injectable()
export class FlowAccountsService {
  constructor(private prisma: PrismaService) {}

  list(params: { branchId?: string; currency?: string; kassaTuri?: string; userId?: string; active?: boolean }) {
    const where: any = {};
    if (params.branchId) where.branchId = params.branchId;
    if (params.currency) where.currency = params.currency;
    if (params.kassaTuri) where.kassaTuri = params.kassaTuri;
    if (params.userId) where.userId = params.userId;
    if (typeof params.active === 'boolean') where.active = params.active;
    return this.prisma.flowAccount.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true } },
      },
      orderBy: [{ name: 'asc' }],
    });
  }

  create(dto: CreateFlowAccountDto) {
    return this.prisma.flowAccount.create({
      data: {
        name: dto.name,
        branchId: dto.branchId || null,
        currency: dto.currency ?? 'SOM',
        kassaTuri: dto.kassaTuri ?? 'Naqd',
        userId: dto.userId || null,
        bankName: dto.bankName || null,
        cardNumber: dto.cardNumber || null,
        cardHolder: dto.cardHolder || null,
        cardType: dto.cardType || null,
      },
    });
  }

  /** Hisobga bog'langan harakatlar soni (maosh, o'tkazma, oldi-berdi, maktab to'lovi, xarajat) */
  private async linkedCount(id: string) {
    const [sal, itFrom, itTo, cpSom, cpDol, pay, expSom, expDol] = await Promise.all([
      this.prisma.salaryPayment.count({ where: { OR: [{ somAccountId: id }, { dollarAccountId: id }] } }),
      this.prisma.internalTransfer.count({ where: { fromAccountId: id } }),
      this.prisma.internalTransfer.count({ where: { toAccountId: id } }),
      this.prisma.counterpartyEntry.count({ where: { somFlowAccountId: id } }),
      this.prisma.counterpartyEntry.count({ where: { dollarFlowAccountId: id } }),
      this.prisma.payment.count({ where: { flowAccountId: id } }),
      this.prisma.expensePayment.count({ where: { flowAccountId: id } }),
      this.prisma.expensePayment.count({ where: { dollarFlowAccountId: id } }),
    ]);
    return sal + itFrom + itTo + cpSom + cpDol + pay + expSom + expDol;
  }

  async update(id: string, dto: UpdateFlowAccountDto) {
    const cur = await this.prisma.flowAccount.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException('Hisob topilmadi');
    // Valyuta o'zgartirilsa — harakatlar/qoldiq bilan desync bo'lmasin
    if (dto.currency !== undefined && dto.currency !== cur.currency) {
      const linked = await this.linkedCount(id);
      if (linked > 0 || cur.balance !== 0) {
        throw new BadRequestException("Hisobda harakatlar bor — valyutani o'zgartirib bo'lmaydi");
      }
    }
    return this.prisma.flowAccount.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.branchId !== undefined ? { branchId: dto.branchId || null } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.kassaTuri !== undefined ? { kassaTuri: dto.kassaTuri } : {}),
        ...(dto.userId !== undefined ? { userId: dto.userId || null } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.bankName !== undefined ? { bankName: dto.bankName || null } : {}),
        ...(dto.cardNumber !== undefined ? { cardNumber: dto.cardNumber || null } : {}),
        ...(dto.cardHolder !== undefined ? { cardHolder: dto.cardHolder || null } : {}),
        ...(dto.cardType !== undefined ? { cardType: dto.cardType || null } : {}),
      },
    });
  }

  async remove(id: string) {
    const acc = await this.prisma.flowAccount.findUnique({ where: { id } });
    if (!acc) throw new NotFoundException('Hisob topilmadi');
    const linked = await this.linkedCount(id);
    if (linked > 0) {
      throw new BadRequestException(
        `Bu hisobda ${linked} ta harakat bog'langan. Avval ularni o'chiring, keyin hisobni o'chiring.`,
      );
    }
    await this.prisma.flowAccount.delete({ where: { id } });
    return { ok: true };
  }
}
