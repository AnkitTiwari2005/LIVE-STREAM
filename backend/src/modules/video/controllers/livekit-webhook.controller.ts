import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request } from 'express';
import { WebhookReceiver } from 'livekit-server-sdk';
import { PrismaService } from '../../../database/prisma.service';
import { StreamStatus } from '@prisma/client';

@Controller('webhooks/livekit')
export class LiveKitWebhookController {
  private readonly logger = new Logger(LiveKitWebhookController.name);
  private receiver: WebhookReceiver;

  constructor(private readonly prisma: PrismaService) {
    const apiKey = process.env.LIVEKIT_API_KEY || 'pooja';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';
    this.receiver = new WebhookReceiver(apiKey, apiSecret);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Headers('authorization') authHeader: string, @Req() req: Request) {
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    // Access raw unmodified string body populated by NestJS rawBody: true
    const rawBody = (req as any).rawBody?.toString('utf-8');
    if (!rawBody) {
      throw new UnauthorizedException('Missing raw body for webhook verification');
    }

    let event: any;
    try {
      event = await this.receiver.receive(rawBody, authHeader);
    } catch (err: any) {
      this.logger.warn(`Signature verification failed for LiveKit webhook: ${err.message}`);
      throw new UnauthorizedException('Invalid LiveKit webhook signature');
    }

    try {
      await this.processEvent(event);
      return { received: true };
    } catch (err: any) {
      this.logger.error(`Error processing webhook event [${event?.event}]: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Internal error during event processing');
    }
  }

  private async processEvent(event: any) {
    const eventType = event.event;
    const room = event.room;
    const participant = event.participant;

    this.logger.log(`LiveKit Webhook Received: ${eventType} for room ${room?.name}`);

    if (!room?.name) return;

    // Room name corresponds to streamId in our platform
    const stream = await this.prisma.stream.findUnique({
      where: { id: room.name },
    });

    if (!stream) {
      this.logger.warn(`Received event for non-existent or deleted stream ${room.name}`);
      return;
    }

    switch (eventType) {
      case 'participant_joined': {
        // Track viewer count
        if (room.numParticipants > stream.peakViewers) {
          await this.prisma.stream.update({
            where: { id: stream.id },
            data: { peakViewers: room.numParticipants },
          });
        }
        // If the streamer reconnected during grace period, restore LIVE status
        if (participant?.identity === stream.streamerId && stream.status === StreamStatus.RECONNECTING_GRACE_PERIOD) {
          this.logger.log(`Streamer reconnected to stream [${stream.id}]. Restoring LIVE status.`);
          await this.prisma.stream.update({
            where: { id: stream.id },
            data: { status: StreamStatus.LIVE },
          });
        }
        break;
      }

      case 'participant_left': {
        // Check if publisher/streamer dropped
        if (participant?.identity === stream.streamerId && stream.status === StreamStatus.LIVE) {
          this.logger.warn(`Streamer disconnected from [${stream.id}]. Entering 2-minute RECONNECTING_GRACE_PERIOD.`);
          await this.prisma.stream.update({
            where: { id: stream.id },
            data: { status: StreamStatus.RECONNECTING_GRACE_PERIOD },
          });
        }
        break;
      }

      case 'room_finished': {
        if (stream.status !== StreamStatus.ENDED && stream.status !== StreamStatus.CANCELLED) {
          const endedAt = new Date();
          const startedAt = stream.startedAt || stream.createdAt;
          const duration = Math.floor((endedAt.getTime() - new Date(startedAt).getTime()) / 1000);

          await this.prisma.stream.update({
            where: { id: stream.id },
            data: {
              status: StreamStatus.ENDED,
              endedAt,
              durationSeconds: duration > 0 ? duration : 0,
            },
          });
          this.logger.log(`Room finished. Stream [${stream.id}] marked as ENDED.`);
        }
        break;
      }
    }
  }
}
