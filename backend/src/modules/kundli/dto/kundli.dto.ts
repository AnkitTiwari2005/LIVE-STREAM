import { IsIn, IsNotEmpty, IsOptional, IsString, Length, Matches, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Birth details as typed by the devotee. Every field is validated here and then re-validated
 * (real calendar date, not in the future) in KundliService; unknown fields are rejected by the
 * global ValidationPipe (forbidNonWhitelisted), so nothing is ever passed through blindly.
 */
export class KundliBirthDto {
  /** YYYY-MM-DD, 1900-01-01 .. today (calendar-checked in the service). */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date!: string;

  /** 24-hour HH:MM. Omit (or use timeAccuracy "unknown") when the birth time is not known. */
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'time must be in 24-hour HH:MM format' })
  time?: string;

  @IsOptional()
  @IsIn(['exact', 'approximate', 'unknown'])
  timeAccuracy?: 'exact' | 'approximate' | 'unknown';

  /** Free-text birth place, e.g. "Varanasi, Uttar Pradesh". Required unless placeId is sent. */
  @ValidateIf((o: KundliBirthDto) => !o.placeId)
  @IsString()
  @Length(2, 120)
  @Matches(/^[^\u0000-\u001f<>]+$/, { message: 'placeQuery contains invalid characters' })
  placeQuery?: string;

  /** An id taken from the "place_ambiguous" candidate list returned by a previous call. */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_.:-]{1,100}$/, { message: 'placeId is not valid' })
  placeId?: string;

  @IsOptional()
  @IsIn(['en', 'hi'])
  lang?: 'en' | 'hi';

  @IsOptional()
  @IsIn(['lahiri', 'raman', 'krishnamurti'])
  ayanamsa?: 'lahiri' | 'raman' | 'krishnamurti';
}

export class KundliChartDto extends KundliBirthDto {
  /** Lagna chart (D1) or Navamsa (D9). */
  @IsOptional()
  @IsIn(['D1', 'D9'])
  varga?: 'D1' | 'D9';

  @IsOptional()
  @IsIn(['north', 'south'])
  style?: 'north' | 'south';

  @IsOptional()
  @IsIn(['light', 'dark'])
  theme?: 'light' | 'dark';
}

export class MatchPersonDto {
  @IsOptional()
  @IsString()
  @Length(1, 60)
  name?: string;

  /** YYYY-MM-DD, 1900-01-01 .. today */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date!: string;

  /** 24-hour HH:MM format */
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'time must be in 24-hour HH:MM format' })
  time?: string;

  @ValidateIf((o: MatchPersonDto) => !o.placeId)
  @IsString()
  @Length(2, 120)
  @Matches(/^[^\u0000-\u001f<>]+$/, { message: 'placeQuery contains invalid characters' })
  placeQuery?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_.:-]{1,100}$/, { message: 'placeId is not valid' })
  placeId?: string;
}

export class KundliMatchDto {
  @ValidateNested()
  @Type(() => MatchPersonDto)
  personA!: MatchPersonDto;

  @ValidateNested()
  @Type(() => MatchPersonDto)
  personB!: MatchPersonDto;

  @IsOptional()
  @IsIn(['en', 'hi'])
  lang?: 'en' | 'hi';

  @IsOptional()
  @IsIn(['lahiri', 'raman', 'krishnamurti'])
  ayanamsa?: 'lahiri' | 'raman' | 'krishnamurti';
}
