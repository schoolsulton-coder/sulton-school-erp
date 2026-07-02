import { IsDateString, IsOptional } from 'class-validator';

export class TerminateDto {
  @IsOptional()
  @IsDateString()
  fireDate?: string; // berilmasa — bugun
}
