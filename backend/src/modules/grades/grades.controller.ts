import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GradesService } from './grades.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { BulkGradeDto } from './dto/bulk-grade.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('grades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('grades')
export class GradesController {
  constructor(private readonly service: GradesService) {}

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
  ) {
    return this.service.classGradebook(classId, subjectId);
  }

  @Post()
  @Permissions('grades.create')
  create(@CurrentUser('id') teacherId: string, @Body() dto: CreateGradeDto) {
    return this.service.create(teacherId, dto);
  }

  @Post('bulk')
  @Permissions('grades.create')
  bulk(@CurrentUser('id') teacherId: string, @Body() dto: BulkGradeDto) {
    return this.service.bulkCreate(teacherId, dto);
  }

  @Delete(':id')
  @Permissions('grades.delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
