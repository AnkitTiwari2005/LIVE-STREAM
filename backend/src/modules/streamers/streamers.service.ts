import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ApplyStreamerDto, ReviewKycDto } from './dto/apply-streamer.dto';
import {
  KycStatus,
  UserRole,
  StreamStatus,
  PaymentStatus,
  StreamerEarningSource,
} from '@prisma/client';
import {
  COINS_PER_100_INR,
  STREAMER_SHARE_PERCENT,
  calculateCoinEarningsBreakdown,
} from '../../common/config/economy.constants';

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

    // N-01: Verify that every submitted KYC document was uploaded by this user.
    // The presigned-upload endpoint creates keys in the form kyc/<userId>_<random>.<ext>.
    // Rejecting any key that does not start with kyc/<userId>_ prevents one user from
    // referencing another user's documents (or attacker-crafted paths) in their application.
    if (dto.kycDocuments && dto.kycDocuments.length > 0) {
      for (const doc of dto.kycDocuments) {
        if (!doc.storageKey.startsWith(`kyc/${userId}_`)) {
          throw new ForbiddenException(
            'One or more KYC documents do not belong to this account. Please re-upload your documents.',
          );
        }
      }
    }

    const profile = await this.prisma.streamerProfile.upsert({
      where: { userId },
      update: {
        bio: dto.bio,
        languages: dto.languages,
        specialties: dto.specialties,
        kycStatus: KycStatus.PENDING,
        // R-02: Cast to Prisma Json — KycDocDto[] is validated at DTO layer but
        // Prisma's Json type requires an explicit cast since it only knows InputJsonValue.
        kycDocuments: dto.kycDocuments ? (dto.kycDocuments as any) : null,
        rejectionReason: null,
      },
      create: {
        userId,
        bio: dto.bio,
        languages: dto.languages,
        specialties: dto.specialties,
        kycStatus: KycStatus.PENDING,
        kycDocuments: dto.kycDocuments ? (dto.kycDocuments as any) : null,
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

  async getStreamEarnings(streamId: string, userId: string, userRole?: string) {
    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      select: { id: true, title: true, streamerId: true, deletedAt: true },
    });

    if (!stream || stream.deletedAt) {
      throw new NotFoundException('Stream not found');
    }

    if (stream.streamerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to view earnings for this stream');
    }

    const grouped = await this.prisma.streamerEarning.groupBy({
      by: ['source'],
      where: { streamId },
      _sum: { coins: true },
    });

    let dakshinaCoins = 0;
    let watchTimeCoins = 0;
    for (const row of grouped) {
      const sumCoins = row._sum.coins || 0;
      if (row.source === StreamerEarningSource.DAKSHINA) {
        dakshinaCoins += sumCoins;
      } else if (row.source === StreamerEarningSource.WATCH_TIME) {
        watchTimeCoins += sumCoins;
      }
    }

    const totalCoins = dakshinaCoins + watchTimeCoins;
    const breakdown = calculateCoinEarningsBreakdown(totalCoins);

    return {
      streamId: stream.id,
      title: stream.title,
      totalCoins,
      dakshinaCoins,
      watchTimeCoins,
      grossInr: breakdown.grossInr,
      netInr: breakdown.netInr,
      platformFeeInr: breakdown.platformFeeInr,
      panditSharePercentage: STREAMER_SHARE_PERCENT,
      coinsPer100Inr: COINS_PER_100_INR,
    };
  }

  async getStreamerEarnings(userId: string, userRole?: string) {
    const isAdmin = userRole === UserRole.ADMIN;
    const streams = await this.prisma.stream.findMany({
      where: isAdmin ? { deletedAt: null } : { streamerId: userId, deletedAt: null },
      select: {
        id: true,
        title: true,
        visibility: true,
        status: true,
        startedAt: true,
        endedAt: true,
        durationSeconds: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    const streamIds = streams.map((s) => s.id);
    const streamMap = new Map(streams.map((s) => [s.id, s]));

    if (streamIds.length === 0) {
      return {
        totalStreams: 0,
        totalCoins: 0,
        dakshinaCoins: 0,
        watchTimeCoins: 0,
        grossInr: 0,
        netEarningsInr: 0,
        platformFeeInr: 0,
        panditSharePercentage: STREAMER_SHARE_PERCENT,
        coinsPer100Inr: COINS_PER_100_INR,
        totalWatchMinutes: 0,
        totalCoinsConsumed: 0,
        perStreamEarnings: [],
        recentDakshina: [],
        legacyInr: {
          totalDakshinaInr: 0,
          netEarningsInr: 0,
          platformFeeInr: 0,
          count: 0,
        },
      };
    }

    const [
      earningBySource,
      earningByStreamAndSource,
      dakshinaOfferings,
      legacyAggregate,
      viewingAggregate,
    ] = await Promise.all([
      this.prisma.streamerEarning.groupBy({
        by: ['source'],
        where: { streamId: { in: streamIds } },
        _sum: { coins: true },
      }),
      this.prisma.streamerEarning.groupBy({
        by: ['streamId', 'source'],
        where: { streamId: { in: streamIds } },
        _sum: { coins: true },
      }),
      this.prisma.dakshinaOffering.findMany({
        where: {
          streamId: { in: streamIds },
          status: PaymentStatus.SUCCESS,
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          coins: true,
          amount: true,
          devoteeName: true,
          createdAt: true,
          streamId: true,
        },
      }),
      this.prisma.dakshinaOffering.aggregate({
        where: {
          streamId: { in: streamIds },
          status: PaymentStatus.SUCCESS,
          coins: null,
          amount: { not: null },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.streamViewingSession.aggregate({
        where: { streamId: { in: streamIds } },
        _sum: {
          totalMinutesWatched: true,
          totalCoinsDebited: true,
        },
      }),
    ]);

    let dakshinaCoins = 0;
    let watchTimeCoins = 0;
    for (const row of earningBySource) {
      const sumCoins = row._sum.coins || 0;
      if (row.source === StreamerEarningSource.DAKSHINA) {
        dakshinaCoins += sumCoins;
      } else if (row.source === StreamerEarningSource.WATCH_TIME) {
        watchTimeCoins += sumCoins;
      }
    }

    const totalCoins = dakshinaCoins + watchTimeCoins;
    const totalsBreakdown = calculateCoinEarningsBreakdown(totalCoins);

    // Build per-stream earning summaries
    const perStreamCoinsMap = new Map<string, { dakshinaCoins: number; watchTimeCoins: number }>();
    for (const row of earningByStreamAndSource) {
      const entry = perStreamCoinsMap.get(row.streamId) || { dakshinaCoins: 0, watchTimeCoins: 0 };
      const sumCoins = row._sum.coins || 0;
      if (row.source === StreamerEarningSource.DAKSHINA) {
        entry.dakshinaCoins += sumCoins;
      } else if (row.source === StreamerEarningSource.WATCH_TIME) {
        entry.watchTimeCoins += sumCoins;
      }
      perStreamCoinsMap.set(row.streamId, entry);
    }

    const perStreamEarnings = streams.map((s) => {
      const c = perStreamCoinsMap.get(s.id) || { dakshinaCoins: 0, watchTimeCoins: 0 };
      const streamTotalCoins = c.dakshinaCoins + c.watchTimeCoins;
      const b = calculateCoinEarningsBreakdown(streamTotalCoins);
      return {
        streamId: s.id,
        title: s.title,
        visibility: s.visibility,
        status: s.status,
        startedAt: s.startedAt,
        dakshinaCoins: c.dakshinaCoins,
        watchTimeCoins: c.watchTimeCoins,
        totalCoins: streamTotalCoins,
        grossInr: b.grossInr,
        netInr: b.netInr,
        platformFeeInr: b.platformFeeInr,
      };
    });

    // Legacy pre-cutover INR offerings kept visible separately without polluting coin totals
    const legacyTotalInr = Number(legacyAggregate._sum.amount || 0);
    const legacyGrossPaise = Math.round(legacyTotalInr * 100);
    const legacyNetPaise = Math.round((legacyGrossPaise * STREAMER_SHARE_PERCENT) / 100);
    const legacyFeePaise = legacyGrossPaise - legacyNetPaise;

    const totalWatchMinutes = viewingAggregate._sum.totalMinutesWatched || 0;
    const totalCoinsConsumed = viewingAggregate._sum.totalCoinsDebited || 0;

    return {
      totalStreams: streams.length,
      totalCoins,
      dakshinaCoins,
      watchTimeCoins,
      grossInr: totalsBreakdown.grossInr,
      netEarningsInr: totalsBreakdown.netInr,
      platformFeeInr: totalsBreakdown.platformFeeInr,
      panditSharePercentage: STREAMER_SHARE_PERCENT,
      coinsPer100Inr: COINS_PER_100_INR,
      totalWatchMinutes,
      totalCoinsConsumed,
      perStreamEarnings,
      recentDakshina: dakshinaOfferings.map((d) => {
        const isLegacyInr = d.coins === null || d.coins === undefined;
        if (!isLegacyInr && typeof d.coins === 'number') {
          const b = calculateCoinEarningsBreakdown(d.coins);
          return {
            id: d.id,
            coins: d.coins,
            isLegacyInr: false,
            legacyAmountInr: null,
            grossInr: b.grossInr,
            netInr: b.netInr,
            platformFeeInr: b.platformFeeInr,
            devoteeName: d.devoteeName,
            createdAt: d.createdAt,
            streamId: d.streamId,
            streamTitle: streamMap.get(d.streamId)?.title || 'Sacred Darshan',
          };
        }
        const amt = Number(d.amount || 0);
        const grossP = Math.round(amt * 100);
        const netP = Math.round((grossP * STREAMER_SHARE_PERCENT) / 100);
        const feeP = grossP - netP;
        return {
          id: d.id,
          coins: 0,
          isLegacyInr: true,
          legacyAmountInr: amt,
          grossInr: grossP / 100,
          netInr: netP / 100,
          platformFeeInr: feeP / 100,
          devoteeName: d.devoteeName,
          createdAt: d.createdAt,
          streamId: d.streamId,
          streamTitle: streamMap.get(d.streamId)?.title || 'Sacred Darshan',
        };
      }),
      legacyInr: {
        totalDakshinaInr: legacyGrossPaise / 100,
        netEarningsInr: legacyNetPaise / 100,
        platformFeeInr: legacyFeePaise / 100,
        count: legacyAggregate._count.id || 0,
      },
    };
  }
}
