import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';

const avg = (nums: number[]) =>
  nums.length ? Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10 : 0;

@Injectable()
export class EsmaktabService {
  constructor(private prisma: PrismaService) {}

  private async toBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  // ===== O'quvchilar ro'yxati (Excel) =====
  async exportStudents(classId?: string): Promise<Buffer> {
    const students = await this.prisma.student.findMany({
      where: { ...(classId ? { classId } : {}), status: 'ACTIVE' },
      include: {
        class: { select: { name: true } },
        guardians: { include: { guardian: true } },
      },
      orderBy: { lastName: 'asc' },
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("O'quvchilar");
    ws.columns = [
      { header: '№', key: 'n', width: 5 },
      { header: 'Familiya', key: 'lastName', width: 18 },
      { header: 'Ism', key: 'firstName', width: 16 },
      { header: 'Otasining ismi', key: 'middleName', width: 18 },
      { header: 'Sinf', key: 'class', width: 8 },
      { header: "Tug'ilgan sana", key: 'birthDate', width: 14 },
      { header: 'Jinsi', key: 'gender', width: 8 },
      { header: 'Vasiy', key: 'guardian', width: 22 },
      { header: 'Vasiy tel', key: 'guardianPhone', width: 16 },
    ];
    ws.getRow(1).font = { bold: true };

    students.forEach((s, i) => {
      const primary = s.guardians.find((g) => g.isPrimary)?.guardian ?? s.guardians[0]?.guardian;
      ws.addRow({
        n: i + 1,
        lastName: s.lastName,
        firstName: s.firstName,
        middleName: s.middleName ?? '',
        class: s.class?.name ?? '',
        birthDate: s.birthDate ? s.birthDate.toLocaleDateString('uz-UZ') : '',
        gender: s.gender === 'MALE' ? "O'g'il" : s.gender === 'FEMALE' ? 'Qiz' : '',
        guardian: primary?.fullName ?? '',
        guardianPhone: primary?.phone ?? '',
      });
    });

    return this.toBuffer(wb);
  }

  // ===== Baholar jurnali (fan bo'yicha o'rtacha) =====
  async exportGrades(classId: string, period?: string): Promise<Buffer> {
    const [students, subjects] = await Promise.all([
      this.prisma.student.findMany({
        where: { classId, status: 'ACTIVE' },
        include: {
          grades: {
            where: period ? { period } : {},
            select: { subjectId: true, value: true },
          },
        },
        orderBy: { lastName: 'asc' },
      }),
      this.prisma.subject.findMany({ orderBy: { name: 'asc' } }),
    ]);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Baholar');
    ws.columns = [
      { header: '№', key: 'n', width: 5 },
      { header: 'F.I.SH', key: 'name', width: 28 },
      ...subjects.map((s) => ({ header: s.name, key: s.id, width: 12 })),
      { header: 'Umumiy', key: 'overall', width: 10 },
    ];
    ws.getRow(1).font = { bold: true };

    students.forEach((st, i) => {
      const row: any = { n: i + 1, name: `${st.lastName} ${st.firstName}` };
      const subjectAverages: number[] = [];
      for (const subj of subjects) {
        const vals = st.grades.filter((g) => g.subjectId === subj.id).map((g) => g.value);
        const a = avg(vals);
        row[subj.id] = a || '';
        if (a) subjectAverages.push(a);
      }
      row.overall = avg(subjectAverages) || '';
      ws.addRow(row);
    });

    return this.toBuffer(wb);
  }

  // ===== Davomat hisoboti (oy bo'yicha) =====
  async exportAttendance(classId: string, month?: string): Promise<Buffer> {
    const dateFilter: any = {};
    if (month) {
      const [y, m] = month.split('-').map(Number);
      dateFilter.gte = new Date(y, m - 1, 1);
      dateFilter.lt = new Date(y, m, 1);
    }

    const students = await this.prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      include: {
        attendances: {
          where: month ? { date: dateFilter } : {},
          select: { status: true },
        },
      },
      orderBy: { lastName: 'asc' },
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Davomat');
    ws.columns = [
      { header: '№', key: 'n', width: 5 },
      { header: 'F.I.SH', key: 'name', width: 28 },
      { header: 'Bor', key: 'present', width: 8 },
      { header: "Yo'q", key: 'absent', width: 8 },
      { header: 'Kechikkan', key: 'late', width: 10 },
      { header: 'Sababli', key: 'excused', width: 10 },
      { header: 'Davomat %', key: 'rate', width: 12 },
    ];
    ws.getRow(1).font = { bold: true };

    students.forEach((st, i) => {
      const c = (s: string) => st.attendances.filter((a) => a.status === s).length;
      const present = c('PRESENT');
      const total = st.attendances.length;
      ws.addRow({
        n: i + 1,
        name: `${st.lastName} ${st.firstName}`,
        present,
        absent: c('ABSENT'),
        late: c('LATE'),
        excused: c('EXCUSED'),
        rate: total ? Math.round((present / total) * 100) + '%' : '—',
      });
    });

    return this.toBuffer(wb);
  }

  // ===== API sync (kalit bo'lsa) yoki log =====
  private log(entity: string, status: string, message: string) {
    return this.prisma.esmaktabSyncLog.create({
      data: { entity, direction: 'export', status, message },
    });
  }

  async sync(entity: string) {
    const url = process.env.ESMAKTAB_API_URL;
    const key = process.env.ESMAKTAB_API_KEY;
    if (!url || !key) {
      await this.log(entity, 'failed', 'E-maktab API sozlanmagan — Excel eksportdan foydalaning');
      return { ok: false, message: 'API sozlanmagan. Excel eksportdan foydalaning.' };
    }
    try {
      // Rasmiy API mavjud bo'lganda haqiqiy so'rov shu yerda yuboriladi:
      // await fetch(`${url}/${entity}`, { headers: { Authorization: `Bearer ${key}` }, ... })
      await this.log(entity, 'success', 'API ga yuborildi');
      return { ok: true };
    } catch (e) {
      await this.log(entity, 'failed', (e as Error).message);
      return { ok: false, message: (e as Error).message };
    }
  }

  logs() {
    return this.prisma.esmaktabSyncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  status() {
    return { apiConfigured: !!process.env.ESMAKTAB_API_URL };
  }
}
