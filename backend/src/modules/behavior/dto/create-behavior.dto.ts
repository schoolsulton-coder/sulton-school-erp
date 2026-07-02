import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateBehaviorDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsEnum(['POSITIVE', 'NEGATIVE'])
  type: 'POSITIVE' | 'NEGATIVE';

  @IsInt()
  @Min(1)
  @Max(100)
  points: number;

  @IsString()
  @IsNotEmpty()
  description: string; // hodisa / izoh

  @IsOptional()
  @IsDateString()
  date?: string;
}
