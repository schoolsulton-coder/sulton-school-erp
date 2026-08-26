import { Module } from '@nestjs/common';
import { BehaviorService } from './behavior.service';
import { BehaviorController } from './behavior.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [BehaviorController],
  providers: [BehaviorService],
  exports: [BehaviorService],
})
export class BehaviorModule {}
