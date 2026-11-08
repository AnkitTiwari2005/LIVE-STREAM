import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, IsBoolean, MaxLength } from 'class-validator';
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
  ctaLink?: string;

  @ApiProperty({ required: false, example: 'amber-orange' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  gradient?: string;
}
