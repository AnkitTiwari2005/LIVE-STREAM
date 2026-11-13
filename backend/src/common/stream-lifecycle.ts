import { StreamStatus, ViewingSessionStatus } from '@prisma/client';

/** Minimal shape shared by PrismaService and an interactive-transaction client. */
export interface StreamLifecycleDb {
  stream: { updateMany: (args: any) => Promise<{ count: number }> };
  streamViewingSession: { updateMany: (args: any) => Promise<{ count: number }> };
}

export function elapsedSeconds(
  stream: { startedAt?: Date | string | null; createdAt: Date | string },
  endedAt: Date = new Date(),
): number {
  const from = new Date((stream.startedAt as any) || (stream.createdAt as any)).getTime();
  const secs = Math.floor((endedAt.getTime() - from) / 1000);
  return secs > 0 ? secs : 0;
}

/**
 * The one place that finishes a stream row. Every end path (streamer ends, admin force-end, ban,
 * account deletion, grace-period watchdog, reconciler, go-live replacing the previous stream) must
 * go through it so that viewing sessions are always closed - an ACTIVE session on an ended stream
 * keeps its viewer's heartbeat running and keeps billing 5 coins a minute for nothing.
 *
 * Idempotent: only a stream that is not already ENDED/CANCELLED is changed, and the sessions are
 * closed either way (so a stream that was ended elsewhere without closing them is healed).
 * Does NOT touch LiveKit - callers close the room before/after, outside any DB transaction.
 */
export async function finalizeStreamRecord(
  db: StreamLifecycleDb,
  stream: { id: string; startedAt?: Date | string | null; createdAt: Date | string },
  opts: {
    endedAt?: Date;
    status?: 'ENDED' | 'CANCELLED';
    sessionStatus?: ViewingSessionStatus;
  } = {},
): Promise<{ changed: boolean; durationSeconds: number }> {
  const endedAt = opts.endedAt ?? new Date();
  const durationSeconds = elapsedSeconds(stream, endedAt);

  const res = await db.stream.updateMany({
    where: { id: stream.id, status: { notIn: [StreamStatus.ENDED, StreamStatus.CANCELLED] } },
    data: { status: opts.status ?? StreamStatus.ENDED, endedAt, durationSeconds },
  });

  await db.streamViewingSession.updateMany({
    where: { streamId: stream.id, status: ViewingSessionStatus.ACTIVE },
    data: { status: opts.sessionStatus ?? ViewingSessionStatus.COMPLETED_NATURAL, endedAt },
  });

  return { changed: res.count > 0, durationSeconds };
}
