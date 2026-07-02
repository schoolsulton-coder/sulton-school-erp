import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubmitHomeworkDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  files?: string[]; // topshirilgan fayllar (rasm/video/hujjat)

  @IsOptional()
  @IsString()
  comment?: string;
}
