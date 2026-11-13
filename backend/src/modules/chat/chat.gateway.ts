import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { ChatService } from './chat.service';
import { PresenceService } from './presence.service';
import { PresenceAccessor } from './presence.accessor';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import Redis from 'ioredis';
import { UserRole, UserStatus } from '@prisma/client';
import { StreamsService } from '../streams/streams.service';

class InMemoryChatCache {
  private rateLimits = new Map<string, number>();
  private counts = new Map<string, number>();
  private mutes = new Map<string, number>();

  constructor() {
    // M-07: Periodic cleanup to prevent memory growth under sustained load.
    // rateLimits and mutes never shrink on their own — with many unique users
    // over time the Maps could grow until Node OOMs.
    // Runs every 5 minutes: purges rateLimits older than 5 min, expired mutes.
    setInterval(() => {
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      for (const [k, v] of this.rateLimits) {
        if (now - v > fiveMinutes) this.rateLimits.delete(k);
      }
      for (const [k, v] of this.mutes) {
        if (v < now) this.mutes.delete(k);
      }
    }, 5 * 60 * 1000).unref(); // .unref() so it doesn't keep the process alive during tests
  }

  checkRateLimit(key: string, cooldownMs: number): boolean {
    const now = Date.now();
    const last = this.rateLimits.get(key) || 0;
    if (now - last < cooldownMs) {
      return false;
    }
    this.rateLimits.set(key, now);
    return true;
  }

  incr(key: string, windowMs: number): number {
    const current = this.counts.get(key) || 0;
    const next = current + 1;
    this.counts.set(key, next);
    setTimeout(() => {
      const c = this.counts.get(key) || 0;
      if (c <= 1) this.counts.delete(key);
      else this.counts.set(key, c - 1);
    }, windowMs);
    return next;
  }

  mute(key: string, durationMinutes: number) {
    this.mutes.set(key, Date.now() + durationMinutes * 60 * 1000);
  }

