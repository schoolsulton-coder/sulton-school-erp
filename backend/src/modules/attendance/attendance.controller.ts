import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Post('mark')
  @Permissions('attendance.create')
  mark(@Body() dto: MarkAttendanceDto) {
    return this.service.markClass(dto);
  }

  @Get('class/:classId')
  @Permissions('attendance.view')
  classDay(@Param('classId') classId: string, @Query('date') date?: string) {
    return this.service.classDay(classId, date);
  }

  @Get('class/:classId/stats')
  @Permissions('attendance.view')
  classStats(
    @Param('classId') classId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.classStats(classId, from, to);
  }

  @Get('student/:studentId')
  @Permissions('attendance.view')
  studentReport(
    @Param('studentId') studentId: string,
    @Query('month') month?: string,
  ) {
    return this.service.studentReport(studentId, month);
  }
}
