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
  @Min(1)
  @Max(5)
  grade?: number; // 5 balli tizim (butun ERP bilan bir xil)

  @IsOptional()
  @IsString()
  teacherNote?: string;

  @IsOptional()
  @IsEnum(['ASSIGNED', 'SUBMITTED', 'CHECKED', 'LATE', 'MISSING'])
  status?: 'ASSIGNED' | 'SUBMITTED' | 'CHECKED' | 'LATE' | 'MISSING';
}
