import {
  Injectable,
  BadRequestException,
  NotFoundException,
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

    if (wallet.balanceCoins < WalletService.COINS_PER_MINUTE) {
      throw new BadRequestException({
        statusCode: 402,
        error: 'INSUFFICIENT_COINS',
        message: `You need at least ${WalletService.COINS_PER_MINUTE} coins to watch public live darshan.`,
        requiredCoins: WalletService.COINS_PER_MINUTE,
        currentBalance: wallet.balanceCoins,
      });
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
      throw new BadRequestException({
        statusCode: 402,
        error: 'INSUFFICIENT_COINS',
        message: 'Insufficient coin balance to enter live darshan.',
        requiredCoins: WalletService.COINS_PER_MINUTE,
        currentBalance: wallet.balanceCoins,
      });
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

    // Atomic SQL decrement
    const rawResult: any = await this.prisma.$queryRawUnsafe(
      `UPDATE "UserWallet"
       SET "balanceCoins" = "balanceCoins" - ${WalletService.COINS_PER_MINUTE},
           "lifetimeSpent" = "lifetimeSpent" + ${WalletService.COINS_PER_MINUTE},
           "updatedAt" = NOW()
       WHERE "userId" = $1 AND "balanceCoins" >= ${WalletService.COINS_PER_MINUTE}
       RETURNING "id", "balanceCoins"`,
      userId,
    );

    // If balance was < 5 coins
    if (!rawResult || rawResult.length === 0) {
      // Mark session evicted
      await this.prisma.streamViewingSession.update({
        where: { id: session.id },
        data: {
          status: ViewingSessionStatus.EVICTED_ZERO_BALANCE,
          endedAt: new Date(),
        },
      });

      // Disconnect participant from LiveKit SFU room
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

    const walletId = rawResult[0].id;
    const balanceAfter = rawResult[0].balanceCoins;
    const nextMinuteIndex = session.totalMinutesWatched + 1;

    // Update session stats
    await this.prisma.streamViewingSession.update({
      where: { id: session.id },
      data: {
        lastTickAt: new Date(),
        totalMinutesWatched: nextMinuteIndex,
        totalCoinsDebited: { increment: WalletService.COINS_PER_MINUTE },
      },
    });

    // Create meter tick log
    await this.prisma.meterTickLog.create({
      data: {
        sessionId: session.id,
        minuteIndex: nextMinuteIndex,
        coinsCharged: WalletService.COINS_PER_MINUTE,
        balanceAfter,
      },
    });

    // Create wallet transaction ledger entry
    await this.prisma.walletTransaction.create({
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
      canContinue: true,
      remainingCoins: balanceAfter,
      availableMinutes: Math.floor(balanceAfter / WalletService.COINS_PER_MINUTE),
      minutesWatched: nextMinuteIndex,
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

  /**
   * 5. Create Top-Up Payment Order
   */
  async createTopupOrder(userId: string, dto: CreateTopupOrderDto) {
    const targetSku = dto.packageSku || dto.sku;
    if (!targetSku) {
      throw new BadRequestException('packageSku or sku is required');
    }

    const pkg = await this.prisma.coinPackage.findUnique({
      where: { sku: targetSku },
    });

    if (!pkg || !pkg.isActive) {
      throw new NotFoundException('Selected coin package is not active');
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    let orderId: string;
    let provider: PaymentProvider = PaymentProvider.RAZORPAY;

    if (razorpayKeyId && razorpayKeySecret) {
      try {
        const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');
        const res = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify({
            amount: Math.round(Number(pkg.priceInr) * 100), // paise
            currency: 'INR',
            receipt: `coin_${pkg.sku}_${Date.now()}`,
            notes: {
              userId,
              sku: pkg.sku,
              coins: pkg.totalCoins,
            },
          }),
        });

        const rzpData = await res.json();
        if (!res.ok) {
          throw new BadRequestException('Razorpay order creation failed');
        }
        orderId = rzpData.id;
      } catch (err: any) {
        this.logger.error(`Failed to reach Razorpay: ${err.message}`);
        orderId = `order_coin_${crypto.randomBytes(8).toString('hex')}`;
        provider = PaymentProvider.MOCK;
      }
    } else {
      orderId = `order_coin_${crypto.randomBytes(8).toString('hex')}`;
      provider = PaymentProvider.MOCK;
    }

    const topupOrder = await this.prisma.walletTopupOrder.create({
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
      amountInr: Number(pkg.priceInr),
      coins: pkg.totalCoins,
      packageName: pkg.name,
      provider,
      keyId: razorpayKeyId || 'rzp_test_placeholder',
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

    if (!order) {
      throw new NotFoundException('Recharge order not found');
    }

    if (order.status === PaymentStatus.SUCCESS) {
      const currentWallet = await this.prisma.userWallet.findUnique({
        where: { userId },
      });
      return {
        success: true,
        message: 'Order already credited',
        balanceCoins: currentWallet?.balanceCoins || 0,
      };
    }

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (order.provider === PaymentProvider.RAZORPAY && razorpayKeySecret && dto.signature) {
      const generatedSignature = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(`${dto.orderId}|${dto.paymentId}`)
        .digest('hex');

      if (generatedSignature !== dto.signature) {
        await this.prisma.walletTopupOrder.update({
          where: { id: order.id },
          data: { status: PaymentStatus.FAILED, failureReason: 'Signature mismatch' },
        });
        throw new BadRequestException('Payment verification failed');
      }
    }

    // Execute atomic balance update
    return this.prisma.$transaction(async (tx) => {
      // 1. Mark order successful
      await tx.walletTopupOrder.update({
        where: { id: order.id },
        data: {
          status: PaymentStatus.SUCCESS,
          paymentId: dto.paymentId,
        },
      });

      // 2. Increment wallet balance
      const wallet = await tx.userWallet.update({
        where: { userId },
        data: {
          balanceCoins: { increment: order.coinsToCredit },
          purchasedCoins: { increment: order.package.coins },
          bonusCoins: { increment: order.package.bonusCoins },
          lifetimeEarned: { increment: order.coinsToCredit },
        },
      });

      // 3. Log immutable transaction
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTxType.CREDIT,
          category: WalletTxCategory.TOPUP_PURCHASE,
          amountCoins: order.coinsToCredit,
          balanceBefore: wallet.balanceCoins - order.coinsToCredit,
          balanceAfter: wallet.balanceCoins,
          referenceId: order.orderId,
          idempotencyKey: `pay_${dto.paymentId}`,
          metadata: {
            orderId: order.orderId,
            paymentId: dto.paymentId,
            packageSku: order.package.sku,
            amountInr: Number(order.amountInr),
          },
        },
      });

      this.logger.log(
        `Devotee [${userId}] recharged ${order.coinsToCredit} coins via order ${order.orderId}. New balance: ${wallet.balanceCoins}`,
      );

      return {
        success: true,
        message: `Successfully added ${order.coinsToCredit} Coins to your Sacred Wallet! 🕉️`,
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
