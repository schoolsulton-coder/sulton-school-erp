import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type JwtUser = { id: string; role: string };

const CONTACT_TYPES = ['CALL', 'TELEGRAM', 'SMS', 'MEETING', 'OTHER'];
const ADMIN_ROLES = ['superadmin', 'admin'];

@Injectable()
export class DebtorsService {
  constructor(private prisma: PrismaService) {}

  // Maktab (Toshkent) sanasi — YYYY-MM-DD
  private dayStr(d: Date): string {
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
  }
  private schoolTodayStart(): Date {
    return new Date(`${this.dayStr(new Date())}T00:00:00.000Z`);
  }

  /** Qarzdorlik matritsasi: har shartnoma + oylik installment holati + oxirgi aloqa */
  async list() {
    const contracts = await this.prisma.contract.findMany({
      where: { status: { notIn: ['DRAFT', 'CANCELLED'] } },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            branch: { select: { id: true, name: true } },
            class: { select: { name: true, academicYear: true } },
          },
        },
        installments: {
          select: { dueDate: true, amount: true, paidAmount: true },
          orderBy: { dueDate: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const todayStart = this.schoolTodayStart();

    const rows = contracts
      .map((c) => {
        const cells = c.installments.map((i) => {
          const remaining = Math.max(0, i.amount - i.paidAmount);
          const state =
            i.paidAmount >= i.amount ? 'paid' : i.paidAmount > 0 ? 'partial' : 'unpaid';
          return {
            key: this.dayStr(i.dueDate).slice(0, 7), // YYYY-MM
            amount: i.amount,
            paid: i.paidAmount,
            remaining,
            state,
            overdue: i.dueDate < todayStart && remaining > 0,
          };
        });
        const debt = cells.reduce((s, x) => s + x.remaining, 0);
        const paid = c.installments.reduce((s, i) => s + i.paidAmount, 0);
        const total = c.installments.reduce((s, i) => s + i.amount, 0);
        const overdueMonths = cells.filter((x) => x.overdue).length;
        return {
          contractId: c.id,
          number: c.number,
          studentId: c.student.id,
          firstName: c.student.firstName,
          lastName: c.student.lastName,
          className: c.student.class?.name ?? null,
          academicYear: c.student.class?.academicYear ?? null,
          branchId: c.student.branch?.id ?? null,
          branchName: c.student.branch?.name ?? null,
          startDate: c.startDate,
          status: c.status,
          total,
          paid,
          debt,
          overdueMonths,
          cells,
        };
      })
      .filter((r) => r.debt > 0);

    // Har o'quvchi bo'yicha oxirgi aloqa + bugungi aloqa
    const studentIds = [...new Set(rows.map((r) => r.studentId))];
    const contacts = studentIds.length
      ? await this.prisma.debtorContact.findMany({
          where: { studentId: { in: studentIds } },
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { fullName: true } } },
        })
      : [];

    const today = this.dayStr(new Date());
    const lastByStudent = new Map<string, (typeof contacts)[number]>();
    const countByStudent = new Map<string, number>();
    const contactedToday = new Set<string>();
    for (const ct of contacts) {
      countByStudent.set(ct.studentId, (countByStudent.get(ct.studentId) ?? 0) + 1);
      if (!lastByStudent.has(ct.studentId)) lastByStudent.set(ct.studentId, ct);
      if (this.dayStr(ct.createdAt) === today) contactedToday.add(ct.studentId);
    }

    const rowsOut = rows.map((r) => {
      const last = lastByStudent.get(r.studentId);
      return {
        ...r,
        lastContact: last
          ? {
              type: last.type,
              note: last.note,
              createdAt: last.createdAt,
              author: last.author?.fullName ?? null,
            }
          : null,
        contactCount: countByStudent.get(r.studentId) ?? 0,
        contactedToday: contactedToday.has(r.studentId),
      };
    });

    const branchesMap = new Map<string, string>();
    const yearsSet = new Set<string>();
    for (const r of rows) {
      if (r.branchId && r.branchName) branchesMap.set(r.branchId, r.branchName);
      if (r.academicYear) yearsSet.add(r.academicYear);
    }

    return {
      rows: rowsOut,
      branches: [...branchesMap].map(([id, name]) => ({ id, name })),
      academicYears: [...yearsSet].sort().reverse(),
      stats: { debtors: rows.length, contactedToday: contactedToday.size },
      today,
    };
  }

  listContacts(studentId: string) {
    return this.prisma.debtorContact.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { fullName: true } } },
    });
  }

  async addContact(user: JwtUser, studentId: string, dto: CreateContactDtoLike) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    });
    if (!student) throw new NotFoundException("O'quvchi topilmadi");

    const note = (dto.note ?? '').trim();
    if (!note) throw new BadRequestException('Izoh bo‘sh bo‘lishi mumkin emas');
    const type = CONTACT_TYPES.includes(dto.type ?? '') ? (dto.type as string) : 'OTHER';

    return this.prisma.debtorContact.create({
      data: { studentId, authorId: user.id, type, note },
      include: { author: { select: { fullName: true } } },
    });
  }

  async removeContact(user: JwtUser, id: string) {
    const c = await this.prisma.debtorContact.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Aloqa topilmadi');
    if (c.authorId !== user.id && !ADMIN_ROLES.includes(user.role)) {
      throw new ForbiddenException("Faqat o'zingiz yozgan aloqani o'chira olasiz");
    }
    await this.prisma.debtorContact.delete({ where: { id } });
    return { ok: true };
  }
}

type CreateContactDtoLike = { type?: string; note: string };
