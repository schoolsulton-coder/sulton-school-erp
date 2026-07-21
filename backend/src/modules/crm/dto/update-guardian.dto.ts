import { IsOptional, IsString } from 'class-validator';

export class UpdateGuardianDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() relation?: string;
  @IsOptional() @IsString() passport?: string;
  @IsOptional() @IsString() telegramUsername?: string;
}
