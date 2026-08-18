import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateEntryDto {
  @IsIn(['IN', 'OUT'])
  direction: 'IN' | 'OUT'; // IN = kirim (bizga), OUT = chiqim (bizdan)

  // So'm qismi (ixtiyoriy)
  @IsOptional()
  @IsNumber()
  @Min(0)
  somAmount?: number;

  // Dollar qismi (ixtiyoriy) — so'm ekvivalenti = dollarAmount * dollarRate
  @IsOptional()
  @IsNumber()
  @Min(0)
  dollarAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dollarRate?: number;

  @IsOptional()
  @IsString()
  sabab?: string;

  // Kassa/hisob (investitsiya)
  @IsOptional()
  @IsString()
  kassaTuri?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  // Investitsiya hisobot davri / turi
  @IsOptional()
  @IsNumber()
  periodYear?: number;

  @IsOptional()
  @IsNumber()
  periodMonth?: number;

  @IsOptional()
  @IsString()
  academicYear?: string;

  @IsOptional()
  @IsString()
  investType?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
