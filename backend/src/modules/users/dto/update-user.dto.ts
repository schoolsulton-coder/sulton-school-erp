import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'BLOCKED'])
  status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

  @IsOptional()
  @IsString()
  subjectId?: string;

  // Xodim kartasi (Maoshlar → Xodimlar) maydonlari — karta mavjud bo'lsagina qo'llanadi
  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  branchIds?: string[];
}
