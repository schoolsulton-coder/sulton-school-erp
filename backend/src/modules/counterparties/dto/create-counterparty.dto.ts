import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export const COUNTERPARTY_CATEGORIES = [
  'OLDI_BERDICHI',
  'OLDI_BERDI',
  'TRANSFER',
  'SOTUV',
  'INVESTOR',
  'INVESTITSIYA',
] as const;

export class CreateCounterpartyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsIn(COUNTERPARTY_CATEGORIES as unknown as string[])
  category?: string;

  @IsOptional()
  @IsBoolean()
  filiallararo?: boolean;

  // Investor uchun ko'p filial (m2m)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  branchIds?: string[];

  // Transfer juftligi
  @IsOptional()
  @IsString()
  pairId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
