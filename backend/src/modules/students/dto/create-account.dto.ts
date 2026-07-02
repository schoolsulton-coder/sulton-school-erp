import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAccountDto {
  // O'quvchi uchun login telefon (Student modelida saqlanmaydi — User.phone bo'ladi).
  // Vasiy uchun ixtiyoriy (berilmasa guardian.phone ishlatiladi).
  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(6)
  password: string;
}
