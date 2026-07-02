import { Module } from '@nestjs/common';
import { PortalService } from './portal.service';
import { PortalController } from './portal.controller';
import { GradesModule } from '../grades/grades.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { BehaviorModule } from '../behavior/behavior.module';

@Module({
  imports: [GradesModule, AttendanceModule, BehaviorModule],
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}
