import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ApplyStreamerDto, ReviewKycDto } from './dto/apply-streamer.dto';
import { KycStatus, UserRole, StreamStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class StreamersService {
  private readonly logger = new Logger(StreamersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async apply(userId: string, dto: ApplyStreamerDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { streamerProfile: true },
    });

    if (!user) throw new NotFoundException('User not found');

    if (user.streamerProfile?.kycStatus === KycStatus.APPROVED) {
      throw new ConflictException('You are already an approved streamer on the platform');
    }

    if (user.streamerProfile?.kycStatus === KycStatus.PENDING) {
      throw new ConflictException('Your streamer verification application is already pending review');
    }

    const profile = await this.prisma.streamerProfile.upsert({
      where: { userId },
      update: {
        bio: dto.bio,
        languages: dto.languages,
        specialties: dto.specialties,
        kycStatus: KycStatus.PENDING,
        kycDocuments: dto.kycDocuments || null,
        rejectionReason: null,
      },
      create: {
        userId,
        bio: dto.bio,
        languages: dto.languages,
        specialties: dto.specialties,
        kycStatus: KycStatus.PENDING,
        kycDocuments: dto.kycDocuments || null,
      },
    });

    this.logger.log(`User ${userId} applied for streamer verification`);
    return {
      message: 'Streamer application submitted successfully. Administrator will review your credentials.',
      profile,
    };
  }

  async getPendingApplications() {
    return this.prisma.streamerProfile.findMany({
      where: { kycStatus: { in: [KycStatus.PENDING, KycStatus.MORE_INFO_NEEDED] } },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getMyProfile(userId: string) {
    return this.prisma.streamerProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
      },
    });
  }

  async reviewKyc(profileId: string, adminId: string, adminEmail: string, dto: ReviewKycDto) {
    if (dto.decision === KycStatus.PENDING) {
      throw new BadRequestException('Decision must be APPROVED, REJECTED, or MORE_INFO_NEEDED');
    }

    const profile = await this.prisma.streamerProfile.findUnique({
      where: { id: profileId },
      include: { user: true },
    });

    if (!profile) throw new NotFoundException('Streamer application not found');

    if (dto.decision === KycStatus.APPROVED) {
      const ops: any[] = [
        this.prisma.streamerProfile.update({
          where: { id: profileId },
          data: {
            kycStatus: KycStatus.APPROVED,
            isVerifiedBadge: true,
            kycReviewedAt: new Date(),
            rejectionReason: null,
          },
        }),
        this.prisma.auditLog.create({
          data: {
            actorId: adminId,
            actorEmail: adminEmail,
            action: 'STREAMER_KYC_APPROVED',
            targetResource: `StreamerProfile:${profileId}`,
            details: { applicantUserId: profile.userId, decision: 'APPROVED' },
          },
        }),
      ];

      // B-15: Never downgrade an ADMIN to STREAMER
      if (profile.user.role !== UserRole.ADMIN) {
        ops.push(
          this.prisma.user.update({
            where: { id: profile.userId },
            data: { role: UserRole.STREAMER },
          }),
        );
      }

      await this.prisma.$transaction(ops);
      return { message: 'Streamer application approved successfully. Verified badge awarded.' };
    }

    // Decision is REJECTED or MORE_INFO_NEEDED
    const ops: any[] = [
      this.prisma.streamerProfile.update({
        where: { id: profileId },
        data: {
          kycStatus: dto.decision,
          isVerifiedBadge: false, // B-15: Revoke verified badge on rejection
          rejectionReason: dto.rejectionReason || null,
          kycReviewedAt: new Date(),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: adminId,
          actorEmail: adminEmail,
          action: `STREAMER_KYC_${dto.decision}`,
          targetResource: `StreamerProfile:${profileId}`,
          details: {
            applicantUserId: profile.userId,
            decision: dto.decision,
            reason: dto.rejectionReason,
          },
        },
      }),
    ];

    // B-15: Reset role to VIEWER if a previously approved streamer is rejected or revoked
    if (profile.user.role === UserRole.STREAMER) {
      ops.push(
        this.prisma.user.update({
          where: { id: profile.userId },
          data: { role: UserRole.VIEWER },
        }),
      );
    }

    await this.prisma.$transaction(ops);
    return { message: `Streamer application updated with decision: ${dto.decision}` };
  }

  async getPublicProfile(profileIdOrUserId: string) {
    const profile = await this.prisma.streamerProfile.findFirst({
      where: {
        OR: [{ id: profileIdOrUserId }, { userId: profileIdOrUserId }],
        kycStatus: KycStatus.APPROVED,
      },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true, createdAt: true },
        },
        followers: { select: { followerId: true } },
      },
    });

    if (!profile) throw new NotFoundException('Verified streamer profile not found');

    // Fetch live streams and upcoming scheduled streams (FR-S3)
    const activeStreams = await this.prisma.stream.findMany({
      where: {
        streamerId: profile.userId,
        visibility: 'PUBLIC',
        status: { in: [StreamStatus.LIVE, StreamStatus.SCHEDULED] },
      },
      include: { category: true },
      orderBy: { scheduledAt: 'asc' },
    });

    return {
      profile: {
        id: profile.id,
        userId: profile.userId,
        name: profile.user.name,
        avatarUrl: profile.user.avatarUrl,
        bio: profile.bio,
        languages: profile.languages,
        specialties: profile.specialties,
        isVerifiedBadge: profile.isVerifiedBadge,
        followerCount: profile.followerCount,
      },
      streams: activeStreams,
    };
  }

  async follow(followerId: string, streamerProfileId: string) {
    const profile = await this.prisma.streamerProfile.findUnique({
      where: { id: streamerProfileId },
    });
    if (!profile) throw new NotFoundException('Streamer not found');

    const follower = await this.prisma.user.findUnique({ where: { id: followerId } });
    if (!follower?.isEmailVerified) {
      throw new BadRequestException('Email address must be verified before following streamers (FR-A2)');
    }

    try {
      await this.prisma.$transaction([
        this.prisma.follow.create({
          data: {
            followerId,
            streamerId: streamerProfileId,
          },
        }),
        this.prisma.streamerProfile.update({
          where: { id: streamerProfileId },
          data: { followerCount: { increment: 1 } },
        }),
      ]);
      return { following: true };
    } catch {
      return { following: true, message: 'Already following' };
    }
  }

  async unfollow(followerId: string, streamerProfileId: string) {
    try {
      await this.prisma.$transaction([
        this.prisma.follow.delete({
          where: {
            followerId_streamerId: {
              followerId,
              streamerId: streamerProfileId,
            },
          },
        }),
        this.prisma.streamerProfile.update({
          where: { id: streamerProfileId },
          data: { followerCount: { decrement: 1 } },
        }),
      ]);
      return { following: false };
    } catch {
      return { following: false };
    }
  }

  async getStreamerEarnings(userId: string, userRole?: string) {
    const isAdmin = userRole === 'ADMIN';
    const streams = await this.prisma.stream.findMany({
      where: isAdmin ? {} : { streamerId: userId },
      select: { id: true, title: true, startedAt: true, durationSeconds: true },
    });
    const streamIds = streams.map((s) => s.id);

    const dakshinaOfferings = await this.prisma.dakshinaOffering.findMany({
      where: {
        streamId: { in: streamIds },
        status: PaymentStatus.SUCCESS,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        devoteeName: true,
        createdAt: true,
        streamId: true,
      },
    });

    const aggregate = await this.prisma.dakshinaOffering.aggregate({
      where: {
        streamId: { in: streamIds },
        status: PaymentStatus.SUCCESS,
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    const totalDakshinaInr = Number(aggregate._sum.amount || 0);
    const panditSharePercentage = 85;
    const netEarningsInr = (totalDakshinaInr * panditSharePercentage) / 100;
    const platformFeeInr = totalDakshinaInr - netEarningsInr;

    // B-11: Database-level SQL SUM aggregation instead of loading all viewing sessions into JS memory
    const viewingAggregate = await this.prisma.streamViewingSession.aggregate({
      where: { streamId: { in: streamIds } },
      _sum: {
        totalMinutesWatched: true,
        totalCoinsDebited: true,
      },
    });

    const totalWatchMinutes = viewingAggregate._sum.totalMinutesWatched || 0;
    const totalCoinsConsumed = viewingAggregate._sum.totalCoinsDebited || 0;

    return {
      totalStreams: streams.length,
      totalDakshinaInr,
      netEarningsInr,
      platformFeeInr,
      panditSharePercentage,
      totalWatchMinutes,
      totalCoinsConsumed,
      recentDakshina: dakshinaOfferings.slice(0, 30).map((d) => ({
        id: d.id,
        amount: Number(d.amount),
        devoteeName: d.devoteeName,
        createdAt: d.createdAt,
        streamTitle: streams.find((s) => s.id === d.streamId)?.title || 'Sacred Darshan',
      })),
    };
  }
}