  isMuted(key: string): boolean {
    const expiresAt = this.mutes.get(key);
    if (!expiresAt) return false;
    if (Date.now() > expiresAt) {
      this.mutes.delete(key);
      return false;
    }
    return true;
  }
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL
      ? [process.env.FRONTEND_URL, 'http://localhost:3000']
      : (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) =>
          callback(null, true),
    credentials: true,
  },
  namespace: '/',
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private redis: Redis | null = null;
  private readonly memoryCache = new InMemoryChatCache();

  constructor(
    private readonly chatService: ChatService,
    private readonly presenceService: PresenceService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => StreamsService))
    private readonly streamsService: StreamsService,
  ) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.redis = new Redis(redisUrl, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 0,
      });
      this.redis.on('error', (err) => {
        this.logger.debug(`Redis offline: ${err.message}`);
      });
    } catch {
      this.redis = null;
    }
  }

  afterInit(_server: Server) {
    // Wire PresenceService → this gateway (avoids circular DI in constructor)
    this.presenceService.setGateway(this);
    // Register in global accessor so VideoModule's webhook controller can reach it
    PresenceAccessor.set(this.presenceService);
    // Wire StreamsService with lazy references to PresenceService + ChatGateway
    if (this.streamsService?.setDependencies) {
      this.streamsService.setDependencies(this.presenceService, this);
    }
  }

  private isRedisReady(): boolean {
    return !!(this.redis && this.redis.status === 'ready');
  }

  private async resolveVerifiedSocketUser(rawToken?: string) {
    if (!rawToken) return null;
    const secret =
      process.env.JWT_ACCESS_SECRET ||
      (process.env.NODE_ENV !== 'production' ? 'jwt_default_insecure_access_secret_key' : '');
    if (!secret) return null;

    try {
      const cleanToken = rawToken.replace(/^Bearer\s+/i, '');
      const payload = this.jwtService.verify(cleanToken, { secret });
      if (!payload?.sub || payload?.purpose === '2fa_challenge' || payload?.is2FAChallenge) {
        return null;
      }

      const dbUser = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          name: true,
          role: true,
          status: true,
          deletedAt: true,
          passwordChangedAt: true,
        },
      });
      if (
        !dbUser ||
        dbUser.deletedAt ||
        dbUser.status === UserStatus.BANNED ||
        dbUser.status === UserStatus.SUSPENDED ||
        dbUser.status === UserStatus.DELETION_REQUESTED
      ) {
        return null;
      }

      if (dbUser.passwordChangedAt && payload.iat && new Date(payload.iat * 1000) < dbUser.passwordChangedAt) {
        return null;
      }

      return { ...payload, sub: dbUser.id, name: dbUser.name, role: dbUser.role };
    } catch {
      return null;
    }
  }

  async handleConnection(client: Socket) {
    const token =
      client.handshake.auth?.token ||
      (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');
    client.data.user = await this.resolveVerifiedSocketUser(token);
    if (client.data.user?.sub) {
      client.join(`user:${client.data.user.sub}`);
    }
  }

  handleDisconnect(client: Socket) {
    // Chat-only socket disconnect: remove from chat-only viewer tracking if applicable.
    // NOTE: Do NOT decrement LiveKit-sourced viewer count here — that is the webhook's job.
    // We only clean up client.data to free memory.
    const streamId = client.data?.streamId;
    if (streamId) {
      // Leave per-identity socket room (clean up for future targeted emits)
      const identity = client.data?.livekitIdentity || client.data?.user?.sub;
      if (identity) {
        client.leave(`identity:${streamId}:${identity}`);
      }
    }
    client.data = {};
  }

  @SubscribeMessage('chat:join')
  async handleJoinStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string; sessionId?: string },
  ) {
    const { streamId } = data;
    if (!streamId) return;

    // Check if stream exists
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) return;

    // S-01/S-02 / B-17: Private stream chat requires authorized streamer/admin or active session token/ID
    if (stream.visibility === 'PRIVATE') {
      const userId = client.data.user?.sub;
      const isStreamer = userId && userId === stream.streamerId;
      const isAdmin = client.data.user?.role === 'ADMIN';
      if (!isStreamer && !isAdmin) {
        const sessionId = data.sessionId || client.handshake.auth?.sessionId;
        const session = await this.prisma.viewerSession.findFirst({
          where: {
            streamId,
            leftAt: null,
            isRemoved: false,
            OR: [
              ...(userId ? [{ userId }] : []),
              ...(sessionId ? [{ id: sessionId }] : []),
            ],
          },
        });
        if (!session) {
          client.emit('chat:error', { message: 'Unauthorized: Private pooja chat requires an active consultation pass' });
          return;
        }
      }
    }

    // Check if user is blocked from this stream
    if (client.data.user?.sub) {
      const blocked = await this.prisma.blockedViewer.findFirst({
        where: { streamId, userId: client.data.user.sub },
      });
      if (blocked) {
        client.emit('chat:error', { message: 'You have been blocked from this stream' });
        client.disconnect();
        return;
      }
    }

    client.join(`stream:${streamId}`);
    client.data.streamId = streamId;

    // Persist sessionId for guest identity resolution later
    if (data.sessionId) {
      client.data.sessionId = data.sessionId;
    }

    // Join per-identity room for targeted kick events
    const userId2 = client.data.user?.sub;
    const sessionId2 = data.sessionId || client.handshake.auth?.sessionId;
    const livekitIdentity = userId2 || (sessionId2 ? `priv_guest_${sessionId2}` : null);
    if (livekitIdentity) {
      client.data.livekitIdentity = livekitIdentity;
      client.join(`identity:${streamId}:${livekitIdentity}`);
    }

    // Send current viewer count to this client
    await this.presenceService.sendCountToSocket(streamId, client.id);

    // Send recent chat messages to joining client
    const recent = await this.chatService.getRecentChat(streamId, 30);
    client.emit('chat:history', recent.reverse());
  }

  @SubscribeMessage('stream:viewer_list:request')
  async handleViewerListRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string },
  ) {
    const user = client.data.user;
    if (!user || !data?.streamId) return;

    const { streamId } = data;
    if (!streamId) return;

    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) return;

    const isModerator = stream.streamerId === user.sub || user.role === UserRole.ADMIN;
    if (!isModerator) return;

    const list = await this.presenceService.getViewerList(streamId, stream.streamerId);
    client.emit('stream:viewer_list', list);
  }

  @SubscribeMessage('chat:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string; message: string; guestName?: string; token?: string },
  ) {
    let user = client.data.user;

    // Fallback: If socket connected before login token was available, verify cleanly against active DB user
    if (!user && (data as any)?.token) {
      user = await this.resolveVerifiedSocketUser((data as any).token);
      if (user) {
        client.data.user = user;
        client.join(`user:${user.sub}`);
      }
    }

    const { streamId, message, guestName } = data;
    if (!streamId || !message || typeof message !== 'string') return;

    // Check if chat is enabled on this stream
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream || !stream.isChatEnabled) {
      client.emit('chat:error', { message: 'Live chat is currently disabled for this stream.' });
      return;
    }

    // FR-C2: Message length capped at 500 characters
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0 || trimmedMessage.length > 500) {
      client.emit('chat:error', { message: 'Message must be between 1 and 500 characters.' });
      return;
    }

    // FR-C2: Rate limit of 1 message per second
    const actorId = user?.sub || client.id;
    const rateLimitKey = `rate:chat:${streamId}:${actorId}`;
    let isAllowed = this.memoryCache.checkRateLimit(rateLimitKey, 1000);
    try {
      if (this.isRedisReady() && this.redis) {
        const rateLimited = await this.redis.set(rateLimitKey, '1', 'EX', 1, 'NX');
        if (!rateLimited) isAllowed = false;
      }
    } catch {
      // Redis unavailable - memoryCache already handled rate limit
    }

    if (!isAllowed) {
      client.emit('chat:error', { message: 'Slow down: maximum 1 message per second permitted.' });
      return;
    }

    // Check if user is muted in this stream
    const muteKey = `mute:${streamId}:${actorId}`;
    let isMuted = this.memoryCache.isMuted(muteKey);
    try {
      if (this.isRedisReady() && this.redis) {
        const redisMute = await this.redis.get(muteKey);
        if (redisMute) isMuted = true;
      }
    } catch {
      // Redis unavailable
    }

    if (isMuted) {
      client.emit('chat:error', { message: 'You are currently muted in this live stream.' });
      return;
    }

    // FR-C6: Prohibited words filter (using Devanagari-safe Indic filter)
    if (!this.chatService.wordFilter.isClean(trimmedMessage)) {
      client.emit('chat:error', { message: 'Your message contains prohibited or inappropriate language.' });
      return;
    }

    // Persist message (supports registered users and guest devotees)
    const saved = await this.chatService.saveMessage(streamId, user?.sub || null, trimmedMessage);

    // Broadcast message to all viewers in stream room (NFR-P4: <1s delivery)
    this.server.to(`stream:${streamId}`).emit('chat:message', {
      id: saved.id,
      streamId,
      message: saved.message,
      createdAt: saved.createdAt,
      user: {
        id: saved.user?.id || actorId,
        name: saved.user?.name || guestName || 'Devotee',
        avatarUrl: saved.user?.avatarUrl || null,
        role: saved.user?.role || 'VIEWER',
      },
      isPinned: false,
    });
  }

  /**
   * Ephemeral Spiritual Reactions (FR-C8: folded hands, flower, diya, bell, om)
   * Broadcast directly over Socket.io room without writing to DB!
   */
  @SubscribeMessage('chat:reaction')
  async handleReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string; emoji: string },
  ) {
    const { streamId, emoji } = data;
    const allowedEmojis = [
      'diya', 'lotus', 'pranam', 'bell', 'om', 'conch',
      '🙏', '🪔', '🌸', '🔔', '🕉️', '🌺', '🐚',
      '🥥', '❤️', '✨', '💐', '🚩', '📿'
    ];

    if (!streamId || !allowedEmojis.includes(emoji)) return;

    // Rate-limit reaction spam per client session (max 5 per second)
    const reactionKey = `rate:react:${streamId}:${client.id}`;
    let count = this.memoryCache.incr(reactionKey, 1000);
    try {
      if (this.isRedisReady() && this.redis) {
        count = await this.redis.incr(reactionKey);
        if (count === 1) {
          await this.redis.expire(reactionKey, 1);
        }
      }
    } catch {
      // Redis unavailable - memoryCache tracked count
    }

    if (count > 5) return;

    // Broadcast ephemeral reaction event to room
    this.server.to(`stream:${streamId}`).emit('chat:reaction', {
      streamId,
      emoji,
      senderId: client.id,
    });
  }

  // --- Moderation Events (FR-C3, FR-C4) ---

  @SubscribeMessage('chat:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string; messageId: string },
  ) {
    const user = client.data.user;
    if (!user || !data?.streamId || !data?.messageId) return;

    const stream = await this.prisma.stream.findUnique({ where: { id: data.streamId } });
    if (!stream) return;

    const isModerator = stream.streamerId === user.sub || user.role === UserRole.ADMIN;
    if (!isModerator) return;

    const msg = await this.prisma.chatMessage.findUnique({ where: { id: data.messageId } });
    if (!msg || msg.streamId !== data.streamId) return;

    await this.chatService.deleteMessage(data.messageId);
    if (this.server) {
      this.server.to(`stream:${data.streamId}`).emit('chat:message_deleted', {
        messageId: data.messageId,
      });
    }
  }

  @SubscribeMessage('chat:pin')
  async handlePinMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string; messageId: string },
  ) {
    const user = client.data.user;
    if (!user || !data?.streamId || !data?.messageId) return;

    const stream = await this.prisma.stream.findUnique({ where: { id: data.streamId } });
    if (!stream) return;

    const isModerator = stream.streamerId === user.sub || user.role === UserRole.ADMIN;
    if (!isModerator) return;

    const msg = await this.prisma.chatMessage.findUnique({ where: { id: data.messageId } });
    if (!msg || msg.streamId !== data.streamId) return;

    const pinned = await this.chatService.pinMessage(data.streamId, data.messageId);
    if (this.server) {
      this.server.to(`stream:${data.streamId}`).emit('chat:message_pinned', {
        messageId: pinned.id,
        message: pinned.message,
      });
    }
  }

  @SubscribeMessage('chat:mute')
  async handleMuteUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string; targetUserId: string; durationMinutes?: number },
  ) {
    const user = client.data.user;
    if (!user || !data?.streamId || !data?.targetUserId) return;

    const stream = await this.prisma.stream.findUnique({ where: { id: data.streamId } });
    if (!stream) return;

    const isModerator = stream.streamerId === user.sub || user.role === UserRole.ADMIN;
    if (!isModerator) return;

    const minutes = Math.min(Math.max(data.durationMinutes || 15, 1), 1440);
    const muteKey = `mute:${data.streamId}:${data.targetUserId}`;
    this.memoryCache.mute(muteKey, minutes);
    try {
      if (this.isRedisReady() && this.redis) {
        await this.redis.set(muteKey, '1', 'EX', minutes * 60);
      }
    } catch {
      // Redis unavailable
    }

    // G6: Only write ModerationAction.targetUserId when it is a real UUID (FK to User.id).
    // Guest socket.id / priv_guest_* strings would cause a Prisma FK violation.
    const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isRealUserId = UUID_PATTERN.test(data.targetUserId);
    await this.prisma.moderationAction.create({
      data: {
        actorId: user.sub,
        ...(isRealUserId ? { targetUserId: data.targetUserId } : {}),
        streamId: data.streamId,
        actionType: 'MUTE',
        durationMinutes: minutes,
      },
    });

    // G7: Send chat:user_muted only to the target's own socket room (not the entire stream room)
    // so other viewers don't know who was muted.
    if (this.server) {
      const targetRoom = `identity:${data.streamId}:${data.targetUserId}`;
      this.server.to(targetRoom).emit('chat:user_muted', {
        userId: data.targetUserId,
        durationMinutes: minutes,
      });
    }
  }

  broadcastDakshina(streamId: string, dakshina: any) {
    if (this.server) {
      this.server.to(`stream:${streamId}`).emit('stream:dakshina_received', dakshina);
    }
  }

  emitEarningsUpdated(
    streamerId: string,
    payload: {
      streamId: string;
      totalCoins: number;
      delta: number;
      source: 'DAKSHINA' | 'WATCH_TIME';
    },
  ) {
    if (this.server && streamerId) {
      this.server.to(`user:${streamerId}`).emit('stream:earnings_updated', payload);
    }
  }

  /**
   * Emit stream:kicked to a specific viewer's identity room.
   * Called by StreamsService.kickViewer() after removing from LiveKit.
   */
  emitKick(streamId: string, identity: string, payload: { reason?: string; blocked: boolean }) {
    if (this.server) {
      this.server
        .to(`identity:${streamId}:${identity}`)
        .emit('stream:kicked', payload);
    }
  }

  /**
   * Broadcast updated viewer count to everyone in the stream room.
   * Also delegates to PresenceService for throttle + Redis pub/sub cross-process relay.
   */
  broadcastViewerCount(streamId: string) {
    this.presenceService.broadcastCount(streamId);
  }
}
