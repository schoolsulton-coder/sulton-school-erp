import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class GradeItem {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  value: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class BulkGradeDto {
  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsOptional()
  @IsEnum(['DAILY', 'QUARTER', 'SEMESTER', 'YEAR', 'EXAM'])
  type?: 'DAILY' | 'QUARTER' | 'SEMESTER' | 'YEAR' | 'EXAM';

  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeItem)
  items: GradeItem[];
}
