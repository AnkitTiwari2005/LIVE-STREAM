import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReportTargetType, ReportStatus } from '@prisma/client';

export class CreateReportDto {
  @ApiProperty({ enum: ReportTargetType })
  @IsEnum(ReportTargetType)
  targetType: ReportTargetType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  streamId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  targetUserId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  chatMessageId?: string;

  @ApiProperty({ example: 'Abusive language in live chat', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason: string;

  @ApiProperty({ example: 'User was posting commercial spam repeatedly.', required: false })
  @IsOptional()
  @IsString()
  details?: string;
}

export class ResolveReportDto {
  @ApiProperty({ enum: ReportStatus })
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  adminNotes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
