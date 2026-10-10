import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Yangi kunlik vazifa. classId berilmasa — maktab bo'yicha umumiy. */
export class CreateDailyTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsInt()
  @Min(0)
  @Max(1000)
  coins: number;

  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  sort?: number;
}

export class UpdateDailyTaskDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  coins?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  sort?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

/** Bitta belgi: bajarildi / bekor qilindi */
export class MarkDailyTaskDto {
  @IsUUID()
  studentId: string;

  @IsUUID()
  taskId: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsBoolean()
  done: boolean;
}

/** Ko'p belgini birdaniga: butun ustun (bitta vazifa — hamma o'quvchiga) uchun */
export class BulkMarkItemDto {
  @IsUUID()
  studentId: string;

  @IsUUID()
  taskId: string;

  @IsBoolean()
  done: boolean;
}

export class MarkBulkDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => BulkMarkItemDto)
  items: BulkMarkItemDto[];
}

/** O'quvchining shu kundagi hamma vazifasini birdaniga belgilash */
export class MarkAllDailyTasksDto {
  @IsUUID()
  studentId: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsBoolean()
  done: boolean;
}
