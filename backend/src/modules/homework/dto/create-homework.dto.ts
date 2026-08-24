import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateHomeworkDto {
  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  type?: string; // vazifa turi (bo'sh bo'lsa "Uyga vazifa")

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[]; // biriktirilgan fayllar (JSON: {n,t,d})

  // Bo'sh bo'lsa — butun sinf; to'ldirilsa — faqat shu o'quvchilar
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  studentIds?: string[];
}
