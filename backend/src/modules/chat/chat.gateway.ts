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
import { Logger, Inject, forwardRef, Optional } from '@nestjs/common';
import { ChatService } from './chat.service';
import { PresenceService } from './presence.service';
import { PresenceAccessor } from './presence.accessor';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import Redis from 'ioredis';
import { UserRole, UserStatus } from '@prisma/client';
import { StreamsService } from '../streams/streams.service';
import { isDevMode } from '../../common/runtime-mode';
import { TokenBlacklistService } from '../../common/token-blacklist.service';

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

/**
 * Browsers must come from our own origin(s). Native/server clients send no Origin header and are allowed
 * (auth is the explicit handshake token, never cookies, so there is no cross-site hijack path either way).
 */
export function isAllowedSocketOrigin(origin: string | undefined, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!origin) return true;
  const allowed = new Set<string>();
  for (const v of [env.FRONTEND_ORIGIN, env.FRONTEND_URL, env.CORS_ORIGIN, ...(env.CORS_ORIGINS || '').split(',')]) {
    if (v && v.trim()) allowed.add(v.trim().replace(/\/$/, ''));
  }
  if (env.DOMAIN) {
    allowed.add(`https://${env.DOMAIN}`);
    allowed.add(`https://www.${env.DOMAIN}`);
  }
  if (isDevMode(env)) {
    allowed.add('http://localhost:3000');
    allowed.add('http://127.0.0.1:3000');
    allowed.add('http://localhost:4000');
  }
  return allowed.has(origin.replace(/\/$/, ''));
}

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => callback(null, isAllowedSocketOrigin(origin)),
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
  // Short-lived caches so a busy chat does not turn into 3 DB reads per message.
  private readonly streamCache = new Map<string, { at: number; row: any }>();
  private readonly accessCache = new Map<string, { at: number; ok: boolean; reason?: string }>();
  private readonly muteCache = new Map<string, { at: number; until: number }>();
  static readonly STREAM_TTL_MS = 5_000;
  static readonly ACCESS_TTL_MS = 10_000;
  static readonly MUTE_TTL_MS = 15_000;

  constructor(
    private readonly chatService: ChatService,
    private readonly presenceService: PresenceService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => StreamsService))
    private readonly streamsService: StreamsService,
    @Optional() private readonly tokenBlacklist?: TokenBlacklistService,
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
      // lazyConnect never connected on its own, so every Redis branch below was dead code.
      this.redis.connect().catch(() => {
        /* Redis is optional: the in-memory limiter and DB-backed mutes keep working */
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
      (isDevMode() ? 'jwt_default_insecure_access_secret_key' : '');
    if (!secret) return null;

    try {
      const cleanToken = rawToken.replace(/^Bearer\s+/i, '');
      const payload = this.jwtService.verify(cleanToken, { secret });
      if (!payload?.sub || payload?.purpose === '2fa_challenge' || payload?.is2FAChallenge) {
        return null;
      }
      // N11: a logged-out / rotated token must not open or keep a socket either
      if (payload.jti && this.tokenBlacklist && (await this.tokenBlacklist.isRevoked(payload.jti))) {
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
    client.data.joinedStreams = new Set<string>();
    client.data.sessionIds = {} as Record<string, string>;
    if (client.data.user?.sub) client.join(`user:${client.data.user.sub}`);
  }

  private async getStreamRow(streamId: string) {
    const hit = this.streamCache.get(streamId);
    if (hit && Date.now() - hit.at < ChatGateway.STREAM_TTL_MS) return hit.row;
    const row = await this.prisma.stream.findUnique({ where: { id: streamId } });
    this.streamCache.set(streamId, { at: Date.now(), row });
    if (this.streamCache.size > 500) this.streamCache.clear();
    return row;
  }

  /** Is this sender still allowed to speak in the stream (not blocked; private: session still valid)? */
  private async checkSenderAccess(
    client: Socket,
    stream: any,
    userId: string | null,
    guestSessionId: string | null = null,
  ): Promise<{ ok: boolean; reason?: string }> {
    const key = `${stream.id}:${userId ?? `g:${guestSessionId}`}`;
    const hit = this.accessCache.get(key);
    if (hit && Date.now() - hit.at < ChatGateway.ACCESS_TTL_MS) return hit;
    let res: { ok: boolean; reason?: string } = { ok: true };
    const isModerator = (!!userId && userId === stream.streamerId) || client.data.user?.role === UserRole.ADMIN;
    if (!isModerator && !userId && guestSessionId) {
      // private-link guest: the ViewerSession must still be valid, and its IP must not be blocked
      const session = await this.prisma.viewerSession.findFirst({
        where: { id: guestSessionId, streamId: stream.id, leftAt: null, isRemoved: false },
      });
      if (!session) res = { ok: false, reason: 'Your access to this private pooja has ended' };
      else if (session.ipAddress) {
        const blocked = await this.prisma.blockedViewer.findFirst({
          where: { streamId: stream.id, sessionFingerprint: session.ipAddress },
        });
        if (blocked) res = { ok: false, reason: 'You have been blocked from this stream' };
      }
    } else if (!isModerator && userId) {
      const blocked = await this.prisma.blockedViewer.findFirst({ where: { streamId: stream.id, userId } });
      if (blocked) res = { ok: false, reason: 'You have been blocked from this stream' };
      else if (stream.visibility === 'PRIVATE') {
        const sessionId = client.data.sessionIds?.[stream.id];
        const session = await this.prisma.viewerSession.findFirst({
          where: {
            streamId: stream.id,
            leftAt: null,
            isRemoved: false,
            OR: [{ userId }, ...(sessionId ? [{ id: sessionId }] : [])],
          },
        });
        if (!session) res = { ok: false, reason: 'Your access to this private pooja has ended' };
      }
    }
    this.accessCache.set(key, { at: Date.now(), ...res });
    if (this.accessCache.size > 5000) this.accessCache.clear();
    return res;
  }

  /** Mutes survive restarts: the ModerationAction row is the source of truth, memory/Redis are caches. */
  private async isMutedDurable(streamId: string, userId: string): Promise<boolean> {
    const key = `${streamId}:${userId}`;
    const hit = this.muteCache.get(key);
    if (hit && Date.now() - hit.at < ChatGateway.MUTE_TTL_MS) return hit.until > Date.now();
    let until = 0;
    try {
      const last = await this.prisma.moderationAction.findFirst({
        where: { streamId, targetUserId: userId, actionType: 'MUTE' },
        orderBy: { createdAt: 'desc' },
      });
      if (last?.durationMinutes) until = last.createdAt.getTime() + last.durationMinutes * 60_000;
    } catch {
      /* DB hiccup: fall back to the in-memory mute only */
    }
    this.muteCache.set(key, { at: Date.now(), until });
    if (this.muteCache.size > 5000) this.muteCache.clear();
    return until > Date.now();
  }

  /**
   * Remove a user/session from a stream's chat room NOW (kick, revoke, block). Clears the caches that
   * would otherwise keep authorising them for up to ACCESS_TTL_MS.
   */
  async evict(streamId: string, who: { userId?: string | null; sessionId?: string | null }): Promise<number> {
    if (who.userId) this.accessCache.delete(`${streamId}:${who.userId}`);
    if (!this.server) return 0;
    let n = 0;
    const sockets = await this.server.in(`stream:${streamId}`).fetchSockets();
    for (const sk of sockets) {
      const uid = sk.data?.user?.sub;
      const sid = sk.data?.sessionIds?.[streamId];
      if ((who.userId && uid === who.userId) || (who.sessionId && sid === who.sessionId)) {
        sk.emit('chat:error', { message: 'You have been removed from this stream chat' });
        sk.leave(`stream:${streamId}`);
        sk.data?.joinedStreams?.delete?.(streamId);
        n++;
      }
    }
    return n;
  }

  /** Drop every socket of a user (account banned/suspended/deleted mid-stream). */
  async evictUser(userId: string): Promise<void> {
    for (const k of [...this.accessCache.keys()]) if (k.endsWith(`:${userId}`)) this.accessCache.delete(k);
    if (this.server) this.server.in(`user:${userId}`).disconnectSockets(true);
  }

  async handleDisconnect(client: Socket) {
    // One socket can join several streams (tab navigation): release the presence of EVERY one of them,
    // not only the last (client.data.streamId), or the earlier streams keep a ghost viewer forever.
    const tracked: Map<string, string> | undefined = client.data?.presence;
    if (tracked) {
      for (const [streamId, identity] of tracked.entries()) {
        client.leave(`identity:${streamId}:${identity}`);
        const { isViewerRemoved, count } = await this.presenceService.removeViewerSocket(
          streamId,
          identity,
          client.id,
        );
        if (isViewerRemoved) {
          this.presenceService.broadcastCount(streamId, count);
          this.server.to(`stream:${streamId}`).emit('stream:viewer_left', { streamId, identity });
        }
      }
    }
    client.data = {};
  }

  /** Display names come from the database; whatever a client sends is cut down to a short, plain label. */
  private static safeName(raw: unknown, fallback = 'Devotee'): string {
    const cleaned = String(raw ?? '')
      .normalize('NFKC')
      .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2060\ufeff]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40);
    return cleaned || fallback;
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

    // The only guest identity we ever trust is a ViewerSession row that exists, belongs to this stream and
    // is still valid. A sessionId the client merely claims on a public stream proves nothing.
    let validGuestSession: { id: string; guestName?: string | null } | null = null;
    let validSessionId: string | null = null;

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
        validSessionId = (session as any).id;
        if (!userId) validGuestSession = session as any;
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
    (client.data.joinedStreams ??= new Set<string>()).add(streamId);
    // Only a session the database confirmed is remembered; a sessionId the client merely claims is not.
    if (validSessionId) (client.data.sessionIds ??= {})[streamId] = validSessionId;
    if (validGuestSession) {
      (client.data.guestNames ??= {})[streamId] = ChatGateway.safeName(validGuestSession.guestName, 'Guest Devotee');
    }

    // Persist sessionId for guest identity resolution later
    if (data.sessionId) {
      client.data.sessionId = data.sessionId;
    }

    // Join per-identity room for targeted kick events
    const userId2 = client.data.user?.sub;
    const isStreamer = Boolean(userId2 && userId2 === stream.streamerId);
    // Counted identities: a signed-in user, or a validated private-link guest. An anonymous socket on a
    // public stream is a lurker: it receives chat and counts, but it is not a devotee in the room (it
    // cannot even obtain a video token), so it never enters presence, peakViewers or the join banner.
    const livekitIdentity: string | null = userId2
      ? userId2
      : validGuestSession
        ? `priv_guest_${validGuestSession.id}`
        : null;

    client.data.isStreamer = isStreamer;
    if (livekitIdentity) {
      client.data.livekitIdentity = livekitIdentity;
      client.join(`identity:${streamId}:${livekitIdentity}`);
    }

    if (!isStreamer && livekitIdentity) {
      const displayName = ChatGateway.safeName(
        client.data.user?.name ?? validGuestSession?.guestName,
        validGuestSession ? 'Guest Devotee' : 'Devotee',
      );
      const isGuest = !userId2;
      client.data.displayName = displayName;
      (client.data.presence ??= new Map<string, string>()).set(streamId, livekitIdentity);

      const { isNewViewer, count } = await this.presenceService.addViewerSession(
        streamId,
        livekitIdentity,
        displayName,
        isGuest,
        client.id,
      );

      if (isNewViewer) {
        this.presenceService.broadcastCount(streamId, count);

        // Studio list (moderators' sockets only would be better; kept to the room for compatibility)
        this.server.to(`stream:${streamId}`).emit('stream:viewer_joined', {
          identity: livekitIdentity,
          displayName,
          isGuest,
          joinedAtMs: Date.now(),
        });

        // Join banner: only while the room is small - at 100 devotees it is pure noise - and always from
        // the sanitised, database-sourced name above.
        if (count <= 25) {
          this.server.to(`stream:${streamId}`).emit('chat:message', {
            id: `join_${livekitIdentity}_${Date.now()}`,
            streamId,
            message: `${displayName} has joined the sacred darshan 🙏`,
            createdAt: new Date().toISOString(),
            user: { id: livekitIdentity, name: displayName, role: isGuest ? 'GUEST' : 'DEVOTEE' },
            isSystem: true,
            systemType: 'JOIN',
          });
        }

        if (count > stream.peakViewers) {
          this.prisma.stream.update({ where: { id: streamId }, data: { peakViewers: count } }).catch(() => {});
        }
      }
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

    const { streamId, message } = data;
    if (!streamId || !message || typeof message !== 'string') return;

    // Only signed-in devotees can speak (the UI already requires it). This also removes client-chosen
    // display names ("Pandit") and anonymous rows that have no author.
    // A private-link guest is allowed too, but only through the session chat:join validated.
    const guestSessionId: string | null = !user?.sub ? (client.data.sessionIds?.[streamId] ?? null) : null;
    if (!user?.sub && !guestSessionId) {
      client.emit('chat:error', { message: 'Please sign in to participate in sacred live chat.' });
      return;
    }
    const senderId: string = user?.sub ?? `priv_guest_${guestSessionId}`;

    // Check if chat is enabled on this stream, and that it is actually on air
    const stream = await this.getStreamRow(streamId);
    if (!stream || !stream.isChatEnabled) {
      client.emit('chat:error', { message: 'Live chat is currently disabled for this stream.' });
      return;
    }
    if (stream.status !== 'LIVE' && stream.status !== 'RECONNECTING_GRACE_PERIOD') {
      client.emit('chat:error', { message: 'Chat is only open while the stream is live.' });
      return;
    }

    // Re-check on every send (cached 10 s): blocked after joining, or private session revoked/kicked.
    const access = await this.checkSenderAccess(client, stream, user?.sub ?? null, guestSessionId);
    if (!access.ok) {
      client.emit('chat:error', { message: access.reason });
      return;
    }

    // Self-healing room admission: If client reconnected or joined before DB handshake finished,
    // auto-admit to room and presence now that stream status and access rights are fully verified.
    if (!client.data.joinedStreams?.has(streamId)) {
      client.join(`stream:${streamId}`);
      client.data.streamId = streamId;
      (client.data.joinedStreams ??= new Set<string>()).add(streamId);
      if (user?.sub) {
        client.join(`identity:${streamId}:${user.sub}`);
        const displayName = ChatGateway.safeName(user.name, 'Devotee');
        (client.data.presence ??= new Map<string, string>()).set(streamId, user.sub);
        this.presenceService.addViewerSession(streamId, user.sub, displayName, false, client.id).catch(() => {});
      }
    }

    // FR-C2: Message length capped at 500 characters
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0 || trimmedMessage.length > 500) {
      client.emit('chat:error', { message: 'Message must be between 1 and 500 characters.' });
      return;
    }

    // FR-C2: Rate limit of 1 message per second
    const actorId = senderId;
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

    if (!isMuted && user?.sub) isMuted = await this.isMutedDurable(streamId, user.sub);

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
        name: saved.user?.name || user?.name || client.data.guestNames?.[streamId] || 'Devotee',
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
    if (!client.data.joinedStreams?.has(streamId)) {
      const stream = await this.getStreamRow(streamId);
      if (stream && (stream.status === 'LIVE' || stream.status === 'RECONNECTING_GRACE_PERIOD')) {
        const access = await this.checkSenderAccess(client, stream, client.data.user?.sub ?? null, null);
        if (access.ok) {
          client.join(`stream:${streamId}`);
          client.data.streamId = streamId;
          (client.data.joinedStreams ??= new Set<string>()).add(streamId);
        } else {
          return;
        }
      } else {
        return;
      }
    }

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

    if (!data.targetUserId || typeof data.targetUserId !== 'string') return;
    const target = await this.prisma.user.findUnique({ where: { id: data.targetUserId }, select: { id: true } });
    if (!target) {
      client.emit('chat:error', { message: 'That user cannot be muted.' });
      return;
    }

    const minutes = Math.min(Math.max(data.durationMinutes || 15, 1), 1440);
    this.muteCache.delete(`${data.streamId}:${data.targetUserId}`);
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
