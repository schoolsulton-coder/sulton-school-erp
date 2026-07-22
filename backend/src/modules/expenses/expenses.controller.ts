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
import { ExpensesService } from './expenses.service';
import {
  BulkExpenseLinesDto,
  CreateExpenseDto,
  CreateExpensePaymentDto,
  CreateSupplierDto,
  ExpenseLineDto,
  UpdateExpenseDto,
} from './dto/expense.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  // ---- Ta'minotchilar ----
  @Get('suppliers')
  @Permissions('finance.view')
  listSuppliers(@Query('branchId') branchId?: string) {
    return this.service.listSuppliers(branchId);
  }

  @Get('suppliers/balances')
  @Permissions('finance.view')
  supplierBalances(@Query('branchId') branchId?: string, @Query('search') search?: string) {
    return this.service.supplierBalances({ branchId, search });
  }

  @Get('suppliers/:id')
  @Permissions('finance.view')
  supplierDetail(
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.supplierDetail(id, { search, branchId, from, to });
  }

  @Post('suppliers')
  @Permissions('finance.create')
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.service.createSupplier(dto);
  }

  @Patch('suppliers/:id')
  @Permissions('finance.update')
  updateSupplier(@Param('id') id: string, @Body() dto: CreateSupplierDto) {
    return this.service.updateSupplier(id, dto);
  }

  @Delete('suppliers/:id')
  @Permissions('finance.update')
  removeSupplier(@Param('id') id: string) {
    return this.service.removeSupplier(id);
  }

  // ---- Xarajatlar ----
  @Get()
  @Permissions('finance.view')
  list(
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('academicYear') academicYear?: string,
  ) {
    return this.service.list({ status, branchId, supplierId, search, from, to, academicYear });
  }

  @Get(':id')
  @Permissions('finance.view')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  @Permissions('finance.create')
  create(@Body() dto: CreateExpenseDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions('finance.update')
  update(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('finance.update')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // ---- Line'lar ----
  @Post(':id/lines')
  @Permissions('finance.update')
  addLine(@Param('id') id: string, @Body() dto: ExpenseLineDto) {
    return this.service.addLine(id, dto);
  }

  @Post(':id/lines/bulk')
  @Permissions('finance.update')
  addLinesBulk(@Param('id') id: string, @Body() dto: BulkExpenseLinesDto) {
    return this.service.addLinesBulk(id, dto);
  }

  @Patch('lines/:lineId')
  @Permissions('finance.update')
  updateLine(@Param('lineId') lineId: string, @Body() dto: ExpenseLineDto) {
    return this.service.updateLine(lineId, dto);
  }

  @Delete('lines/:lineId')
  @Permissions('finance.update')
  removeLine(@Param('lineId') lineId: string) {
    return this.service.removeLine(lineId);
  }

  // ---- To'lovlar ----
  @Post(':id/payments')
  @Permissions('finance.update')
  addPayment(@Param('id') id: string, @Body() dto: CreateExpensePaymentDto) {
    return this.service.addPayment(id, dto);
  }

  @Patch('payments/:paymentId')
  @Permissions('finance.update')
  updatePayment(@Param('paymentId') paymentId: string, @Body() dto: CreateExpensePaymentDto) {
    return this.service.updatePayment(paymentId, dto);
  }

  @Delete('payments/:paymentId')
  @Permissions('finance.update')
  removePayment(@Param('paymentId') paymentId: string) {
    return this.service.removePayment(paymentId);
  }
}
