import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HomeworkService } from './homework.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { SubmitHomeworkDto } from './dto/submit-homework.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('homework')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('homework')
export class HomeworkController {
  constructor(private readonly service: HomeworkService) {}

  @Get()
  @Permissions('homework.view')
  findAll(
    @Query('classId') classId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('teacherId') teacherId?: string,
  ) {
    return this.service.findAll({ classId, subjectId, teacherId });
  }

  @Get(':id')
  @Permissions('homework.view')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('homework.create')
  create(@CurrentUser('id') teacherId: string, @Body() dto: CreateHomeworkDto) {
    return this.service.create(teacherId, dto);
  }

  // Topshirish (ustoz/admin qayd etadi; o'quvchi portali keyin)
  @Post(':id/submit')
  @Permissions('homework.update')
  submit(@Param('id') id: string, @Body() dto: SubmitHomeworkDto) {
    return this.service.submit(id, dto);
  }

  @Patch('submissions/:submissionId/grade')
  @Permissions('homework.update')
  grade(
    @Param('submissionId') submissionId: string,
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.service.grade(submissionId, dto);
  }

  @Post('mark-overdue')
  @Permissions('homework.update')
  markOverdue() {
    return this.service.markOverdue();
  }
}
