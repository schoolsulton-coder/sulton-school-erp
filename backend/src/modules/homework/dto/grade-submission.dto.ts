import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class GradeSubmissionDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  grade?: number;

  @IsOptional()
  @IsString()
  teacherNote?: string;

  @IsOptional()
  @IsEnum(['ASSIGNED', 'SUBMITTED', 'CHECKED', 'LATE', 'MISSING'])
  status?: 'ASSIGNED' | 'SUBMITTED' | 'CHECKED' | 'LATE' | 'MISSING';
}
