import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePrivateLinkDto, ClaimPrivateLinkDto } from './dto/create-private-link.dto';
import { CryptoUtil } from '../../common/crypto.util';
import * as bcrypt from 'bcryptjs';
import {
  IVideoProviderService,
  VIDEO_PROVIDER_TOKEN,
} from '../video/interfaces/video-provider.interface';
import { getLiveKitPublicUrl } from '../../common/livekit-url.util';
import { StreamStatus, StreamVisibility, UserStatus } from '@prisma/client';

function getFrontendOrigin(): string {
  const origin = process.env.FRONTEND_ORIGIN || (process.env.DOMAIN ? `https://${process.env.DOMAIN}` : null);
  if (origin) return origin.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') {
    throw new BadRequestException('FRONTEND_ORIGIN or DOMAIN environment variable must be configured in production (N-13)');
  }
  return 'http://localhost:3000';
}

@Injectable()
export class PrivateLinksService {
  private readonly logger = new Logger(PrivateLinksService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(VIDEO_PROVIDER_TOKEN)
    private readonly videoProvider: IVideoProviderService,
  ) {}

  async createLink(streamerId: string, dto: CreatePrivateLinkDto) {
    const stream = await this.prisma.stream.findUnique({
      where: { id: dto.streamId },
    });

    if (!stream) throw new NotFoundException('Stream not found');
    if (stream.streamerId !== streamerId) {
      throw new ForbiddenException('Only the assigned streamer can create private join links');
    }

    if (stream.visibility !== StreamVisibility.PRIVATE) {
      throw new BadRequestException('Cannot create private join links for a public stream');
    }

    // If no password or expiration is set, check if an unrevoked active link already exists
    if (!dto.password && !dto.expiresAt && !dto.maxViewers) {
      const existingLink = await this.prisma.privateAccessLink.findFirst({
        where: { streamId: dto.streamId, isRevoked: false },
        orderBy: { createdAt: 'desc' },
      });
      if (existingLink && (!existingLink.expiresAt || existingLink.expiresAt > new Date())) {
        const rawTokenSlug = CryptoUtil.decryptAesGcm(existingLink.tokenEncrypted);
        const origin = getFrontendOrigin();
        const joinUrl = `${origin}/join/${rawTokenSlug}`;
        const whatsAppPart1 = `🙏 Namaste! You are invited to attend our private live Pooja session on Shubhdarshan:\n*${stream.title}*\n\n🔗 Join Link: ${joinUrl}\n\nPlease join on time. Har Har Mahadev!`;
        return {
          linkId: existingLink.id,
          joinUrl,
          rawTokenSlug,
          hasPassword: !!existingLink.passwordHash,
          maxViewers: existingLink.maxViewers,
          expiresAt: existingLink.expiresAt,
          requireApproval: existingLink.requireApproval,
          requireLogin: existingLink.requireLogin,
          whatsAppShare: {
            part1Url: `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsAppPart1)}`,
            part2Text: null,
          },
        };
      }
    }

    // Generate 128-bit cryptographically secure token slug (FR-P2)
    const rawTokenSlug = CryptoUtil.generate128BitToken();
    const tokenHash = CryptoUtil.hashSha256(rawTokenSlug);
    const tokenEncrypted = CryptoUtil.encryptAesGcm(rawTokenSlug);

    let passwordHash: string | null = null;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    const link = await this.prisma.privateAccessLink.create({
      data: {
        streamId: dto.streamId,
        tokenHash,
        tokenEncrypted,
        passwordHash,
        expiresAt,
        maxViewers: dto.maxViewers || null,
        requireApproval: dto.requireApproval || false,
        requireLogin: dto.requireLogin ?? true,
      },
    });

    const origin = getFrontendOrigin();
    const joinUrl = `${origin}/join/${rawTokenSlug}`;

    // Generate 2-part WhatsApp share text (FR-P9)
    const whatsAppPart1 = `🙏 Namaste! You are invited to attend our private live Pooja session on Shubhdarshan:\n*${stream.title}*\n\n🔗 Join Link: ${joinUrl}\n\nPlease join on time. Har Har Mahadev!`;
    const whatsAppPart2 = dto.password
      ? `🔑 Private Session Access Password: *${dto.password}*\n(Please do not forward this password to unauthorized guests)`
      : null;

    return {
      linkId: link.id,
      joinUrl,
      rawTokenSlug,
      hasPassword: !!dto.password,
      maxViewers: link.maxViewers,
      expiresAt: link.expiresAt,
      requireApproval: link.requireApproval,
      requireLogin: link.requireLogin,
      whatsAppShare: {
        part1Url: `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsAppPart1)}`,
        part2Text: whatsAppPart2,
      },
    };
  }

