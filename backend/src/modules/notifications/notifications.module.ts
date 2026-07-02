import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TelegramService } from './telegram.service';
import { SmsService } from './sms.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, TelegramService, SmsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
