import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import { ChatService } from '../chat/chat.service';
import { CreateDakshinaDto } from './dto/create-dakshina.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PaymentStatus, PaymentProvider, StreamStatus, StreamVisibility, UserRole, WalletTxType, WalletTxCategory } from '@prisma/client';
import {
  isProd,
  safeEqualHex,
  razorpaySignature,
  createRazorpayOrder,
  assertCaptured,
} from '../../common/payments.util';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
    private readonly chatService: ChatService,
  ) {}

  /**
   * 1. Create a Dakshina (Vedic Offering) Order (C-02)
   */
  async createDakshinaOrder(dto: CreateDakshinaDto, devoteeId?: string) {
    const stream = await this.prisma.stream.findFirst({
      where: {
        id: dto.streamId,
        deletedAt: null,
      },
      include: { streamer: true },
    });

    if (!stream) {
      throw new NotFoundException('Sacred stream not found');
    }

    if (stream.status !== StreamStatus.LIVE && stream.status !== StreamStatus.RECONNECTING_GRACE_PERIOD) {
      throw new BadRequestException('Offerings can only be made during an active live darshan broadcast');
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const configured = !!keyId && !!keySecret;

    if (!configured && isProd()) {
      throw new ServiceUnavailableException('Payment gateway is not configured for production');
    }

    const amountPaise = Math.round(Number(dto.amount) * 100);
    const receipt = `dakshina_${dto.streamId.slice(0, 6)}_${Date.now()}`;
    const notes = {
      streamId: dto.streamId,
      streamerId: stream.streamerId,
      devoteeName: dto.devoteeName,
      gotra: dto.gotra || '',
    };

    let orderId: string;
    let provider: PaymentProvider;

    if (configured) {
      const rzp = await createRazorpayOrder(amountPaise, receipt, notes);
      orderId = rzp.id;
      provider = PaymentProvider.RAZORPAY;
    } else {
      orderId = `order_mock_${crypto.randomBytes(8).toString('hex')}`;
      provider = PaymentProvider.MOCK;
    }

    const offering = await this.prisma.dakshinaOffering.create({
      data: {
        streamId: dto.streamId,
        devoteeId: devoteeId || null,
        devoteeName: dto.devoteeName,
        amount: dto.amount,
        currency: 'INR',
        prayerMessage: dto.prayerMessage || null,
        gotra: dto.gotra || null,
        provider,
        orderId,
        status: PaymentStatus.PENDING,
      },
    });

    return {
      orderId,
      amount: dto.amount,
      currency: 'INR',
      provider,
      keyId: configured ? keyId : undefined,
      devoteeName: dto.devoteeName,
      offeringId: offering.id,
    };
  }

  /**
   * 2. Verify Payment Signature & Credit Dakshina (C-02)
   */
  async verifyPayment(dto: VerifyPaymentDto) {
    const offering = await this.prisma.dakshinaOffering.findUnique({
      where: { orderId: dto.orderId },
      include: {
        stream: {
          select: { id: true, title: true, streamerId: true, visibility: true },
        },
      },
    });

    if (!offering) {
      throw new NotFoundException('Offering order not found');
    }

    if (offering.status === PaymentStatus.SUCCESS) {
      return { success: true, message: 'Offering already verified and blessed 🙏', offering };
    }

    if (offering.provider === PaymentProvider.MOCK) {
      if (isProd()) {
        throw new ForbiddenException('Mock payments are disabled in production environment');
      }
    } else {
      if (!dto.signature) {
        throw new BadRequestException('Payment signature is required');
      }

      const expectedSig = razorpaySignature(dto.orderId, dto.paymentId);
      if (!safeEqualHex(expectedSig, dto.signature)) {
        throw new BadRequestException('Payment signature verification failed');
      }

      await assertCaptured(dto.paymentId, dto.orderId, Math.round(Number(offering.amount) * 100));
    }

    // Atomic claim: only one concurrent process can flip PENDING -> SUCCESS
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.dakshinaOffering.updateMany({
        where: { id: offering.id, status: PaymentStatus.PENDING },
        data: {
          status: PaymentStatus.SUCCESS,
          paymentId: dto.paymentId,
        },
      });

      if (claimed.count === 0) {
        const fresh = await tx.dakshinaOffering.findUnique({ where: { id: offering.id } });
        return { success: true, message: 'Offering already processed', offering: fresh };
      }

      // Profanity filtering on prayer message before broadcasting
      let safePrayerMessage = offering.prayerMessage;
      if (safePrayerMessage && !this.chatService.wordFilter.isClean(safePrayerMessage)) {
        safePrayerMessage = '🙏 Har Har Mahadev • Auspicious Blessings';
      }

      // Broadcast auspicious live dakshina announcement to stream devotees
      this.chatGateway.broadcastDakshina(offering.streamId, {
        id: offering.id,
        devoteeName: offering.devoteeName,
        amount: Number(offering.amount),
        prayerMessage: safePrayerMessage,
        gotra: offering.gotra,
        timestamp: new Date(),
      });

      this.logger.log(
        `Dakshina of ₹${offering.amount} blessed by ${offering.devoteeName} for stream ${offering.streamId}`,
      );

      const updatedOffering = await tx.dakshinaOffering.findUnique({ where: { id: offering.id } });
      return {
        success: true,
        message: 'Sacred Dakshina accepted with Vedic blessings 🙏',
        offering: updatedOffering,
      };
    });
  }

  /**
   * 3. Handle Webhook from Payment Providers (C-03)
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
    if (event === 'payment.captured' || event === 'order.paid') {
      const orderId = body.payload?.payment?.entity?.order_id || body.data?.order?.order_id;
      const paymentId = body.payload?.payment?.entity?.id || body.data?.payment?.payment_id;

      if (!orderId) {
        return { received: true, note: 'No order_id in webhook payload' };
      }

      // 1. Check if order is a Dakshina offering
      const offering = await this.prisma.dakshinaOffering.findUnique({
        where: { orderId },
      });

      if (offering && offering.status === PaymentStatus.PENDING) {
        await this.prisma.$transaction(async (tx) => {
          const claimed = await tx.dakshinaOffering.updateMany({
            where: { id: offering.id, status: PaymentStatus.PENDING },
            data: { status: PaymentStatus.SUCCESS, paymentId: paymentId || `pay_wh_${Date.now()}` },
          });

          if (claimed.count > 0) {
            let safePrayerMessage = offering.prayerMessage;
            if (safePrayerMessage && !this.chatService.wordFilter.isClean(safePrayerMessage)) {
              safePrayerMessage = '🙏 Har Har Mahadev • Auspicious Blessings';
            }

            this.chatGateway.broadcastDakshina(offering.streamId, {
              id: offering.id,
              devoteeName: offering.devoteeName,
              amount: Number(offering.amount),
              prayerMessage: safePrayerMessage,
              gotra: offering.gotra,
              timestamp: new Date(),
            });
            this.logger.log(`Webhook reconciled Dakshina offering [${offering.id}] as SUCCESS`);
          }
        });
        return { received: true, reconciled: 'dakshina' };
      }

      // 2. Check if order is a Wallet Topup
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
            const wallet = await tx.userWallet.upsert({
              where: { userId: topupOrder.userId },
              create: {
                userId: topupOrder.userId,
                balanceCoins: topupOrder.coinsToCredit,
                purchasedCoins: topupOrder.coinsToCredit,
              },
              update: {
                balanceCoins: { increment: topupOrder.coinsToCredit },
                purchasedCoins: { increment: topupOrder.coinsToCredit },
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
   * 4. List Recent Offerings for a Live Stream (DPDP Act 2023 Compliant)
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

    if (stream.visibility === StreamVisibility.PRIVATE && !isStreamerOrAdmin && !callerUserId) {
      throw new NotFoundException('Private session offerings are restricted');
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
        amount: true,
        prayerMessage: true,
        gotra: true,
        createdAt: true,
      },
    });

    return offerings.map((o) => ({
      id: o.id,
      devoteeName: o.devoteeName,
      amount: Number(o.amount),
      // DPDP Compliance: Gotra and personal prayer messages are only visible to the streamer or admin
      prayerMessage: isStreamerOrAdmin ? o.prayerMessage : null,
      gotra: isStreamerOrAdmin ? o.gotra : null,
      createdAt: o.createdAt,
    }));
  }

  /**
   * 5. Streamer Total Dakshina & Offerings Summary
   */
  async getStreamerEarnings(streamerId: string) {
    const streams = await this.prisma.stream.findMany({
      where: { streamerId },
      select: { id: true },
    });

    const streamIds = streams.map((s) => s.id);

    const offerings = await this.prisma.dakshinaOffering.findMany({
      where: {
        streamId: { in: streamIds },
        status: PaymentStatus.SUCCESS,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const totalInr = offerings.reduce((acc, curr) => acc + Number(curr.amount), 0);

    return {
      totalOfferingsCount: offerings.length,
      totalInr,
      recentOfferings: offerings.map((o) => ({
        ...o,
        amount: Number(o.amount),
      })),
    };
  }
}
