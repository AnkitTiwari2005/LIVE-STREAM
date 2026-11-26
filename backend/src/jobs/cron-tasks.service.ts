import { finalizeStreamRecord } from '../common/stream-lifecycle';
import { Injectable, Logger, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import {
  IVideoProviderService,
  VIDEO_PROVIDER_TOKEN,
} from '../modules/video/interfaces/video-provider.interface';
import { RemindersService } from '../modules/notifications/reminders.service';
import { StreamStatus, ViewingSessionStatus } from '@prisma/client';
import { DbActivityCoordinator, dbActivity } from '../common/db-activity.coordinator';

@Injectable()
export class CronTasksService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CronTasksService.name);
  private activity: DbActivityCoordinator = dbActivity;

  constructor(
    private readonly prisma: PrismaService,
    private readonly remindersService: RemindersService,
    @Inject(VIDEO_PROVIDER_TOKEN)
    private readonly videoProvider: IVideoProviderService,
  ) {}

  onModuleInit() {
    if (process.env.RUN_CRONS !== 'false') {
      this.activity.enableWorkerSubscriber();
    }
  }

  async onModuleDestroy() {
    await this.activity.shutdown();
  }

  /** Exposed for isolated unit tests so global singleton state is never polluted. */
  setActivityCoordinator(coordinator: DbActivityCoordinator) {
    this.activity = coordinator;
  }

  /**
   * 1. Stream Disconnect Watchdog:
   * Checks streams in RECONNECTING_GRACE_PERIOD for more than 2 minutes (120s) without reconnect.
   * Auto-ends them per FR-L6.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleStreamDisconnectWatchdog() {
    if (process.env.RUN_CRONS === 'false') return;
    if (!this.activity.shouldRunBroadcastWatchdogs()) return;

    const twoMinutesAgo = new Date(Date.now() - 120 * 1000);

    const abandonedStreams = await this.prisma.stream.findMany({
      where: {
        status: StreamStatus.RECONNECTING_GRACE_PERIOD,
        updatedAt: { lte: twoMinutesAgo },
      },
    });

    for (const stream of abandonedStreams) {
      this.logger.warn(`Stream [${stream.id}] exceeded 2-minute reconnect grace period. Auto-ending.`);
      await this.videoProvider.endRoom(stream.id);
      await finalizeStreamRecord(this.prisma as any, stream, {
        sessionStatus: ViewingSessionStatus.DISCONNECTED_TIMEOUT,
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
    const now = Date.now();
    if (!this.activity.shouldRunBroadcastWatchdogs(now)) return;

    // B-14: Cancel stale SCHEDULED streams older than 48 hours that never went live (hourly gate so
    // an idle serverless database is never woken every minute solely to prune 48h-old rows).
    if (this.activity.shouldRunStaleScheduleCleanup(now)) {
      const twoDaysAgo = new Date(now - 48 * 3600 * 1000);
      const staleCancelled = await this.prisma.stream.updateMany({
        where: { status: StreamStatus.SCHEDULED, scheduledAt: { lte: twoDaysAgo } },
        data: { status: StreamStatus.CANCELLED },
      });
      if ((staleCancelled?.count ?? 0) > 0) {
        this.activity.bumpPublicStreamsVersion();
      }
      this.activity.markStaleScheduleCleanupDone(now);
    }

    const activeLiveKitRooms = await this.videoProvider.listActiveRooms();
    // `null` = LiveKit could not be queried: infer nothing. An empty array is a REAL answer ("no rooms
    // exist") and is exactly the "only stream died" case, so it must be processed below.
    let closedZombieCount = 0;
    if (activeLiveKitRooms !== null) {
      const liveKitRoomNames = new Set(activeLiveKitRooms.map((r) => r.name));

      // Find DB streams marked LIVE that started more than 5 minutes ago
      const fiveMinutesAgo = new Date(now - 300 * 1000);
      const dbLiveStreams = await this.prisma.stream.findMany({
        where: {
          status: StreamStatus.LIVE,
          startedAt: { lte: fiveMinutesAgo },
        },
      });

      for (const stream of dbLiveStreams) {
        if (!liveKitRoomNames.has(stream.id)) {
          this.logger.warn(`Reconciler detected orphaned DB live stream [${stream.id}]. Ending stream.`);
          await finalizeStreamRecord(this.prisma as any, stream, {
            sessionStatus: ViewingSessionStatus.DISCONNECTED_TIMEOUT,
          });
        }
      }

      // Zombie rooms: a LiveKit room whose stream already ended keeps publishing/serving media for free
      // (e.g. an earlier deleteRoom failed). Close them.
      if (activeLiveKitRooms.length > 0) {
        const zombies = await this.prisma.stream.findMany({
          where: {
            id: { in: activeLiveKitRooms.map((r) => r.name) },
            status: { in: [StreamStatus.ENDED, StreamStatus.CANCELLED] },
          },
          select: { id: true },
        });
        for (const z of zombies) {
          this.logger.warn(`Closing zombie LiveKit room [${z.id}] of an ended stream.`);
          await this.videoProvider.endRoom(z.id);
          closedZombieCount++;
        }
      }
    }

    await this.refreshBroadcastActivityState(activeLiveKitRooms, closedZombieCount, now);
  }

  private async refreshBroadcastActivityState(
    activeLiveKitRooms: Array<{ name: string; sid: string; numParticipants: number }> | null,
    closedZombieCount: number,
    now: number,
  ) {
    try {
      const [liveOrGraceCount, activeSessionCount] = await Promise.all([
        this.prisma.stream?.count
          ? this.prisma.stream.count({
              where: { status: { in: [StreamStatus.LIVE, StreamStatus.RECONNECTING_GRACE_PERIOD] } },
            })
          : Promise.resolve(0),
        this.prisma.streamViewingSession?.count
          ? this.prisma.streamViewingSession.count({
              where: { status: ViewingSessionStatus.ACTIVE },
            })
          : Promise.resolve(0),
      ]);
      const unclosedRooms = activeLiveKitRooms ? activeLiveKitRooms.length - closedZombieCount : 0;
      const hasWork = liveOrGraceCount > 0 || activeSessionCount > 0 || unclosedRooms > 0;
      this.activity.completeBroadcastSweep(hasWork, now);
    } catch {
      // Keep active on transient DB errors so watchdogs never miss a live broadcast
      this.activity.completeBroadcastSweep(true, now);
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
    if (!this.activity.shouldRunBroadcastWatchdogs()) return;

    const ninetySecondsAgo = new Date(Date.now() - 90 * 1000);

    // Sweep: ACTIVE sessions on streams that are already over (ended by a path that did not close
    // them). They would otherwise stay ACTIVE forever, because the scan below only looks at LIVE streams.
    const swept = await this.prisma.streamViewingSession.updateMany({
      where: { status: 'ACTIVE', stream: { status: { in: [StreamStatus.ENDED, StreamStatus.CANCELLED] } } },
      data: { status: ViewingSessionStatus.COMPLETED_NATURAL, endedAt: new Date() },
    });
    if (swept.count > 0) this.logger.warn(`Closed ${swept.count} viewing session(s) left ACTIVE on ended streams.`);

    // Page through all expired sessions (a cap of 50 per run starved the queue during a mass drop-off).
    for (let page = 0; page < 20; page++) {
      const expiredSessions = await this.prisma.streamViewingSession.findMany({
        where: {
          status: 'ACTIVE',
          // R-03: also catch sessions where lastTickAt IS NULL.
          stream: { status: StreamStatus.LIVE },
          OR: [
            { lastTickAt: { lte: ninetySecondsAgo } },
            { lastTickAt: null, startedAt: { lte: ninetySecondsAgo } },
          ],
        },
        include: {
          stream: { select: { id: true, title: true } },
        },
        take: 50,
      });
      if (expiredSessions.length === 0) break;

      for (const session of expiredSessions) {
        this.logger.warn(
          `Viewer [${session.userId}] meter heartbeat timeout (>90s) in stream [${session.streamId}]. Evicting.`,
        );

        // Force eviction from LiveKit video room
        await this.videoProvider.kickParticipant(session.streamId, session.userId);

        await this.prisma.streamViewingSession.update({
          where: { id: session.id },
          data: {
            status: ViewingSessionStatus.DISCONNECTED_TIMEOUT,
            endedAt: new Date(),
          },
        });
      }
      if (expiredSessions.length < 50) break;
    }
  }

  /**
   * 3. 15-Minute Advance Reminder Dispatcher:
   * Scans for scheduled public streams starting within 15 minutes (FR-N3).
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async dispatchReminders() {
    if (process.env.RUN_CRONS === 'false') return;
    const now = Date.now();
    if (!this.activity.shouldRunReminders(now)) return;

    await this.remindersService.dispatch15MinuteReminders();

    // Only track future reminders matching dispatch15MinuteReminders (>= now) so an overdue
    // unstarted SCHEDULED stream never pins the reminder cron awake every minute for 48 hours.
    let nextScheduledAt: Date | null = null;
    try {
      const nextReminder = await this.prisma.streamReminder?.findFirst?.({
        where: {
          isSent15Min: false,
          stream: {
            status: StreamStatus.SCHEDULED,
            scheduledAt: { gte: new Date(now) },
          },
        },
        orderBy: { stream: { scheduledAt: 'asc' } },
        select: { stream: { select: { scheduledAt: true } } },
      });
      nextScheduledAt = nextReminder?.stream?.scheduledAt ?? null;
    } catch {
      nextScheduledAt = new Date(now);
    }
    this.activity.completeReminderSweep(nextScheduledAt, now);
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

    const oneEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

    // 1. Purge chat messages > 30 days old for concluded streams - except messages that an OPEN
    //    (unreviewed) report points at: deleting those destroyed the evidence before anyone looked.
    const deletedChat = await this.prisma.chatMessage.deleteMany({
      where: {
        createdAt: { lte: thirtyDaysAgo },
        stream: { status: { in: [StreamStatus.ENDED, StreamStatus.CANCELLED] } },
        reports: { none: { status: 'OPEN' } },
      },
    });

    // 1b. Purge viewer sessions > 30 days old for concluded streams to prevent unbounded table growth
    const deletedViewerSessions = await this.prisma.viewerSession.deleteMany({
      where: {
        joinedAt: { lte: thirtyDaysAgo },
        stream: { status: { in: [StreamStatus.ENDED, StreamStatus.CANCELLED] } },
      },
    });

    // 2. Anonymize personal identifiers > 90 days old (matches the published retention policy)
    const anonymizedIps = await this.prisma.viewerSession.updateMany({
      where: { joinedAt: { lte: ninetyDaysAgo }, ipAddress: { not: null } },
      data: { ipAddress: null },
    });
    const anonymizedBilling = await this.prisma.streamViewingSession.updateMany({
      where: {
        startedAt: { lte: ninetyDaysAgo },
        OR: [{ ipAddress: { not: null } }, { userAgent: { not: null } }],
      },
      data: { ipAddress: null, userAgent: null },
    });
    const anonymizedAudit = await this.prisma.auditLog.updateMany({
      where: { createdAt: { lte: ninetyDaysAgo }, ipAddress: { not: null } },
      data: { ipAddress: null },
    });
    // Block fingerprints are kept longer than 90 days so a kicked viewer cannot simply wait it out
    // (documented as 180 days in the privacy notice).
    const anonymizedBlocks = await this.prisma.blockedViewer.updateMany({
      where: { createdAt: { lte: oneEightyDaysAgo }, sessionFingerprint: { not: null } },
      data: { sessionFingerprint: null },
    });

    this.logger.log(`Retention cleanup finished: deleted ${deletedChat.count} old chat records; anonymized ${anonymizedIps.count} viewer, ${anonymizedBilling.count} billing, ${anonymizedAudit.count} audit and ${anonymizedBlocks.count} block records.`);
  }
}
