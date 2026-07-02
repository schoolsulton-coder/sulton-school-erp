import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { EsmaktabService } from './esmaktab.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@ApiTags('esmaktab')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('esmaktab')
export class EsmaktabController {
  constructor(private readonly service: EsmaktabService) {}

  private xlsx(res: Response, buffer: Buffer, name: string) {
    res.set({
      'Content-Type': XLSX,
      'Content-Disposition': `attachment; filename="${name}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('export/students')
  @Permissions('reports.view')
  async students(@Res() res: Response, @Query('classId') classId?: string) {
    const buffer = await this.service.exportStudents(classId);
    this.xlsx(res, buffer, 'oquvchilar');
  }

  @Get('export/grades')
  @Permissions('reports.view')
  async grades(
    @Res() res: Response,
    @Query('classId') classId: string,
    @Query('period') period?: string,
  ) {
    const buffer = await this.service.exportGrades(classId, period);
    this.xlsx(res, buffer, 'baholar');
  }

  @Get('export/attendance')
  @Permissions('reports.view')
  async attendance(
    @Res() res: Response,
    @Query('classId') classId: string,
    @Query('month') month?: string,
  ) {
    const buffer = await this.service.exportAttendance(classId, month);
    this.xlsx(res, buffer, 'davomat');
  }

  @Post('sync')
  @Permissions('reports.view')
  sync(@Body('entity') entity: string) {
    return this.service.sync(entity ?? 'students');
  }

  @Get('logs')
  @Permissions('reports.view')
  logs() {
    return this.service.logs();
  }

  @Get('status')
  @Permissions('reports.view')
  status() {
    return this.service.status();
  }
}
