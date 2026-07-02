import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PortalService } from './portal.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * O'quvchi va vasiy portali — self-service.
 * Ruxsat permission'ga emas, balki foydalanuvchining o'z bog'liqligiga asoslanadi
 * (faqat JwtAuthGuard; ma'lumot servis ichida o'z farzandi bilan cheklanadi).
 */
@ApiTags('portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('portal')
export class PortalController {
  constructor(private readonly service: PortalService) {}

  @Get('overview')
  overview(@CurrentUser('id') userId: string) {
    return this.service.overview(userId);
  }

  @Get('student/:studentId')
  detail(
    @CurrentUser('id') userId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.service.studentDetail(userId, studentId);
  }
}
