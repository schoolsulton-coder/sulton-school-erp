import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PortalService } from './portal.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * O'quvchi va vasiy portali — self-service.
 * Ruxsat permission'ga emas, foydalanuvchining o'z bog'liqligiga asoslanadi:
 * har bir endpoint servis ichida "bu mening farzandimmi" deb tekshiradi.
 */
@ApiTags('portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('portal')
export class PortalController {
  constructor(private readonly service: PortalService) {}

  /** Farzandlar (tanlash uchun) */
  @Get('children')
  children(@CurrentUser('id') userId: string) {
    return this.service.children(userId);
  }

  /** Farzandlar ro'yxati — qisqa ko'rsatkichlar bilan */
  @Get('overview')
  overview(@CurrentUser('id') userId: string) {
    return this.service.overview(userId);
  }

  /** Bosh sahifa — barcha bo'limlardan qisqacha */
  @Get('student/:studentId/summary')
  summary(@CurrentUser('id') userId: string, @Param('studentId') studentId: string) {
    return this.service.summary(userId, studentId);
  }

  @Get('student/:studentId/grades')
  grades(
    @CurrentUser('id') userId: string,
    @Param('studentId') studentId: string,
    @Query('period') period?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.service.grades(userId, studentId, { period, subjectId });
  }

  @Get('student/:studentId/attendance')
  attendance(
    @CurrentUser('id') userId: string,
    @Param('studentId') studentId: string,
    @Query('month') month?: string,
  ) {
    return this.service.attendance(userId, studentId, month);
  }

  @Get('student/:studentId/behavior')
  behavior(
    @CurrentUser('id') userId: string,
    @Param('studentId') studentId: string,
    @Query('month') month?: string,
  ) {
    return this.service.behavior(userId, studentId, month);
  }

  @Get('student/:studentId/homework')
  homework(@CurrentUser('id') userId: string, @Param('studentId') studentId: string) {
    return this.service.homework(userId, studentId);
  }

  @Get('student/:studentId/schedule')
  schedule(
    @CurrentUser('id') userId: string,
    @Param('studentId') studentId: string,
    @Query('weekId') weekId?: string,
  ) {
    return this.service.weekSchedule(userId, studentId, weekId);
  }

  @Get('student/:studentId/payments')
  payments(@CurrentUser('id') userId: string, @Param('studentId') studentId: string) {
    return this.service.payments(userId, studentId);
  }
}
