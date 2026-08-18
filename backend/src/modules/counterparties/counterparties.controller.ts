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
      filiallararo:
        filiallararo === 'true' ? true : filiallararo === 'false' ? false : undefined,
    });
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
  addEntry(@Param('id') id: string, @Body() dto: CreateEntryDto) {
    return this.service.addEntry(id, dto);
  }

  @Post('transfer/create')
  @Permissions('finance.create')
  transfer(@Body() dto: CreateTransferDto) {
    return this.service.transfer(dto);
  }

  @Delete(':id')
  @Permissions('finance.create')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
