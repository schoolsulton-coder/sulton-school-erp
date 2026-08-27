import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RegistersService } from './registers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('registers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance/registers')
export class RegistersController {
  constructor(private readonly service: RegistersService) {}

  @Get()
  @Permissions('finance.view')
  list(
    @CurrentUser() user: any,
    @Query('type') type?: string,
    @Query('branchId') branchId?: string,
    @Query('active') active?: string,
    @Query('kassaTuri') kassaTuri?: string,
    @Query('currency') currency?: string,
    @Query('mine') mine?: string,
    @Query('asOf') asOf?: string,
  ) {
    return this.service.list({
      type,
      branchId,
      active,
      kassaTuri,
      currency,
      mine,
      asOf,
      userId: user?.id,
    });
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

  /** Balans-tekshiruv: ?mode=check (hisobot) | adopt (baseline) | apply (to'g'rilash) */
  @Post('reconcile')
  @Permissions('finance.create')
  reconcile(@Query('mode') mode?: string) {
    const m = mode === 'adopt' || mode === 'apply' ? mode : 'check';
    return this.service.reconcile(m);
  }
}
