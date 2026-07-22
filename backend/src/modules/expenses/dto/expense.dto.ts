import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExpenseDto {
  @IsString() @IsNotEmpty() supplierId: string;
  @IsString() @IsNotEmpty() branchId: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() date?: string;
  @IsOptional() @IsString() academicYear?: string;
  @IsOptional() @IsString() note?: string;
}

export class UpdateExpenseDto {
  @IsOptional() @IsString() supplierId?: string;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() date?: string;
  @IsOptional() @IsString() academicYear?: string;
  @IsOptional() @IsString() note?: string;
}

export class ExpenseLineDto {
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() subCategory?: string;
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsString() note?: string;
}

export class BulkExpenseLinesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseLineDto)
  lines: ExpenseLineDto[];
}

export class CreateExpensePaymentDto {
  @IsOptional() @IsNumber() @Min(0) amount?: number;
  @IsString() @IsNotEmpty() method: string;
  @IsOptional() @IsString() accountId?: string;
  // Dollar qismi (ixtiyoriy)
  @IsOptional() @IsNumber() @Min(0) dollarAmount?: number;
  @IsOptional() @IsNumber() @Min(0) dollarRate?: number;
  @IsOptional() @IsString() dollarMethod?: string;
  @IsOptional() @IsString() dollarAccountId?: string;
  @IsOptional() @IsString() paidAt?: string;
  @IsOptional() @IsBoolean() isRefund?: boolean;
  @IsOptional() @IsString() note?: string;
}

export class CreateSupplierDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() branchId?: string;
}
