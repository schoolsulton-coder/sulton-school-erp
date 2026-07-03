import { IsNotEmpty, IsString } from 'class-validator';

// Sozlamalar reference (Filial, Psixolog, O'quv yili) uchun umumiy DTO
export class CreateRefDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
