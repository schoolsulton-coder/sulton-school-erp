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
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { AssignStudentsDto } from './dto/assign-students.dto';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly service: ClassesService) {}

  @Get()
  @Permissions('classes.view')
  findAll(@Query('academicYear') academicYear?: string) {
    return this.service.findAll(academicYear);
  }

  @Get(':id')
  @Permissions('classes.view')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('classes.create')
  create(@Body() dto: CreateClassDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions('classes.update')
  update(@Param('id') id: string, @Body() dto: UpdateClassDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('classes.delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // ---- O'quvchilar ----
  @Post(':id/students')
  @Permissions('classes.update')
  assignStudents(@Param('id') id: string, @Body() dto: AssignStudentsDto) {
    return this.service.assignStudents(id, dto);
  }

  @Delete(':id/students/:studentId')
  @Permissions('classes.update')
  removeStudent(@Param('id') id: string, @Param('studentId') studentId: string) {
    return this.service.removeStudent(id, studentId);
  }

  // ---- Ustoz / kurator ----
  @Post(':id/teachers')
  @Permissions('classes.update')
  assignTeacher(@Param('id') id: string, @Body() dto: AssignTeacherDto) {
    return this.service.assignTeacher(id, dto);
  }

  @Delete(':id/teachers/:teacherId')
  @Permissions('classes.update')
  removeTeacher(@Param('id') id: string, @Param('teacherId') teacherId: string) {
    return this.service.removeTeacher(id, teacherId);
  }
}
