import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import Redis from 'ioredis';
import { UserRole } from '@prisma/client';

class InMemoryChatCache {
  private rateLimits = new Map<string, number>();
  private counts = new Map<string, number>();
  private mutes = new Map<string, number>();

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
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  },
  namespace: '/',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private redis: Redis | null = null;
  private readonly memoryCache = new InMemoryChatCache();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
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

  private isRedisReady(): boolean {
    return !!(this.redis && this.redis.status === 'ready');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');
      if (token) {
        const payload = this.jwtService.verify(token, {
          secret: process.env.JWT_ACCESS_SECRET || 'jwt_default_insecure_access_secret_key',
        });
        client.data.user = payload;
      }
    } catch {
      // Unauthenticated or guest connection
      client.data.user = null;
    }
  }

  handleDisconnect(client: Socket) {
    // Cleanup on client drop
  }

  @SubscribeMessage('chat:join')
  async handleJoinStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string },
  ) {
    const { streamId } = data;
    if (!streamId) return;

    // Check if stream exists
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) return;

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

    // Send recent chat messages to joining client
    const recent = await this.chatService.getRecentChat(streamId, 30);
    client.emit('chat:history', recent.reverse());
  }

  @SubscribeMessage('chat:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string; message: string; guestName?: string; token?: string },
  ) {
    let user = client.data.user;

    // Fallback: If socket connected before login token was available, verify from message payload
    if (!user && (data as any)?.token) {
      try {
        const rawToken = (data as any).token.replace(/^Bearer\s+/i, '');
        user = this.jwtService.verify(rawToken, {
          secret: process.env.JWT_ACCESS_SECRET || 'jwt_default_insecure_access_secret_key',
        });
        client.data.user = user;
      } catch {}
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
      '🙏', '🪔', '🌸', '🔔', '🕉️', '🌺', '🐚'
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
    if (!user) return;

    const stream = await this.prisma.stream.findUnique({ where: { id: data.streamId } });
    if (!stream) return;

    const isModerator = stream.streamerId === user.sub || user.role === UserRole.ADMIN;
    if (!isModerator) return;

    await this.chatService.deleteMessage(data.messageId);
    this.server.to(`stream:${data.streamId}`).emit('chat:message_deleted', {
      messageId: data.messageId,
    });
  }

  @SubscribeMessage('chat:pin')
  async handlePinMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string; messageId: string },
  ) {
    const user = client.data.user;
    if (!user) return;

    const stream = await this.prisma.stream.findUnique({ where: { id: data.streamId } });
    if (!stream) return;

    const isModerator = stream.streamerId === user.sub || user.role === UserRole.ADMIN;
    if (!isModerator) return;

    const pinned = await this.chatService.pinMessage(data.streamId, data.messageId);
    this.server.to(`stream:${data.streamId}`).emit('chat:message_pinned', {
      messageId: pinned.id,
      message: pinned.message,
    });
  }

  @SubscribeMessage('chat:mute')
  async handleMuteUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string; targetUserId: string; durationMinutes?: number },
  ) {
    const user = client.data.user;
    if (!user) return;

    const stream = await this.prisma.stream.findUnique({ where: { id: data.streamId } });
    if (!stream) return;

    const isModerator = stream.streamerId === user.sub || user.role === UserRole.ADMIN;
    if (!isModerator) return;

    const minutes = data.durationMinutes || 15;
    const muteKey = `mute:${data.streamId}:${data.targetUserId}`;
    this.memoryCache.mute(muteKey, minutes);
    try {
      if (this.isRedisReady() && this.redis) {
        await this.redis.set(muteKey, '1', 'EX', minutes * 60);
      }
    } catch {
      // Redis unavailable
    }

    await this.prisma.moderationAction.create({
      data: {
        actorId: user.sub,
        targetUserId: data.targetUserId,
        streamId: data.streamId,
        actionType: 'MUTE',
        durationMinutes: minutes,
      },
    });

    this.server.to(`stream:${data.streamId}`).emit('chat:user_muted', {
      userId: data.targetUserId,
      durationMinutes: minutes,
    });
  }

  broadcastDakshina(streamId: string, dakshina: any) {
    if (this.server) {
      this.server.to(`stream:${streamId}`).emit('stream:dakshina_received', dakshina);
    }
  }
}
