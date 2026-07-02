import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class AttendanceItem {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsEnum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'])
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

  @IsOptional()
  @IsString()
  note?: string;
}

export class MarkAttendanceDto {
  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsDateString()
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceItem)
  records: AttendanceItem[];
}
