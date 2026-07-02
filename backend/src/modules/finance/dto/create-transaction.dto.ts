import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTransactionDto {
  // TRANSFER bu yerda emas — /finance/transfer ishlatiladi
  @IsEnum(['INCOME', 'EXPENSE', 'INVESTMENT'])
  type: 'INCOME' | 'EXPENSE' | 'INVESTMENT';

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
