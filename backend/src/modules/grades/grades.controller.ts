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
import { GradesService } from './grades.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { BulkGradeDto } from './dto/bulk-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

type JwtUser = { id: string; role: string };

@ApiTags('grades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('grades')
export class GradesController {
  constructor(private readonly service: GradesService) {}

  // Ustoz/kurator o'z fanlari va sinflari (selektorlar uchun)
  @Get('my-subjects')
  @Permissions('grades.view')
  mySubjects(@CurrentUser() user: JwtUser) {
    return this.service.mySubjects(user);
  }

  @Get()
  @Permissions('grades.view')
  list(
    @Query('studentId') studentId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('type') type?: string,
    @Query('period') period?: string,
  ) {
    return this.service.list({ studentId, subjectId, type, period });
  }

  @Get('student/:studentId/report')
  @Permissions('grades.view')
  studentReport(@Param('studentId') studentId: string) {
    return this.service.studentReport(studentId);
  }

  @Get('class/:classId/subject/:subjectId')
  @Permissions('grades.view')
  gradebook(
    @Param('classId') classId: string,
    @Param('subjectId') subjectId: string,
    @Query('type') type?: string,
  ) {
    return this.service.classGradebook(classId, subjectId, type);
  }

  @Get('class/:classId/stats')
  @Permissions('grades.view')
  classStats(
    @Param('classId') classId: string,
    @Query('subjectId') subjectId?: string,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('period') period?: string,
  ) {
    return this.service.classStats(classId, { subjectId, type, from, to, period });
  }

  @Post()
  @Permissions('grades.create')
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateGradeDto) {
    return this.service.create(user, dto);
  }

  @Post('bulk')
  @Permissions('grades.create')
  bulk(@CurrentUser() user: JwtUser, @Body() dto: BulkGradeDto) {
    return this.service.bulkCreate(user, dto);
  }

  @Patch(':id')
  @Permissions('grades.update')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateGradeDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  @Permissions('grades.delete')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
