import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateFlowAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsIn(['SOM', 'USD'])
  currency?: string;

  @IsOptional()
  @IsString()
  kassaTuri?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class UpdateFlowAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsIn(['SOM', 'USD'])
  currency?: string;

  @IsOptional()
  @IsString()
  kassaTuri?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
