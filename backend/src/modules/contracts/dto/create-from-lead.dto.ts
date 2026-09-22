import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Qabul (lead) kartasidan to'g'ridan-to'g'ri shartnoma tuzish.
 * O'quvchisi bo'lmagan lead — shu tranzaksiya ichida o'quvchiga aylantiriladi.
 */
export class CreateFromLeadDto {
  @IsDateString()
  startDate: string;

  @IsInt()
  @Min(1)
  @Max(24)
  months: number;

  @IsNumber()
  @Min(0)
  monthlyAmount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  dueDay?: number;

  @IsOptional()
  @IsIn(['MONTHLY', 'YEARLY'])
  type?: 'MONTHLY' | 'YEARLY';

  @IsOptional()
  @IsString()
  @MaxLength(40)
  category?: string; // "Boshqa" tur: Grand, Xodim farzandi, ... (bo'sh = oddiy Oylik/Yillik)

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}
