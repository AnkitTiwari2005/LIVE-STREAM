import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
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
  password?: string;

  @ApiProperty({ example: '2026-11-10T20:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({ example: 25, required: false, description: 'Maximum concurrent viewers allowed' })
  @IsOptional()
  @IsInt()
  @Min(1)
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
  password?: string;

  @ApiProperty({ example: 'Rahul Sharma', required: false, description: 'Display name for guest' })
  @IsOptional()
  @IsString()
  guestName?: string;
}
