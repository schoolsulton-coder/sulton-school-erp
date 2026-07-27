import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateContractDto {
  @IsOptional()
  @IsIn([
    'DRAFT',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED',
    'SUSPENDED',
    'TEMP_SUSPENDED',
    'LEFT',
    'OTHER',
  ])
  status?: string;

  @IsOptional()
  @IsIn(['MONTHLY', 'YEARLY'])
  type?: 'MONTHLY' | 'YEARLY';

  @IsOptional()
  @IsString()
  classId?: string; // o'quvchining sinfini o'zgartirish (sinf belgilash)

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyAmount?: number; // oylik asosiy narx
}
