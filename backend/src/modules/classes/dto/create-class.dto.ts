import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  name: string; // "5-A"

  @IsInt()
  @Min(1)
  @Max(11)
  gradeLevel: number;

  @IsString()
  @IsNotEmpty()
  academicYear: string; // "2025-2026"

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  capacity?: number;

  @IsOptional()
  @IsString()
  room?: string;
}
