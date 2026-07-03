import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAdmissionDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() academicYear?: string;
  @IsOptional() @IsString() classId?: string;
  @IsOptional() @IsString() managerId?: string;
  @IsOptional() @IsString() psychologistId?: string;
  @IsOptional() @IsString() stageId?: string;

  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsString() note?: string;
}
