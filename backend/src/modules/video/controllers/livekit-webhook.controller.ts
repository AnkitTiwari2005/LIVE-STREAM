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
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../../common/decorators/public.decorator';
import { PresenceAccessor } from '../../chat/presence.accessor';

@SkipThrottle()
@Public()
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

    const stream = await this.prisma.stream.findUnique({
      where: { id: room.name },
    });

    if (!stream) {
      this.logger.warn(`Received event for non-existent or deleted stream ${room.name}`);
      return;
    }

    // PresenceService is available after ChatGateway.afterInit() runs
    const presenceService = PresenceAccessor.get();

    switch (eventType) {
      case 'participant_joined': {
        const identity: string = participant?.identity || '';
        const isStreamer = identity === stream.streamerId;
        const isHidden = participant?.permission?.hidden ?? false;

        // Track viewer presence (exclude streamer and hidden/admin participants)
        if (!isStreamer && !isHidden && identity && presenceService) {
          await presenceService.addViewer(stream.id, identity);
        }

        // Fix peakViewers: use presence count which excludes streamer + hidden
        const viewerCount = presenceService
          ? await presenceService.getCount(stream.id)
          : Math.max(0, (room.numParticipants || 1) - 1);

        if (viewerCount > stream.peakViewers) {
          await this.prisma.stream.update({
            where: { id: stream.id },
            data: { peakViewers: viewerCount },
          });
        }

        if (presenceService) {
          presenceService.broadcastCount(stream.id);
        }

        // If the streamer reconnected during grace period, restore LIVE status
        if (isStreamer && stream.status === StreamStatus.RECONNECTING_GRACE_PERIOD) {
          this.logger.log(`Streamer reconnected to stream [${stream.id}]. Restoring LIVE status.`);
          await this.prisma.stream.update({
            where: { id: stream.id },
            data: { status: StreamStatus.LIVE },
          });
        }
        break;
      }

      case 'participant_left': {
        const identity: string = participant?.identity || '';
        const isStreamer = identity === stream.streamerId;
        const isHidden = participant?.permission?.hidden ?? false;

        // Remove from presence and broadcast updated count
        if (!isStreamer && !isHidden && identity && presenceService) {
          await presenceService.removeViewer(stream.id, identity);
          presenceService.broadcastCount(stream.id);
        }

        // Check if publisher/streamer dropped
        if (
          isStreamer &&
          stream.status === StreamStatus.LIVE &&
          !stream.endedAt
        ) {
          this.logger.warn(`Streamer disconnected from [${stream.id}]. Entering 2-minute RECONNECTING_GRACE_PERIOD.`);
          await this.prisma.stream.update({
            where: { id: stream.id },
            data: { status: StreamStatus.RECONNECTING_GRACE_PERIOD },
          });
        }

        // B-16: Record leftAt for private viewer session
        if (identity) {
          const isGuest = identity.startsWith('priv_guest_');
          const sessionId = isGuest ? identity.replace('priv_guest_', '') : null;
          await this.prisma.viewerSession.updateMany({
            where: {
              streamId: stream.id,
              leftAt: null,
              OR: [
                ...(identity ? [{ userId: identity }] : []),
                ...(sessionId ? [{ id: sessionId }] : []),
              ],
            },
            data: { leftAt: new Date() },
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

          // B-13: Close all active viewing sessions
          await this.prisma.streamViewingSession.updateMany({
            where: { streamId: stream.id, status: 'ACTIVE' },
            data: { status: 'DISCONNECTED_TIMEOUT', endedAt },
          });

          // Clear presence and broadcast zero count
          if (presenceService) {
            await presenceService.clearStream(stream.id);
            presenceService.broadcastCount(stream.id);
          }

          this.logger.log(`Room finished. Stream [${stream.id}] marked as ENDED.`);
        }
        break;
      }
    }
  }
}
