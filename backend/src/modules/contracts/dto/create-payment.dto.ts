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
  accountId?: string; // qaysi kassaga tushishi (bo'sh bo'lsa kassaga urilmaydi)

  @IsOptional()
  @IsString()
  note?: string;
}
