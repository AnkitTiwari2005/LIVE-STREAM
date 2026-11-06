import { IsArray, IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { KycStatus } from '@prisma/client';

export class ApplyStreamerDto {
  @ApiProperty({ example: 'Vedic pandit with 15+ years experience conducting Maha Yagya and Kundli readings.' })
  @IsString()
  @IsNotEmpty()
  bio: string;

  @ApiProperty({ example: ['Hindi', 'Sanskrit', 'English'] })
  @IsArray()
  @IsString({ each: true })
  languages: string[];

  @ApiProperty({ example: ['Vedic Pooja', 'Kundli Match', 'Vastu Consultation'] })
  @IsArray()
  @IsString({ each: true })
  specialties: string[];

  @ApiProperty({
    example: [{ documentType: 'PAN_CARD', storageKey: 'kyc/users/pan_uuid.pdf' }],
    description: 'Encrypted document storage keys. NOTE: Unmasked Aadhaar is strictly prohibited.',
  })
  @IsOptional()
  kycDocuments?: any;
}

export class ReviewKycDto {
  @ApiProperty({ enum: [KycStatus.APPROVED, KycStatus.REJECTED, KycStatus.MORE_INFO_NEEDED] })
  @IsEnum(KycStatus)
  decision: KycStatus;

  @ApiProperty({ example: 'Certificate verification incomplete. Please provide Vedic academy registration.', required: false })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
