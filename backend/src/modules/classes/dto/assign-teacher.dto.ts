import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AssignTeacherDto {
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @IsOptional()
  @IsBoolean()
  isCurator?: boolean; // true => kurator, false => fan o'qituvchisi
}
