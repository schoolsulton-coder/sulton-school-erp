import { IsOptional, IsString } from 'class-validator';

/**
 * Lead'ni o'quvchiga aylantirish. Maydonlar berilmasa — lead ma'lumotlaridan
 * olinadi (fullName bo'lingan holda).
 */
export class ConvertLeadDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  // vasiy (ota-ona) — berilmasa lead.fullName/phone ishlatiladi
  @IsOptional()
  @IsString()
  guardianName?: string;

  @IsOptional()
  @IsString()
  guardianRelation?: string;
}
