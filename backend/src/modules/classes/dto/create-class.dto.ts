import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  name: string; // "5-A"

  @IsInt()
  @Min(0)
  @Max(11)
  gradeLevel: number;

  @IsString()
  @IsNotEmpty()
  academicYear: string; // "2025-2026"

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  capacity?: number;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsString()
  language?: string; // "O'zbek", "Rus", "Ingliz"

  @IsOptional()
  @IsString()
  branchId?: string; // Filial

  @IsOptional()
  @IsString()
  status?: string; // "Faol", "Nofaol", "Arxiv"

  @IsOptional()
  @IsString()
  telegramGroup?: string; // Telegram guruh havolasi
}
