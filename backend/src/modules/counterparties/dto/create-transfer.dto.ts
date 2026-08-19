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

  // Har tomon uchun tashqi hisoblar (so'm / dollar)
  @IsOptional()
  @IsString()
  fromSomAccountId?: string;

  @IsOptional()
  @IsString()
  toSomAccountId?: string;

  @IsOptional()
  @IsString()
  fromDollarAccountId?: string;

  @IsOptional()
  @IsString()
  toDollarAccountId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
