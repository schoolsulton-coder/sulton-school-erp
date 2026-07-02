import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PdfService } from '../../common/pdf/pdf.service';
import { CreateRunDto } from './dto/create-run.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { renderVedomostHtml } from './payroll-template';

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private pdf: PdfService,
  ) {}

  listRuns() {
    return this.prisma.payrollRun.findMany({
      include: { _count: { select: { items: true } } },
      orderBy: { period: 'desc' },
    });
  }

  /** Oylik hisob ochish — faol xodimlar uchun item'lar yaratiladi */
  async createRun(dto: CreateRunDto) {
    const exists = await this.prisma.payrollRun.findUnique({
      where: { period: dto.period },
    });
    if (exists) throw new ConflictException('Bu davr uchun hisob allaqachon bor');

    const employees = await this.prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: { salary: true },
    });

    return this.prisma.$transaction(async (tx) => {
      const run = await tx.payrollRun.create({ data: { period: dto.period } });

      for (const emp of employees) {
        // MONTHLY — stavka to'liq; HOURLY/PER_LESSON — qo'lda kiritiladi (0)
        const base =
          emp.salary?.type === 'MONTHLY' ? (emp.salary?.baseRate ?? 0) : 0;
        await tx.payrollItem.create({
          data: {
            payrollRunId: run.id,
            employeeId: emp.id,
            base,
            bonus: 0,
            penalty: 0,
            total: base,
          },
        });
      }
      return run;
    });
  }

  async getRun(id: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            employee: {
              include: {
                user: { select: { fullName: true } },
                position: true,
              },
            },
          },
        },
      },
    });
    if (!run) throw new NotFoundException('Oylik hisobi topilmadi');

    const totalSum = run.items.reduce((s, i) => s + i.total, 0);
    return { ...run, totalSum };
  }

  /** Bonus / jarima kiritish — jami avtomatik qayta hisoblanadi */
  async updateItem(itemId: string, dto: UpdateItemDto) {
    const item = await this.prisma.payrollItem.findUnique({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException('Yozuv topilmadi');

    const bonus = dto.bonus ?? item.bonus;
    const penalty = dto.penalty ?? item.penalty;
    const total = item.base + bonus - penalty;

    return this.prisma.payrollItem.update({
      where: { id: itemId },
      data: { bonus, penalty, total },
    });
  }

  async approveRun(id: string) {
    await this.getRun(id);
    await this.prisma.payrollRun.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
    await this.prisma.payrollItem.updateMany({
      where: { payrollRunId: id },
      data: { status: 'APPROVED' },
    });
    return { ok: true };
  }

  /** Butun hisobni to'langan deb belgilash */
  async payRun(id: string) {
    const run = await this.getRun(id);
    if (run.status === 'DRAFT') {
      throw new BadRequestException('Avval hisobni tasdiqlang');
    }
    await this.prisma.payrollRun.update({
      where: { id },
      data: { status: 'PAID' },
    });
    await this.prisma.payrollItem.updateMany({
      where: { payrollRunId: id },
      data: { status: 'PAID', paidAt: new Date() },
    });
    return { ok: true };
  }

  // ===== Vedomost PDF =====
  async generateVedomost(id: string): Promise<{ buffer: Buffer; period: string }> {
    const run = await this.getRun(id);
    const html = renderVedomostHtml({
      period: run.period,
      items: run.items.map((i, idx) => ({
        index: idx + 1,
        fullName: i.employee.user.fullName,
        position: i.employee.position?.name,
        base: i.base,
        bonus: i.bonus,
        penalty: i.penalty,
        total: i.total,
      })),
      totalSum: run.totalSum,
    });
    const buffer = await this.pdf.fromHtml(html);
    return { buffer, period: run.period };
  }
}
