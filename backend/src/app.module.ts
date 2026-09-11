import { ExecutionContext, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { PdfModule } from './common/pdf/pdf.module';
import { AuthModule } from './modules/auth/auth.module';
import { StudentsModule } from './modules/students/students.module';
import { CrmModule } from './modules/crm/crm.module';
import { ClassesModule } from './modules/classes/classes.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { ContractTemplatesModule } from './modules/contract-templates/contract-templates.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { UsersModule } from './modules/users/users.module';
import { HrModule } from './modules/hr/hr.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { HomeworkModule } from './modules/homework/homework.module';
import { BehaviorModule } from './modules/behavior/behavior.module';
import { CoinsModule } from './modules/coins/coins.module';
import { GradesModule } from './modules/grades/grades.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { PortalModule } from './modules/portal/portal.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { EsmaktabModule } from './modules/esmaktab/esmaktab.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DebtorsModule } from './modules/debtors/debtors.module';
import { CounterpartiesModule } from './modules/counterparties/counterparties.module';
import { FlowAccountsModule } from './modules/flow-accounts/flow-accounts.module';
import { InternalTransfersModule } from './modules/internal-transfers/internal-transfers.module';

/**
 * So'rov yo'lini oladi (global prefiks bilan, masalan "/api/auth/login").
 *
 * Yo'l NORMALLASHTIRILADI: query olib tashlanadi, kichik harfga o'tkaziladi va
 * oxiridagi "/" kesiladi. Express marshrutni katta-kichik harf va oxirgi "/" ga
 * qaramasdan topadi — normallashtirmasak "/api/auth/login/" yoki "/api/Auth/login"
 * bilan chegaradan chetlab o'tish mumkin bo'lardi.
 */
function requestPath(context: ExecutionContext): string {
  if (context.getType() !== 'http') return '';
  const req = context.switchToHttp().getRequest();
  const raw = String(req?.path ?? req?.url ?? '').split('?')[0];
  const lower = raw.toLowerCase();
  return lower.length > 1 ? lower.replace(/\/+$/, '') : lower;
}

/**
 * Haqiqiy mijoz IP'sini aniqlaydi.
 *
 * Nginx reverse-proxy ortida turamiz — Express'ning req.ip doim 127.0.0.1 ni
 * qaytaradi, ya'ni chegarani barcha foydalanuvchilar bo'lishib ketardi.
 * Nginx X-Real-IP ni har safar o'zi yozadi (mijoz soxtalashtira olmaydi),
 * X-Forwarded-For esa $proxy_add_x_forwarded_for bilan oxiriga haqiqiy IP'ni
 * qo'shadi — shuning uchun undan OXIRGI qiymatni olamiz.
 */
function clientIp(req: Record<string, any>): string {
  const realIp = req?.headers?.['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) return realIp.trim();

  const forwarded = req?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    const parts = forwarded
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }

  return String(req?.ip ?? 'unknown');
}

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
    ThrottlerModule.forRoot({
      // Chegara haqiqiy mijoz IP'si bo'yicha hisoblansin (nginx ortidamiz).
      getTracker: clientIp,
      // Webhook'lar (Meta/Instagram) — mashina-mashina chaqiruv, chegaradan ozod.
      skipIf: (context) => requestPath(context).startsWith('/api/webhooks/'),
      throttlers: [
        // Umumiy chegara. Kalit har bir endpoint uchun ALOHIDA hisoblanadi,
        // shuning uchun 300/daqiqa bitta ofis IP'si ortidagi 30 xodimning
        // oddiy ishini to'smaydi, lekin avtomatlashtirilgan hujumni cheklaydi.
        { name: 'default', ttl: 60000, limit: 300 },
        // Faqat /api/auth/login uchun: bitta IP'dan turli loginlar bo'yicha
        // ommaviy parol taxmin qilishni ("spraying") to'sadi.
        {
          name: 'login-ip',
          ttl: 60000,
          limit: 20,
          skipIf: (context) => requestPath(context) !== '/api/auth/login',
        },
      ],
    }),
    PrismaModule,
    PdfModule,
    AuthModule,
    StudentsModule,
    CrmModule,
    ClassesModule,
    ContractsModule,
    ContractTemplatesModule,
    FinanceModule,
    ExpensesModule,
    UsersModule,
    HrModule,
    PayrollModule,
    HomeworkModule,
    BehaviorModule,
    CoinsModule,
    NotificationsModule,
    WebhooksModule,
    GradesModule,
    AttendanceModule,
    PortalModule,
    EsmaktabModule,
    PaymentsModule,
    DebtorsModule,
    CounterpartiesModule,
    FlowAccountsModule,
    InternalTransfersModule,
    // Barcha asosiy modullar ulandi 🎉
    // GradesModule, AttendanceModule, HomeworkModule, BehaviorModule,
    // NotificationsModule, TelegramModule, EsmaktabModule, ReportsModule
  ],
  providers: [
    // Rate limiting butun API bo'yicha ishlaydi (ilgari guard ro'yxatdan
    // o'tmagani uchun ThrottlerModule amalda hech narsa qilmayotgan edi).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
