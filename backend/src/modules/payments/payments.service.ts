import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import { CreateDakshinaDto } from './dto/create-dakshina.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PaymentStatus, PaymentProvider, StreamStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
  ) {}

  /**
   * 1. Create a Dakshina (Vedic Offering) Order
   */
  async createDakshinaOrder(dto: CreateDakshinaDto, devoteeId?: string) {
    const stream = await this.prisma.stream.findUnique({
      where: { id: dto.streamId },
      include: { streamer: true },
    });

    if (!stream) {
      throw new NotFoundException('Sacred stream not found');
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    let orderId: string;
    let provider: PaymentProvider = dto.provider || PaymentProvider.RAZORPAY;

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
            amount: Math.round(dto.amount * 100), // amount in paise
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`,
            notes: {
              streamId: dto.streamId,
              streamerId: stream.streamerId,
              devoteeName: dto.devoteeName,
              gotra: dto.gotra || '',
            },
          }),
        });

        const rzpData = await res.json();
        if (!res.ok) {
          this.logger.error(`Razorpay order error: ${JSON.stringify(rzpData)}`);
          throw new BadRequestException('Payment gateway error. Please try again.');
        }

        orderId = rzpData.id;
        provider = PaymentProvider.RAZORPAY;
      } catch (err: any) {
        this.logger.error(`Failed to reach Razorpay: ${err.message}`);
        // Fallback to test mode order if external API fails
        orderId = `order_shubh_${crypto.randomBytes(8).toString('hex')}`;
        provider = PaymentProvider.MOCK;
      }
    } else {
      // Sandbox / Test mode order
      orderId = `order_shubh_${crypto.randomBytes(8).toString('hex')}`;
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
      keyId: razorpayKeyId || 'rzp_test_placeholder',
      devoteeName: dto.devoteeName,
      offeringId: offering.id,
    };
  }

  /**
   * 2. Verify Payment Signature & Credit Dakshina
   */
  async verifyPayment(dto: VerifyPaymentDto) {
    const offering = await this.prisma.dakshinaOffering.findUnique({
      where: { orderId: dto.orderId },
      include: {
        stream: {
          select: { title: true, streamerId: true },
        },
      },
    });

    if (!offering) {
      throw new NotFoundException('Offering order not found');
    }

    if (offering.status === PaymentStatus.SUCCESS) {
      return { success: true, message: 'Offering already verified and blessed 🙏', offering };
    }

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (offering.provider === PaymentProvider.RAZORPAY && razorpayKeySecret && dto.signature) {
      const generatedSignature = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(`${dto.orderId}|${dto.paymentId}`)
        .digest('hex');

      if (generatedSignature !== dto.signature) {
        await this.prisma.dakshinaOffering.update({
          where: { id: offering.id },
          data: { status: PaymentStatus.FAILED },
        });
        throw new BadRequestException('Invalid payment signature verification failed');
      }
    }

    // Update status to SUCCESS
    const updatedOffering = await this.prisma.dakshinaOffering.update({
      where: { id: offering.id },
      data: {
        status: PaymentStatus.SUCCESS,
        paymentId: dto.paymentId,
      },
    });

    // Broadcast auspicious live dakshina announcement to all stream devotees!
    this.chatGateway.broadcastDakshina(offering.streamId, {
      id: updatedOffering.id,
      devoteeName: updatedOffering.devoteeName,
      amount: Number(updatedOffering.amount),
      prayerMessage: updatedOffering.prayerMessage,
      gotra: updatedOffering.gotra,
      timestamp: updatedOffering.createdAt,
    });

    this.logger.log(
      `Dakshina of ₹${updatedOffering.amount} blessed by ${updatedOffering.devoteeName} for stream ${offering.streamId}`,
    );

    return {
      success: true,
      message: 'Sacred Dakshina accepted with Vedic blessings 🙏',
      offering: updatedOffering,
    };
  }

  /**
   * 3. Handle Webhook from Payment Providers
   */
  async handleWebhook(body: any, signature: string) {
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(body))
        .digest('hex');

      if (expectedSignature !== signature) {
        this.logger.warn('Payment webhook signature mismatch');
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const event = body.event;
    if (event === 'payment.captured' || event === 'order.paid') {
      const orderId = body.payload?.payment?.entity?.order_id || body.data?.order?.order_id;
      const paymentId = body.payload?.payment?.entity?.id || body.data?.payment?.payment_id;

      if (orderId) {
        const offering = await this.prisma.dakshinaOffering.findUnique({
          where: { orderId },
        });

        if (offering && offering.status !== PaymentStatus.SUCCESS) {
          await this.verifyPayment({
            orderId,
            paymentId: paymentId || `pay_auto_${Date.now()}`,
          });
        }
      }
    }

    return { received: true };
  }

  /**
   * 4. List Recent Offerings for a Live Stream
   */
  async getRecentOfferings(streamId: string) {
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
      ...o,
      amount: Number(o.amount),
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
