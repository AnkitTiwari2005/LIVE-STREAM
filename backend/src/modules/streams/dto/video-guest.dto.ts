import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class GrantVideoGuestDto {
  /** If another devotee holds the slot, revoke them and give it to this one. */
  @IsOptional()
  @IsBoolean()
  replace?: boolean;
}

export class MuteParticipantDto {
  @IsIn(['camera', 'microphone'])
  source: 'camera' | 'microphone';
}
