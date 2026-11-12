import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsOptional,
} from 'class-validator';
import {
  MIN_DAKSHINA_COINS,
  MAX_DAKSHINA_COINS,
} from '../../../common/config/economy.constants';

export class CreateDakshinaDto {
  @IsString()
  @IsNotEmpty()
  streamId: string;

  @IsInt()
  @Min(MIN_DAKSHINA_COINS)
  @Max(MAX_DAKSHINA_COINS)
  coins: number;

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

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  idempotencyKey: string;
}
