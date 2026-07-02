import {
  IsDateString,
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
  @IsInt()
  @Min(1)
  @Max(28)
  dueDay?: number; // to'lov sanasi (oyning kuni), default 5
}
