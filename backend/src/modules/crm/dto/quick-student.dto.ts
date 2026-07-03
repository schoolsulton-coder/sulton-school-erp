import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class QuickStudentDto {
  @IsOptional() @IsString() branchId?: string;

  @IsEnum(['MALE', 'FEMALE'])
  gender: 'MALE' | 'FEMALE';

  @IsString() @IsNotEmpty() lastName: string;
  @IsString() @IsNotEmpty() firstName: string;

  @IsOptional() @IsString() guardianId?: string;
}
