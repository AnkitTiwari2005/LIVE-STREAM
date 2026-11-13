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

interface InternalViewerRecord extends ViewerEntry {
  socketIds: Set<string>;
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  /** Publisher / regular redis connection */
  private redis: Redis | null = null;

  /** Dedicated subscriber connection (a subscribed redis client cannot issue commands) */
  private redisSubscriber: Redis | null = null;

  /** In-memory fallback sets: streamId -> Set<identity> */
  private readonly memoryViewers = new Map<string, Set<string>>();

  /** In-memory rich viewer registry: streamId -> Map<identity, InternalViewerRecord> */
  private readonly streamViewers = new Map<string, Map<string, InternalViewerRecord>>();

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

  /**
   * Register a viewer session from Socket.IO or LiveKit webhook.
   * Tracks multiple sockets per identity so multi-tab or reconnect does not inflate count.
   */
  async addViewerSession(
    streamId: string,
    identity: string,
    displayName: string = 'Devotee',
    isGuest: boolean = false,
    socketId?: string,
  ): Promise<{ isNewViewer: boolean; count: number }> {
    let streamMap = this.streamViewers.get(streamId);
    if (!streamMap) {
      streamMap = new Map();
      this.streamViewers.set(streamId, streamMap);
    }

    let isNewViewer = false;
    let record = streamMap.get(identity);

    if (record) {
      if (socketId) record.socketIds.add(socketId);
      if (displayName && displayName !== 'Devotee') {
        record.displayName = displayName;
      }
    } else {
      isNewViewer = true;
      record = {
        identity,
        displayName: displayName || 'Devotee',
        isGuest,
        joinedAtMs: Date.now(),
        socketIds: new Set(socketId ? [socketId] : []),
      };
      streamMap.set(identity, record);
    }

    // Keep memoryViewers Set in sync
    const mem = this.memoryViewers.get(streamId) ?? new Set();
    mem.add(identity);
    this.memoryViewers.set(streamId, mem);

    // Redis sync (Set for identities + Hash for rich metadata)
    try {
      if (this.isRedisReady() && this.redis) {
        await this.redis.sadd(`stream:viewers:${streamId}`, identity);
        await this.redis.hset(
          `stream:viewer_meta:${streamId}`,
          identity,
          JSON.stringify({
            identity,
            displayName: record.displayName,
            isGuest: record.isGuest,
            joinedAtMs: record.joinedAtMs,
          }),
        );
        await this.redis.expire(`stream:viewers:${streamId}`, 3600);
        await this.redis.expire(`stream:viewer_meta:${streamId}`, 3600);
      }
    } catch {}

    const count = await this.getCount(streamId);
    return { isNewViewer, count };
  }

  /** Backward-compatible helper (calls addViewerSession) */
  async addViewer(streamId: string, identity: string) {
    const isGuest = identity.startsWith('priv_guest_') || identity.startsWith('guest_');
    await this.addViewerSession(streamId, identity, 'Devotee', isGuest);
  }

  /**
   * Remove a viewer socket or identity.
   * If socketId is provided, identity is only evicted when all sockets for that identity disconnect.
   */
  async removeViewerSocket(
    streamId: string,
    identity: string,
    socketId?: string,
  ): Promise<{ isViewerRemoved: boolean; count: number }> {
    const streamMap = this.streamViewers.get(streamId);
    let isViewerRemoved = false;

    if (streamMap) {
      const record = streamMap.get(identity);
      if (record) {
        if (socketId) {
          record.socketIds.delete(socketId);
        }
        // Evict if no socketId specified or zero remaining sockets
        if (!socketId || record.socketIds.size === 0) {
          streamMap.delete(identity);
          isViewerRemoved = true;
          if (streamMap.size === 0) {
            this.streamViewers.delete(streamId);
          }
        }
      }
    } else {
      // Fallback if record was only in memoryViewers
      const mem = this.memoryViewers.get(streamId);
      if (mem && mem.has(identity)) {
        mem.delete(identity);
        isViewerRemoved = true;
      }
    }

    if (isViewerRemoved) {
      const mem = this.memoryViewers.get(streamId);
      if (mem) {
        mem.delete(identity);
        if (mem.size === 0) this.memoryViewers.delete(streamId);
      }

      try {
        if (this.isRedisReady() && this.redis) {
          await this.redis.srem(`stream:viewers:${streamId}`, identity);
          await this.redis.hdel(`stream:viewer_meta:${streamId}`, identity);
        }
      } catch {}
    }

    const count = await this.getCount(streamId);
    return { isViewerRemoved, count };
  }

  /** Backward-compatible helper */
  async removeViewer(streamId: string, identity: string) {
    await this.removeViewerSocket(streamId, identity);
  }

