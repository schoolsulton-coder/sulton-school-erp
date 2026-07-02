import { IsEnum, IsNumber, Min } from 'class-validator';

export class SetSalaryDto {
  @IsEnum(['MONTHLY', 'HOURLY', 'PER_LESSON'])
  type: 'MONTHLY' | 'HOURLY' | 'PER_LESSON';

  @IsNumber()
  @Min(0)
  baseRate: number;
}
