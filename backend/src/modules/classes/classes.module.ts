import { Module } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';

@Module({
  controllers: [ClassesController, ScheduleController],
  providers: [ClassesService, ScheduleService],
  exports: [ClassesService, ScheduleService],
})
export class ClassesModule {}
