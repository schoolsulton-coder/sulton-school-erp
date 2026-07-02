import { IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateDiscountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['PERCENT', 'FIXED'])
  type: 'PERCENT' | 'FIXED';

  @IsNumber()
  @Min(0)
  value: number; // PERCENT => foiz (0-100), FIXED => so'm (oylikdan)
}
