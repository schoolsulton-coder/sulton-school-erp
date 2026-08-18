import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTransferDto {
  @IsString()
  @IsNotEmpty()
  fromId: string;

  @IsString()
  @IsNotEmpty()
  toId: string;

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
  @IsString()
  kassaTuri?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
