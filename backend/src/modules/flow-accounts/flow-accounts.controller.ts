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
import { FlowAccountsService } from './flow-accounts.service';
import { CreateFlowAccountDto, UpdateFlowAccountDto } from './dto/flow-account.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  Permissions,
  PermissionsAny,
} from '../../common/decorators/permissions.decorator';

@ApiTags('flow-accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('flow-accounts')
export class FlowAccountsController {
  constructor(private readonly service: FlowAccountsService) {}

  @Get()
  // Kassa ro'yxatini to'lov kirituvchi ham o'qiy olishi kerak (Administrator —
  // contracts.view). Yaratish/tahrirlash esa faqat moliya ruxsati bilan.
  @PermissionsAny('finance.view', 'contracts.view')
  list(
    @Query('branchId') branchId?: string,
    @Query('currency') currency?: string,
    @Query('kassaTuri') kassaTuri?: string,
    @Query('userId') userId?: string,
    @Query('active') active?: string,
  ) {
    return this.service.list({
      branchId,
      currency,
      kassaTuri,
      userId,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }

  @Post()
  @Permissions('finance.create')
  create(@Body() dto: CreateFlowAccountDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions('finance.create')
  update(@Param('id') id: string, @Body() dto: UpdateFlowAccountDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('finance.create')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
