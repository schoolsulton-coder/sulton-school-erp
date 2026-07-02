import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('schedule')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class ScheduleController {
  constructor(private readonly service: ScheduleService) {}

  // ---- Fanlar ----
  @Get('subjects')
  @Permissions('classes.view')
  listSubjects() {
    return this.service.listSubjects();
  }

  @Post('subjects')
  @Permissions('classes.create')
  createSubject(@Body() dto: CreateSubjectDto) {
    return this.service.createSubject(dto);
  }

  // ---- Jadval ----
  @Get('classes/:classId/schedule')
  @Permissions('classes.view')
  byClass(@Param('classId') classId: string) {
    return this.service.byClass(classId);
  }

  @Post('schedule')
  @Permissions('classes.update')
  create(@Body() dto: CreateScheduleDto) {
    return this.service.create(dto);
  }

  @Delete('schedule/:id')
  @Permissions('classes.update')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
