import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateContactDto {
  @IsOptional()
  @IsIn(['CALL', 'TELEGRAM', 'SMS', 'MEETING', 'OTHER'])
  type?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  note!: string;
}
