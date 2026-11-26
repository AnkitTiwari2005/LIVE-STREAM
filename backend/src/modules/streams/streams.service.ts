import { finalizeStreamRecord } from '../../common/stream-lifecycle';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  ServiceUnavailableException,
  ConflictException,
  Inject,
  Logger,
} from '@nestjs/common';
import { WalletService } from '../wallet/wallet.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateStreamDto } from './dto/create-stream.dto';
import { UpdateStreamDto } from './dto/update-stream.dto';
import { KickViewerDto } from './dto/kick-viewer.dto';
import { MuteParticipantDto } from './dto/video-guest.dto';
import { StreamStatus, StreamVisibility, UserRole, UserStatus, ViewingSessionStatus } from '@prisma/client';
import { validateStateTransition } from './state/stream-state-machine';
import {
  IVideoProviderService,
  VIDEO_PROVIDER_TOKEN,
} from '../video/interfaces/video-provider.interface';
import { getLiveKitPublicUrl } from '../../common/livekit-url.util';
import { dbActivity } from '../../common/db-activity.coordinator';

const PUBLIC_STREAMS_CACHE_TTL_MS = 15_000;

@Injectable()
export class StreamsService {
  private readonly logger = new Logger(StreamsService.name);
  static readonly MAX_ROOM_PARTICIPANTS = 100;
  private publicStreamsCache: { data: any[]; expiresAt: number; version: number } | null = null;

