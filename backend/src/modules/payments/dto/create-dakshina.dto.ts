import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsEnum } from 'class-validator';
import { PaymentProvider } from '@prisma/client';

export class CreateDakshinaDto {
  @IsString()
  @IsNotEmpty()
  streamId: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsNotEmpty()
  devoteeName: string;

  @IsString()
  @IsOptional()
  prayerMessage?: string;

  @IsString()
  @IsOptional()
  gotra?: string;

  @IsEnum(PaymentProvider)
  @IsOptional()
  provider?: PaymentProvider;
}
