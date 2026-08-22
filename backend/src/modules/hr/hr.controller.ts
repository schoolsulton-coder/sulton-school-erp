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

  @Get('xodimlar')
  @Permissions('hr.view')
  xodimlar(@Query('search') search?: string, @Query('branchId') branchId?: string) {
    return this.service.xodimlar({ search, branchId });
  }

  @Get('lavozimlar')
  @Permissions('hr.view')
  lavozimlar(
    @Query('search') search?: string,
    @Query('branchId') branchId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.lavozimlar({ search, branchId, departmentId, status });
  }

  @Get('shartnomalar')
  @Permissions('hr.view')
  shartnomalar(
    @Query('search') search?: string,
    @Query('branchId') branchId?: string,
    @Query('type') type?: string,
    @Query('employment') employment?: string,
  ) {
    return this.service.shartnomalar({ search, branchId, type, employment });
  }

  @Post('shartnomalar')
  @Permissions('hr.create')
  createShartnoma(@Body() dto: any) {
    return this.service.createShartnoma(dto);
  }

  @Get('tolovlar')
  @Permissions('hr.view')
  tolovlar(
    @Query('search') search?: string,
    @Query('branchId') branchId?: string,
    @Query('kassa') kassa?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.service.tolovlar({ search, branchId, kassa, year, month });
  }

  @Post('tolovlar')
  @Permissions('payroll.create')
  createTolov(@Body() dto: any) {
    return this.service.createTolov(dto);
  }

  @Get('oylik-status')
  @Permissions('hr.view')
  oylikStatus(@Query('employeeId') employeeId: string, @Query('period') period: string) {
    return this.service.oylikStatus(employeeId, period);
  }

  // ---- Oylik hisob ----
  @Get('oylik-preview')
  @Permissions('hr.view')
  oylikPreview(@Query('period') period: string, @Query('branchId') branchId?: string, @Query('departmentId') departmentId?: string) {
    return this.service.oylikPreview({ period, branchId, departmentId });
  }

  @Post('oylik/hisoblash')
  @Permissions('payroll.create')
  oylikHisoblash(@Body() dto: { period: string; branchId?: string; departmentId?: string; ishchiKunlar?: number; employeeIds?: string[] }) {
    return this.service.oylikHisoblash(dto);
  }

  @Get('oylik')
  @Permissions('hr.view')
  oylikList(@Query('period') period: string, @Query('branchId') branchId?: string, @Query('search') search?: string) {
    return this.service.oylikList({ period, branchId, search });
  }

  @Get('oylik/:id')
  @Permissions('hr.view')
  oylikDetail(@Param('id') id: string) {
    return this.service.oylikDetail(id);
  }

  @Post('oylik/:id/confirm')
  @Permissions('payroll.create')
  oylikConfirm(@Param('id') id: string, @Body('confirm') confirm?: boolean) {
    return this.service.oylikConfirm(id, confirm !== false);
  }

  @Get('oylik-10')
  @Permissions('hr.view')
  oylik10(@Query('academicYear') academicYear: string, @Query('branchId') branchId?: string) {
    return this.service.oylik10(academicYear, branchId);
  }

  @Get('maosh-umumiy')
  @Permissions('hr.view')
  umumiy(@Query('period') period: string, @Query('branchId') branchId?: string) {
    return this.service.umumiy(period, branchId);
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
