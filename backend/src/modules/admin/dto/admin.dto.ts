import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, IsBoolean, IsInt, Min, IsISO8601, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';

export class UpdateUserStatusDto {
  @ApiProperty({ enum: UserStatus })
  @IsEnum(UserStatus)
  status: UserStatus;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

export class CreateCategoryDto {
  @ApiProperty({ example: 'Vedic Pooja' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'vedic-pooja' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  slug: string;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}

export class UpdateCategoryDto {
  @ApiProperty({ required: false, example: 'Vedic Pooja' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AddWordFilterDto {
  @ApiProperty({ example: 'disallowed_term' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  word: string;

  @ApiProperty({ required: false, example: 'HIGH' })
  @IsOptional()
  @IsString()
  severity?: string;
}

export class UpdateStaticPageDto {
  @ApiProperty({ example: 'Terms & Conditions' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: '<p>Updated legal terms</p>' })
  @IsString()
  @IsNotEmpty()
  contentHtml: string;
}

export class UpdateBannerDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ required: false, example: 'Deepotsav' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  occasion?: string;

  @ApiProperty({ required: false, example: 'Join the Grand Deepotsav Mahotsav & Live Ganga Aarti' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  message?: string;

  @ApiProperty({ required: false, example: 'Live Aarti from sacred ghats' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  mobileMessage?: string;

  @ApiProperty({ required: false, example: 'Watch Live Aarti' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  ctaText?: string;

  @ApiProperty({ required: false, example: '/#live-section' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  // H-08: Added URL validation — previously any string was accepted, allowing javascript: URIs
  // which could be used for XSS via the festival banner CTA link.
  @Matches(/^(\/[^\s<>"]*|https?:\/\/[^\s<>"]+)$/, {
    message: 'ctaLink must be a relative path starting with / or an absolute http/https URL',
  })
  ctaLink?: string;

  @ApiProperty({ required: false, example: 'amber-orange' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  gradient?: string;
}

export class ToggleSpecialBadgeDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  hasSpecialBadge: boolean;

  @ApiProperty({ required: false, example: 'आचार्य रत्न' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialBadgeTitle?: string;
}

export class ToggleVerifiedBadgeDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isVerifiedBadge: boolean;
}

export class RecordPayoutDto {
  @ApiProperty({ example: 'uuid-of-streamer' })
  @IsString()
  @IsNotEmpty()
  streamerId: string;

  @ApiProperty({ description: 'Gross coins settled (must not exceed unsettled due coins)', example: 1500 })
  @IsInt()
  @Min(1)
  coins: number;

  @ApiProperty({ required: false, description: 'ISO date string – start of earning period covered', example: '2026-11-01T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  periodFrom?: string;

  @ApiProperty({ description: 'ISO date string – end of earning period covered (inclusive)', example: '2026-11-30T23:59:59.999Z' })
  @IsISO8601()
  periodTo: string;

  @ApiProperty({ required: false, description: 'Payment method', example: 'UPI' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  method?: string;

  @ApiProperty({ description: 'UTR / transaction ID / cheque no.', example: 'UTR12345678901234' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  reference: string;

  @ApiProperty({ required: false, description: 'Optional admin note', example: 'November settlement' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

