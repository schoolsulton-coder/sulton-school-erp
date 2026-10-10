import { Module } from '@nestjs/common';
import { DailyTasksService } from './daily-tasks.service';
import { DailyTasksController } from './daily-tasks.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [DailyTasksController],
  providers: [DailyTasksService],
  exports: [DailyTasksService],
})
export class DailyTasksModule {}
