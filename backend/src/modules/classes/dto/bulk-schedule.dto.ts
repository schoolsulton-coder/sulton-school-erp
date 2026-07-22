import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class BulkSlotDto {
  @IsInt()
  @Min(1)
  @Max(7)
  weekday: number;

  @Matches(TIME, { message: 'startTime HH:MM formatida bo‘lishi kerak' })
  startTime: string;

  @Matches(TIME, { message: 'endTime HH:MM formatida bo‘lishi kerak' })
  endTime: string;
}

export class BulkScheduleDto {
  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsString()
  room?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkSlotDto)
  slots: BulkSlotDto[];
}
