import { IsString, IsNotEmpty } from 'class-validator';

export class MeterTickDto {
  @IsString()
  @IsNotEmpty()
  streamId: string;

  @IsString()
  @IsNotEmpty()
  sessionToken: string;
}
