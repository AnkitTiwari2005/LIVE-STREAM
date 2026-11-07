import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  ServiceUnavailableException,
  Inject,
  Logger,
} from '@nestjs/common';
import { WalletService } from '../wallet/wallet.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateStreamDto } from './dto/create-stream.dto';
import { StreamStatus, StreamVisibility, UserRole, UserStatus, ViewingSessionStatus } from '@prisma/client';
import { validateStateTransition } from './state/stream-state-machine';
import {
  IVideoProviderService,
  VIDEO_PROVIDER_TOKEN,
} from '../video/interfaces/video-provider.interface';
import { getLiveKitPublicUrl } from '../../common/livekit-url.util';

@Injectable()
export class StreamsService {
  private readonly logger = new Logger(StreamsService.name);

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
        status: StreamStatus.LIVE,
      },
    });

    for (const s of activeStreams) {
      try {
        await this.videoProvider.endRoom(s.id);
      } catch {}
      await this.prisma.stream.update({
        where: { id: s.id },
        data: {
          status: StreamStatus.ENDED,
          endedAt: new Date(),
        },
      });
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
    const activeStreamForUser = await this.prisma.stream.findFirst({
      where: {
        streamerId,
        status: StreamStatus.LIVE,
        id: { not: streamId },
      },
    });
    if (activeStreamForUser && !forceEndPrevious) {
      throw new BadRequestException('You already have another live broadcast in progress.');
    }

    // Capacity Gate 2: Check global concurrent live streams limit (max 3 for single VPS NFR-P1)
    const totalLiveStreams = await this.prisma.stream.count({
      where: { status: StreamStatus.LIVE, id: { not: activeStreamForUser?.id } },
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
      maxParticipants: 100,
    });

    const startedAt = stream.startedAt || new Date();

    // Now end previous stream and mark new stream LIVE in one transaction
    const [updatedStream] = await this.prisma.$transaction(async (tx) => {
      if (activeStreamForUser && forceEndPrevious) {
        try {
          await this.videoProvider.endRoom(activeStreamForUser.id);
        } catch {}
        await tx.stream.update({
          where: { id: activeStreamForUser.id },
          data: { status: StreamStatus.ENDED, endedAt: new Date() },
        });
        await tx.streamViewingSession.updateMany({
          where: { streamId: activeStreamForUser.id, status: ViewingSessionStatus.ACTIVE },
          data: { status: ViewingSessionStatus.DISCONNECTED_TIMEOUT, endedAt: new Date() },
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

    // Generate short-lived publisher token (15 mins TTL)
    const publisherToken = await this.videoProvider.generateToken({
      roomName: stream.id,
      participantId: streamerId,
      participantName: stream.streamer.name,
      isPublisher: true,
      canSubscribe: true,
      ttlMinutes: 15,
      metadata: { role: 'streamer' },
    });

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

    // Check if user is banned or blocked
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.status === UserStatus.BANNED || user?.status === UserStatus.SUSPENDED) {
        throw new ForbiddenException('Your account is restricted from watching streams');
      }

      const isBlocked = await this.prisma.blockedViewer.findFirst({
        where: { streamId, userId },
      });
      if (isBlocked) {
        throw new ForbiddenException('You have been blocked from viewing this live stream');
      }
    }

    const participantId = userId || `guest_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const participantName = guestName || (userId ? 'Registered Devotee' : 'Guest Devotee');

    let viewingSession: any = null;

    // Devotees watching public live streams are metered at 5 coins/min
    if (stream.visibility === StreamVisibility.PUBLIC) {
      if (!userId) {
        throw new UnauthorizedException(
          'Please sign in or register to receive your 100 free coins and join the sacred live darshan.'
        );
      }

      // If user is not the stream host/pandit, meter their darshan session
      if (userId !== stream.streamerId) {
        viewingSession = await this.walletService.startViewingSession(userId, streamId, ip);
      }
    }

    // Record or update viewer session
    await this.prisma.viewerSession.create({
      data: {
        streamId,
        userId: userId || null,
        guestName: participantName,
        ipAddress: ip || null,
      },
    });

    // Generate short-lived viewer token (15 mins TTL)
    const token = await this.videoProvider.generateToken({
      roomName: stream.id,
      participantId,
      participantName,
      isPublisher: false,
      canSubscribe: true,
      ttlMinutes: 2, // B-07: Shorter token refreshed via meter-tick to prevent unmetered viewing
      metadata: { role: 'viewer', isGuest: !userId, sessionToken: viewingSession?.sessionToken },
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
    const where: any = {
      visibility: StreamVisibility.PUBLIC,
      status: { in: [StreamStatus.LIVE, StreamStatus.SCHEDULED] },
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
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
    });

    // B-14: Explicitly sort LIVE streams before SCHEDULED streams
    return streams.sort((a, b) => {
      if (a.status === StreamStatus.LIVE && b.status !== StreamStatus.LIVE) return -1;
      if (a.status !== StreamStatus.LIVE && b.status === StreamStatus.LIVE) return 1;
      return 0;
    });
  }

  async getStreamerMine(streamerId: string) {
    return this.prisma.stream.findMany({
      where: { streamerId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStream(streamId: string, streamerId: string, dto: Partial<CreateStreamDto>) {
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) throw new NotFoundException('Stream not found');
    if (stream.streamerId !== streamerId) throw new ForbiddenException('Not your stream');
    if (stream.status === StreamStatus.LIVE || stream.status === StreamStatus.ENDED) {
      throw new BadRequestException('Cannot edit an active or concluded stream');
    }
    return this.prisma.stream.update({
      where: { id: streamId },
      data: {
        title: dto.title ?? stream.title,
        description: dto.description ?? stream.description,
        categoryId: dto.categoryId ?? stream.categoryId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : stream.scheduledAt,
        thumbnailUrl: dto.thumbnailUrl ?? stream.thumbnailUrl,
      },
    });
  }

  async deleteStream(streamId: string, streamerId: string) {
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) throw new NotFoundException('Stream not found');
    if (stream.streamerId !== streamerId) throw new ForbiddenException('Not your stream');
    if (stream.status === StreamStatus.LIVE) {
      throw new BadRequestException('Cannot delete an active live stream. End the stream first.');
    }
    return this.prisma.stream.update({
      where: { id: streamId },
      data: { status: StreamStatus.CANCELLED },
    });
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

    return stream;
  }
}
