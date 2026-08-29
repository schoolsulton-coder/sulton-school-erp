import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsNotEmpty()
  method: string; // naqd, plastik, click, payme

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  accountId?: string; // eski Moliya kassa (bo'sh bo'lsa kassaga urilmaydi)

  @IsOptional()
  @IsString()
  flowAccountId?: string; // «Hisoblar» bo'limidagi kassa

  @IsOptional()
  @IsString()
  note?: string;
}
