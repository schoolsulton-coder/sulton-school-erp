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
import { CrmService } from './crm.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { MoveStageDto } from './dto/move-stage.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { MarkVisitDto } from './dto/mark-visit.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateAdmissionDto } from './dto/create-admission.dto';
import { QuickStudentDto } from './dto/quick-student.dto';
import { CreateGuardianDto } from './dto/create-guardian.dto';
import { UpdateGuardianDto } from './dto/update-guardian.dto';
import { CreateRefDto } from './dto/create-ref.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('crm')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('crm')
export class CrmController {
  constructor(private readonly service: CrmService) {}

  @Get('stages')
  @Permissions('crm.view')
  listStages() {
    return this.service.listStages();
  }

  @Get('board')
  @Permissions('crm.view')
  board(@Query('managerId') managerId?: string) {
    return this.service.board(managerId);
  }

  @Get('stats')
  @Permissions('crm.view')
  stats() {
    return this.service.stats();
  }

  @Get('cohort')
  @Permissions('crm.view')
  cohort() {
    return this.service.cohort();
  }

  // ---- Tashriflar (rejadagi / real) ----
  @Get('visits')
  @Permissions('crm.view')
  visits(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('filial') filial?: string,
    @Query('from') from?: string,
  ) {
    return this.service.visits({ status, search, filial, from });
  }

  @Patch('leads/:id/visit')
  @Permissions('crm.update')
  markVisit(@Param('id') id: string, @Body() dto: MarkVisitDto) {
    return this.service.markVisit(id, dto.status, dto.visitedAt);
  }

  // ---- Yillik taqqoslash ----
  @Get('yearly')
  @Permissions('crm.view')
  yearly() {
    return this.service.yearly();
  }

  // ---- Vasiylar ----
  @Get('guardians')
  @Permissions('crm.view')
  guardians() {
    return this.service.guardians();
  }

  // ---- Qabul rejasi ----
  @Get('admission-plans')
  @Permissions('crm.view')
  listPlans(@Query('academicYear') academicYear?: string) {
    return this.service.listPlans(academicYear);
  }

  @Get('admission-plans/progress')
  @Permissions('crm.view')
  admissionProgress(@Query('academicYear') academicYear?: string) {
    return this.service.admissionProgress(academicYear);
  }

  @Post('admission-plans')
  @Permissions('crm.create')
  createPlan(@Body() dto: CreatePlanDto) {
    return this.service.createPlan(dto);
  }

  @Get('leads')
  @Permissions('crm.view')
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('stageId') stageId?: string,
    @Query('managerId') managerId?: string,
  ) {
    return this.service.findAll({ page, limit, search, stageId, managerId });
  }

  @Get('leads/:id')
  @Permissions('crm.view')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('leads')
  @Permissions('crm.create')
  create(@Body() dto: CreateLeadDto) {
    return this.service.create(dto);
  }

  @Patch('leads/:id')
  @Permissions('crm.update')
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.service.update(id, dto);
  }

  @Patch('leads/:id/stage')
  @Permissions('crm.update')
  moveStage(@Param('id') id: string, @Body() dto: MoveStageDto) {
    return this.service.moveStage(id, dto);
  }

  @Patch('leads/:id/assign')
  @Permissions('crm.update')
  assign(@Param('id') id: string, @Body('managerId') managerId: string) {
    return this.service.assignManager(id, managerId);
  }

  @Post('leads/:id/activities')
  @Permissions('crm.create')
  addActivity(
    @Param('id') id: string,
    @Body() dto: CreateActivityDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.addActivity(id, userId, dto);
  }

  @Patch('activities/:activityId/done')
  @Permissions('crm.update')
  completeActivity(@Param('activityId') activityId: string) {
    return this.service.completeActivity(activityId);
  }

  @Post('leads/:id/convert')
  @Permissions('crm.update')
  convert(@Param('id') id: string, @Body() dto: ConvertLeadDto) {
    return this.service.convert(id, dto);
  }

  @Delete('leads/:id')
  @Permissions('crm.delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // ---- Sozlamalar reference (Filial, Psixolog, O'quv yili) ----
  @Get('branches') @Permissions('crm.view') branches() { return this.service.branches(); }
  @Post('branches') @Permissions('crm.create') createBranch(@Body() d: CreateRefDto) { return this.service.createBranch(d.name); }
  @Get('psychologists') @Permissions('crm.view') psychologists() { return this.service.psychologists(); }
  @Post('psychologists') @Permissions('crm.create') createPsychologist(@Body() d: CreateRefDto) { return this.service.createPsychologist(d.name); }
  @Get('academic-years') @Permissions('crm.view') academicYears() { return this.service.academicYears(); }
  @Post('academic-years') @Permissions('crm.create') createAcademicYear(@Body() d: CreateRefDto) { return this.service.createAcademicYear(d.name); }
  @Get('operators') @Permissions('crm.view') operators() { return this.service.operators(); }

  // ---- Yangi qabul formasi yordamchilari ----
  @Get('classes-form')
  @Permissions('crm.view')
  classesForm(@Query('academicYear') y?: string, @Query('branchId') b?: string) {
    return this.service.classesForm(y, b);
  }

  @Get('students/search')
  @Permissions('crm.view')
  searchStudents(
    @Query('q') q: string,
    @Query('academicYear') academicYear?: string,
  ) {
    return this.service.searchStudents(q, academicYear);
  }

  @Get('guardians/search')
  @Permissions('crm.view')
  searchGuardians(@Query('q') q?: string) {
    return this.service.searchGuardians(q);
  }

  @Post('guardians')
  @Permissions('crm.create')
  createGuardian(@Body() dto: CreateGuardianDto) {
    return this.service.createGuardian(dto);
  }

  @Get('guardians/:id')
  @Permissions('crm.view')
  guardian(@Param('id') id: string) {
    return this.service.guardian(id);
  }

  @Patch('guardians/:id')
  @Permissions('crm.update')
  updateGuardian(@Param('id') id: string, @Body() dto: UpdateGuardianDto) {
    return this.service.updateGuardian(id, dto);
  }

  @Post('students/quick')
  @Permissions('crm.create')
  quickStudent(@Body() dto: QuickStudentDto) {
    return this.service.quickCreateStudent(dto);
  }

  @Get('admissions')
  @Permissions('crm.view')
  admissionsList(
    @Query('search') search?: string,
    @Query('academicYear') academicYear?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.service.admissionsList({ search, academicYear, branchId });
  }

  @Post('admissions')
  @Permissions('crm.create')
  createAdmission(@Body() dto: CreateAdmissionDto) {
    return this.service.createAdmission(dto);
  }
}
