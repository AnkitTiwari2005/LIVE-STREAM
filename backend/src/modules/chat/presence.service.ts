/**
 * PresenceService — live viewer count + viewer list for Shubhdarshan streams.
 *
 * Sources of truth (in order):
 *   1. Redis Set  `stream:viewers:{streamId}`  — identities of live viewers
 *   2. In-memory Map<streamId, Set<identity>>  — fallback when Redis is down
 *
 * Broadcast:
 *   - `stream:viewer_count` { streamId, count } throttled to 1/s per stream
 *   - Published to Redis channel `shubh:presence:count` so the worker process
 *     (which runs the reconciler cron but has no Socket.IO server) can notify
 *     the api process which does the actual socket.io broadcast.
 *
 * Not persisted to DB — counts are ephemeral live-only data.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  IVideoProviderService,
  VIDEO_PROVIDER_TOKEN,
} from '../video/interfaces/video-provider.interface';
import Redis from 'ioredis';

export interface ViewerEntry {
  identity: string;
  displayName: string;
  isGuest: boolean;
  joinedAtMs: number;
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  /** Publisher / regular redis connection */
  private redis: Redis | null = null;

  /** Dedicated subscriber connection (a subscribed redis client cannot issue commands) */
  private redisSubscriber: Redis | null = null;

  /** In-memory fallback when Redis is unavailable */
  private readonly memoryViewers = new Map<string, Set<string>>();

  /** Per-stream throttle timer handles */
  private readonly throttleTimers = new Map<string, NodeJS.Timeout>();

  /**
   * ChatGateway reference — set via setGateway() after gateway.afterInit()
   * to avoid a circular NestJS DI cycle (PresenceService→ChatGateway→ChatModule→PresenceService).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private gateway: any = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(VIDEO_PROVIDER_TOKEN)
    private readonly videoProvider: IVideoProviderService,
  ) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.redis = new Redis(redisUrl, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 0,
      });
      this.redis.on('error', (err) =>
        this.logger.debug(`PresenceService Redis offline: ${err.message}`),
      );
    } catch {
      this.redis = null;
    }
  }

  /**
   * Called by ChatGateway.afterInit() to wire in the gateway reference
   * and start the cross-process subscriber (api process only).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setGateway(gw: any) {
    this.gateway = gw;
    if (!this.redisSubscriber) {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      try {
        this.redisSubscriber = new Redis(redisUrl, {
          lazyConnect: true,
          enableOfflineQueue: false,
          maxRetriesPerRequest: 0,
        });
        this.redisSubscriber.on('error', () => {});
        this.redisSubscriber
          .subscribe('shubh:presence:count')
          .catch(() => {});
        this.redisSubscriber.on('message', (_channel, msg) => {
          try {
            const payload = JSON.parse(msg);
            if (payload?.streamId && typeof payload.count === 'number') {
              this.emitCount(payload.streamId, payload.count);
            }
          } catch {
            // malformed message — ignore
          }
        });
      } catch {
        this.redisSubscriber = null;
      }
    }
  }

  private isRedisReady(): boolean {
    return !!(this.redis && this.redis.status === 'ready');
  }

  // ---------------------------------------------------------------------------
  // Viewer tracking
  // ---------------------------------------------------------------------------

  async addViewer(streamId: string, identity: string) {
    try {
      if (this.isRedisReady() && this.redis) {
        await this.redis.sadd(`stream:viewers:${streamId}`, identity);
        await this.redis.expire(`stream:viewers:${streamId}`, 3600); // 1-hour TTL safety
      }
    } catch {
      // fall through to memory
    }
    const mem = this.memoryViewers.get(streamId) ?? new Set();
    mem.add(identity);
    this.memoryViewers.set(streamId, mem);
  }

  async removeViewer(streamId: string, identity: string) {
    try {
      if (this.isRedisReady() && this.redis) {
        await this.redis.srem(`stream:viewers:${streamId}`, identity);
      }
    } catch {
      // fall through to memory
    }
    const mem = this.memoryViewers.get(streamId);
    if (mem) {
      mem.delete(identity);
      if (mem.size === 0) this.memoryViewers.delete(streamId);
    }
  }

  async getCount(streamId: string): Promise<number> {
    try {
      if (this.isRedisReady() && this.redis) {
        return await this.redis.scard(`stream:viewers:${streamId}`);
      }
    } catch {
      // fall through to memory
    }
    return this.memoryViewers.get(streamId)?.size ?? 0;
  }

  async clearStream(streamId: string) {
    try {
      if (this.isRedisReady() && this.redis) {
        await this.redis.del(`stream:viewers:${streamId}`);
      }
    } catch {}
    this.memoryViewers.delete(streamId);
  }

  // ---------------------------------------------------------------------------
  // Broadcast helpers
  // ---------------------------------------------------------------------------

  /**
   * Throttled broadcast — at most 1 `stream:viewer_count` event per second per stream.
   * Also publishes to Redis channel so worker process can trigger the api's subscriber.
   */
  broadcastCount(streamId: string, count?: number) {
    if (this.throttleTimers.has(streamId)) return;
    const timer = setTimeout(async () => {
      this.throttleTimers.delete(streamId);
      const finalCount = count !== undefined ? count : await this.getCount(streamId);
      const payload = JSON.stringify({ streamId, count: finalCount });
      // Notify cross-process subscriber (worker→api relay)
      try {
        if (this.isRedisReady() && this.redis) {
          await this.redis.publish('shubh:presence:count', payload);
        }
      } catch {}
      // Direct emit if gateway is available in this process
      this.emitCount(streamId, finalCount);
    }, 1000);
    this.throttleTimers.set(streamId, timer);
  }

  /** Immediately emit count over Socket.IO (called in api process only) */
  private emitCount(streamId: string, count: number) {
    if (this.gateway?.server) {
      this.gateway.server
        .to(`stream:${streamId}`)
        .emit('stream:viewer_count', { streamId, count });
    }
  }

  /**
   * Send current viewer count to a single socket immediately (on chat:join).
   */
  async sendCountToSocket(streamId: string, socketId: string) {
    const count = await this.getCount(streamId);
    if (this.gateway?.server) {
      this.gateway.server
        .to(socketId)
        .emit('stream:viewer_count', { streamId, count });
    }
  }

  // ---------------------------------------------------------------------------
  // Viewer list (for studio panel)
  // ---------------------------------------------------------------------------

  async getViewerList(streamId: string, streamerId: string): Promise<ViewerEntry[]> {
    // Best effort: query LiveKit for live participant data
    const participants = await this.videoProvider.listParticipants(streamId);
    const viewers = participants.filter(
      (p) => !p.hidden && p.identity !== streamerId,
    );

    // Resolve display names for logged-in users
    const userIds = viewers
      .filter((p) => !p.identity.startsWith('priv_guest_'))
      .map((p) => p.identity);

    const dbUsers =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true },
          })
        : [];
    const userNameMap = new Map(dbUsers.map((u) => [u.id, u.name]));

    // Resolve guest names from ViewerSession
    const guestSessionIds = viewers
      .filter((p) => p.identity.startsWith('priv_guest_'))
      .map((p) => p.identity.replace('priv_guest_', ''));

    const guestSessions =
      guestSessionIds.length > 0
        ? await this.prisma.viewerSession.findMany({
            where: { id: { in: guestSessionIds } },
            select: { id: true, guestName: true },
          })
        : [];
    const guestNameMap = new Map(
      guestSessions.map((s) => [s.id, s.guestName ?? 'Devotee']),
    );

    return viewers.map((p) => {
      const isGuest = p.identity.startsWith('priv_guest_');
      const sessionId = isGuest ? p.identity.replace('priv_guest_', '') : null;
      const displayName = isGuest
        ? (guestNameMap.get(sessionId ?? '') ?? 'Devotee')
        : (userNameMap.get(p.identity) ?? 'Devotee');
      return {
        identity: p.identity,
        displayName,
        isGuest,
        joinedAtMs: p.joinedAtMs,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Reconciler (called by CronTasksService every 30s)
  // ---------------------------------------------------------------------------

  /**
   * Syncs Redis viewer sets against LiveKit ground truth for all active streams.
   * Also updates Stream.peakViewers (excluding streamer + hidden participants).
   * Safe to call from the worker process (emits via Redis pub/sub, not socket.io direct).
   */
  async reconcileAll() {
    try {
      const activeStreams = await this.prisma.stream.findMany({
        where: { status: { in: ['LIVE', 'RECONNECTING_GRACE_PERIOD'] } },
        select: { id: true, streamerId: true, peakViewers: true },
      });

      for (const stream of activeStreams) {
        try {
          const participants = await this.videoProvider.listParticipants(stream.id);
          const viewers = participants.filter(
            (p) => !p.hidden && p.identity !== stream.streamerId,
          );
          const count = viewers.length;

          // Rebuild Redis set
          if (this.isRedisReady() && this.redis) {
            const key = `stream:viewers:${stream.id}`;
            await this.redis.del(key);
            if (viewers.length > 0) {
              await this.redis.sadd(key, ...viewers.map((v) => v.identity));
              await this.redis.expire(key, 3600);
            }
          }

          // Update in-memory fallback
          const memSet = new Set(viewers.map((v) => v.identity));
          if (memSet.size > 0) this.memoryViewers.set(stream.id, memSet);
          else this.memoryViewers.delete(stream.id);

          // Fix peakViewers inflation: exclude streamer & hidden
          if (count > stream.peakViewers) {
            await this.prisma.stream.update({
              where: { id: stream.id },
              data: { peakViewers: count },
            });
          }

          // Broadcast updated count
          this.broadcastCount(stream.id, count);
        } catch (err: any) {
          this.logger.debug(`reconcileAll: stream ${stream.id}: ${err.message}`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`reconcileAll outer error: ${err.message}`);
    }
  }
}
