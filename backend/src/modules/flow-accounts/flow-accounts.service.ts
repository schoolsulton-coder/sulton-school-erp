import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFlowAccountDto, UpdateFlowAccountDto } from './dto/flow-account.dto';

@Injectable()
export class FlowAccountsService {
  constructor(private prisma: PrismaService) {}

  list(params: { branchId?: string; currency?: string; userId?: string; active?: boolean }) {
    const where: any = {};
    if (params.branchId) where.branchId = params.branchId;
    if (params.currency) where.currency = params.currency;
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

  async update(id: string, dto: UpdateFlowAccountDto) {
    const cur = await this.prisma.flowAccount.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException('Hisob topilmadi');
    // Valyuta o'zgartirilsa — harakatlar/qoldiq bilan desync bo'lmasin
    if (dto.currency !== undefined && dto.currency !== cur.currency) {
      const [sal, itFrom, itTo, cpSom, cpDol] = await Promise.all([
        this.prisma.salaryPayment.count({ where: { OR: [{ somAccountId: id }, { dollarAccountId: id }] } }),
        this.prisma.internalTransfer.count({ where: { fromAccountId: id } }),
        this.prisma.internalTransfer.count({ where: { toAccountId: id } }),
        this.prisma.counterpartyEntry.count({ where: { somFlowAccountId: id } }),
        this.prisma.counterpartyEntry.count({ where: { dollarFlowAccountId: id } }),
      ]);
      if (sal + itFrom + itTo + cpSom + cpDol > 0 || cur.balance !== 0) {
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
    const [sal, itFrom, itTo, cpSom, cpDol] = await Promise.all([
      this.prisma.salaryPayment.count({ where: { OR: [{ somAccountId: id }, { dollarAccountId: id }] } }),
      this.prisma.internalTransfer.count({ where: { fromAccountId: id } }),
      this.prisma.internalTransfer.count({ where: { toAccountId: id } }),
      this.prisma.counterpartyEntry.count({ where: { somFlowAccountId: id } }),
      this.prisma.counterpartyEntry.count({ where: { dollarFlowAccountId: id } }),
    ]);
    const linked = sal + itFrom + itTo + cpSom + cpDol;
    if (linked > 0) {
      throw new BadRequestException(
        `Bu hisobda ${linked} ta harakat bog'langan. Avval ularni o'chiring, keyin hisobni o'chiring.`,
      );
    }
    await this.prisma.flowAccount.delete({ where: { id } });
    return { ok: true };
  }
}
