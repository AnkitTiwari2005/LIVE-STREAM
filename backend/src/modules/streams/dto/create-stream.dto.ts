import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsDateString,
  IsIn,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StreamVisibility } from '@prisma/client';

export class CreateStreamDto {
  @ApiProperty({ example: 'Maha Shivratri Rudrabhishek Live from Varanasi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Sacred Vedic chanting and panchamrit snan. Join us for live darshan.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Category UUID (e.g. Pooja, Aarti, Kundli)' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ example: 'https://assets.platform-domain.com/thumbnails/rudra.jpg', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Matches(/^(\/uploads\/[a-zA-Z0-9_\-\.\/]+|https:\/\/[a-zA-Z0-9_\-\.\/]+)$/, {
    message: 'thumbnailUrl must be a local /uploads/ path or a valid HTTPS URL',
  })
  thumbnailUrl?: string;

  @ApiProperty({ enum: StreamVisibility, default: StreamVisibility.PUBLIC })
  @IsEnum(StreamVisibility)
  visibility: StreamVisibility;

  @ApiProperty({ example: '480p', enum: ['480p', '720p'], default: '480p', description: 'FR-L4: default is 480p' })
  @IsIn(['480p', '720p'])
  videoQuality: string;

  @ApiProperty({ example: '2026-11-10T18:00:00.000Z', required: false, description: 'Optional for scheduled streams' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
