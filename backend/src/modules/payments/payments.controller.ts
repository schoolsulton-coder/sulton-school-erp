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
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get()
  @Permissions('contracts.view')
  list(
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('method') method?: string,
    @Query('type') type?: string,
    @Query('accountId') accountId?: string,
    @Query('confirmed') confirmed?: string,
    @Query('branchId') branchId?: string,
    @Query('academicYear') academicYear?: string,
    @Query('studentId') studentId?: string,
  ) {
    return this.service.list({
      search,
      from,
      to,
      method,
      type,
      accountId,
      confirmed,
      branchId,
      academicYear,
      studentId,
    });
  }

  @Get('student/:studentId/schedule')
  @Permissions('contracts.view')
  schedule(@Param('studentId') studentId: string) {
    return this.service.studentSchedule(studentId);
  }

  @Get(':id')
  @Permissions('contracts.view')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  @Permissions('contracts.create')
  create(@Body() dto: CreatePaymentDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Patch(':id/confirm')
  @Permissions('contracts.update')
  confirm(
    @Param('id') id: string,
    @Body('date') date: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.confirm(id, date, userId);
  }

  @Patch(':id')
  @Permissions('contracts.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.update(id, dto, userId);
  }

  @Delete(':id')
  @Permissions('contracts.delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
