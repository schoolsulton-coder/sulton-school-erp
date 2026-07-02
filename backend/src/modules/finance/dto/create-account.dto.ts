import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string; // Asosiy kassa, Bank, ...

  @IsOptional()
  @IsNumber()
  @Min(0)
  balance?: number; // boshlang'ich qoldiq
}
