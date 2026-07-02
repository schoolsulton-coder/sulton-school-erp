import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddGuardianDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsString()
  relation?: string; // ota, ona, vasiy

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
