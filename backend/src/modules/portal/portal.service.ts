import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GradesService } from '../grades/grades.service';
import { AttendanceService } from '../attendance/attendance.service';
import { BehaviorService } from '../behavior/behavior.service';

@Injectable()
export class PortalService {
  constructor(
    private prisma: PrismaService,
    private grades: GradesService,
    private attendance: AttendanceService,
    private behavior: BehaviorService,
  ) {}

  private currentMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  /** Joriy foydalanuvchi -> bog'liq o'quvchi(lar) */
  private async resolveStudents(userId: string) {
    const student = await this.prisma.student.findFirst({
      where: { userId },
      include: { class: { select: { name: true } } },
    });
    if (student) return [student];

    const guardian = await this.prisma.guardian.findFirst({
      where: { userId },
      include: {
        students: {
          include: { student: { include: { class: { select: { name: true } } } } },
        },
      },
    });
    if (guardian) return guardian.students.map((sg) => sg.student);

    return [];
  }

  private async computeDebt(studentId: string) {
    const insts = await this.prisma.contractInstallment.findMany({
      where: { contract: { studentId }, status: { not: 'PAID' } },
      select: { amount: true, paidAmount: true },
    });
    return insts.reduce((s, i) => s + (i.amount - i.paidAmount), 0);
  }

  /** Bosh sahifa: har bir farzand uchun qisqa kartalar */
  async overview(userId: string) {
    const students = await this.resolveStudents(userId);
    const month = this.currentMonth();

    return Promise.all(
      students.map(async (s) => {
        const [gr, att, beh, hwPending, debt] = await Promise.all([
          this.grades.studentReport(s.id),
          this.attendance.studentReport(s.id, month),
          this.behavior.studentSummary(s.id),
          this.prisma.homeworkSubmission.count({
            where: { studentId: s.id, status: { in: ['ASSIGNED', 'MISSING'] } },
          }),
          this.computeDebt(s.id),
        ]);
        return {
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          className: (s as any).class?.name ?? null,
          gradeAvg: gr.overall,
          attendanceRate: att.rate,
          behaviorScore: beh.score,
          homeworkPending: hwPending,
          debt,
        };
      }),
    );
  }

  /** Bitta farzand bo'yicha to'liq ma'lumot (ruxsat tekshiruvi bilan) */
  async studentDetail(userId: string, studentId: string) {
    const students = await this.resolveStudents(userId);
    if (!students.some((s) => s.id === studentId)) {
      throw new ForbiddenException("Bu o'quvchi ma'lumotiga ruxsat yo'q");
    }

    const [grades, attendance, behavior, submissions, contracts] = await Promise.all([
      this.grades.studentReport(studentId),
      this.attendance.studentReport(studentId, this.currentMonth()),
      this.behavior.studentSummary(studentId),
      this.prisma.homeworkSubmission.findMany({
        where: { studentId },
        include: { homework: { include: { subject: true } } },
        orderBy: { homework: { dueDate: 'desc' } },
        take: 20,
      }),
      this.prisma.contract.findMany({
        where: { studentId },
        include: {
          installments: { orderBy: { dueDate: 'asc' } },
          payments: { orderBy: { paidAt: 'desc' }, take: 10 },
        },
      }),
    ]);

    return { grades, attendance, behavior, submissions, contracts };
  }
}