  /**
   * Safe inspection without side effects (crawler friendly)
   */
  async inspectLink(tokenSlug: string) {
    const tokenHash = CryptoUtil.hashSha256(tokenSlug);
    const link = await this.prisma.privateAccessLink.findUnique({
      where: { tokenHash },
      include: {
        stream: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            status: true,
            streamer: { select: { name: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!link || link.isRevoked) {
      throw new NotFoundException('This private join link is invalid or has been revoked (FR-P5)');
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new BadRequestException('This private join link has expired');
    }

    return {
      streamId: link.streamId,
      streamTitle: link.stream.title,
      streamDescription: link.stream.description,
      streamerName: link.stream.streamer.name,
      streamerAvatar: link.stream.streamer.avatarUrl,
      thumbnailUrl: link.stream.thumbnailUrl,
      isLive: link.stream.status === StreamStatus.LIVE,
      requiresPassword: !!link.passwordHash,
      requiresLogin: link.requireLogin,
      requiresApproval: link.requireApproval,
    };
  }

  async claimLink(
    tokenSlug: string,
    dto: ClaimPrivateLinkDto,
    userId?: string,
    ip?: string,
    tokenIat?: number,
  ) {
    const tokenHash = CryptoUtil.hashSha256(tokenSlug);
    const link = await this.prisma.privateAccessLink.findUnique({
      where: { tokenHash },
      include: {
        stream: {
          include: { streamer: true },
        },
      },
    });

    if (!link || link.isRevoked) {
      throw new NotFoundException('This private access link has been revoked or does not exist');
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new BadRequestException('This private access link has expired');
    }

    // Verify stream status
    if (link.stream.status !== StreamStatus.LIVE && link.stream.status !== StreamStatus.RECONNECTING_GRACE_PERIOD) {
      throw new BadRequestException('The private live session is not currently streaming');
    }

    // Check user verification and account status if userId provided.
    // A stale JWT whose user row was deleted (or scheduled for deletion / invalidated by password reset)
    // must resolve verifiedUser = null instead of flowing into ViewerSession.userId (FK constraint).
    let verifiedUser: any = null;
    if (userId) {
      const candidateUser = await this.prisma.user.findUnique({ where: { id: userId } });
      if (candidateUser) {
        if (candidateUser.status === UserStatus.BANNED || candidateUser.status === UserStatus.SUSPENDED) {
          throw new ForbiddenException('Your account is restricted from attending live streams');
        }

        const isDeletedAccount =
          candidateUser.status === UserStatus.DELETION_REQUESTED || Boolean(candidateUser.deletedAt);
        const isStalePasswordResetToken = Boolean(
          candidateUser.passwordChangedAt &&
            typeof tokenIat === 'number' &&
            new Date(tokenIat * 1000) < candidateUser.passwordChangedAt,
        );

        if (!isDeletedAccount && !isStalePasswordResetToken) {
          verifiedUser = candidateUser;
          const blocked = await this.prisma.blockedViewer.findFirst({
            where: { streamId: link.streamId, userId: verifiedUser.id },
          });
          if (blocked) {
            throw new ForbiddenException('You have been removed and blocked from this private session (FR-P7)');
          }
        }
      }
    }

    // Enforce login requirement if configured
    if (link.requireLogin && !verifiedUser) {
      throw new UnauthorizedException('This private session requires you to be logged into your account');
    }

    // Enforce password if set
    if (link.passwordHash) {
      if (!dto.password) {
        throw new UnauthorizedException('A password is required to access this private stream');
      }
      const isMatch = await bcrypt.compare(dto.password, link.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedException('Incorrect private access password');
      }
    }

    // Check if IP is blocked (B-11 / S-01)
    if (ip) {
      const blockedIp = await this.prisma.blockedViewer.findFirst({
        where: { streamId: link.streamId, sessionFingerprint: ip },
      });
      if (blockedIp) {
        throw new ForbiddenException('You have been removed and blocked from this private session');
      }
    }

    // Check max viewer limit
    if (link.maxViewers) {
      const activeSessionsCount = await this.prisma.viewerSession.count({
        where: {
          streamId: link.streamId,
          privateLinkId: link.id,
          leftAt: null,
          isRemoved: false,
        },
      });
      if (activeSessionsCount >= link.maxViewers) {
        throw new ForbiddenException('This private live session has reached its maximum viewer capacity');
      }
    }

    const participantName = dto.guestName || verifiedUser?.name || 'Private Devotee';

    // Create session record first to get consistent identity (B-11 / S-01)
    const session = await this.prisma.viewerSession.create({
      data: {
        streamId: link.streamId,
        privateLinkId: link.id,
        userId: verifiedUser?.id || null,
        guestName: participantName,
        ipAddress: ip || null,
      },
    });

    const participantId = verifiedUser ? verifiedUser.id : `priv_guest_${session.id}`;
    // B-03: Viewers must never receive publish permissions by default
    const canPublish = false;

    // Generate LiveKit token for private pooja consultation (60 minutes TTL)
    const token = await this.videoProvider.generateToken({
      roomName: link.stream.id,
      participantId,
      participantName,
      isPublisher: false,
      canPublish,
      canSubscribe: true,
      ttlMinutes: 60,
      metadata: { role: 'private_viewer', sessionId: session.id, linkId: link.id },
    });

    return {
      token,
      sessionId: session.id,
      serverUrl: getLiveKitPublicUrl(),
      streamId: link.streamId,
      streamTitle: link.stream.title,
      streamDescription: link.stream.description,
      streamerName: link.stream.streamer.name,
      streamerAvatar: link.stream.streamer.avatarUrl,
    };
  }

  async revokeLink(linkId: string, streamerId: string) {
    const link = await this.prisma.privateAccessLink.findUnique({
      where: { id: linkId },
      include: {
        stream: true,
        sessions: { where: { leftAt: null, isRemoved: false } },
      },
    });

    if (!link) throw new NotFoundException('Private link not found');
    if (link.stream.streamerId !== streamerId) {
      throw new ForbiddenException('Only the streamer can revoke this private link');
    }

    await this.prisma.privateAccessLink.update({
      where: { id: linkId },
      data: { isRevoked: true },
    });

    // Event-driven eviction: immediately kick all active viewers who entered via this link
    for (const session of link.sessions) {
      const identity = session.userId || `priv_guest_${session.id}`;
      await this.videoProvider.kickParticipant(link.stream.id, identity);
      await this.prisma.viewerSession.update({
        where: { id: session.id },
        data: { isRemoved: true, leftAt: new Date() },
      });
    }

    this.logger.log(`Private link ${linkId} revoked. Evicted ${link.sessions.length} viewers.`);
    return { message: 'Link successfully revoked. All connected viewers have been disconnected.' };
  }

  async kickAndBlockViewer(
    streamId: string,
    streamerId: string,
    targetUserId?: string,
    targetSessionId?: string,
    reason?: string,
  ) {
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream || stream.streamerId !== streamerId) {
      throw new ForbiddenException('Only the streamer can moderate attendees in this stream');
    }

    let identityToKick = targetUserId || null;
    let sessionIp: string | null = null;
    if (targetSessionId) {
      const session = await this.prisma.viewerSession.findUnique({ where: { id: targetSessionId } });
      if (session) {
        sessionIp = session.ipAddress;
        // B-16: Resolve real identity from session record (logged-in user or guest)
        if (!identityToKick) {
          identityToKick = session.userId || `priv_guest_${session.id}`;
        }
        await this.prisma.viewerSession.update({
          where: { id: session.id },
          data: { isRemoved: true, leftAt: new Date() },
        });
      }
    }

    // Add to BlockedViewer table (FR-P7)
    await this.prisma.blockedViewer.create({
      data: {
        streamId,
        userId: targetUserId || null,
        sessionFingerprint: sessionIp || targetSessionId || null,
        reason: reason || 'Removed by streamer',
      },
    });

    // Evict from LiveKit SFU immediately using roomName
    if (identityToKick) {
      await this.videoProvider.kickParticipant(streamId, identityToKick);
    }

    return { message: 'Viewer removed and permanently blocked from this stream.' };
  }
}
