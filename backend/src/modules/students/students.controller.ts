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
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { AddGuardianDto } from './dto/add-guardian.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly service: StudentsService) {}

  @Get()
  @Permissions('students.view')
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('classId') classId?: string,
    @Query('status') status?: string,
    @Query('academicYear') academicYear?: string,
  ) {
    return this.service.findAll({ page, limit, search, classId, status, academicYear });
  }

  @Get(':id')
  @Permissions('students.view')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('students.create')
  create(@Body() dto: CreateStudentDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions('students.update')
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('students.delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // ---- Vasiylar ----
  @Post(':id/guardians')
  @Permissions('students.update')
  addGuardian(@Param('id') id: string, @Body() dto: AddGuardianDto) {
    return this.service.addGuardian(id, dto);
  }

  @Delete(':id/guardians/:guardianId')
  @Permissions('students.update')
  removeGuardian(
    @Param('id') id: string,
    @Param('guardianId') guardianId: string,
  ) {
    return this.service.removeGuardian(id, guardianId);
  }

  // ---- Portal login akkauntlari ----
  @Post(':id/account')
  @Permissions('students.update')
  createStudentAccount(@Param('id') id: string, @Body() dto: CreateAccountDto) {
    return this.service.createStudentAccount(id, dto);
  }

  @Post('guardians/:guardianId/account')
  @Permissions('students.update')
  createGuardianAccount(
    @Param('guardianId') guardianId: string,
    @Body() dto: CreateAccountDto,
  ) {
    return this.service.createGuardianAccount(guardianId, dto);
  }
}
