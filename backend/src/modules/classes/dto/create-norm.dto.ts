import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateNormDto {
  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsInt()
  @Min(0)
  @Max(40)
  weeklyHours: number; // haftalik reja soati
}
