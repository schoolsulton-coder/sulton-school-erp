import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @IsOptional()
  @IsString()
  filial?: string;

  @IsInt()
  @Min(0)
  @Max(11)
  gradeLevel: number;

  @IsInt()
  @Min(0)
  plannedCount: number;
}
