import { Matches } from 'class-validator';

export class CreateRunDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'period YYYY-MM formatida bo‘lishi kerak (masalan 2026-06)',
  })
  period: string;
}
