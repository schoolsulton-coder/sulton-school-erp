import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class MarkVisitDto {
  @IsEnum(['PLANNED', 'ARRIVED', 'NO_SHOW', 'CANCELLED'])
  status: 'PLANNED' | 'ARRIVED' | 'NO_SHOW' | 'CANCELLED';

  @IsOptional()
  @IsDateString()
  visitedAt?: string;
}
