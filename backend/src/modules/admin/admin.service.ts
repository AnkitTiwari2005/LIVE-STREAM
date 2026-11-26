import { finalizeStreamRecord } from '../../common/stream-lifecycle';
import { calculateCoinEarningsBreakdown } from '../../common/config/economy.constants';
import { Injectable, NotFoundException, BadRequestException, ConflictException, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserStatus, StreamStatus, UserRole, KycStatus } from '@prisma/client';
import {
  IVideoProviderService,
  VIDEO_PROVIDER_TOKEN,
} from '../video/interfaces/video-provider.interface';
import { ChatService } from '../chat/chat.service';

/** Masks a devotee email for privacy: "ab***@gmail.com" */
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [user, domain] = email.split('@');
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}***@${domain}`;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(VIDEO_PROVIDER_TOKEN)
    private readonly videoProvider: IVideoProviderService,
    private readonly chatService: ChatService,
  ) {}

  async getDashboardOverview() {
    const [
      totalUsers,
      totalStreamers,
      activeLiveStreams,
      totalStreams,
      openReports,
      pendingKyc,
    ] = await Promise.all([
      this.prisma.user.count().catch(() => 0),
      this.prisma.streamerProfile.count({ where: { kycStatus: 'APPROVED' } }).catch(() => 0),
      this.prisma.stream.count({ where: { status: StreamStatus.LIVE } }).catch(() => 0),
      this.prisma.stream.count().catch(() => 0),
      this.prisma.report.count({ where: { status: 'OPEN' } }).catch(() => 0),
      this.prisma.streamerProfile.count({ where: { kycStatus: 'PENDING' } }).catch(() => 0),
    ]);

    return {
      totalUsers,
      totalStreamers,
      activeLiveStreams,
      totalStreams,
      openReports,
      pendingKyc,
    };
  }

  async searchUsers(query?: string, role?: UserRole, status?: UserStatus) {
    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isEmailVerified: true,
        isTwoFactorEnabled: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updateUserStatus(userId: string, status: UserStatus, adminId: string, adminEmail: string, reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot modify status of another administrator');
    }

    // B-23: If banning or suspending, force-end any active broadcasts immediately
    if (status === UserStatus.BANNED || status === UserStatus.SUSPENDED) {
      try {
        const activeStreams = await this.prisma.stream.findMany({
          where: {
            streamerId: userId,
            status: { in: [StreamStatus.LIVE, StreamStatus.RECONNECTING_GRACE_PERIOD] },
          },
        });
        for (const st of activeStreams) {
          await this.videoProvider.endRoom(st.id).catch(() => {});
          await finalizeStreamRecord(this.prisma as any, st);
        }
      } catch (err: any) {
        this.logger.error(`Error terminating active streams for banned user ${userId}: ${err.message}`);
      }
    }

    const updated = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { status },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: adminId,
          actorEmail: adminEmail,
          action: `USER_STATUS_${status}`,
          targetResource: `User:${userId}`,
          details: { previousStatus: user.status, newStatus: status, reason },
        },
      }),
    ]);

    return { message: `User status changed to ${status}`, user: updated[0] };
  }

  async getLiveStreamsMonitor() {
    return this.prisma.stream.findMany({
      where: { status: { in: [StreamStatus.LIVE, StreamStatus.RECONNECTING_GRACE_PERIOD] } },
      include: {
        streamer: { select: { id: true, name: true, email: true, avatarUrl: true } },
        category: true,
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async forceEndStream(streamId: string, adminId: string, adminEmail: string) {
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) throw new NotFoundException('Stream not found');

    // A kill switch must not claim success while the media room is still running: report the real result.
    const roomClosed = await this.videoProvider.endRoom(stream.id);

    const { durationSeconds: duration } = await finalizeStreamRecord(this.prisma as any, stream);
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        actorEmail: adminEmail,
        action: 'ADMIN_FORCE_END_STREAM',
        targetResource: `Stream:${streamId}`,
        details: { durationSeconds: duration, peakViewers: stream.peakViewers, roomClosed },
      },
    });

    return roomClosed
      ? { message: 'Stream forcibly terminated.', roomClosed: true }
      : {
          message:
            'Stream marked ended, but LiveKit did not confirm closing the media room. It will be cleaned up automatically within a minute; check LiveKit if the broadcast is still visible.',
          roomClosed: false,
        };
  }

  async getAuditLogs(limit = 100) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // --- Category Management ---
  async getCategories() {
    return this.prisma.streamCategory.findMany({ orderBy: { displayOrder: 'asc' } });
  }

  async createCategory(name: string, slug: string, displayOrder = 0) {
    return this.prisma.streamCategory.create({
      data: { name, slug, displayOrder },
    });
  }

  async updateCategory(id: string, name: string, displayOrder?: number, isActive?: boolean) {
    return this.prisma.streamCategory.update({
      where: { id },
      data: {
        name,
        displayOrder: displayOrder ?? undefined,
        isActive: isActive ?? undefined,
      },
    });
  }

  // --- Chat Word Filter Management ---
  async getWordFilters() {
    return this.prisma.chatWordFilter.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async addWordFilter(word: string, severity = 'HIGH') {
    const row = await this.prisma.chatWordFilter.upsert({
      where: { word: word.toLowerCase().trim() },
      update: { isActive: true, severity },
      create: { word: word.toLowerCase().trim(), severity, isActive: true },
    });
    await this.chatService.reloadWordFilter();
    return row;
  }

  async removeWordFilter(id: string) {
    const row = await this.prisma.chatWordFilter.delete({ where: { id } });
    await this.chatService.reloadWordFilter();
    return row;
  }

  // --- CMS Static Pages ---
  async getStaticPage(slug: string) {
    const page = await this.prisma.staticPage.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException(`Static page '${slug}' not found`);
    return page;
  }

  private cleanHtml(html: string): string {
    if (!html) return '';
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/\s*on\w+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi, '')
      .replace(/href\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, 'href="#"');
  }

  async updateStaticPage(slug: string, title: string, contentHtml: string) {
    const safeHtml = this.cleanHtml(contentHtml);
    return this.prisma.staticPage.upsert({
      where: { slug },
      update: { title, contentHtml: safeHtml },
      create: { slug, title, contentHtml: safeHtml },
    });
  }

  // --- Occasion Announcement Banner CMS ---
  async getBannerConfig() {
    try {
      const row = await this.prisma.staticPage.findUnique({
        where: { slug: 'announcement-banner' },
      });
      if (!row) {
        return {
          enabled: false,
          occasion: 'Deepotsav',
          message: 'Join the Grand Deepotsav Mahotsav & Live Ganga Aarti from Bharat\'s sacred ghats',
          mobileMessage: 'Live Aarti from sacred ghats',
          ctaText: 'Watch Live Aarti',
          ctaLink: '/#live-section',
          gradient: 'amber-orange',
        };
      }
      const data = JSON.parse(row.contentHtml);
      return {
        enabled: Boolean(data.enabled),
        occasion: data.occasion || row.title || 'Deepotsav',
        message: data.message || '',
        mobileMessage: data.mobileMessage || '',
        ctaText: data.ctaText || 'Watch Live Aarti',
        ctaLink: data.ctaLink || '/#live-section',
        gradient: data.gradient || 'amber-orange',
        updatedAt: row.updatedAt,
      };
    } catch {
      return {
        enabled: false,
        occasion: 'Deepotsav',
        message: 'Join the Grand Deepotsav Mahotsav & Live Ganga Aarti from Bharat\'s sacred ghats',
        mobileMessage: 'Live Aarti from sacred ghats',
        ctaText: 'Watch Live Aarti',
        ctaLink: '/#live-section',
        gradient: 'amber-orange',
      };
    }
  }

  async updateBannerConfig(dto: {
    enabled: boolean;
    occasion?: string;
    message?: string;
    mobileMessage?: string;
    ctaText?: string;
    ctaLink?: string;
    gradient?: string;
  }) {
    const payload = {
      enabled: Boolean(dto.enabled),
      occasion: dto.occasion || 'Special Occasion',
      message: dto.message || '',
      mobileMessage: dto.mobileMessage || '',
      ctaText: dto.ctaText || 'Watch Now',
      ctaLink: dto.ctaLink || '/#live-section',
      gradient: dto.gradient || 'amber-orange',
    };

    const row = await this.prisma.staticPage.upsert({
      where: { slug: 'announcement-banner' },
      update: {
        title: payload.occasion,
        contentHtml: JSON.stringify(payload),
      },
      create: {
        slug: 'announcement-banner',
        title: payload.occasion,
        contentHtml: JSON.stringify(payload),
      },
    });

    return {
      ...payload,
      updatedAt: row.updatedAt,
    };
  }

  // --- Dakshina Offerings Oversight (DakshinaOffering table - devotee dakshina payments during streams. Email is masked at this layer for privacy.) ---
  async getPoojaBookings(status?: string, page = 1, limit = 50) {
    if (status && !['ALL', 'PENDING', 'SUCCESS', 'FAILED'].includes(status)) {
      throw new BadRequestException('status must be ALL, PENDING, SUCCESS or FAILED');
    }
    page = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
    limit = Number.isFinite(limit) && limit >= 1 ? Math.min(Math.floor(limit), 200) : 50;
    const where: any = { status: 'SUCCESS' };
    if (status && status !== 'ALL') {
      where.status = status;
    } else {
      // Show all statuses for admin overview
      delete where.status;
    }

    const skip = (page - 1) * limit;

    const [offerings, total] = await Promise.all([
      this.prisma.dakshinaOffering.findMany({
        where,
        include: {
          stream: {
            select: {
              id: true,
              title: true,
              streamer: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          devotee: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.dakshinaOffering.count({ where }),
    ]);

    return {
      data: offerings.map((o) => ({
        id: o.id,
        devoteeName: o.devoteeName,
        devoteeEmail: o.devotee?.email ? maskEmail(o.devotee.email) : null,
        gotra: o.gotra || null,
        panditName: o.stream?.streamer?.name || null,
        panditEmail: o.stream?.streamer?.email || null,
        streamTitle: o.stream?.title || null,
        coins: o.coins || 0,
        amount: o.amount ? Number(o.amount) : null,
        prayerMessage: o.prayerMessage || null,
        status: o.status,
        provider: o.provider,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      })),
      total,
      page,
      limit,
    };
  }

  // --- Pandit earnings ledger ---
  // Single source of truth = StreamerEarning (Dakshina + watch-time), the same table the pandit's own
  // earnings page uses, converted with the shared economy helpers (150 coins = Rs100, 85% pandit share).
  async getDakshinaLedger() {
    const [groups, payoutGroups] = await Promise.all([
      this.prisma.streamerEarning.groupBy({
        by: ['streamerId'],
        _sum: { coins: true },
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      this.prisma.panditPayout.groupBy({
        by: ['streamerId'],
        _sum: { coins: true, netPaise: true },
        _max: { paidAt: true },
      }),
    ]);

    const payoutMap = new Map(
      payoutGroups.map((pg) => [
        pg.streamerId,
        {
          paidCoins: pg._sum.coins || 0,
          paidNetPaise: pg._sum.netPaise || 0,
          lastPaidAt: pg._max.paidAt || null,
        },
      ]),
    );

    const allStreamerIds = Array.from(
      new Set([...groups.map((g) => g.streamerId), ...payoutGroups.map((pg) => pg.streamerId)]),
    );

    const users = allStreamerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: allStreamerIds } },
          select: { id: true, name: true, email: true, avatarUrl: true },
        })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));

    const ledger = groups
      .map((g) => {
        const u = byId.get(g.streamerId);
        const earnedCoins = g._sum.coins || 0;
        const payout = payoutMap.get(g.streamerId);
        const paidCoins = payout?.paidCoins || 0;
        const dueCoins = Math.max(0, earnedCoins - paidCoins);
        const earnedBreakdown = calculateCoinEarningsBreakdown(earnedCoins);
        const dueBreakdown = calculateCoinEarningsBreakdown(dueCoins);
        // Net figures use the same cumulative rule as recordPayout, so earned = paid + due exactly.
        const netPaiseOf = (c: number) => Math.round(calculateCoinEarningsBreakdown(c).netInr * 100);
        const paidNetPaise = netPaiseOf(paidCoins);
        const dueNetPaise = Math.max(0, netPaiseOf(earnedCoins) - paidNetPaise);
        return {
          panditId: g.streamerId,
          panditName: u?.name || 'Unknown',
          panditEmail: u?.email || '',
          panditAvatarUrl: u?.avatarUrl || null,
          earnedCoins,
          paidCoins,
          dueCoins,
          transactionCount: g._count._all,
          lastDakshinaAt: g._max.createdAt || null,
          lastPaidAt: payout?.lastPaidAt || null,
          // Earned breakdown
          grossInr: earnedBreakdown.grossInr,
          platformFeeInr: earnedBreakdown.platformFeeInr,
          totalInr: earnedBreakdown.netInr,  // kept for CSV backward-compat
          // Due breakdown (the real "how much to pay now")
          dueGrossInr: dueBreakdown.grossInr,
          duePlatformFeeInr: dueBreakdown.platformFeeInr,
          dueNetInr: dueNetPaise / 100,
          // Paid breakdown
          paidNetInr: paidNetPaise / 100,
        };
      })
      .sort((x, y) => y.dueCoins - x.dueCoins);

    const platformTotalCoins = ledger.reduce((acc, p) => acc + p.earnedCoins, 0);
    const platformPaidCoins = ledger.reduce((acc, p) => acc + p.paidCoins, 0);
    const platformDueCoins = ledger.reduce((acc, p) => acc + p.dueCoins, 0);
    const platformTotalTransactions = ledger.reduce((acc, p) => acc + p.transactionCount, 0);
    const platformBreakdown = calculateCoinEarningsBreakdown(platformTotalCoins);

    return {
      ledger,
      platformTotalCoins,
      platformPaidCoins,
      platformDueCoins,
      platformGrossInr: platformBreakdown.grossInr,
      platformFeeInr: platformBreakdown.platformFeeInr,
      platformTotalInr: ledger.reduce((acc, p) => acc + p.totalInr, 0),
      platformDueNetInr: Math.round(ledger.reduce((acc, p) => acc + p.dueNetInr * 100, 0)) / 100,
      platformTotalTransactions,
    };
  }

  // --- Payout Settlement ---
  async recordPayout(
    streamerId: string,
    coins: number,
    periodTo: string,
    reference: string,
    paidById: string,
    paidByEmail: string,
    periodFrom?: string,
    method?: string,
    note?: string,
  ) {
    // Validate pandit exists
    const pandit = await this.prisma.user.findUnique({ where: { id: streamerId }, select: { id: true, name: true } });
    if (!pandit) throw new NotFoundException('Pandit not found');

    // Validate admin/payer exists
    const payer = await this.prisma.user.findUnique({ where: { id: paidById }, select: { id: true } });
    if (!payer) throw new NotFoundException('Admin account not found');

    if (!Number.isInteger(coins) || coins <= 0) throw new BadRequestException('coins must be a positive integer');
    if (periodFrom && Number.isNaN(new Date(periodFrom).getTime())) throw new BadRequestException('periodFrom is not a valid date');
    if (Number.isNaN(new Date(periodTo).getTime())) throw new BadRequestException('periodTo is not a valid date');

    let payout: any;
    let breakdown = calculateCoinEarningsBreakdown(coins);
    let dueAfter = 0;
    try {
      payout = await this.prisma.$transaction(async (tx) => {
        // Serialise concurrent payouts for the same pandit: without this lock two requests can both read the
        // same "due" figure and together settle more than was earned.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'pandit-payout:' + streamerId}))`;

        const [earnedAgg, paidAgg] = await Promise.all([
          tx.streamerEarning.aggregate({ where: { streamerId }, _sum: { coins: true } }),
          tx.panditPayout.aggregate({ where: { streamerId }, _sum: { coins: true } }),
        ]);
        const earnedCoins = earnedAgg._sum.coins || 0;
        const paidCoins = paidAgg._sum.coins || 0;
        const dueCoins = Math.max(0, earnedCoins - paidCoins);
        if (coins > dueCoins) {
          throw new BadRequestException(
            `Cannot settle ${coins} coins: only ${dueCoins} coins are currently outstanding for this pandit (earned ${earnedCoins}, already paid ${paidCoins}).`,
          );
        }

        breakdown = calculateCoinEarningsBreakdown(coins);
        // Net paid is the difference of the cumulative net before/after this payout, so any number of part-payments
        // always adds up to exactly the net earned (no per-payout rounding drift; 1-coin payouts can't overpay).
        const netPaiseOf = (c: number) => Math.round(calculateCoinEarningsBreakdown(c).netInr * 100);
        const netPaise = netPaiseOf(paidCoins + coins) - netPaiseOf(paidCoins);
        dueAfter = dueCoins - coins;

        const p = await tx.panditPayout.create({
          data: {
            streamerId,
            coins,
            netPaise,
            periodFrom: periodFrom ? new Date(periodFrom) : null,
            periodTo: new Date(periodTo),
            method: method || null,
            reference,
            note: note || null,
            paidById,
            paidAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: paidById,
            actorEmail: paidByEmail,
            action: 'RECORD_PANDIT_PAYOUT',
            targetResource: `User:${streamerId}`,
            details: {
              panditName: pandit.name,
              coins,
              netInr: netPaise / 100,
              grossInr: breakdown.grossInr,
              reference,
              method: method || null,
              periodTo,
              note: note || null,
            },
          },
        });

        return p;
      });
    } catch (err: any) {
      // Prisma unique constraint: same streamer + reference already recorded
      if (err?.code === 'P2002') {
        throw new BadRequestException(
          `A payout with reference "${reference}" already exists for this pandit. Use a unique transaction ID.`,
        );
      }
      throw err;
    }

    return {
      ...payout,
      netInr: payout.netPaise / 100,
      grossInr: breakdown.grossInr,
      dueCoinsAfter: dueAfter,
    };
  }

  // --- List payouts for a specific pandit ---
  async getPanditPayouts(streamerId: string) {
    const pandit = await this.prisma.user.findUnique({ where: { id: streamerId }, select: { id: true, name: true } });
    if (!pandit) throw new NotFoundException('Pandit not found');

    const payouts = await this.prisma.panditPayout.findMany({
      where: { streamerId },
      include: {
        paidBy: { select: { name: true, email: true } },
      },
      orderBy: { paidAt: 'desc' },
    });

    return payouts.map((p) => ({
      id: p.id,
      coins: p.coins,
      netInr: p.netPaise / 100,
      periodFrom: p.periodFrom,
      periodTo: p.periodTo,
      method: p.method,
      reference: p.reference,
      note: p.note,
      paidAt: p.paidAt,
      paidBy: p.paidBy ? `${p.paidBy.name} (${p.paidBy.email})` : null,
    }));
  }

  // --- Delete Category ---
  async deleteCategory(id: string, adminId?: string, adminEmail?: string) {
    // Verify no active streams use this category before deletion
    const usageCount = await this.prisma.stream.count({ where: { categoryId: id } });
    if (usageCount > 0) {
      throw new BadRequestException(
        `Cannot delete category: ${usageCount} stream(s) are assigned to it. Reassign or archive them first.`,
      );
    }
    const deleted = await this.prisma.streamCategory.delete({ where: { id } });
    if (adminId && adminEmail) {
      await this.prisma.auditLog.create({
        data: {
          actorId: adminId,
          actorEmail: adminEmail,
          action: 'DELETE_STREAM_CATEGORY',
          targetResource: `StreamCategory:${id}`,
          details: { name: (deleted as any).name ?? null },
        },
      });
    }
    return deleted;
  }

  // --- Pandit Management & Special Badges ---
  async getPanditsList() {
    const streamers = await this.prisma.streamerProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            followers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const userIds = streamers.map((s) => s.userId);
    const streamCounts = await this.prisma.stream.groupBy({
      by: ['streamerId'],
      where: { streamerId: { in: userIds } },
      _count: { id: true },
    });

    const streamCountMap = new Map<string, number>();
    for (const sc of streamCounts) {
      streamCountMap.set(sc.streamerId, sc._count.id);
    }

    return streamers.map((s) => ({
      id: s.id,
      userId: s.userId,
      name: s.user.name,
      email: s.user.email,
      avatarUrl: s.user.avatarUrl,
      role: s.user.role,
      status: s.user.status,
      bio: s.bio,
      languages: s.languages,
      specialties: s.specialties,
      kycStatus: s.kycStatus,
      isVerifiedBadge: s.isVerifiedBadge,
      hasSpecialBadge: s.hasSpecialBadge,
      specialBadgeTitle: s.specialBadgeTitle || 'आचार्य रत्न',
      followerCount: s._count?.followers ?? s.followerCount,
      totalStreams: streamCountMap.get(s.userId) || 0,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  async toggleSpecialBadge(
    profileId: string,
    hasSpecialBadge: boolean,
    specialBadgeTitle?: string,
    adminId?: string,
    adminEmail?: string,
  ) {
    const profile = await this.prisma.streamerProfile.findUnique({
      where: { id: profileId },
      include: { user: true },
    });
    if (!profile) throw new NotFoundException('Pandit profile not found');

    const updated = await this.prisma.streamerProfile.update({
      where: { id: profileId },
      data: {
        hasSpecialBadge,
        specialBadgeTitle: specialBadgeTitle !== undefined ? specialBadgeTitle : profile.specialBadgeTitle,
      },
    });

    if (adminId && adminEmail) {
      await this.prisma.auditLog.create({
        data: {
          actorId: adminId,
          actorEmail: adminEmail,
          action: hasSpecialBadge ? 'GRANT_PANDIT_SPECIAL_BADGE' : 'REVOKE_PANDIT_SPECIAL_BADGE',
          targetResource: `StreamerProfile:${profileId}`,
          details: {
            panditName: profile.user.name,
            hasSpecialBadge,
            specialBadgeTitle: updated.specialBadgeTitle,
          },
        },
      });
    }

    return updated;
  }

  async toggleVerifiedBadge(
    profileId: string,
    isVerifiedBadge: boolean,
    adminId?: string,
    adminEmail?: string,
  ) {
    const profile = await this.prisma.streamerProfile.findUnique({
      where: { id: profileId },
      include: { user: true },
    });
    if (!profile) throw new NotFoundException('Pandit profile not found');

    const updated = await this.prisma.streamerProfile.update({
      where: { id: profileId },
      data: {
        isVerifiedBadge,
        kycStatus: isVerifiedBadge ? KycStatus.APPROVED : profile.kycStatus,
      },
    });

    if (adminId && adminEmail) {
      await this.prisma.auditLog.create({
        data: {
          actorId: adminId,
          actorEmail: adminEmail,
          action: isVerifiedBadge ? 'GRANT_PANDIT_VERIFIED_BADGE' : 'REVOKE_PANDIT_VERIFIED_BADGE',
          targetResource: `StreamerProfile:${profileId}`,
          details: {
            panditName: profile.user.name,
            isVerifiedBadge,
          },
        },
      });
    }

    return updated;
  }
}
