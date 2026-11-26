import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePrivateLinkDto {
  @ApiProperty({ description: 'Target private stream ID' })
  @IsString()
  @IsNotEmpty()
  streamId: string;

  @ApiProperty({ example: 'SecretPooja789', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  password?: string;

  @ApiProperty({ example: '2026-11-10T20:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({ example: 25, required: false, description: 'Maximum concurrent viewers allowed' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  maxViewers?: number;

  @ApiProperty({ default: false, description: 'Enable lobby waiting room approval (FR-P4)' })
  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;

  @ApiProperty({ default: true, description: 'Enforce registered account login (FR-P8)' })
  @IsOptional()
  @IsBoolean()
  requireLogin?: boolean;
}

export class ClaimPrivateLinkDto {
  @ApiProperty({ example: 'SecretPooja789', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  password?: string;

  @ApiProperty({ example: 'Rahul Sharma', required: false, description: 'Display name for guest' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  guestName?: string;
}


export class KickBlockViewerDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  targetUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  targetSessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
