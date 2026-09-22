import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { DashboardService } from './dashboard.service';
import { DashboardDetailService } from './dashboard-detail.service';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly service: DashboardService,
    private readonly details: DashboardDetailService,
  ) {}

  /** CEO dashboard: bugungi holat, ogohlantirishlar, qarz muddati, davr natijasi, pul oqimi, o'quv jarayoni */
  @Get('ceo')
  @Permissions('reports.view')
  ceo(@Query('from') from?: string, @Query('to') to?: string, @Query('branchId') branchId?: string) {
    return this.service.ceo({ from, to, branchId });
  }

  /** O'quv jarayoni bo'limi — sinf filtri bilan (moliya qismi qayta hisoblanmaydi) */
  @Get('ceo/academic')
  @Permissions('reports.view')
  academic(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('branchId') branchId?: string,
    @Query('classId') classId?: string,
  ) {
    return this.service.academicScoped({ from, to, branchId, classId });
  }

  /** Karta / qator bosilganda — o'sha ko'rsatkichning yozuvlari */
  @Get('ceo/detail')
  @Permissions('reports.view')
  detail(
    @Query('kind') kind: string,
    @Query('key') key?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('branchId') branchId?: string,
    @Query('classId') classId?: string,
  ) {
    return this.details.detail(kind, { key, from, to, branchId, classId });
  }

  @Get('ceo/export')
  @Permissions('reports.view')
  async export(
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('branchId') branchId?: string,
  ) {
    const { buffer, name } = await this.service.exportXlsx({ from, to, branchId });
    res.set({
      'Content-Type': XLSX,
      'Content-Disposition': `attachment; filename="${name}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
