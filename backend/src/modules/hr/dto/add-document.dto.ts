import { IsNotEmpty, IsString } from 'class-validator';

export class AddDocumentDto {
  @IsString()
  @IsNotEmpty()
  type: string; // mehnat shartnomasi, ariza, ...

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  filePath: string;
}
