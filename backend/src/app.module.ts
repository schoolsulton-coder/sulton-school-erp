import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { PdfModule } from './common/pdf/pdf.module';
import { AuthModule } from './modules/auth/auth.module';
import { StudentsModule } from './modules/students/students.module';
import { CrmModule } from './modules/crm/crm.module';
import { ClassesModule } from './modules/classes/classes.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { UsersModule } from './modules/users/users.module';
import { HrModule } from './modules/hr/hr.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { HomeworkModule } from './modules/homework/homework.module';
import { BehaviorModule } from './modules/behavior/behavior.module';
import { GradesModule } from './modules/grades/grades.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { PortalModule } from './modules/portal/portal.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { EsmaktabModule } from './modules/esmaktab/esmaktab.module';
import { PaymentsModule } from './modules/payments/payments.module';

/**
 * AppModule — barcha ERP/LMS modullarini birlashtiradi.
 *
 * Modullar bosqichma-bosqich qo'shiladi (docs/ROADMAP.md ga qarang):
 *   UsersModule, StudentsModule, CrmModule, ClassesModule, ContractsModule,
 *   FinanceModule, HrModule, PayrollModule, GradesModule, AttendanceModule,
 *   HomeworkModule, BehaviorModule, NotificationsModule, TelegramModule,
 *   EsmaktabModule, ReportsModule
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    PdfModule,
    AuthModule,
    StudentsModule,
    CrmModule,
    ClassesModule,
    ContractsModule,
    FinanceModule,
    ExpensesModule,
    UsersModule,
    HrModule,
    PayrollModule,
    HomeworkModule,
    BehaviorModule,
    NotificationsModule,
    WebhooksModule,
    GradesModule,
    AttendanceModule,
    PortalModule,
    EsmaktabModule,
    PaymentsModule,
    // Barcha asosiy modullar ulandi 🎉
    // GradesModule, AttendanceModule, HomeworkModule, BehaviorModule,
    // NotificationsModule, TelegramModule, EsmaktabModule, ReportsModule
  ],
})
export class AppModule {}
