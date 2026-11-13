import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class KickViewerDto {
  /** If true, also create a BlockedViewer record to prevent rejoining */
  @IsBoolean()
  block: boolean;

  /** Optional human-readable reason (shown to kicked user, logged in ModerationAction) */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
