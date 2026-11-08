import { IsArray, IsNotEmpty, IsOptional, IsString, IsEnum, IsIn, Matches, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { KycStatus } from '@prisma/client';

/**
 * R-02: Strongly-typed KYC document DTO.
 * Accepts only storage keys in the form kyc/<safe-filename> (not arbitrary URLs).
 * This prevents an attacker from supplying a publicUrl pointing to their own server
 * and capturing the admin's JWT token when the admin opens the document link.
 */
export class KycDocDto {
  @ApiProperty({ example: 'PAN_CARD', description: 'Type of identity document' })
  @IsString()
  @IsIn(['PAN_CARD', 'AADHAAR', 'PASSPORT', 'DEGREE_CERTIFICATE', 'TEACHING_CERTIFICATE', 'OTHER'], {
    message: 'documentType must be one of the allowed document type values',
  })
  documentType: string;

  @ApiProperty({ example: 'kyc/abc123def456.pdf', description: 'Storage key from our own upload endpoint — never an external URL' })
  @IsString()
  @Matches(/^kyc\/[A-Za-z0-9._-]{8,120}$/, {
    message: 'storageKey must be a valid internal storage key (kyc/filename), not an external URL',
  })
  storageKey: string;
}

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
    example: [{ documentType: 'PAN_CARD', storageKey: 'kyc/abc123def456.pdf' }],
    description: 'Storage keys from our upload endpoint only. Each key must be in kyc/<filename> format. External URLs are rejected. Unmasked Aadhaar is strictly prohibited.',
  })
  // R-02: Was `kycDocuments?: any` — replaced with typed, validated DTO.
  // This prevents an attacker supplying an external URL to steal the admin's JWT.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => KycDocDto)
  kycDocuments?: KycDocDto[];
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
