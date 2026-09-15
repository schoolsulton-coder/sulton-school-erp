import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateScheduleWeekDto {
  /** Hafta boshi, masalan "2026-09-14" (Dushanbaga keltiriladi) */
  @IsDateString()
  startDate: string;

  /** Hafta oxiri; berilmasa — Shanba (boshidan +5 kun) */
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  /** Berilsa — shu haftaning darslari yangi haftaga ko'chiriladi */
  @IsOptional()
  @IsString()
  copyFromWeekId?: string;
}

export class UpdateScheduleWeekDto {
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class CopyScheduleWeekDto {
  /** Mavjud maqsad hafta ... */
  @IsOptional()
  @IsString()
  targetWeekId?: string;

  /** ... yoki maqsad hafta boshi (bo'lmasa yaratiladi). Ikkalasi ham berilmasa — keyingi hafta */
  @IsOptional()
  @IsDateString()
  targetStartDate?: string;

  @IsOptional()
  @IsDateString()
  targetEndDate?: string;

  /** Faqat bitta sinfni ko'chirish (berilmasa — butun maktab) */
  @IsOptional()
  @IsString()
  classId?: string;

  /** Maqsad haftada darslar bo'lsa — ularni almashtirish */
  @IsOptional()
  @IsBoolean()
  replace?: boolean;
}
