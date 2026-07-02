import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Ishga qabul — bitta formada login (user) + xodim profili + stavka yaratadi.
 */
export class HireEmployeeDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  roleId: string;

  @IsDateString()
  hireDate: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  positionId?: string;

  // boshlang'ich stavka (ixtiyoriy)
  @IsOptional()
  @IsEnum(['MONTHLY', 'HOURLY', 'PER_LESSON'])
  salaryType?: 'MONTHLY' | 'HOURLY' | 'PER_LESSON';

  @IsOptional()
  @IsNumber()
  @Min(0)
  baseRate?: number;
}
