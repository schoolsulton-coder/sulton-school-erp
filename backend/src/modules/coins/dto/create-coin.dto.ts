import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateCoinDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  /** Musbat — coin qo'shiladi, manfiy — ayiriladi */
  @IsInt()
  @Min(-1000)
  @Max(1000)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
