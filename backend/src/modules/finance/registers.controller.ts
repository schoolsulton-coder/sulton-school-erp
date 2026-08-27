import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RegistersService } from './registers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('registers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/registers')
export class RegistersController {
  constructor(private readonly service: RegistersService) {}

  @Get()
  @Permissions('finance.view')
  list(@Query('type') type?: string, @Query('branchId') branchId?: string, @Query('active') active?: string) {
    return this.service.list({ type, branchId, active });
  }

  @Get(':type/:id/detail')
  @Permissions('finance.view')
  detail(
    @Param('type') type: string,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.detail(type.toUpperCase(), id, { from, to, limit: limit ? Number(limit) : undefined });
  }
}
