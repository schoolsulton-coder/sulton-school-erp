import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  openingBalance?: number; // boshlang'ich qoldiqni tahrirlash (balans farq bilan moslanadi)
}
