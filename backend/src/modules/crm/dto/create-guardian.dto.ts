import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateGuardianDto {
  @IsString() @IsNotEmpty() fullName: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() relation?: string;
}
