import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateGuardianDto {
  @IsString() @IsNotEmpty() fullName: string;
  @IsString() @IsNotEmpty() phone: string;
  @IsOptional() @IsString() relation?: string;
}
