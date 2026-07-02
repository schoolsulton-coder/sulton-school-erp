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
import { HrService } from './hr.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreatePositionDto } from './dto/create-position.dto';
import { HireEmployeeDto } from './dto/hire-employee.dto';
import { SetSalaryDto } from './dto/set-salary.dto';
import { TerminateDto } from './dto/terminate.dto';
import { AddDocumentDto } from './dto/add-document.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('hr')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('hr')
export class HrController {
  constructor(private readonly service: HrService) {}

  // ---- Bo'limlar ----
  @Get('departments')
  @Permissions('hr.view')
  listDepartments() {
    return this.service.listDepartments();
  }

  @Post('departments')
  @Permissions('hr.create')
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.service.createDepartment(dto);
  }

  // ---- Lavozimlar ----
  @Get('positions')
  @Permissions('hr.view')
  listPositions() {
    return this.service.listPositions();
  }

  @Post('positions')
  @Permissions('hr.create')
  createPosition(@Body() dto: CreatePositionDto) {
    return this.service.createPosition(dto);
  }

  // ---- Xodimlar ----
  @Get('employees')
  @Permissions('hr.view')
  listEmployees(
    @Query('status') status?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.service.listEmployees({ status, departmentId });
  }

  @Get('employees/:id')
  @Permissions('hr.view')
  getEmployee(@Param('id') id: string) {
    return this.service.getEmployee(id);
  }

  @Post('employees')
  @Permissions('hr.create')
  hire(@Body() dto: HireEmployeeDto) {
    return this.service.hire(dto);
  }

  @Patch('employees/:id/salary')
  @Permissions('hr.update')
  setSalary(@Param('id') id: string, @Body() dto: SetSalaryDto) {
    return this.service.setSalary(id, dto);
  }

  @Patch('employees/:id/terminate')
  @Permissions('hr.update')
  terminate(@Param('id') id: string, @Body() dto: TerminateDto) {
    return this.service.terminate(id, dto);
  }

  @Post('employees/:id/documents')
  @Permissions('hr.update')
  addDocument(@Param('id') id: string, @Body() dto: AddDocumentDto) {
    return this.service.addDocument(id, dto);
  }
}
