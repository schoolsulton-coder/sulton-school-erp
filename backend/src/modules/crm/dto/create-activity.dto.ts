import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateActivityDto {
  @IsEnum(['CALL', 'NOTE', 'REMINDER', 'MEETING'])
  @IsNotEmpty()
  type: 'CALL' | 'NOTE' | 'REMINDER' | 'MEETING';

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string; // REMINDER uchun eslatma vaqti
}
