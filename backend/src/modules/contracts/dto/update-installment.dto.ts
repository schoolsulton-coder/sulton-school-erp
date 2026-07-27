import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateInstallmentDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number; // to'lanadigan summa (chegirmadan keyingi)

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