  // Set via StreamsService.setDependencies() called from ChatGateway.afterInit()
  // to avoid circular NestJS DI (StreamsModule ↔ ChatModule).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private presenceService: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private chatGateway: any = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setDependencies(presenceService: any, chatGateway: any) {
    this.presenceService = presenceService;
    this.chatGateway = chatGateway;
  }

  constructor(
    private readonly prisma: PrismaService,
    @Inject(VIDEO_PROVIDER_TOKEN)
    private readonly videoProvider: IVideoProviderService,
    private readonly walletService: WalletService,
  ) {}

  async createStream(streamerId: string, dto: CreateStreamDto) {
    const category = await this.prisma.streamCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundException('Selected category does not exist');

    const scheduledDate = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    const initialStatus = scheduledDate && scheduledDate > new Date()
      ? StreamStatus.SCHEDULED
      : StreamStatus.DRAFT;

    const stream = await this.prisma.stream.create({
      data: {
        streamerId,
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        thumbnailUrl: dto.thumbnailUrl,
        visibility: dto.visibility,
        status: initialStatus,
        videoQuality: dto.videoQuality || '480p',
        scheduledAt: scheduledDate,
      },
      include: { category: true },
    });

    dbActivity.bumpPublicStreamsVersion();
    this.logger.log(`Stream created [${stream.id}] by streamer ${streamerId} with status ${stream.status}`);
    return stream;
  }

  async getActiveLiveStreamForStreamer(streamerId: string) {
    return this.prisma.stream.findFirst({
      where: {
        streamerId,
        status: StreamStatus.LIVE,
      },
      include: { category: true },
    });
  }

  async endAllActiveLiveStreamsForStreamer(streamerId: string) {
    const activeStreams = await this.prisma.stream.findMany({
      where: {
        streamerId,
        status: { in: [StreamStatus.LIVE, StreamStatus.RECONNECTING_GRACE_PERIOD] },
      },
    });

    for (const s of activeStreams) {
      try {
        await this.videoProvider.endRoom(s.id);
      } catch {}
      await finalizeStreamRecord(this.prisma as any, s);
      this.logger.log(`Force-ended active live stream [${s.id}] for streamer [${streamerId}]`);
    }

    return { message: 'All active streams have been concluded', count: activeStreams.length };
  }

  async goLive(streamId: string, streamerId: string, forceEndPrevious: boolean = false) {
    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      include: { streamer: true },
    });

    if (!stream) throw new NotFoundException('Stream not found');

    if (stream.streamerId !== streamerId) {
      throw new ForbiddenException('Only the designated streamer can start this stream');
    }

    // B-12: Validate state transition first before modifying any stream state
    validateStateTransition(stream.status, StreamStatus.LIVE);

    // Capacity Gate 1: Check if streamer already has another active live stream
    const BROADCASTING = [StreamStatus.LIVE, StreamStatus.RECONNECTING_GRACE_PERIOD];
    const activeStreamForUser = await this.prisma.stream.findFirst({
      where: {
        streamerId,
        status: { in: BROADCASTING },
        id: { not: streamId },
      },
    });
    if (activeStreamForUser && !forceEndPrevious) {
      throw new BadRequestException('You already have another live broadcast in progress.');
    }

    // Capacity Gate 2: Check global concurrent live streams limit (max 3 for single VPS NFR-P1)
    // Streams in the reconnect grace period still occupy a slot; this stream (resuming from grace) and
    // the one about to be force-ended do not count against itself.
    const totalLiveStreams = await this.prisma.stream.count({
      where: {
        status: { in: BROADCASTING },
        id: { notIn: [streamId, ...(activeStreamForUser && forceEndPrevious ? [activeStreamForUser.id] : [])] },
      },
    });
    if (totalLiveStreams >= 3 && stream.status !== StreamStatus.LIVE) {
      throw new ServiceUnavailableException(
        'Platform streaming capacity is currently full (3 concurrent streams). Please wait a few moments.',
      );
    }

    // B-12: Create media room in LiveKit before ending previous stream or updating DB
    const room = await this.videoProvider.createRoom({
      roomName: stream.id,
      emptyTimeoutSeconds: 600,
      maxParticipants: StreamsService.MAX_ROOM_PARTICIPANTS,
    });

    const startedAt = stream.startedAt || new Date();

    // LiveKit is a network call: never make it inside the interactive transaction (default 5 s timeout
    // -> P2028 -> a 500 after the new room was already created).
    if (activeStreamForUser && forceEndPrevious) {
      try {
        await this.videoProvider.endRoom(activeStreamForUser.id);
      } catch {}
    }

    // Now end previous stream and mark new stream LIVE in one transaction. The advisory lock makes the
    // capacity re-count + status flip atomic, so concurrent go-lives cannot overshoot the cap.
    const [updatedStream] = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(727001)`);
      if (stream.status !== StreamStatus.LIVE) {
        const liveNow = await tx.stream.count({
          where: {
            status: { in: BROADCASTING },
            id: { notIn: [streamId, ...(activeStreamForUser && forceEndPrevious ? [activeStreamForUser.id] : [])] },
          },
        });
        if (liveNow >= 3) {
          throw new ServiceUnavailableException(
            'Platform streaming capacity is currently full (3 concurrent streams). Please wait a few moments.',
          );
        }
      }
      if (activeStreamForUser && forceEndPrevious) {
        await finalizeStreamRecord(tx as any, activeStreamForUser, {
          sessionStatus: ViewingSessionStatus.DISCONNECTED_TIMEOUT,
        });
      }

      const newlyLive = await tx.stream.update({
        where: { id: stream.id },
        data: {
          status: StreamStatus.LIVE,
          startedAt,
          livekitRoomSid: room.roomId,
        },
      });

      return [newlyLive];
    });

    // Generate publisher token — H-04: increased from 15 min to 180 min (3 hours)
    // A pandit streaming > 15 min was silently disconnected by LiveKit when the old token expired.
    const publisherToken = await this.videoProvider.generateToken({
      roomName: stream.id,
      participantId: streamerId,
      participantName: stream.streamer.name,
      isPublisher: true,
      canSubscribe: true,
      ttlMinutes: 180,
      metadata: { role: 'streamer' },
    });

    dbActivity.wakeBroadcasts();
    dbActivity.markRemindersDirty();
    this.logger.log(`Stream [${stream.id}] is now LIVE. Room: ${room.roomId}`);
    return {
      stream: updatedStream,
      publisherToken,
      serverUrl: getLiveKitPublicUrl(),
    };
  }

  async endStream(streamId: string, actorId: string, isAdmin: boolean = false) {
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) throw new NotFoundException('Stream not found');

    if (!isAdmin && stream.streamerId !== actorId) {
      throw new ForbiddenException('You do not have permission to terminate this stream');
    }

    if (stream.status === StreamStatus.ENDED || stream.status === StreamStatus.CANCELLED) {
      return { message: 'Stream has already concluded', stream };
    }

    const endedAt = new Date();
    const startedAt = stream.startedAt || stream.createdAt;
    const duration = Math.floor((endedAt.getTime() - new Date(startedAt).getTime()) / 1000);

    // Terminate room on LiveKit media plane
    await this.videoProvider.endRoom(stream.id);

    const updatedStream = await this.prisma.stream.update({
      where: { id: stream.id },
      data: {
        status: StreamStatus.ENDED,
        endedAt,
        durationSeconds: duration > 0 ? duration : 0,
      },
    });

    // B-13: Close all active viewing sessions when stream ends
    await this.prisma.streamViewingSession.updateMany({
      where: {
        streamId: stream.id,
        status: ViewingSessionStatus.ACTIVE,
      },
      data: {
        status: ViewingSessionStatus.COMPLETED_NATURAL,
        endedAt,
      },
    });

    if (isAdmin) {
      await this.prisma.auditLog.create({
        data: {
          actorId,
          action: 'STREAM_FORCE_ENDED',
          targetResource: `Stream:${streamId}`,
          details: { durationSeconds: duration, peakViewers: stream.peakViewers },
        },
      });
    }

    dbActivity.markBroadcastDirty();
    dbActivity.markRemindersDirty();
    this.logger.log(`Stream [${streamId}] ended. Duration: ${duration}s, Peak: ${stream.peakViewers}`);
    return { message: 'Stream ended successfully', stream: updatedStream };
  }

  async getViewerToken(streamId: string, userId?: string, guestName?: string, ip?: string) {
    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      include: { streamer: true },
    });

    if (!stream) throw new NotFoundException('Stream not found');

    // Reject non-live streams
    if (stream.status !== StreamStatus.LIVE && stream.status !== StreamStatus.RECONNECTING_GRACE_PERIOD) {
      throw new BadRequestException('This stream is not currently live');
    }

    // Reject private streams on public endpoint
    if (stream.visibility === StreamVisibility.PRIVATE) {
      throw new ForbiddenException('This is a private stream. Please join using your secret link.');
    }

    // Check if user is banned, deleted, or blocked
    let verifiedUser: any = null;
    if (userId) {
      const candidateUser = await this.prisma.user.findUnique({ where: { id: userId } });
      if (candidateUser) {
        if (candidateUser.status === UserStatus.BANNED || candidateUser.status === UserStatus.SUSPENDED) {
          throw new ForbiddenException('Your account is restricted from watching streams');
        }
        if (candidateUser.status !== UserStatus.DELETION_REQUESTED && !candidateUser.deletedAt) {
          verifiedUser = candidateUser;
          const isBlocked = await this.prisma.blockedViewer.findFirst({
            where: { streamId, userId: verifiedUser.id },
          });
          if (isBlocked) {
            throw new ForbiddenException('You have been blocked from viewing this live stream');
          }
        }
      }
    }

    const participantId = verifiedUser?.id || `guest_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    // guestName is client-supplied and becomes the participant's display name for everyone in the room:
    // accept only a short plain string (no control chars) so it cannot be used to impersonate or bloat the token.
    const cleanGuestName =
      typeof guestName === 'string' ? guestName.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 60) : '';
    const participantName = cleanGuestName || (verifiedUser ? verifiedUser.name || 'Registered Devotee' : 'Guest Devotee');

    let viewingSession: any = null;

    // Devotees watching public live streams are metered at 5 coins/min
    if (stream.visibility === StreamVisibility.PUBLIC) {
      if (!verifiedUser) {
        throw new UnauthorizedException(
          'Please sign in or register to receive your 100 free coins and join the sacred live darshan.'
        );
      }

      // If user is not the stream host/pandit or platform admin, meter their darshan session
      const isExempt = verifiedUser.id === stream.streamerId || verifiedUser.role === UserRole.ADMIN;
      if (!isExempt) {
        // A viewer who already holds an ACTIVE session is only reconnecting (page reload, network blip):
        // they have paid for it, so these gates apply to brand-new sessions only.
        const existingSession = await this.prisma.streamViewingSession.findFirst({
          where: { userId: verifiedUser.id, streamId, status: ViewingSessionStatus.ACTIVE },
          select: { id: true },
        });
        if (!existingSession) {
          if (stream.status === StreamStatus.RECONNECTING_GRACE_PERIOD) {
            throw new ServiceUnavailableException(
              'The pandit is reconnecting. Please try again in a minute - you have not been charged.',
            );
          }
          // Do not take coins for a room that cannot admit the viewer (LiveKit enforces maxParticipants).
          // Fail open when LiveKit cannot be queried: the room limit still holds server-side.
          const inRoom = await this.videoProvider.getRoomParticipantCount(stream.id);
          if (inRoom !== null && inRoom >= StreamsService.MAX_ROOM_PARTICIPANTS) {
            throw new ServiceUnavailableException(
              'This darshan is full right now. Please try again shortly - you have not been charged.',
            );
          }
        }
        viewingSession = await this.walletService.startViewingSession(verifiedUser.id, streamId, ip);
      }
    }

    // Record or update viewer session: de-duplicate reconnects for the same user in this stream
    // so 5-minute token refresh polling does not bloat the database with duplicate rows.
    let existingViewerSession: any = null;
    if (verifiedUser?.id) {
      existingViewerSession = await this.prisma.viewerSession.findFirst({
        where: {
          streamId,
          userId: verifiedUser.id,
          leftAt: null,
          isRemoved: false,
        },
        select: { id: true },
      });
    }

    if (!existingViewerSession) {
      await this.prisma.viewerSession.create({
        data: {
          streamId,
          userId: verifiedUser?.id || null,
          guestName: participantName,
          ipAddress: ip || null,
        },
      });
    }

    // R-03: Reduced viewer token TTL from 60 to 5 minutes.
    // A 60-min token cannot be revoked — if a viewer's session is terminated by the
    // watchdog or on zero balance, they could reconnect with the saved token for up to
    // an hour. With 5-min tokens the player calls fetchStreamAndToken() on reconnect
    // which re-validates the session before issuing a fresh token.
    const token = await this.videoProvider.generateToken({
      roomName: stream.id,
      participantId,
      participantName,
      isPublisher: false,
      canSubscribe: true,
      ttlMinutes: 5,
      metadata: { role: 'viewer', isGuest: !verifiedUser, sessionToken: viewingSession?.sessionToken },
    });

    return {
      token,
      serverUrl: getLiveKitPublicUrl(),
      streamTitle: stream.title,
      streamerName: stream.streamer.name,
      quality: stream.videoQuality,
      sessionToken: viewingSession?.sessionToken,
      remainingCoins: viewingSession?.remainingCoins,
      availableMinutes: viewingSession?.availableMinutes,
    };
  }

  async getPublicStreams(categoryId?: string, search?: string) {
    const isUnfiltered = !categoryId && !search;
    const now = Date.now();
    const version = dbActivity.getPublicStreamsVersion();
    if (
      isUnfiltered &&
      this.publicStreamsCache &&
      now < this.publicStreamsCache.expiresAt &&
      this.publicStreamsCache.version === version
    ) {
      return this.publicStreamsCache.data;
    }

    const where: any = {
      visibility: StreamVisibility.PUBLIC,
      status: { in: [StreamStatus.LIVE, StreamStatus.SCHEDULED] },
      // Stale SCHEDULED rows (never went live) are only cancelled after 48 h: don't list them meanwhile.
      OR: [
        { status: StreamStatus.LIVE },
        { scheduledAt: { gte: new Date(now - 6 * 3600 * 1000) } },
      ],
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const streams = await this.prisma.stream.findMany({
      where,
      include: {
        category: true,
        streamer: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            streamerProfile: { select: { isVerifiedBadge: true, specialties: true } },
          },
        },
      },
      orderBy: [
        { scheduledAt: 'asc' },
        { createdAt: 'desc' },
      ],
      take: 100,
    });

    // B-14: Explicitly sort LIVE streams before SCHEDULED streams
    const sorted = streams.sort((a, b) => {
      if (a.status === StreamStatus.LIVE && b.status !== StreamStatus.LIVE) return -1;
      if (a.status !== StreamStatus.LIVE && b.status === StreamStatus.LIVE) return 1;
      return 0;
    });

    if (isUnfiltered) {
      this.publicStreamsCache = {
        data: sorted,
        expiresAt: now + PUBLIC_STREAMS_CACHE_TTL_MS,
        version: dbActivity.getPublicStreamsVersion(),
      };
    }

    return sorted;
  }

  async getStreamerMine(streamerId: string) {
    return this.prisma.stream.findMany({
      where: { streamerId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStream(streamId: string, streamerId: string, dto: UpdateStreamDto) {
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) throw new NotFoundException('Stream not found');
    if (stream.streamerId !== streamerId) throw new ForbiddenException('Not your stream');
    // N-04: Only DRAFT or SCHEDULED streams can be edited
    if (stream.status !== StreamStatus.DRAFT && stream.status !== StreamStatus.SCHEDULED) {
      throw new BadRequestException('Only draft or scheduled streams can be updated');
    }
    const newSchedule = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    if (newSchedule && Number.isNaN(newSchedule.getTime())) {
      throw new BadRequestException('Invalid scheduled time');
    }
    if (newSchedule && newSchedule.getTime() <= Date.now()) {
      throw new BadRequestException('Scheduled time must be in the future');
    }
    const scheduleChanged =
      !!newSchedule && newSchedule.getTime() !== (stream.scheduledAt ? stream.scheduledAt.getTime() : NaN);

    const updated = await this.prisma.stream.update({
      where: { id: streamId },
      data: {
        title: dto.title ?? stream.title,
        description: dto.description ?? stream.description,
        categoryId: dto.categoryId ?? stream.categoryId,
        scheduledAt: newSchedule ?? stream.scheduledAt,
        thumbnailUrl: dto.thumbnailUrl ?? stream.thumbnailUrl,
        // A draft that gets a future time becomes a scheduled stream (same rule as createStream);
        // otherwise it never shows in the public list and never sends reminders.
        ...(newSchedule && stream.status === StreamStatus.DRAFT ? { status: StreamStatus.SCHEDULED } : {}),
      },
    });

    // New time => subscribers who were already reminded about the old one must be reminded again.
    if (scheduleChanged) {
      await this.prisma.streamReminder.updateMany({
        where: { streamId },
        data: { isSentScheduled: false, isSent15Min: false },
      });
    }
    dbActivity.bumpPublicStreamsVersion();
    if (scheduleChanged || (newSchedule && stream.status === StreamStatus.DRAFT)) {
      dbActivity.markRemindersDirty();
    }
    return updated;
  }

  async deleteStream(streamId: string, streamerId: string) {
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) throw new NotFoundException('Stream not found');
    if (stream.streamerId !== streamerId) throw new ForbiddenException('Not your stream');
    // N-04: Only DRAFT or SCHEDULED streams can be cancelled/deleted
    if (stream.status !== StreamStatus.DRAFT && stream.status !== StreamStatus.SCHEDULED) {
      throw new BadRequestException('Only draft or scheduled streams can be cancelled or deleted');
    }
    const cancelled = await this.prisma.stream.update({
      where: { id: streamId },
      data: { status: StreamStatus.CANCELLED },
    });
    dbActivity.bumpPublicStreamsVersion();
    dbActivity.markRemindersDirty();
    return cancelled;
  }

  async getStreamerPastStreams(streamerId: string) {
    return this.prisma.stream.findMany({
      where: {
        streamerId,
        status: { in: [StreamStatus.ENDED, StreamStatus.CANCELLED] },
      },
      include: { category: true },
      orderBy: { endedAt: 'desc' },
    });
  }

  async getStreamById(id: string, caller?: any) {
    const stream = await this.prisma.stream.findUnique({
      where: { id },
      include: {
        category: true,
        streamer: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            streamerProfile: { select: { isVerifiedBadge: true, bio: true } },
          },
        },
      },
    });
    if (!stream) throw new NotFoundException('Stream not found');

    // S-02: Private streams are invisible to general queries without ownership or admin role
    if (stream.visibility === StreamVisibility.PRIVATE) {
      const isOwner = caller && caller.id === stream.streamerId;
      const isAdmin = caller && caller.role === 'ADMIN';
      if (!isOwner && !isAdmin) {
        throw new NotFoundException('Stream not found');
      }
    }

    // Drafts are private work-in-progress: only the owner/admin can read them (CANCELLED stays readable -
    // the player's status poll needs to see it).
    if (stream.status === StreamStatus.DRAFT) {
      const isOwner = caller && caller.id === stream.streamerId;
      const isAdmin = caller && caller.role === 'ADMIN';
      if (!isOwner && !isAdmin) {
        throw new NotFoundException('Stream not found');
      }
    }

    return stream;
  }

  // ---------------------------------------------------------------------------
  // Feature C — Kick / Remove viewer (public + private streams)
  // ---------------------------------------------------------------------------

  /** Drop a user's / guest session's chat sockets from a stream room (kick, revoke, block). */
  async evictChat(streamId: string, who: { userId?: string | null; sessionId?: string | null }) {
    try {
      await this.chatGateway?.evict?.(streamId, who);
    } catch (err: any) {
      this.logger.warn(`Chat eviction failed for stream ${streamId}: ${err.message}`);
    }
  }

  async kickViewer(
    streamId: string,
    actorId: string,
    actorRole: string,
    identity: string,
    dto: KickViewerDto,
  ) {
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) throw new NotFoundException('Stream not found');

    const isModerator = stream.streamerId === actorId || actorRole === UserRole.ADMIN;
    if (!isModerator) throw new ForbiddenException('Not authorized to remove viewers');

    // 1. Kick from LiveKit
    await this.videoProvider.kickParticipant(streamId, identity);

    // 2. Determine if identity is a registered user or guest session
    const isGuest = identity.startsWith('priv_guest_');
    const targetUserId = isGuest ? null : identity;
    const targetSessionId = isGuest ? identity.replace('priv_guest_', '') : null;

    // 3. Stop coin billing (StreamViewingSession → EVICTED_BY_MODERATOR)
    // StreamViewingSession is keyed by userId only (guests don't have metered billing)
    // Only a registered user can have a metered session. For a guest there is nothing to stop, and a
    // where-clause without userId would end EVERY viewer's billing session on the stream.
    if (targetUserId) {
      await this.prisma.streamViewingSession.updateMany({
        where: { streamId, userId: targetUserId, status: 'ACTIVE' },
        data: {
          status: ViewingSessionStatus.EVICTED_BY_MODERATOR,
          endedAt: new Date(),
        },
      });
    }

    // 4. Mark ViewerSession as removed
    if (targetSessionId) {
      await this.prisma.viewerSession.updateMany({
        where: { id: targetSessionId, streamId },
        data: { isRemoved: true, leftAt: new Date() },
      });
    } else if (targetUserId) {
      await this.prisma.viewerSession.updateMany({
        where: { userId: targetUserId, streamId, isRemoved: false },
        data: { isRemoved: true, leftAt: new Date() },
      });
    }

    // 4b. Remove their chat sockets from the room right now (otherwise the 10 s access cache and the open
    //     socket keep them talking after the kick)
    await this.evictChat(streamId, { userId: targetUserId, sessionId: targetSessionId });

    // 5. Block if requested — create a BlockedViewer record
    if (dto.block) {
      // claimLink matches guests by IP (sessionFingerprint = ip) and users by userId; a session id never
      // matches anything, so resolve the guest's IP from their session.
      let guestIp: string | null = null;
      if (targetSessionId) {
        const sess = await this.prisma.viewerSession.findFirst({
          where: { id: targetSessionId, streamId },
          select: { ipAddress: true },
        });
        guestIp = sess?.ipAddress ?? null;
      }
      try {
        // Check if already blocked to avoid duplicates
        const existing = await this.prisma.blockedViewer.findFirst({
          where: {
            streamId,
            ...(targetUserId ? { userId: targetUserId } : {}),
            ...(targetSessionId ? { sessionFingerprint: guestIp ?? targetSessionId } : {}),
          },
        });
        if (!existing) {
          await this.prisma.blockedViewer.create({
            data: {
              streamId,
              ...(targetUserId ? { userId: targetUserId } : {}),
              ...(targetSessionId ? { sessionFingerprint: guestIp ?? targetSessionId } : {}),
              reason: dto.reason,
            },
          });
        }
      } catch (err: any) {
        this.logger.warn(`BlockedViewer create failed for ${identity}: ${err.message}`);
      }
    }

    // 6. Record ModerationAction
    const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    await this.prisma.moderationAction.create({
      data: {
        actorId,
        ...(targetUserId && UUID_PATTERN.test(targetUserId) ? { targetUserId } : {}),
        streamId,
        actionType: dto.block ? 'BLOCK' : 'KICK',
        reason: dto.reason,
      },
    });

    // 7. Notify the kicked client via Socket.IO
    if (this.chatGateway) {
      this.chatGateway.emitKick(streamId, identity, {
        reason: dto.reason,
        blocked: dto.block,
      });
    }

    // 7b. If they held the video slot it is free now (the participant is gone from LiveKit)
    this.chatGateway?.emitVideoGuestChanged?.(streamId, { identity, active: false });
    this.chatGateway?.clearVideoRequest?.(streamId, identity);

    // 8. Update viewer count
    if (this.presenceService) {
      await this.presenceService.removeViewer(streamId, identity);
      this.presenceService.broadcastCount(streamId);
    }

    this.logger.log(`Kicked viewer [${identity}] from stream [${streamId}] block=${dto.block}`);
    return {
      success: true,
      kicked: true,
      blocked: !!dto.block,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Public-stream "video guest": the pandit lets ONE devotee turn on camera + mic
  // for the current session only. LiveKit is the source of truth: the grant is a live
  // permission + a server-set attribute (videoGuest='1') on that participant, so it
  // disappears automatically when they leave/reconnect, the stream ends, or the pandit
  // revokes it. Nothing is persisted that could outlive the session.
  // ─────────────────────────────────────────────────────────────────────────────
  private readonly streamLocks = new Map<string, Promise<unknown>>();

  /** Serialises slot changes per stream so two quick clicks can never create two guests. */
  private withStreamLock<T>(streamId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.streamLocks.get(streamId) ?? Promise.resolve();
    const run = prev.catch(() => undefined).then(fn);
    const tail = run.catch(() => undefined);
    this.streamLocks.set(streamId, tail);
    tail.then(() => {
      if (this.streamLocks.get(streamId) === tail) this.streamLocks.delete(streamId);
    });
    return run;
  }

  private static readonly UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  private async loadModeratedStream(streamId: string, actorId: string, actorRole: string) {
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) throw new NotFoundException('Stream not found');
    if (stream.streamerId !== actorId && actorRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Not authorized');
    }
    return stream;
  }

  private async auditVideo(streamId: string, actorId: string, identity: string, type: 'VIDEO_GRANT' | 'VIDEO_REVOKE') {
    try {
      await this.prisma.moderationAction.create({
        data: {
          actorId,
          ...(StreamsService.UUID_RE.test(identity) ? { targetUserId: identity } : {}),
          streamId,
          actionType: type as any,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Audit ${type} failed for ${identity}: ${err.message}`);
    }
  }

  /** Current video guest (if any), read from LiveKit. */
  async getVideoGuest(streamId: string, actorId: string, actorRole: string) {
    await this.loadModeratedStream(streamId, actorId, actorRole);
    const list = await this.videoProvider.listParticipants(streamId);
    if (list === null) throw new ServiceUnavailableException('Video service is unavailable right now.');
    const g = list.find((p) => p.attributes?.videoGuest === '1' && p.canPublish);
    return { guest: g ? { identity: g.identity, name: g.name } : null };
  }

  async grantVideoGuest(
    streamId: string,
    actorId: string,
    actorRole: string,
    identity: string,
    opts: { replace?: boolean } = {},
  ) {
    return this.withStreamLock(streamId, async () => {
      const stream = await this.loadModeratedStream(streamId, actorId, actorRole);
      if (stream.visibility !== StreamVisibility.PUBLIC) {
        throw new BadRequestException('Video guests are for public streams. Private rooms are already two-way.');
      }
      if (stream.status !== StreamStatus.LIVE) throw new BadRequestException('The stream is not live.');
      if (identity === stream.streamerId) throw new BadRequestException('You are already broadcasting.');
      if (!StreamsService.UUID_RE.test(identity)) {
        throw new BadRequestException('Only signed-in devotees can be given the video slot.');
      }
      const blocked = await this.prisma.blockedViewer.findFirst({ where: { streamId, userId: identity } });
      if (blocked) throw new ForbiddenException('This devotee is blocked from the stream.');

      const list = await this.videoProvider.listParticipants(streamId);
      if (list === null) throw new ServiceUnavailableException('Video service is unavailable right now.');
      const target = list.find((p) => p.identity === identity);
      if (!target) throw new BadRequestException('This devotee is not in the stream right now.');

      const current = list.find((p) => p.attributes?.videoGuest === '1' && p.canPublish);
      if (current && current.identity === identity) {
        return { success: true, guest: { identity, name: target.name }, alreadyActive: true };
      }
      if (current) {
        if (!opts.replace) {
          throw new ConflictException({
            message: 'Another devotee already has the video slot. Revoke them first or replace them.',
            code: 'VIDEO_SLOT_TAKEN',
            currentIdentity: current.identity,
            currentName: current.name,
          });
        }
        await this.revokeVideoGuestInternal(streamId, actorId, current.identity, true);
      }

      const ok = await this.videoProvider.updateParticipantPermissions(streamId, identity, {
        canPublish: true,
        sources: ['camera', 'microphone'],
        attributes: { videoGuest: '1' },
      });
      if (!ok) throw new ServiceUnavailableException('Could not grant video access. Please try again.');

      // The lock above is per process. With several API instances two grants could interleave, so
      // confirm against LiveKit that we are the only guest; if not, back out (fail safe: retry).
      const after = await this.videoProvider.listParticipants(streamId);
      const guests = (after ?? []).filter((p) => p.attributes?.videoGuest === '1' && p.canPublish);
      if (guests.length > 1) {
        await this.videoProvider.updateParticipantPermissions(streamId, identity, {
          canPublish: false,
          attributes: { videoGuest: '' },
        });
        throw new ConflictException({
          message: 'Another devotee just received the video slot. Please try again.',
          code: 'VIDEO_SLOT_TAKEN',
        });
      }

      await this.auditVideo(streamId, actorId, identity, 'VIDEO_GRANT');
      this.chatGateway?.emitVideoGuestChanged?.(streamId, { identity, name: target.name, active: true });
      this.chatGateway?.emitToIdentity?.(streamId, identity, 'video:granted', { streamId });
      this.chatGateway?.clearVideoRequest?.(streamId, identity);
      this.logger.log(`Video guest granted [${identity}] on stream [${streamId}]`);
      return { success: true, guest: { identity, name: target.name } };
    });
  }

  private async revokeVideoGuestInternal(streamId: string, actorId: string, identity: string, replaced = false) {
    await this.videoProvider.updateParticipantPermissions(streamId, identity, {
      canPublish: false,
      attributes: { videoGuest: '' },
    });
    await this.auditVideo(streamId, actorId, identity, 'VIDEO_REVOKE');
    this.chatGateway?.emitVideoGuestChanged?.(streamId, { identity, active: false });
    this.chatGateway?.emitToIdentity?.(streamId, identity, 'video:revoked', { streamId, replaced });
  }

  async revokeVideoGuest(streamId: string, actorId: string, actorRole: string, identity: string) {
    return this.withStreamLock(streamId, async () => {
      await this.loadModeratedStream(streamId, actorId, actorRole);
      await this.revokeVideoGuestInternal(streamId, actorId, identity);
      return { success: true };
    });
  }

  /** Pandit/admin mutes a participant's camera or microphone (they can switch it back on themselves). */
  async muteParticipantMedia(
    streamId: string,
    actorId: string,
    actorRole: string,
    identity: string,
    dto: MuteParticipantDto,
  ) {
    const stream = await this.loadModeratedStream(streamId, actorId, actorRole);
    if (identity === stream.streamerId) throw new BadRequestException('Cannot mute the broadcaster.');
    const done = await this.videoProvider.muteParticipantSource(streamId, identity, dto.source, true);
    this.chatGateway?.emitToIdentity?.(streamId, identity, 'video:muted_by_host', { streamId, source: dto.source });
    return { success: true, muted: done };
  }

  /** Called when a devotee asks the pandit for the video slot (via socket). */
  async getStreamForVideoRequest(streamId: string) {
    return this.prisma.stream.findUnique({
      where: { id: streamId },
      select: { id: true, streamerId: true, visibility: true, status: true },
    });
  }

  async getViewerListForStream(streamId: string, actorId: string, actorRole: string) {
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) throw new NotFoundException('Stream not found');
    if (stream.streamerId !== actorId && actorRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Not authorized');
    }
    if (!this.presenceService) return [];
    return this.presenceService.getViewerList(streamId, stream.streamerId);
  }
}
