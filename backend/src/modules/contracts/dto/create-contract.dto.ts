import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateContractDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsDateString()
  startDate: string;

  @IsInt()
  @Min(1)
  @Max(24)
  months: number; // shartnoma davomiyligi (oy)

  @IsNumber()
  @Min(0)
  monthlyAmount: number; // oylik to'lov (chegirmagacha)

  @IsOptional()
  @IsString()
  discountId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number; // to'g'ridan-to'g'ri chegirma summasi (oyiga ayriladi)

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  dueDay?: number; // to'lov sanasi (oyning kuni), default 5

  @IsOptional()
  @IsIn(['MONTHLY', 'YEARLY'])
  type?: 'MONTHLY' | 'YEARLY'; // Oylik / Yillik
}
