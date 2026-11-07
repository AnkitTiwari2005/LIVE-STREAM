import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import {
  IVideoProviderService,
  VIDEO_PROVIDER_TOKEN,
} from '../modules/video/interfaces/video-provider.interface';
import { RemindersService } from '../modules/notifications/reminders.service';
import { StreamStatus, ViewingSessionStatus } from '@prisma/client';

@Injectable()
export class CronTasksService {
  private readonly logger = new Logger(CronTasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly remindersService: RemindersService,
    @Inject(VIDEO_PROVIDER_TOKEN)
    private readonly videoProvider: IVideoProviderService,
  ) {}

  /**
   * 1. Stream Disconnect Watchdog:
   * Checks streams in RECONNECTING_GRACE_PERIOD for more than 2 minutes (120s) without reconnect.
   * Auto-ends them per FR-L6.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleStreamDisconnectWatchdog() {
    if (process.env.RUN_CRONS === 'false') return;

    const twoMinutesAgo = new Date(Date.now() - 120 * 1000);

    const abandonedStreams = await this.prisma.stream.findMany({
      where: {
        status: StreamStatus.RECONNECTING_GRACE_PERIOD,
        updatedAt: { lte: twoMinutesAgo },
      },
    });

    for (const stream of abandonedStreams) {
      this.logger.warn(`Stream [${stream.id}] exceeded 2-minute reconnect grace period. Auto-ending.`);
      const endedAt = new Date();
      const duration = Math.floor((endedAt.getTime() - new Date(stream.startedAt || stream.createdAt).getTime()) / 1000);

      await this.videoProvider.endRoom(stream.id);

      await this.prisma.stream.update({
        where: { id: stream.id },
        data: {
          status: StreamStatus.ENDED,
          endedAt,
          durationSeconds: duration > 0 ? duration : 0,
        },
      });
    }
  }

  /**
   * 2. LiveKit Room State Reconciler:
   * Compares active LiveKit rooms with DB streams to resolve any dropped webhooks.
   * Safe guard: Never auto-ends if LiveKit returns empty list due to gateway timeout.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async reconcileLiveRooms() {
    if (process.env.RUN_CRONS === 'false') return;

    const activeLiveKitRooms = await this.videoProvider.listActiveRooms();
    // Safety guard: if LiveKit API fails or returns 0 rooms while DB has live streams, do not mass-end
    if (!activeLiveKitRooms || activeLiveKitRooms.length === 0) {
      return;
    }

    const liveKitRoomNames = new Set(activeLiveKitRooms.map((r) => r.name));

    // Find DB streams marked LIVE that started more than 5 minutes ago
    const fiveMinutesAgo = new Date(Date.now() - 300 * 1000);
    const dbLiveStreams = await this.prisma.stream.findMany({
      where: {
        status: StreamStatus.LIVE,
        startedAt: { lte: fiveMinutesAgo },
      },
    });

    for (const stream of dbLiveStreams) {
      if (!liveKitRoomNames.has(stream.id)) {
        this.logger.warn(`Reconciler detected orphaned DB live stream [${stream.id}]. Ending stream.`);
        await this.prisma.stream.update({
          where: { id: stream.id },
          data: {
            status: StreamStatus.ENDED,
            endedAt: new Date(),
          },
        });
      }
    }
  }

  /**
   * 3. Server-Authoritative Coin Billing Watchdog (H-01):
   * Runs every 30 seconds. Checks active viewer sessions.
   * If a viewer stops heartbeating (no meter tick for > 90s), they are forcefully evicted from LiveKit.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCoinMeterWatchdog() {
    if (process.env.RUN_CRONS === 'false') return;

    const ninetySecondsAgo = new Date(Date.now() - 90 * 1000);

    const expiredSessions = await this.prisma.streamViewingSession.findMany({
      where: {
        status: 'ACTIVE',
        lastTickAt: { lte: ninetySecondsAgo },
        stream: { status: StreamStatus.LIVE },
      },
      include: {
        stream: { select: { id: true, title: true } },
      },
      take: 50,
    });

    for (const session of expiredSessions) {
      this.logger.warn(
        `Viewer [${session.userId}] meter heartbeat timeout (>90s) in stream [${session.streamId}]. Evicting.`,
      );

      // Force eviction from LiveKit video room
      await this.videoProvider.kickParticipant(session.streamId, session.userId);

      await this.prisma.streamViewingSession.update({
        where: { id: session.id },
        data: {
          status: ViewingSessionStatus.EVICTED_ZERO_BALANCE,
          endedAt: new Date(),
        },
      });
    }
  }

  /**
   * 3. 15-Minute Advance Reminder Dispatcher:
   * Scans for scheduled public streams starting within 15 minutes (FR-N3).
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async dispatchReminders() {
    if (process.env.RUN_CRONS === 'false') return;
    await this.remindersService.dispatch15MinuteReminders();
  }

  /**
   * 4. Data Retention Cleanup:
   * Runs daily at 03:00 UTC.
   * - Purges chat messages older than 30 days for ended streams (FR-C7).
   * - Anonymizes viewer session IP addresses older than 90 days.
   */
  @Cron('0 3 * * *')
  async performDataRetentionPurge() {
    if (process.env.RUN_CRONS === 'false') return;

    this.logger.log('Executing automated data retention purge...');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // 1. Purge chat messages > 30 days old for concluded streams
    const deletedChat = await this.prisma.chatMessage.deleteMany({
      where: {
        createdAt: { lte: thirtyDaysAgo },
        stream: { status: { in: [StreamStatus.ENDED, StreamStatus.CANCELLED] } },
      },
    });

    // 2. Anonymize IP addresses > 90 days old
    const anonymizedIps = await this.prisma.viewerSession.updateMany({
      where: {
        joinedAt: { lte: ninetyDaysAgo },
        ipAddress: { not: null },
      },
      data: {
        ipAddress: null,
      },
    });

    this.logger.log(`Retention cleanup finished: Deleted ${deletedChat.count} old chat records, anonymized ${anonymizedIps.count} IP logs.`);
  }
}
