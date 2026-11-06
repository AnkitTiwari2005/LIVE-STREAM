import { BadRequestException } from '@nestjs/common';
import { StreamStatus } from '@prisma/client';

const LEGAL_TRANSITIONS: Record<StreamStatus, StreamStatus[]> = {
  [StreamStatus.DRAFT]: [StreamStatus.SCHEDULED, StreamStatus.LIVE, StreamStatus.CANCELLED],
  [StreamStatus.SCHEDULED]: [StreamStatus.LIVE, StreamStatus.CANCELLED],
  [StreamStatus.LIVE]: [StreamStatus.RECONNECTING_GRACE_PERIOD, StreamStatus.ENDED],
  [StreamStatus.RECONNECTING_GRACE_PERIOD]: [StreamStatus.LIVE, StreamStatus.ENDED],
  [StreamStatus.ENDED]: [],
  [StreamStatus.CANCELLED]: [],
};

export function validateStateTransition(current: StreamStatus, next: StreamStatus): void {
  // Idempotency: allow identical transitions (e.g. repeated go-live API calls)
  if (current === next) return;

  const allowed = LEGAL_TRANSITIONS[current];
  if (!allowed || !allowed.includes(next)) {
    throw new BadRequestException(`Illegal stream state transition from [${current}] to [${next}].`);
  }
}
