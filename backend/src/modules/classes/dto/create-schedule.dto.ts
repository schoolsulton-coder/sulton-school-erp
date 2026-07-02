import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/; // "08:30"

export class CreateScheduleDto {
  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsInt()
  @Min(1)
  @Max(7)
  weekday: number; // 1=Dushanba ... 7=Yakshanba

  @Matches(TIME, { message: 'startTime HH:MM formatida bo‘lishi kerak' })
  startTime: string;

  @Matches(TIME, { message: 'endTime HH:MM formatida bo‘lishi kerak' })
  endTime: string;

  @IsOptional()
  @IsString()
  room?: string;
}
