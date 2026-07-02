import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsString()
  source?: string; // Instagram, tavsiya, reklama...

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(20)
  childAge?: number;

  @IsOptional()
  @IsString()
  note?: string;

  // ---- Tashrif (qabul) ----
  @IsOptional()
  @IsDateString()
  scheduledAt?: string; // belgilangan tashrif vaqti

  @IsOptional()
  @IsString()
  filial?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(11)
  gradeLevel?: number; // qaysi sinf

  @IsOptional()
  @IsString()
  whoComes?: string; // "Ota va farzand", "Ona", ...

  @IsOptional()
  @IsString()
  stageId?: string;

  @IsOptional()
  @IsString()
  managerId?: string;
}
