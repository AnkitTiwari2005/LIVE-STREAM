import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePoojaBookingDto {
  @ApiProperty({ example: 'rohit-tiwari', description: 'Pandit userId, profileId, slug, or catalog id' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  panditIdOrSlug: string;

  @ApiProperty({ example: 'rudrabhishek' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  poojaId: string;

  @ApiProperty({ example: 'Maha Rudrabhishek Pooja' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  poojaName: string;

  @ApiProperty({ required: false, example: 'Shiva & Rudra' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiProperty({ required: false, example: 150 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500000)
  dakshinaCoins?: number;

  @ApiProperty({ example: 'Ankit Tiwari' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  devoteeName: string;

  @ApiProperty({ required: false, example: 'Kashyap' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  devoteeGotra?: string;

  @ApiProperty({ example: '2026-12-01' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  scheduledDate: string;

  @ApiProperty({ example: 'Morning (07:00 AM – 09:00 AM IST)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  timeSlot: string;

  @ApiProperty({ example: 'Family Health, Long Life & Healing' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  sankalpIntent: string;
}

export class RespondPoojaBookingDto {
  @ApiProperty({ enum: ['APPROVED', 'DECLINED'] })
  @IsIn(['APPROVED', 'DECLINED'])
  decision: 'APPROVED' | 'DECLINED';

  @ApiProperty({ required: false, example: 'Confirmed for 07:30 AM IST' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  confirmedTime?: string;

  @ApiProperty({ required: false, example: '/join/invite' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Matches(/^(\/[^\s<>"]*|https:\/\/[^\s<>"]+)$/, {
    message: 'roomLink must be a relative path starting with / or an https:// URL',
  })
  roomLink?: string;

  @ApiProperty({ required: false, example: 'Temple schedule conflict during this slot' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  declineReason?: string;
}
