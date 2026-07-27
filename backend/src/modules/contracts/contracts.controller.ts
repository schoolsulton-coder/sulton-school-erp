import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { UpdateInstallmentDto } from './dto/update-installment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  // ---- Chegirmalar ----
  @Get('discounts')
  @Permissions('contracts.view')
  listDiscounts() {
    return this.service.listDiscounts();
  }

  @Post('discounts')
  @Permissions('contracts.create')
  createDiscount(@Body() dto: CreateDiscountDto) {
    return this.service.createDiscount(dto);
  }

  // ---- Barcha to'lovlar ----
  @Get('payments')
  @Permissions('contracts.view')
  payments() {
    return this.service.recentPayments();
  }

  // ---- Boy ko'rinish (stat plitkalar + qatorlar) ----
  @Get('overview')
  @Permissions('contracts.view')
  overview() {
    return this.service.overview();
  }

  // ---- Shartnomalar ----
  @Get()
  @Permissions('contracts.view')
  findAll(
    @Query('status') status?: string,
    @Query('studentId') studentId?: string,
  ) {
    return this.service.findAll({ status, studentId });
  }

  @Get(':id')
  @Permissions('contracts.view')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('contracts.create')
  create(@Body() dto: CreateContractDto) {
    return this.service.create(dto);
  }

  @Post(':id/payments')
  @Permissions('contracts.update')
  addPayment(@Param('id') id: string, @Body() dto: CreatePaymentDto) {
    return this.service.addPayment(id, dto);
  }

  @Patch(':id/cancel')
  @Permissions('contracts.update')
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }

  // ---- Tahrirlash / o'chirish ----
  @Patch(':id')
  @Permissions('contracts.update')
  update(@Param('id') id: string, @Body() dto: UpdateContractDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('contracts.delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Patch(':id/installments/:instId')
  @Permissions('contracts.update')
  updateInstallment(
    @Param('id') id: string,
    @Param('instId') instId: string,
    @Body() dto: UpdateInstallmentDto,
  ) {
    return this.service.updateInstallment(id, instId, dto);
  }

  @Delete(':id/installments/:instId')
  @Permissions('contracts.delete')
  removeInstallment(
    @Param('id') id: string,
    @Param('instId') instId: string,
  ) {
    return this.service.removeInstallment(id, instId);
  }

  @Post('mark-overdue')
  @Permissions('contracts.update')
  markOverdue() {
    return this.service.markOverdue();
  }

  // ---- PDF yuklab olish / chop etish ----
  @Get(':id/pdf')
  @Permissions('contracts.view')
  async pdf(@Param('id') id: string, @Res() res: Response) {
    const { buffer, number } = await this.service.generatePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${number}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
