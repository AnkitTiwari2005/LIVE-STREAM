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
} from '@prisma/client';
import * as crypto from 'crypto';
import {
  isProd,
  safeEqualHex,
  razorpaySignature,
  createRazorpayOrder,
  assertCaptured,
} from '../../common/payments.util';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  public static readonly COINS_PER_MINUTE = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly livekitProvider: LiveKitProviderService,
  ) {}

  /**
   * 1. Get or create wallet for user
   */
  async getWalletBalance(userId: string) {
    let wallet = await this.prisma.userWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.userWallet.create({
        data: {
          userId,
          balanceCoins: 100,
          bonusCoins: 100,
          purchasedCoins: 0,
          lifetimeEarned: 100,
          lifetimeSpent: 0,
        },
      });

      await this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTxType.CREDIT,
          category: WalletTxCategory.JOINING_BONUS,
          amountCoins: 100,
          balanceBefore: 0,
          balanceAfter: 100,
          referenceId: `signup_bonus_${userId}`,
          metadata: { note: 'Auspicious Welcome Darshan Bonus' },
        },
      });
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
    const wallet = await this.getWalletBalance(userId);

    // B-16: True HTTP 402 Payment Required for insufficient coins
    if (wallet.balanceCoins < WalletService.COINS_PER_MINUTE) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          error: 'INSUFFICIENT_COINS',
          message: `You need at least ${WalletService.COINS_PER_MINUTE} coins to watch public live darshan.`,
          requiredCoins: WalletService.COINS_PER_MINUTE,
          currentBalance: wallet.balanceCoins,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // Terminate any previous active session for this user to enforce single-tab rule
    await this.prisma.streamViewingSession.updateMany({
      where: {
        userId,
        status: ViewingSessionStatus.ACTIVE,
      },
      data: {
        status: ViewingSessionStatus.DISCONNECTED_TIMEOUT,
        endedAt: new Date(),
      },
    });

    // Atomic SQL decrement for Minute 1
    const rawResult: any = await this.prisma.$queryRawUnsafe(
      `UPDATE "UserWallet"
       SET "balanceCoins" = "balanceCoins" - ${WalletService.COINS_PER_MINUTE},
           "lifetimeSpent" = "lifetimeSpent" + ${WalletService.COINS_PER_MINUTE},
           "updatedAt" = NOW()
       WHERE "userId" = $1 AND "balanceCoins" >= ${WalletService.COINS_PER_MINUTE}
       RETURNING "id", "balanceCoins"`,
      userId,
    );

    if (!rawResult || rawResult.length === 0) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          error: 'INSUFFICIENT_COINS',
          message: 'Insufficient coin balance to enter live darshan.',
          requiredCoins: WalletService.COINS_PER_MINUTE,
          currentBalance: wallet.balanceCoins,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const walletId = rawResult[0].id;
    const balanceAfter = rawResult[0].balanceCoins;
    const sessionToken = `ses_${crypto.randomBytes(16).toString('hex')}`;

    // Create viewing session
    const session = await this.prisma.streamViewingSession.create({
      data: {
        streamId,
        userId,
        sessionToken,
        status: ViewingSessionStatus.ACTIVE,
        totalMinutesWatched: 1,
        totalCoinsDebited: WalletService.COINS_PER_MINUTE,
        ipAddress: ip || null,
        userAgent: userAgent || null,
        meterTicks: {
          create: {
            minuteIndex: 1,
            coinsCharged: WalletService.COINS_PER_MINUTE,
            balanceAfter,
          },
        },
      },
    });

    // Log transaction
    await this.prisma.walletTransaction.create({
      data: {
        walletId,
        type: WalletTxType.DEBIT,
        category: WalletTxCategory.STREAM_METERED_VIEW,
        amountCoins: WalletService.COINS_PER_MINUTE,
        balanceBefore: balanceAfter + WalletService.COINS_PER_MINUTE,
        balanceAfter,
        streamId,
        referenceId: session.id,
        idempotencyKey: `tick_${session.id}_1`,
        metadata: { minuteIndex: 1, sessionToken },
      },
    });

    this.logger.log(
      `Devotee [${userId}] entered stream [${streamId}]. Minute 1 debited. Balance: ${balanceAfter} coins.`,
    );

    return {
      sessionToken,
      remainingCoins: balanceAfter,
      availableMinutes: Math.floor(balanceAfter / WalletService.COINS_PER_MINUTE),
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
    });

    if (!session) {
      return {
        canContinue: false,
        remainingCoins: 0,
        reason: 'SESSION_EXPIRED',
        message: 'Viewing session not found or concluded.',
      };
    }

    // W-01: Wrap atomic balance decrement, session stats, meter tick log & transaction ledger in a single transaction
    const tickResult = await this.prisma.$transaction(async (tx) => {
      const rawResult: any = await tx.$queryRawUnsafe(
        `UPDATE "UserWallet"
         SET "balanceCoins" = "balanceCoins" - ${WalletService.COINS_PER_MINUTE},
             "lifetimeSpent" = "lifetimeSpent" + ${WalletService.COINS_PER_MINUTE},
             "updatedAt" = NOW()
         WHERE "userId" = $1 AND "balanceCoins" >= ${WalletService.COINS_PER_MINUTE}
         RETURNING "id", "balanceCoins"`,
        userId,
      );

      if (!rawResult || rawResult.length === 0) {
        return null;
      }

      const walletId = rawResult[0].id;
      const balanceAfter = rawResult[0].balanceCoins;
      const nextMinuteIndex = session.totalMinutesWatched + 1;

      // Update session stats
      await tx.streamViewingSession.update({
        where: { id: session.id },
        data: {
          lastTickAt: new Date(),
          totalMinutesWatched: nextMinuteIndex,
          totalCoinsDebited: { increment: WalletService.COINS_PER_MINUTE },
        },
      });

      // Create meter tick log
      await tx.meterTickLog.create({
        data: {
          sessionId: session.id,
          minuteIndex: nextMinuteIndex,
          coinsCharged: WalletService.COINS_PER_MINUTE,
          balanceAfter,
        },
      });

      // Create wallet transaction ledger entry
      await tx.walletTransaction.create({
        data: {
          walletId,
          type: WalletTxType.DEBIT,
          category: WalletTxCategory.STREAM_METERED_VIEW,
          amountCoins: WalletService.COINS_PER_MINUTE,
          balanceBefore: balanceAfter + WalletService.COINS_PER_MINUTE,
          balanceAfter,
          streamId: dto.streamId,
          referenceId: session.id,
          idempotencyKey: `tick_${session.id}_${nextMinuteIndex}`,
          metadata: { minuteIndex: nextMinuteIndex, sessionToken: dto.sessionToken },
        },
      });

      return {
        balanceAfter,
        nextMinuteIndex,
      };
    });

    // If balance was insufficient
    if (!tickResult) {
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

    return {
      canContinue: true,
      remainingCoins: tickResult.balanceAfter,
      availableMinutes: Math.floor(tickResult.balanceAfter / WalletService.COINS_PER_MINUTE),
      minutesWatched: tickResult.nextMinuteIndex,
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
    if (!configured && isProd()) {
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
      if (isProd()) {
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

      const wallet = await tx.userWallet.update({
        where: { userId },
        data: {
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
