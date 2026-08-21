import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export const IT_KINDS = ['SOM', 'DOLLAR', 'VALYUTA', 'PUL'] as const;

export class CreateInternalTransferDto {
  @IsIn(IT_KINDS as unknown as string[])
  kind: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  @IsNotEmpty()
  fromAccountId: string;

  @IsString()
  @IsNotEmpty()
  toAccountId: string;

  @IsOptional()
  @IsString()
  kassaTuri?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  somAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dollarAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dollarRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  loss?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
