import { Injectable } from '@nestjs/common';
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
      },
    });
  }

  update(id: string, dto: UpdateFlowAccountDto) {
    return this.prisma.flowAccount.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.branchId !== undefined ? { branchId: dto.branchId || null } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.kassaTuri !== undefined ? { kassaTuri: dto.kassaTuri } : {}),
        ...(dto.userId !== undefined ? { userId: dto.userId || null } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.prisma.flowAccount.delete({ where: { id } });
    return { ok: true };
  }
}
