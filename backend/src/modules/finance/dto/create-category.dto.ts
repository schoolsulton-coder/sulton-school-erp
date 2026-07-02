import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT'])
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT';
}
