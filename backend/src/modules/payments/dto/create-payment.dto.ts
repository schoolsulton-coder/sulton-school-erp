import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AllocationDto {
  @IsString()
  @IsNotEmpty()
  installmentId: string;

  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreatePaymentDto {
  @IsOptional()
  @IsString()
  contractId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsNumber()
  @Min(1)
  @Max(1_000_000_000) // xato terishdan himoya (1 mlrd so'm)
  amount: number;

  @IsString()
  method: string; // Naqd, Bank, Karta

  @IsOptional()
  @IsString()
  type?: string; // Click, Payme, Terminal...

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  cardLast4?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  isRefund?: boolean;

  @IsOptional()
  @IsDateString()
  confirmedAt?: string;

  /** Oylarga qo'lda taqsimlash (bo'lmasa — eng eskisidan avtomatik) */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AllocationDto)
  allocations?: AllocationDto[];
}
