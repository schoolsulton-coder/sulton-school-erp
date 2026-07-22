import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { CreateNormDto } from './dto/create-norm.dto';
import { BulkScheduleDto } from './dto/bulk-schedule.dto';
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

  @Patch('subjects/:id')
  @Permissions('classes.update')
  updateSubject(@Param('id') id: string, @Body() dto: CreateSubjectDto) {
    return this.service.updateSubject(id, dto);
  }

  @Delete('subjects/:id')
  @Permissions('classes.update')
  removeSubject(@Param('id') id: string) {
    return this.service.removeSubject(id);
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

  @Get('schedule/availability')
  @Permissions('classes.view')
  availability(
    @Query('classId') classId: string,
    @Query('teacherId') teacherId?: string,
  ) {
    return this.service.availability(classId, teacherId);
  }

  @Post('schedule/bulk')
  @Permissions('classes.update')
  bulkCreate(@Body() dto: BulkScheduleDto) {
    return this.service.bulkCreate(dto);
  }

  @Patch('schedule/:id')
  @Permissions('classes.update')
  update(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.service.update(id, dto);
  }

  @Delete('schedule/:id')
  @Permissions('classes.update')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // ---- Fan normasi (haftalik soat) ----
  @Get('classes/:classId/norms')
  @Permissions('classes.view')
  norms(@Param('classId') classId: string) {
    return this.service.norms(classId);
  }

  @Post('classes/:classId/norms')
  @Permissions('classes.update')
  upsertNorm(@Param('classId') classId: string, @Body() dto: CreateNormDto) {
    return this.service.upsertNorm(classId, dto);
  }

  @Delete('norms/:id')
  @Permissions('classes.update')
  removeNorm(@Param('id') id: string) {
    return this.service.removeNorm(id);
  }
}
