import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateItemDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  bonus?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  penalty?: number;
}
