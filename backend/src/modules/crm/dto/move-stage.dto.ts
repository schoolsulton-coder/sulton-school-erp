import { IsNotEmpty, IsString } from 'class-validator';

export class MoveStageDto {
  @IsString()
  @IsNotEmpty()
  stageId: string;
}
