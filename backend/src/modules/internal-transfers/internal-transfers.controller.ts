import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InternalTransfersService } from './internal-transfers.service';
import { CreateInternalTransferDto } from './dto/create-internal-transfer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('internal-transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('internal-transfers')
export class InternalTransfersController {
  constructor(private readonly service: InternalTransfersService) {}

  @Get()
  @Permissions('finance.view')
  list(
    @Query('kind') kind?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.service.list({ kind: kind || 'SOM', from, to, search, branchId });
  }

  @Get(':id')
  @Permissions('finance.view')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Post()
  @Permissions('finance.create')
  create(@Body() dto: CreateInternalTransferDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Post(':id/confirm')
  @Permissions('finance.create')
  confirm(@Param('id') id: string, @CurrentUser('id') userId: string, @Body('confirm') confirm?: boolean) {
    return this.service.confirm(id, userId, confirm !== false);
  }

  @Delete(':id')
  @Permissions('finance.create')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
