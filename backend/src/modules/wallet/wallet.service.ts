import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LiveKitProviderService } from '../video/providers/livekit-provider.service';
import { MeterTickDto } from './dto/meter-tick.dto';
import { CreateTopupOrderDto, VerifyTopupDto } from './dto/topup-order.dto';
import {
  WalletTxType,
  WalletTxCategory,
  ViewingSessionStatus,
  PaymentStatus,
  PaymentProvider,
  StreamerEarningSource,
} from '@prisma/client';
import * as crypto from 'crypto';
import {
  isProd,
  safeEqualHex,
  razorpaySignature,
  createRazorpayOrder,
  assertCaptured,
} from '../../common/payments.util';
import { COINS_PER_MINUTE } from '../../common/config/economy.constants';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  public static readonly COINS_PER_MINUTE = COINS_PER_MINUTE;

  constructor(
    private readonly prisma: PrismaService,
    private readonly livekitProvider: LiveKitProviderService,
    private readonly chatGateway: ChatGateway,
  ) {}

  /**
   * 1. Get or create wallet for user
   */
  async getWalletBalance(userId: string) {
    let wallet = await this.prisma.userWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { isEmailVerified: true },
      });

      // N-05: Welcome bonus coins are only awarded to email-verified accounts
      const initialCoins = user?.isEmailVerified ? 100 : 0;

      try {
        wallet = await this.prisma.userWallet.create({
          data: {
            userId,
            balanceCoins: initialCoins,
            bonusCoins: initialCoins,
            purchasedCoins: 0,
            lifetimeEarned: initialCoins,
            lifetimeSpent: 0,
          },
        });

        if (initialCoins > 0) {
          await this.prisma.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: WalletTxType.CREDIT,
              category: WalletTxCategory.JOINING_BONUS,
              amountCoins: initialCoins,
              balanceBefore: 0,
              balanceAfter: initialCoins,
              referenceId: `signup_bonus_${userId}`,
              idempotencyKey: `signup_bonus_${userId}`,
              metadata: { note: 'Auspicious Welcome Darshan Bonus' },
            },
          });
        }
      } catch (err: any) {
        // N-05: Catch only concurrent unique constraint conflict, do not swallow other database errors
        if (err.code === 'P2002' || err.message?.includes('Unique constraint')) {
          wallet = await this.prisma.userWallet.findUnique({ where: { userId } });
        } else {
          this.logger.error(`Failed to initialize wallet for user [${userId}]: ${err.message}`);
          throw err;
        }
      }
    }

    if (!wallet) {
      throw new HttpException('Unable to initialize user wallet', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return {
      balanceCoins: wallet.balanceCoins,
      bonusCoins: wallet.bonusCoins,
      purchasedCoins: wallet.purchasedCoins,
      lifetimeEarned: wallet.lifetimeEarned,
      lifetimeSpent: wallet.lifetimeSpent,
      availableMinutes: Math.floor(wallet.balanceCoins / WalletService.COINS_PER_MINUTE),
      consumptionRatePerMin: WalletService.COINS_PER_MINUTE,
    };
  }

  /**
   * 2. Start viewing session & debit Minute 1 upfront
   */
  async startViewingSession(
    userId: string,
    streamId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      select: { id: true, streamerId: true, title: true, deletedAt: true },
    });

    if (!stream || stream.deletedAt) {
      throw new NotFoundException('Stream not found');
    }

    if (stream.streamerId === userId) {
      throw new ForbiddenException('Broadcasters cannot start metered viewing on their own stream');
    }

    const wallet = await this.getWalletBalance(userId);

    // B-09: Check if active session already exists for this user and stream (e.g. reload or reconnect)
    const existingActive = await this.prisma.streamViewingSession.findFirst({
      where: {
        userId,
        streamId,
        status: ViewingSessionStatus.ACTIVE,
      },
      orderBy: { startedAt: 'desc' },
    });

    if (existingActive) {
      const availableMinutes = Math.floor(wallet.balanceCoins / COINS_PER_MINUTE);
      this.logger.log(`Devotee [${userId}] reconnecting to stream [${streamId}], reusing active session.`);
      return {
        sessionToken: existingActive.sessionToken,
        remainingCoins: wallet.balanceCoins,
        availableMinutes,
        sessionId: existingActive.id,
      };
    }

    // B-16: True HTTP 402 Payment Required for insufficient coins
    if (wallet.balanceCoins < COINS_PER_MINUTE) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          error: 'INSUFFICIENT_COINS',
          message: `You need at least ${COINS_PER_MINUTE} coins to watch public live darshan.`,
          requiredCoins: COINS_PER_MINUTE,
          currentBalance: wallet.balanceCoins,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // B-09: Wrap debit, session creation, minute 1 tick, wallet ledger, and streamer earning in a single atomic transaction
    const startResult = await this.prisma.$transaction(async (tx) => {
      // Serialise concurrent starts for the same user (double click, two tabs, retry): take the wallet
      // row lock first, then re-check for an ACTIVE session. The second caller blocks here, sees the
      // session the first one committed and reuses it instead of creating, debiting - and paying the
      // streamer - twice.
      const locked: any = await tx.$queryRawUnsafe(
        `SELECT "id", "balanceCoins" FROM "UserWallet" WHERE "userId" = $1 FOR UPDATE`,
        userId,
      );
      const raced = await tx.streamViewingSession.findFirst({
        where: { userId, streamId, status: ViewingSessionStatus.ACTIVE },
        orderBy: { startedAt: 'desc' },
      });
      if (raced) {
        return {
          reused: true as const,
          sessionToken: raced.sessionToken,
          balanceAfter: (locked?.[0]?.balanceCoins ?? wallet.balanceCoins) as number,
          sessionId: raced.id,
          streamTotalCoins: 0,
        };
      }

      const rawResult: any = await tx.$queryRawUnsafe(
        `UPDATE "UserWallet"
         SET "balanceCoins" = "balanceCoins" - $2,
             "lifetimeSpent" = "lifetimeSpent" + $2,
             "updatedAt" = NOW()
         WHERE "userId" = $1 AND "balanceCoins" >= $2
         RETURNING "id", "balanceCoins"`,
        userId,
        COINS_PER_MINUTE,
      );

      if (!rawResult || rawResult.length === 0) {
        throw new HttpException(
          {
            statusCode: HttpStatus.PAYMENT_REQUIRED,
            error: 'INSUFFICIENT_COINS',
            message: 'Insufficient coin balance to enter live darshan.',
            requiredCoins: COINS_PER_MINUTE,
            currentBalance: wallet.balanceCoins,
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }

      const walletId = rawResult[0].id;
      const balanceAfter = rawResult[0].balanceCoins;
      const sessionToken = `ses_${crypto.randomBytes(16).toString('hex')}`;

      // Single-tab rule: end this user's sessions on OTHER streams only now that the debit succeeded,
      // inside the same transaction (it used to run BEFORE the debit, so a failed debit still cost the
      // viewer the session they already had).
      await tx.streamViewingSession.updateMany({
        where: { userId, streamId: { not: streamId }, status: ViewingSessionStatus.ACTIVE },
        data: { status: ViewingSessionStatus.DISCONNECTED_TIMEOUT, endedAt: new Date() },
      });

      // Create viewing session
      const session = await tx.streamViewingSession.create({
        data: {
          streamId,
          userId,
          sessionToken,
          status: ViewingSessionStatus.ACTIVE,
          totalMinutesWatched: 1,
          totalCoinsDebited: COINS_PER_MINUTE,
          ipAddress: ip || null,
          userAgent: userAgent || null,
          lastTickAt: new Date(),
          meterTicks: {
            create: {
              minuteIndex: 1,
              coinsCharged: COINS_PER_MINUTE,
              balanceAfter,
            },
          },
        },
      });

      // Log viewer debit transaction
      await tx.walletTransaction.create({
        data: {
          walletId,
          type: WalletTxType.DEBIT,
          category: WalletTxCategory.STREAM_METERED_VIEW,
          amountCoins: COINS_PER_MINUTE,
          balanceBefore: balanceAfter + COINS_PER_MINUTE,
          balanceAfter,
          streamId,
          referenceId: session.id,
          idempotencyKey: `tick_${session.id}_1`,
          metadata: { minuteIndex: 1, sessionToken, streamTitle: stream.title },
        },
      });

      // Credit streamer watch-time revenue atomically in the same transaction
      await tx.streamerEarning.create({
        data: {
          streamId,
          streamerId: stream.streamerId,
          viewerId: userId,
          source: StreamerEarningSource.WATCH_TIME,
          coins: COINS_PER_MINUTE,
          referenceId: session.id,
          idempotencyKey: `earn_${session.id}_1`,
        },
      });

      const earningAgg = await tx.streamerEarning.aggregate({
        where: { streamId },
        _sum: { coins: true },
      });

      return {
        reused: false as const,
        sessionToken,
        balanceAfter,
        sessionId: session.id,
        streamTotalCoins: earningAgg._sum.coins || 0,
      };
    });

    if (startResult.reused) {
      this.logger.log(`Devotee [${userId}] raced a concurrent start on stream [${streamId}], reusing its session.`);
      return {
        sessionToken: startResult.sessionToken,
        remainingCoins: startResult.balanceAfter,
        availableMinutes: Math.floor(startResult.balanceAfter / COINS_PER_MINUTE),
        sessionId: startResult.sessionId,
      };
    }

    this.chatGateway.emitEarningsUpdated(stream.streamerId, {
      streamId,
      totalCoins: startResult.streamTotalCoins,
      delta: COINS_PER_MINUTE,
      source: 'WATCH_TIME',
    });

    this.logger.log(
      `Devotee [${userId}] entered stream [${streamId}]. Minute 1 debited atomically. Balance: ${startResult.balanceAfter} coins.`,
    );

    return {
      sessionToken: startResult.sessionToken,
      remainingCoins: startResult.balanceAfter,
      availableMinutes: Math.floor(startResult.balanceAfter / COINS_PER_MINUTE),
      sessionId: startResult.sessionId,
    };
  }

  /**
   * 3. 60-Second Meter Heartbeat Tick
   */
  async processMeterTick(userId: string, dto: MeterTickDto) {
    const session = await this.prisma.streamViewingSession.findFirst({
      where: {
        sessionToken: dto.sessionToken,
        userId,
        streamId: dto.streamId,
        status: ViewingSessionStatus.ACTIVE,
      },
      include: {
        stream: {
          select: { id: true, streamerId: true, title: true },
        },
      },
    });

    if (!session) {
      return {
        canContinue: false,
        remainingCoins: 0,
        reason: 'SESSION_EXPIRED',
        message: 'Viewing session not found or concluded.',
      };
    }

    // Never bill (and never pay the streamer) for a stream that is over, or while the pandit is
    // reconnecting and no video is being produced.
    const liveState = await this.prisma.stream.findUnique({
      where: { id: dto.streamId },
      select: { status: true },
    });
    if (!liveState || liveState.status === 'ENDED' || liveState.status === 'CANCELLED') {
      const w = await this.getWalletBalance(userId);
      await this.prisma.streamViewingSession.updateMany({
        where: { id: session.id, status: ViewingSessionStatus.ACTIVE },
        data: { status: ViewingSessionStatus.COMPLETED_NATURAL, endedAt: new Date() },
      });
      return {
        canContinue: false,
        remainingCoins: w.balanceCoins,
        reason: 'STREAM_ENDED',
        message: 'This darshan has concluded.',
      };
    }
    if (liveState.status === 'RECONNECTING_GRACE_PERIOD') {
      const w = await this.getWalletBalance(userId);
      // Keep the heartbeat fresh (without billing) so the 90 s watchdog does not evict everybody the
      // moment the stream resumes; a viewer who truly left stops ticking and is reaped after resume.
      await this.prisma.streamViewingSession.updateMany({
        where: { id: session.id, status: ViewingSessionStatus.ACTIVE },
        data: { lastTickAt: new Date() },
      });
      return { canContinue: true, remainingCoins: w.balanceCoins, nextTickInSeconds: 30, paused: true };
    }

    // B-10: Fast-path cooldown reject before opening a transaction
    if (session.lastTickAt && Date.now() - session.lastTickAt.getTime() < 55_000) {
      const wallet = await this.getWalletBalance(userId);
      return {
        canContinue: true,
        remainingCoins: wallet.balanceCoins,
        nextTickInSeconds: 60,
      };
    }

    // W-01: Strict global lock order: UserWallet first, then atomic conditional StreamViewingSession claim
    let tickResult:
      | { status: 'INSUFFICIENT' }
      | { status: 'CREDITED'; balanceAfter: number; actualMinuteIndex: number; streamTotalCoins: number };

    try {
      tickResult = await this.prisma.$transaction(async (tx) => {
        const rawResult: any = await tx.$queryRawUnsafe(
          `UPDATE "UserWallet"
           SET "balanceCoins" = "balanceCoins" - $2,
               "lifetimeSpent" = "lifetimeSpent" + $2,
               "updatedAt" = NOW()
           WHERE "userId" = $1 AND "balanceCoins" >= $2
           RETURNING "id", "balanceCoins"`,
          userId,
          COINS_PER_MINUTE,
        );

        if (!rawResult || rawResult.length === 0) {
          return { status: 'INSUFFICIENT' as const };
        }

        const claimedSession: any = await tx.$queryRawUnsafe(
          `UPDATE "StreamViewingSession"
           SET "lastTickAt" = NOW(),
               "totalMinutesWatched" = "totalMinutesWatched" + 1,
               "totalCoinsDebited" = "totalCoinsDebited" + $2
           WHERE "id" = $1
             AND "status" = 'ACTIVE'
             AND ("lastTickAt" IS NULL OR "lastTickAt" <= NOW() - INTERVAL '55 seconds')
           RETURNING "totalMinutesWatched"`,
          session.id,
          COINS_PER_MINUTE,
        );

        if (!claimedSession || claimedSession.length === 0) {
          throw new Error('TICK_NOT_CLAIMED');
        }

        const walletId = rawResult[0].id;
        const balanceAfter = rawResult[0].balanceCoins;
        const actualMinuteIndex: number = claimedSession[0].totalMinutesWatched;

        // Create meter tick log
        await tx.meterTickLog.create({
          data: {
            sessionId: session.id,
            minuteIndex: actualMinuteIndex,
            coinsCharged: COINS_PER_MINUTE,
            balanceAfter,
          },
        });

        // Create wallet transaction ledger entry
        await tx.walletTransaction.create({
          data: {
            walletId,
            type: WalletTxType.DEBIT,
            category: WalletTxCategory.STREAM_METERED_VIEW,
            amountCoins: COINS_PER_MINUTE,
            balanceBefore: balanceAfter + COINS_PER_MINUTE,
            balanceAfter,
            streamId: dto.streamId,
            referenceId: session.id,
            idempotencyKey: `tick_${session.id}_${actualMinuteIndex}`,
            metadata: {
              minuteIndex: actualMinuteIndex,
              sessionToken: dto.sessionToken,
              streamTitle: session.stream.title,
            },
          },
        });

        // Credit streamer watch-time earning atomically
        await tx.streamerEarning.create({
          data: {
            streamId: dto.streamId,
            streamerId: session.stream.streamerId,
            viewerId: userId,
            source: StreamerEarningSource.WATCH_TIME,
            coins: COINS_PER_MINUTE,
            referenceId: session.id,
            idempotencyKey: `earn_${session.id}_${actualMinuteIndex}`,
          },
        });

        const earningAgg = await tx.streamerEarning.aggregate({
          where: { streamId: dto.streamId },
          _sum: { coins: true },
        });

        return {
          status: 'CREDITED' as const,
          balanceAfter,
          actualMinuteIndex,
          streamTotalCoins: earningAgg._sum.coins || 0,
        };
      });
    } catch (err: any) {
      if (err?.message === 'TICK_NOT_CLAIMED') {
        const latestSession = await this.prisma.streamViewingSession.findUnique({
          where: { id: session.id },
          select: { status: true },
        });
        if (latestSession?.status !== ViewingSessionStatus.ACTIVE) {
          return {
            canContinue: false,
            remainingCoins: 0,
            reason: 'SESSION_EXPIRED',
            message: 'Viewing session not found or concluded.',
          };
        }
        const wallet = await this.getWalletBalance(userId);
        return {
          canContinue: true,
          remainingCoins: wallet.balanceCoins,
          nextTickInSeconds: 60,
        };
      }

      // B-10: Idempotent success on concurrent duplicate meter tick key
      if (err.code === 'P2002' || err.message?.includes('Unique constraint')) {
        const wallet = await this.getWalletBalance(userId);
        return {
          canContinue: true,
          remainingCoins: wallet.balanceCoins,
          nextTickInSeconds: 60,
        };
      }
      throw err;
    }

    // If balance was insufficient
    if (tickResult.status === 'INSUFFICIENT') {
      await this.prisma.streamViewingSession.update({
        where: { id: session.id },
        data: {
          status: ViewingSessionStatus.EVICTED_ZERO_BALANCE,
          endedAt: new Date(),
        },
      });

      await this.livekitProvider.kickParticipant(dto.streamId, userId);

      const currentWallet = await this.prisma.userWallet.findUnique({
        where: { userId },
      });

      return {
        canContinue: false,
        remainingCoins: currentWallet?.balanceCoins || 0,
        reason: 'ZERO_BALANCE',
        message: 'Sacred Darshan Paused — Please recharge coins to continue receiving blessings.',
      };
    }

    // Emit live watch-time earnings update to streamer only after commit
    this.chatGateway.emitEarningsUpdated(session.stream.streamerId, {
      streamId: dto.streamId,
      totalCoins: tickResult.streamTotalCoins,
      delta: COINS_PER_MINUTE,
      source: 'WATCH_TIME',
    });

    return {
      canContinue: true,
      remainingCoins: tickResult.balanceAfter,
      availableMinutes: Math.floor(tickResult.balanceAfter / COINS_PER_MINUTE),
      minutesWatched: tickResult.actualMinuteIndex,
      nextTickInSeconds: 60,
    };
  }

  /**
   * 4. List Active Packages
   */
  async getCoinPackages() {
    return this.prisma.coinPackage.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  private async alreadyCredited(userId: string) {
    const currentWallet = await this.prisma.userWallet.findUnique({
      where: { userId },
    });
    const balance = currentWallet?.balanceCoins || 0;
    return {
      success: true,
      message: 'Order already credited',
      newBalance: balance,
      availableMinutes: Math.floor(balance / WalletService.COINS_PER_MINUTE),
    };
  }

  /**
   * 5. Create Top-Up Payment Order
   */
  async createTopupOrder(userId: string, dto: CreateTopupOrderDto) {
    const targetSku = dto.packageSku || dto.sku;
    if (!targetSku) {
      throw new BadRequestException('packageSku is required');
    }

    const pkg = await this.prisma.coinPackage.findUnique({
      where: { sku: targetSku },
    });

    if (!pkg || !pkg.isActive) {
      throw new NotFoundException('Selected coin package is not active');
    }

    const configured = !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET;
    if (!configured && isProd() && process.env.ALLOW_MOCK_PAYMENTS !== 'true') {
      throw new ServiceUnavailableException('Payments are not configured in production');
    }

    const amountPaise = Math.round(Number(pkg.priceInr) * 100);
    const receipt = `coin_${userId.slice(0, 8)}_${Date.now()}`;
    const notes = { userId, sku: pkg.sku, coins: pkg.totalCoins };

    const rzp = configured
      ? await createRazorpayOrder(amountPaise, receipt, notes)
      : null;

    const orderId = rzp?.id ?? `order_mock_${crypto.randomBytes(8).toString('hex')}`;
    const provider = rzp ? PaymentProvider.RAZORPAY : PaymentProvider.MOCK;

    await this.prisma.walletTopupOrder.create({
      data: {
        userId,
        packageId: pkg.id,
        coinsToCredit: pkg.totalCoins,
        amountInr: pkg.priceInr,
        provider,
        orderId,
        status: PaymentStatus.PENDING,
      },
    });

    return {
      orderId,
      provider,
      amountInr: Number(pkg.priceInr),
      coins: pkg.totalCoins,
      packageName: pkg.name,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    };
  }

  /**
   * 6. Verify Payment & Credit Coins
   */
  async verifyTopup(userId: string, dto: VerifyTopupDto) {
    const order = await this.prisma.walletTopupOrder.findUnique({
      where: { orderId: dto.orderId },
      include: { package: true },
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundException('Recharge order not found');
    }

    if (order.status === PaymentStatus.SUCCESS) {
      return this.alreadyCredited(userId);
    }

    if (order.provider === PaymentProvider.MOCK) {
      if (isProd() && process.env.ALLOW_MOCK_PAYMENTS !== 'true') {
        throw new ForbiddenException('Mock payments are disabled in production');
      }
    } else {
      if (!dto.signature) {
        throw new BadRequestException('Payment signature is required');
      }
      if (!safeEqualHex(razorpaySignature(dto.orderId, dto.paymentId), dto.signature)) {
        throw new BadRequestException('Payment verification failed');
      }
      await assertCaptured(dto.paymentId, dto.orderId, Math.round(Number(order.amountInr) * 100));
    }

    return this.prisma.$transaction(async (tx) => {
      // Atomic claim: exactly one concurrent request can flip PENDING -> SUCCESS
      const claimed = await tx.walletTopupOrder.updateMany({
        where: { id: order.id, status: PaymentStatus.PENDING },
        data: {
          status: PaymentStatus.SUCCESS,
          paymentId: dto.paymentId,
        },
      });

      if (claimed.count !== 1) {
        return this.alreadyCredited(userId);
      }

      // upsert, like the webhook path: a paying user with no wallet row yet must still be credited
      // (update would throw P2025 and roll the whole claim back after the money was captured).
      const wallet = await tx.userWallet.upsert({
        where: { userId },
        create: {
          userId,
          balanceCoins: order.coinsToCredit,
          purchasedCoins: order.package.coins,
          bonusCoins: order.package.bonusCoins,
          lifetimeEarned: order.coinsToCredit,
        },
        update: {
          balanceCoins: { increment: order.coinsToCredit },
          purchasedCoins: { increment: order.package.coins },
          bonusCoins: { increment: order.package.bonusCoins },
          lifetimeEarned: { increment: order.coinsToCredit },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTxType.CREDIT,
          category: WalletTxCategory.TOPUP_PURCHASE,
          amountCoins: order.coinsToCredit,
          balanceBefore: wallet.balanceCoins - order.coinsToCredit,
          balanceAfter: wallet.balanceCoins,
          referenceId: order.orderId,
          idempotencyKey: `topup_${order.id}`,
        },
      });

      return {
        success: true,
        coinsAdded: order.coinsToCredit,
        newBalance: wallet.balanceCoins,
        availableMinutes: Math.floor(wallet.balanceCoins / WalletService.COINS_PER_MINUTE),
      };
    });
  }

  /**
   * 7. Transaction History
   */
  async getTransactionHistory(userId: string) {
    const wallet = await this.prisma.userWallet.findUnique({
      where: { userId },
    });

    if (!wallet) return [];

    return this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
