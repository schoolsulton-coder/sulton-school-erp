import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateStudentDto } from './create-student.dto';

export class UpdateStudentDto extends PartialType(CreateStudentDto) {
  @IsOptional()
  @IsEnum(['ACTIVE', 'GRADUATED', 'EXPELLED', 'ARCHIVED'])
  status?: 'ACTIVE' | 'GRADUATED' | 'EXPELLED' | 'ARCHIVED';
}
