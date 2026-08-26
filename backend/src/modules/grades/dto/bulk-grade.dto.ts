import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
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

  @IsInt()
  @Min(1)
  @Max(5)
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
  @IsString()
  classId?: string; // ustoz ko'lamini tekshirish uchun

  @IsOptional()
  @IsEnum(['DAILY', 'HOMEWORK', 'QUARTER', 'SEMESTER', 'YEAR', 'EXAM'])
  type?: 'DAILY' | 'HOMEWORK' | 'QUARTER' | 'SEMESTER' | 'YEAR' | 'EXAM';

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
