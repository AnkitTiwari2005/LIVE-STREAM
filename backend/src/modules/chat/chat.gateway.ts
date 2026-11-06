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
import { Logger, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import Redis from 'ioredis';
import { UserRole } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_ORIGIN || 'https://platform-domain.com',
    credentials: true,
  },
  namespace: '/',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private redis: Redis;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
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
    @MessageBody() data: { streamId: string; message: string },
  ) {
    const user = client.data.user;

    // FR-A2 & FR-C1: Guests cannot chat. Only verified registered users can chat.
    if (!user || !user.sub) {
      client.emit('chat:error', { message: 'Please log in and verify your email to chat in live streams.' });
      return;
    }

    const { streamId, message } = data;
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

    // FR-C2: Rate limit of 1 message per second per user using Redis
    const rateLimitKey = `rate:chat:${streamId}:${user.sub}`;
    const rateLimited = await this.redis.set(rateLimitKey, '1', 'EX', 1, 'NX');
    if (!rateLimited) {
      client.emit('chat:error', { message: 'Slow down: maximum 1 message per second permitted.' });
      return;
    }

    // Check if user is muted in this stream
    const isMuted = await this.redis.get(`mute:${streamId}:${user.sub}`);
    if (isMuted) {
      client.emit('chat:error', { message: 'You are currently muted in this live stream.' });
      return;
    }

    // FR-C6: Prohibited words filter (using Devanagari-safe Indic filter)
    if (!this.chatService.wordFilter.isClean(trimmedMessage)) {
      client.emit('chat:error', { message: 'Your message contains prohibited or inappropriate language.' });
      return;
    }

    // Persist message
    const saved = await this.chatService.saveMessage(streamId, user.sub, trimmedMessage);

    // Broadcast message to all viewers in stream room (NFR-P4: <1s delivery)
    this.server.to(`stream:${streamId}`).emit('chat:message', {
      id: saved.id,
      streamId,
      message: saved.message,
      createdAt: saved.createdAt,
      user: {
        id: saved.user.id,
        name: saved.user.name,
        avatarUrl: saved.user.avatarUrl,
        role: saved.user.role,
      },
      isPinned: false,
    });
  }

  /**
   * Ephemeral Spiritual Reactions (FR-C8: folded hands, flower, diya, bell, om)
   * Broadcast directly over Redis/Socket.io room without writing to DB!
   */
  @SubscribeMessage('chat:reaction')
  async handleReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string; emoji: string },
  ) {
    const { streamId, emoji } = data;
    const allowedEmojis = ['🙏', '🪔', '🌸', '🔔', '🕉️', '🌺'];

    if (!streamId || !allowedEmojis.includes(emoji)) return;

    // Rate-limit reaction spam per client session (max 3 per second)
    const reactionKey = `rate:react:${streamId}:${client.id}`;
    const count = await this.redis.incr(reactionKey);
    if (count === 1) {
      await this.redis.expire(reactionKey, 1);
    }
    if (count > 3) return;

    // Broadcast ephemeral reaction event
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
    await this.redis.set(`mute:${data.streamId}:${data.targetUserId}`, '1', 'EX', minutes * 60);

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
}
