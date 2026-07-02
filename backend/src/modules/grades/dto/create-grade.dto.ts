import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
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

  @IsNumber()
  @Min(1)
  @Max(100)
  value: number;

  @IsOptional()
  @IsEnum(['DAILY', 'QUARTER', 'SEMESTER', 'YEAR', 'EXAM'])
  type?: 'DAILY' | 'QUARTER' | 'SEMESTER' | 'YEAR' | 'EXAM';

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
