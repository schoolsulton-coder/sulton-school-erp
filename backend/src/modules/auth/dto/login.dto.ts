import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  // Login — telefon yoki email bo'lishi mumkin
  @IsString()
  @IsNotEmpty()
  login: string;

  @IsString()
  @MinLength(6)
  password: string;
}
