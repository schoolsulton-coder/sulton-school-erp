import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CounterpartiesService } from './counterparties.service';
import { CreateCounterpartyDto } from './dto/create-counterparty.dto';
import { CreateEntryDto } from './dto/create-entry.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('counterparties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('counterparties')
export class CounterpartiesController {
  constructor(private readonly service: CounterpartiesService) {}

  @Get()
  @Permissions('finance.view')
  list(
    @Query('category') category?: string,
    @Query('branchId') branchId?: string,
    @Query('search') search?: string,
    @Query('filiallararo') filiallararo?: string,
  ) {
    return this.service.list({
      category,
      branchId,
      search,
      filiallararo: filiallararo === 'true' ? true : filiallararo === 'false' ? false : undefined,
    });
  }

  @Get('entries')
  @Permissions('finance.view')
  entries(
    @Query('scope') scope?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.service.entries({
      scope: scope === 'INVESTITSIYA' ? 'INVESTITSIYA' : 'OLDI_BERDI',
      from,
      to,
      search,
      branchId,
    });
  }

  @Get('entries/:id')
  @Permissions('finance.view')
  entryDetail(@Param('id') id: string) {
    return this.service.entryDetail(id);
  }

  @Get('transfers')
  @Permissions('finance.view')
  transfers(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.service.transfers({ from, to, search, branchId });
  }

  @Get('transfers/:pairId')
  @Permissions('finance.view')
  transferDetail(@Param('pairId') pairId: string) {
    return this.service.transferDetail(pairId);
  }

  @Get(':id/detail')
  @Permissions('finance.view')
  detail(@Param('id') id: string) {
    return this.service.counterpartyDetail(id);
  }

  @Get(':id')
  @Permissions('finance.view')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  @Permissions('finance.create')
  create(@Body() dto: CreateCounterpartyDto) {
    return this.service.create(dto);
  }

  @Post(':id/entries')
  @Permissions('finance.create')
  addEntry(@Param('id') id: string, @Body() dto: CreateEntryDto, @CurrentUser('id') userId: string) {
    return this.service.addEntry(id, dto, userId);
  }

  @Post('transfer/create')
  @Permissions('finance.create')
  transfer(@Body() dto: CreateTransferDto, @CurrentUser('id') userId: string) {
    return this.service.transfer(dto, userId);
  }

  @Post('transfers/:pairId/confirm')
  @Permissions('finance.create')
  confirmTransfer(
    @Param('pairId') pairId: string,
    @Body('confirm') confirm: boolean | undefined,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.confirmTransfer(pairId, userId, confirm !== false);
  }

  @Delete('entries/:id')
  @Permissions('finance.create')
  removeEntry(@Param('id') id: string) {
    return this.service.removeEntry(id);
  }

  @Delete('transfers/:pairId')
  @Permissions('finance.create')
  removeTransfer(@Param('pairId') pairId: string) {
    return this.service.removeTransfer(pairId);
  }

  @Delete(':id')
  @Permissions('finance.create')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
