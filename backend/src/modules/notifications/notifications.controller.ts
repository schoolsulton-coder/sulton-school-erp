import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  // O'z bildirishnomalari (portal in-app uchun) — permission shart emas
  @Get('me')
  mine(@CurrentUser('id') userId: string) {
    return this.service.listMine(userId);
  }

  @Get()
  @Permissions('notifications.view')
  recent() {
    return this.service.recent();
  }

  @Get('status')
  @Permissions('notifications.view')
  status() {
    return this.service.status();
  }

  // Test xabar (admin) — userId yoki studentId orqali
  @Post('test')
  @Permissions('notifications.view')
  async test(
    @Body() body: { userId?: string; studentId?: string; title?: string; message: string },
  ) {
    const title = body.title ?? 'Test';
    if (body.studentId) {
      await this.service.notifyGuardians(body.studentId, title, body.message);
    } else if (body.userId) {
      await this.service.notifyUser(body.userId, title, body.message);
    }
    return { ok: true };
  }
}
