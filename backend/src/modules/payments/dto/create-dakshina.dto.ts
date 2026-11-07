import { IsString, IsNotEmpty, IsNumber, Min, Max, MaxLength, IsOptional } from 'class-validator';

export class CreateDakshinaDto {
  @IsString()
  @IsNotEmpty()
  streamId: string;

  @IsNumber()
  @Min(1)
  @Max(100000)
  amount: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  devoteeName: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  prayerMessage?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  gotra?: string;
}
