import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransferDto } from './dto/transfer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  // ---- Kassalar ----
  @Get('accounts')
  @Permissions('finance.view')
  listAccounts() {
    return this.service.listAccounts();
  }

  @Post('accounts')
  @Permissions('finance.create')
  createAccount(@Body() dto: CreateAccountDto) {
    return this.service.createAccount(dto);
  }

  // ---- Kategoriyalar ----
  @Get('categories')
  @Permissions('finance.view')
  listCategories(@Query('type') type?: string) {
    return this.service.listCategories(type);
  }

  @Post('categories')
  @Permissions('finance.create')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.service.createCategory(dto);
  }

  // ---- Tranzaksiyalar ----
  @Get('transactions')
  @Permissions('finance.view')
  listTransactions(
    @Query('type') type?: string,
    @Query('accountId') accountId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.listTransactions({ type, accountId, from, to });
  }

  @Post('transactions')
  @Permissions('finance.create')
  createTransaction(@Body() dto: CreateTransactionDto) {
    return this.service.createTransaction(dto);
  }

  // ---- Ichki o'tkazma ----
  @Post('transfer')
  @Permissions('finance.create')
  transfer(@Body() dto: TransferDto) {
    return this.service.transfer(dto);
  }

  // ---- Hisobotlar ----
  @Get('summary')
  @Permissions('finance.view')
  summary() {
    return this.service.summary();
  }

  @Get('cash-flow')
  @Permissions('finance.view')
  cashFlow(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.cashFlow(from, to);
  }
}
