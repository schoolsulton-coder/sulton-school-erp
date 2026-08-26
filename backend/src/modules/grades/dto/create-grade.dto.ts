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

export class CreateGradeDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  value: number;

  @IsOptional()
  @IsEnum(['DAILY', 'HOMEWORK', 'QUARTER', 'SEMESTER', 'YEAR', 'EXAM'])
  type?: 'DAILY' | 'HOMEWORK' | 'QUARTER' | 'SEMESTER' | 'YEAR' | 'EXAM';

  @IsOptional()
  @IsString()
  period?: string; // "1-chorak", "2-yarim yillik"

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
