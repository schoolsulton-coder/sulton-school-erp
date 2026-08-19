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
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('flow-accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('flow-accounts')
export class FlowAccountsController {
  constructor(private readonly service: FlowAccountsService) {}

  @Get()
  @Permissions('finance.view')
  list(
    @Query('branchId') branchId?: string,
    @Query('currency') currency?: string,
    @Query('userId') userId?: string,
    @Query('active') active?: string,
  ) {
    return this.service.list({
      branchId,
      currency,
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
