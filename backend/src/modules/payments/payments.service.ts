import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  ForbiddenException,
  ConflictException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import { ChatService } from '../chat/chat.service';
import { WalletService } from '../wallet/wallet.service';
import { CreateDakshinaDto } from './dto/create-dakshina.dto';
import {
  PaymentStatus,
  StreamStatus,
  StreamVisibility,
  UserRole,
  WalletTxType,
  WalletTxCategory,
  StreamerEarningSource,
  ViewingSessionStatus,
} from '@prisma/client';
import { isProd, safeEqualHex } from '../../common/payments.util';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
    private readonly chatService: ChatService,
    private readonly walletService: WalletService,
  ) {}

  /**
   * 1. Send Coin-Based Sacred Dakshina from Viewer Wallet -> Streamer Ledger
   */
  async sendCoinDakshina(dto: CreateDakshinaDto, devoteeId: string) {
    const stream = await this.prisma.stream.findFirst({
      where: {
        id: dto.streamId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        streamerId: true,
        status: true,
      },
    });

    if (!stream) {
      throw new NotFoundException('Sacred stream not found');
    }

    if (
      stream.status !== StreamStatus.LIVE &&
      stream.status !== StreamStatus.RECONNECTING_GRACE_PERIOD
    ) {
      throw new BadRequestException(
        'Offerings can only be made during an active live darshan broadcast',
      );
    }

    if (stream.streamerId === devoteeId) {
      throw new ForbiddenException('Broadcasters cannot send Dakshina to their own stream');
    }

    const cleanDevoteeName = dto.devoteeName.trim();
    const cleanPrayerMessage = dto.prayerMessage?.trim() || null;
    const cleanGotra = dto.gotra?.trim() || null;

    if (!cleanDevoteeName || !this.chatService.wordFilter.isClean(cleanDevoteeName)) {
      throw new BadRequestException('Devotee name contains disallowed words');
    }
    if (cleanPrayerMessage && !this.chatService.wordFilter.isClean(cleanPrayerMessage)) {
      throw new BadRequestException('Prayer message contains disallowed words');
    }
    if (cleanGotra && !this.chatService.wordFilter.isClean(cleanGotra)) {
      throw new BadRequestException('Gotra contains disallowed words');
    }

    // Idempotency fast-path
    const existingOffering = await this.prisma.dakshinaOffering.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existingOffering) {
      if (existingOffering.devoteeId && existingOffering.devoteeId !== devoteeId) {
        throw new ConflictException('Duplicate idempotency key used by another account');
      }
      const wallet = await this.prisma.userWallet.findUnique({ where: { userId: devoteeId } });
      return {
        success: true,
        idempotentReplay: true,
        message: 'Sacred Dakshina accepted with Vedic blessings 🙏',
        offering: existingOffering,
        remainingCoins: wallet?.balanceCoins ?? 0,
      };
    }

    // Ensure wallet exists (creates wallet with welcome bonus for verified users if missing)
    const initialWallet = await this.walletService.getWalletBalance(devoteeId);
    if (initialWallet.balanceCoins < dto.coins) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          error: 'INSUFFICIENT_COINS',
          message: `You need ${dto.coins} coins to offer this Dakshina (current balance: ${initialWallet.balanceCoins} coins).`,
          requiredCoins: dto.coins,
          currentBalance: initialWallet.balanceCoins,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const offeringId = crypto.randomUUID();
    let txResult: {
      offering: any;
      balanceAfter: number;
      streamTotalCoins: number;
    };

    try {
      txResult = await this.prisma.$transaction(async (tx) => {
        const rawWallet: any = await tx.$queryRawUnsafe(
          `UPDATE "UserWallet"
           SET "balanceCoins" = "balanceCoins" - $2,
               "bonusCoins" = GREATEST(0, "bonusCoins" - $2),
               "lifetimeSpent" = "lifetimeSpent" + $2,
               "updatedAt" = NOW()
           WHERE "userId" = $1 AND "balanceCoins" >= $2
           RETURNING "id", "balanceCoins"`,
          devoteeId,
          dto.coins,
        );

        if (!rawWallet || rawWallet.length === 0) {
          const current = await tx.userWallet.findUnique({ where: { userId: devoteeId } });
          const currentBalance = current?.balanceCoins ?? 0;
          throw new HttpException(
            {
              statusCode: HttpStatus.PAYMENT_REQUIRED,
              error: 'INSUFFICIENT_COINS',
              message: `You need ${dto.coins} coins to offer this Dakshina (current balance: ${currentBalance} coins).`,
              requiredCoins: dto.coins,
              currentBalance,
            },
            HttpStatus.PAYMENT_REQUIRED,
          );
        }

        const walletId = rawWallet[0].id;
        const balanceAfter = rawWallet[0].balanceCoins;

        const offering = await tx.dakshinaOffering.create({
          data: {
            id: offeringId,
            streamId: dto.streamId,
            devoteeId,
            devoteeName: cleanDevoteeName,
            coins: dto.coins,
            idempotencyKey: dto.idempotencyKey,
            prayerMessage: cleanPrayerMessage,
            gotra: cleanGotra,
            status: PaymentStatus.SUCCESS,
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId,
            type: WalletTxType.DEBIT,
            category: WalletTxCategory.DAKSHINA_OFFERING,
            amountCoins: dto.coins,
            balanceBefore: balanceAfter + dto.coins,
            balanceAfter,
            streamId: dto.streamId,
            referenceId: offering.id,
            idempotencyKey: `dak_tx_${dto.idempotencyKey}`,
            metadata: {
              streamerId: stream.streamerId,
              streamTitle: stream.title,
              devoteeName: cleanDevoteeName,
            },
          },
        });

        await tx.streamerEarning.create({
          data: {
            streamId: dto.streamId,
            streamerId: stream.streamerId,
            viewerId: devoteeId,
            source: StreamerEarningSource.DAKSHINA,
            coins: dto.coins,
            referenceId: offering.id,
            idempotencyKey: `earn_dak_${offering.id}`,
          },
        });

        const earningAgg = await tx.streamerEarning.aggregate({
          where: { streamId: dto.streamId },
          _sum: { coins: true },
        });

        return {
          offering,
          balanceAfter,
          streamTotalCoins: earningAgg._sum.coins || 0,
        };
      });
    } catch (err: any) {
      if (err instanceof HttpException) {
        throw err;
      }
      if (err?.code === 'P2002' || err?.message?.includes('Unique constraint')) {
        const replayed = await this.prisma.dakshinaOffering.findUnique({
          where: { idempotencyKey: dto.idempotencyKey },
        });
        if (replayed && (!replayed.devoteeId || replayed.devoteeId === devoteeId)) {
          const wallet = await this.prisma.userWallet.findUnique({ where: { userId: devoteeId } });
          return {
            success: true,
            idempotentReplay: true,
            message: 'Sacred Dakshina accepted with Vedic blessings 🙏',
            offering: replayed,
            remainingCoins: wallet?.balanceCoins ?? 0,
          };
        }
      }
      throw err;
    }

    // Strictly post-commit realtime events
    this.chatGateway.broadcastDakshina(dto.streamId, {
      id: txResult.offering.id,
      devoteeName: cleanDevoteeName,
      coins: dto.coins,
      prayerMessage: cleanPrayerMessage,
      gotra: cleanGotra,
      timestamp: new Date(),
    });

    this.chatGateway.emitEarningsUpdated(stream.streamerId, {
      streamId: dto.streamId,
      totalCoins: txResult.streamTotalCoins,
      delta: dto.coins,
      source: 'DAKSHINA',
    });

    this.logger.log(
      `Coin Dakshina of ${dto.coins} coins offered by ${cleanDevoteeName} (${devoteeId}) for stream ${dto.streamId}`,
    );

    return {
      success: true,
      message: 'Sacred Dakshina accepted with Vedic blessings 🙏',
      offering: txResult.offering,
      remainingCoins: txResult.balanceAfter,
    };
  }

  /**
   * 2. Handle Webhook from Payment Providers (Wallet Top-Up Orders only)
   */
  async handleWebhook(body: any, rawBody?: Buffer, signature?: string) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (isProd() && !webhookSecret) {
      throw new ServiceUnavailableException('Webhook secret is not configured');
    }

    if (webhookSecret) {
      if (!signature) {
        throw new BadRequestException('Webhook signature header missing');
      }
      if (!rawBody) {
        throw new BadRequestException('Raw body required for HMAC verification');
      }

      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (!safeEqualHex(expectedSig, signature)) {
        this.logger.warn('Payment webhook signature mismatch');
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const event = body?.event;

    // N5: A failed ATTEMPT is not a failed ORDER - Razorpay lets the customer retry on the same order,
    // and a later payment.captured must still credit the coins. Only record the reason; keep PENDING.
    if (event === 'payment.failed') {
      const ent = body.payload?.payment?.entity;
      const orderId = ent?.order_id || body.data?.order?.order_id;
      if (orderId) {
        await this.prisma.walletTopupOrder.updateMany({
          where: { orderId, status: PaymentStatus.PENDING },
          data: { failureReason: String(ent?.error_description || ent?.error_code || 'payment attempt failed').slice(0, 250) },
        });
        this.logger.log(`Webhook recorded failed attempt for topup order [${orderId}] (order stays PENDING)`);
        return { received: true, reconciled: 'payment_attempt_failed' };
      }
    }

    // N5: Refund -> claw back the refunded coins. Partial refunds are proportional, every refund id is
    // applied once (idempotency key), the debit is one atomic statement (no stale read, never negative),
    // and coins the user already spent are written to the audit log as uncollected.
    if (event === 'refund.processed') {
      const refund = body.payload?.refund?.entity;
      const paymentId = refund?.payment_id || body.payload?.payment?.entity?.id;
      if (paymentId) {
        const topupOrder = await this.prisma.walletTopupOrder.findFirst({ where: { paymentId } });
        if (topupOrder) {
          const orderPaise = Math.round(Number(topupOrder.amountInr) * 100);
          const refundPaise = Number(refund?.amount);
          const fraction =
            Number.isFinite(refundPaise) && refundPaise > 0 && orderPaise > 0
              ? Math.min(1, refundPaise / orderPaise)
              : 1; // amount absent from payload: treat as full
          const wantCoins = Math.min(topupOrder.coinsToCredit, Math.ceil(topupOrder.coinsToCredit * fraction));
          const idemKey = `refund_wh_${refund?.id || topupOrder.id}`;

          const result = await this.prisma.$transaction(async (tx) => {
            if (await tx.walletTransaction.findUnique({ where: { idempotencyKey: idemKey } })) {
              return { duplicate: true as const };
            }
            const rows: any = await tx.$queryRawUnsafe(
              `WITH old AS (
                 SELECT "id", "balanceCoins" AS bal FROM "UserWallet" WHERE "userId" = $1 FOR UPDATE
               )
               UPDATE "UserWallet" w
               SET "balanceCoins"   = w."balanceCoins" - LEAST(old.bal, $2),
                   "purchasedCoins" = GREATEST(0, w."purchasedCoins" - LEAST(old.bal, $2)),
                   "updatedAt" = NOW()
               FROM old WHERE w."id" = old."id"
               RETURNING w."id" AS id, old.bal AS before, w."balanceCoins" AS after`,
              topupOrder.userId,
              wantCoins,
            );
            const row = rows?.[0];
            const before = Number(row?.before ?? 0);
            const after = Number(row?.after ?? 0);
            const debited = before - after;
            const shortfall = wantCoins - debited;
            if (row) {
              await tx.walletTransaction.create({
                data: {
                  walletId: row.id,
                  type: WalletTxType.DEBIT,
                  category: WalletTxCategory.ADMIN_ADJUSTMENT,
                  amountCoins: debited,
                  balanceBefore: before,
                  balanceAfter: after,
                  referenceId: `refund_${paymentId}`,
                  idempotencyKey: idemKey,
                },
              });
            }
            if (fraction >= 1) {
              await tx.walletTopupOrder.update({
                where: { id: topupOrder.id },
                data: { failureReason: 'REFUNDED' },
              });
            }
            await tx.auditLog.create({
              data: {
                actorId: topupOrder.userId,
                actorEmail: 'system@razorpay.webhook',
                action: 'PAYMENT_REFUND_PROCESSED',
                targetResource: `WalletTopupOrder:${topupOrder.id}`,
                details: {
                  paymentId,
                  refundId: refund?.id,
                  orderId: topupOrder.orderId,
                  coinsRequested: wantCoins,
                  coinsDebited: debited,
                  coinsUncollected: shortfall,
                },
              },
            });
            return { duplicate: false as const, debited, shortfall };
          });
          this.logger.log(`Webhook reconciled refund for topup order [${topupOrder.id}]: ${JSON.stringify(result)}`);
          return { received: true, reconciled: 'refund_processed' };
        }
      }
    }

    // N5: Record payment dispute for compliance & fraud review
    if (event === 'payment.dispute.created') {
      const paymentId = body.payload?.dispute?.entity?.payment_id || body.payload?.payment?.entity?.id;
      const disputeId = body.payload?.dispute?.entity?.id;
      await this.prisma.auditLog.create({
        data: {
          actorId: 'system',
          actorEmail: 'system@razorpay.webhook',
          action: 'PAYMENT_DISPUTE_RAISED',
          targetResource: `Payment:${paymentId}`,
          details: { disputeId, paymentId, dispute: body.payload?.dispute?.entity },
        },
      }).catch((err) => this.logger.warn(`Failed to log dispute: ${err.message}`));
      this.logger.warn(`Payment dispute created for payment [${paymentId}], dispute [${disputeId}]`);
      return { received: true, reconciled: 'dispute_recorded' };
    }

    if (event === 'payment.captured' || event === 'order.paid') {
      const orderId = body.payload?.payment?.entity?.order_id || body.data?.order?.order_id;
      const paymentId = body.payload?.payment?.entity?.id || body.data?.payment?.payment_id;

      if (!orderId) {
        return { received: true, note: 'No order_id in webhook payload' };
      }

      const topupOrder = await this.prisma.walletTopupOrder.findUnique({
        where: { orderId },
        include: { package: true },
      });

      if (topupOrder && topupOrder.status === PaymentStatus.PENDING) {
        await this.prisma.$transaction(async (tx) => {
          const claimed = await tx.walletTopupOrder.updateMany({
            where: { id: topupOrder.id, status: PaymentStatus.PENDING },
            data: { status: PaymentStatus.SUCCESS, paymentId: paymentId || `pay_wh_${Date.now()}` },
          });

          if (claimed.count > 0) {
            const purchasedCoins = topupOrder.package?.coins || topupOrder.coinsToCredit;
            const bonusCoins = topupOrder.package?.bonusCoins || 0;

            const wallet = await tx.userWallet.upsert({
              where: { userId: topupOrder.userId },
              create: {
                userId: topupOrder.userId,
                balanceCoins: topupOrder.coinsToCredit,
                purchasedCoins,
                bonusCoins,
                lifetimeEarned: topupOrder.coinsToCredit,
              },
              update: {
                balanceCoins: { increment: topupOrder.coinsToCredit },
                purchasedCoins: { increment: purchasedCoins },
                bonusCoins: { increment: bonusCoins },
                lifetimeEarned: { increment: topupOrder.coinsToCredit },
              },
            });

            await tx.walletTransaction.create({
              data: {
                walletId: wallet.id,
                type: WalletTxType.CREDIT,
                category: WalletTxCategory.TOPUP_PURCHASE,
                amountCoins: topupOrder.coinsToCredit,
                balanceBefore: wallet.balanceCoins - topupOrder.coinsToCredit,
                balanceAfter: wallet.balanceCoins,
                referenceId: topupOrder.orderId,
                idempotencyKey: `topup_wh_${topupOrder.id}`,
              },
            });
            this.logger.log(`Webhook reconciled Wallet topup [${topupOrder.id}] as SUCCESS`);
          }
        });
        return { received: true, reconciled: 'wallet_topup' };
      }
    }

    return { received: true };
  }

  /**
   * 3. List Recent Offerings for a Live Stream (DPDP Act 2023 Compliant)
   */
  async getRecentOfferings(streamId: string, callerUserId?: string, callerRole?: string) {
    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      select: { id: true, visibility: true, streamerId: true, deletedAt: true },
    });

    if (!stream || stream.deletedAt) {
      throw new NotFoundException('Stream not found');
    }

    const isStreamerOrAdmin =
      callerRole === UserRole.ADMIN || (callerUserId && stream.streamerId === callerUserId);

    if (stream.visibility === StreamVisibility.PRIVATE && !isStreamerOrAdmin) {
      if (!callerUserId) {
        throw new NotFoundException('Private session offerings are restricted');
      }
      const activeSession = await this.prisma.streamViewingSession.findFirst({
        where: {
          streamId,
          userId: callerUserId,
          status: ViewingSessionStatus.ACTIVE,
        },
      });
      if (!activeSession) {
        throw new NotFoundException('Private session offerings are restricted');
      }
    }

    const offerings = await this.prisma.dakshinaOffering.findMany({
      where: {
        streamId,
        status: PaymentStatus.SUCCESS,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        devoteeName: true,
        coins: true,
        amount: true,
        prayerMessage: true,
        gotra: true,
        createdAt: true,
      },
    });

    return offerings.map((o) => {
      const isLegacyInr = o.coins === null || o.coins === undefined;
      return {
        id: o.id,
        devoteeName: o.devoteeName,
        coins: o.coins ?? 0,
        isLegacyInr,
        legacyAmountInr: isLegacyInr && o.amount !== null ? Number(o.amount) : null,
        // DPDP Compliance: Gotra and personal prayer messages are only visible to the streamer or admin
        prayerMessage: isStreamerOrAdmin ? o.prayerMessage : null,
        gotra: isStreamerOrAdmin ? o.gotra : null,
        createdAt: o.createdAt,
      };
    });
  }
}
