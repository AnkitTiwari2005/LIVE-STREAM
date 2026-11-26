import { Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { createOptionalRedisClient, resolveRedisUrl } from './redis/redis.util';

const DEFAULT_IDLE_SWEEP_MS = 3 * 60 * 60_000; // 3 hours
const REMINDER_LOOKAHEAD_MS = 17 * 60_000; // Wake 17m before next reminder window
const STALE_SCHEDULE_SWEEP_MS = 60 * 60_000; // 1 hour
const ACTIVITY_CHANNEL = 'shubh:db:activity';

export type ActivitySignal = 'broadcast' | 'broadcast_dirty' | 'reminders' | 'streams';

export class DbActivityCoordinator {
  private readonly logger = new Logger(DbActivityCoordinator.name);
  private broadcastActive = false;
  private broadcastDirty = true;
  private lastBroadcastSweepAt = 0;

  private remindersDirty = true;
  private nextReminderAtMs: number | null = null;
  private lastReminderSweepAt = 0;

  private lastStaleScheduleSweepAt = 0;
  private publicStreamsVersion = 0;

  private redisPub: Redis | null = null;
  private redisSub: Redis | null = null;
  private redisPubInitialized = false;
  private redisSubInitialized = false;

  getIdleSweepMs(): number {
    const raw = Number(process.env.CRON_IDLE_SWEEP_MS);
    return Number.isFinite(raw) && raw >= 60_000 ? raw : DEFAULT_IDLE_SWEEP_MS;
  }

  /**
   * Idle gating requires notifications to reach the cron scheduler:
   * - Single-process Hostinger / Node: in-memory signals reach CronTasksService directly.
   * - Multi-process Docker with Redis: Redis pub/sub relays signals from api -> worker.
   * - Split headless worker without Redis: cannot receive api mutations, so skip idle gating.
   */
  isIdleGatingEnabled(): boolean {
    if (process.env.WORKER_PROCESS === 'true' && !resolveRedisUrl()) {
      return false;
    }
    return true;
  }

  /** Attaches an optional Redis subscriber for worker processes when REDIS_URL is set. */
  enableWorkerSubscriber(): void {
    if (this.redisSubInitialized || !resolveRedisUrl()) return;
    this.redisSubInitialized = true;
    const sub = createOptionalRedisClient(this.logger, 'DbActivity (sub)');
    if (!sub) return;
    this.redisSub = sub;
    const subscribe = () => sub.subscribe(ACTIVITY_CHANNEL).catch(() => {});
    sub.on('ready', subscribe);
    if (sub.status === 'ready') subscribe();
    sub.on('message', (_channel, msg) => {
      this.applyRemoteSignal(msg as ActivitySignal);
    });
  }

  private publishSignal(signal: ActivitySignal): void {
    if (!resolveRedisUrl()) return;
    if (!this.redisPubInitialized) {
      this.redisPubInitialized = true;
      this.redisPub = createOptionalRedisClient(this.logger, 'DbActivity (pub)');
    }
    if (this.redisPub && this.redisPub.status === 'ready') {
      this.redisPub.publish(ACTIVITY_CHANNEL, signal).catch(() => {});
    }
  }

  private applyRemoteSignal(signal: ActivitySignal): void {
    switch (signal) {
      case 'broadcast':
        this.broadcastActive = true;
        this.broadcastDirty = true;
        this.publicStreamsVersion++;
        break;
      case 'broadcast_dirty':
        this.broadcastDirty = true;
        this.publicStreamsVersion++;
        break;
      case 'reminders':
        this.remindersDirty = true;
        break;
      case 'streams':
        this.publicStreamsVersion++;
        break;
    }
  }

  async shutdown(): Promise<void> {
    await Promise.allSettled([
      this.redisPub ? this.redisPub.quit() : Promise.resolve(),
      this.redisSub ? this.redisSub.quit() : Promise.resolve(),
    ]);
    this.redisPub = null;
    this.redisSub = null;
    this.redisPubInitialized = false;
    this.redisSubInitialized = false;
  }

  wakeBroadcasts(): void {
    this.broadcastActive = true;
    this.broadcastDirty = true;
    this.publicStreamsVersion++;
    this.publishSignal('broadcast');
  }

  markBroadcastDirty(): void {
    this.broadcastDirty = true;
    this.publicStreamsVersion++;
    this.publishSignal('broadcast_dirty');
  }

  completeBroadcastSweep(hasActiveWork: boolean, now = Date.now()): void {
    this.broadcastActive = hasActiveWork;
    this.broadcastDirty = false;
    this.lastBroadcastSweepAt = now;
  }

  shouldRunBroadcastWatchdogs(now = Date.now()): boolean {
    if (!this.isIdleGatingEnabled()) return true;
    if (this.broadcastActive || this.broadcastDirty) return true;
    return now - this.lastBroadcastSweepAt >= this.getIdleSweepMs();
  }

  isBroadcastActive(): boolean {
    return this.broadcastActive || this.broadcastDirty;
  }

  notifyScheduledReminder(scheduledAt: Date | string | null | undefined): void {
    if (!scheduledAt) {
      this.markRemindersDirty();
      return;
    }
    const ts = new Date(scheduledAt).getTime();
    if (!Number.isFinite(ts)) {
      this.markRemindersDirty();
      return;
    }
    this.nextReminderAtMs =
      this.nextReminderAtMs === null ? ts : Math.min(this.nextReminderAtMs, ts);
    // Notify remote worker via dirty signal because remote memory may have an older timestamp.
    this.publishSignal('reminders');
  }

  markRemindersDirty(): void {
    this.remindersDirty = true;
    this.publishSignal('reminders');
  }

  completeReminderSweep(nextScheduledAt: Date | string | null | undefined, now = Date.now()): void {
    const ts = nextScheduledAt ? new Date(nextScheduledAt).getTime() : NaN;
    this.nextReminderAtMs = Number.isFinite(ts) ? ts : null;
    this.remindersDirty = false;
    this.lastReminderSweepAt = now;
  }

  shouldRunReminders(now = Date.now()): boolean {
    if (!this.isIdleGatingEnabled()) return true;
    if (this.remindersDirty) return true;
    if (this.nextReminderAtMs !== null && now >= this.nextReminderAtMs - REMINDER_LOOKAHEAD_MS) {
      return true;
    }
    return now - this.lastReminderSweepAt >= this.getIdleSweepMs();
  }

  shouldRunStaleScheduleCleanup(now = Date.now()): boolean {
    return now - this.lastStaleScheduleSweepAt >= STALE_SCHEDULE_SWEEP_MS;
  }

  markStaleScheduleCleanupDone(now = Date.now()): void {
    this.lastStaleScheduleSweepAt = now;
  }

  bumpPublicStreamsVersion(): number {
    this.publicStreamsVersion++;
    this.publishSignal('streams');
    return this.publicStreamsVersion;
  }

  getPublicStreamsVersion(): number {
    return this.publicStreamsVersion;
  }

  resetForTest(): void {
    this.broadcastActive = false;
    this.broadcastDirty = true;
    this.lastBroadcastSweepAt = 0;
    this.remindersDirty = true;
    this.nextReminderAtMs = null;
    this.lastReminderSweepAt = 0;
    this.lastStaleScheduleSweepAt = 0;
    this.publicStreamsVersion = 0;
  }
}

export const dbActivity = new DbActivityCoordinator();