  async getCount(streamId: string): Promise<number> {
    const memCount =
      this.streamViewers.get(streamId)?.size ??
      this.memoryViewers.get(streamId)?.size ??
      0;
    try {
      if (this.isRedisReady() && this.redis) {
        const redisCount = await this.redis.scard(`stream:viewers:${streamId}`);
        return Math.max(redisCount, memCount);
      }
    } catch {}
    return memCount;
  }

  async clearStream(streamId: string) {
    try {
      if (this.isRedisReady() && this.redis) {
        await this.redis.del(`stream:viewers:${streamId}`);
        await this.redis.del(`stream:viewer_meta:${streamId}`);
      }
    } catch {}
    this.memoryViewers.delete(streamId);
    this.streamViewers.delete(streamId);
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
    const viewersMap = new Map<string, ViewerEntry>();

    // 1. Gather all viewers from local in-memory registry
    const streamMap = this.streamViewers.get(streamId);
    if (streamMap) {
      for (const [id, record] of streamMap.entries()) {
        if (id !== streamerId) {
          viewersMap.set(id, {
            identity: record.identity,
            displayName: record.displayName,
            isGuest: record.isGuest,
            joinedAtMs: record.joinedAtMs,
          });
        }
      }
    }

    // 2. Supplement from Redis hash if available
    try {
      if (this.isRedisReady() && this.redis) {
        const metas = await this.redis.hgetall(`stream:viewer_meta:${streamId}`);
        if (metas) {
          for (const [id, jsonStr] of Object.entries(metas)) {
            if (id !== streamerId && !viewersMap.has(id)) {
              try {
                const parsed = JSON.parse(jsonStr);
                viewersMap.set(id, parsed);
              } catch {}
            }
          }
        }
      }
    } catch {}

    // 3. Supplement with LiveKit room participants (best-effort)
    try {
      const participants = await this.videoProvider.listParticipants(streamId);
      for (const p of participants) {
        if (!p.hidden && p.identity !== streamerId) {
          const existing = viewersMap.get(p.identity);
          if (existing) {
            if (p.name && (!existing.displayName || existing.displayName === 'Devotee')) {
              existing.displayName = p.name;
            }
            if (p.joinedAtMs) {
              existing.joinedAtMs = Math.min(existing.joinedAtMs, p.joinedAtMs);
            }
          } else {
            viewersMap.set(p.identity, {
              identity: p.identity,
              displayName: p.name || 'Devotee',
              isGuest: p.identity.startsWith('priv_guest_') || p.identity.startsWith('guest_'),
              joinedAtMs: p.joinedAtMs || Date.now(),
            });
          }
        }
      }
    } catch (err: any) {
      this.logger.debug(`getViewerList LiveKit fallback: ${err.message}`);
    }

    // 4. Resolve missing names from DB
    const list = Array.from(viewersMap.values());
    const unresolvedUserIds = list
      .filter((v) => !v.isGuest && (!v.displayName || v.displayName === 'Devotee'))
      .map((v) => v.identity);

    if (unresolvedUserIds.length > 0) {
      try {
        const dbUsers = await this.prisma.user.findMany({
          where: { id: { in: unresolvedUserIds } },
          select: { id: true, name: true },
        });
        const nameMap = new Map(dbUsers.map((u) => [u.id, u.name]));
        for (const v of list) {
          const resolvedName = nameMap.get(v.identity);
          if (resolvedName) v.displayName = resolvedName;
        }
      } catch {}
    }

    const unresolvedGuestSessionIds = list
      .filter((v) => v.isGuest && (!v.displayName || v.displayName === 'Devotee'))
      .map((v) => v.identity.replace('priv_guest_', ''));

    if (unresolvedGuestSessionIds.length > 0) {
      try {
        const guestSessions = await this.prisma.viewerSession.findMany({
          where: { id: { in: unresolvedGuestSessionIds } },
          select: { id: true, guestName: true },
        });
        const guestNameMap = new Map(guestSessions.map((s) => [s.id, s.guestName ?? 'Devotee']));
        for (const v of list) {
          const sId = v.identity.replace('priv_guest_', '');
          const gName = guestNameMap.get(sId);
          if (gName) v.displayName = gName;
        }
      } catch {}
    }

    return list.sort((a, b) => a.joinedAtMs - b.joinedAtMs);
  }

  // ---------------------------------------------------------------------------
  // Reconciler (called by CronTasksService every 30s)
  // ---------------------------------------------------------------------------

  /**
   * Syncs Redis viewer sets against LiveKit ground truth for all active streams
   * while keeping actively connected chat viewers intact.
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
          const livekitViewers = participants.filter(
            (p) => !p.hidden && p.identity !== stream.streamerId,
          );

          // Add any LiveKit participants into presence
          for (const p of livekitViewers) {
            await this.addViewerSession(
              stream.id,
              p.identity,
              p.name || 'Devotee',
              p.identity.startsWith('priv_guest_') || p.identity.startsWith('guest_'),
            );
          }

          const count = await this.getCount(stream.id);

          // Update peakViewers if count grew
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
