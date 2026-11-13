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
  Inject,
  Optional,
} from '@nestjs/common';
import { IVideoProviderService, VIDEO_PROVIDER_TOKEN } from '../interfaces/video-provider.interface';
import { finalizeStreamRecord } from '../../../common/stream-lifecycle';
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

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(VIDEO_PROVIDER_TOKEN) private readonly video?: IVideoProviderService,
  ) {
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
        let meta: any = {};
        try {
          meta = participant?.metadata ? JSON.parse(participant.metadata) : {};
        } catch {
          meta = {};
        }

        // Re-validate private viewers on EVERY join: a LiveKit token is a bearer credential valid until it
        // expires, so a kicked / revoked / blocked viewer could otherwise walk straight back in with the
        // token they already hold. The token only grants room access; this is where it is revoked.
        if (meta.sessionId && identity && !isStreamer) {
          const session = await this.prisma.viewerSession.findUnique({
            where: { id: meta.sessionId },
            include: { privateLink: true },
          });
          const link = session?.privateLink;
          const linkDead = !!link && (link.isRevoked || (link.expiresAt && link.expiresAt < new Date()));
          let blocked = false;
          if (session?.userId) {
            blocked = !!(await this.prisma.blockedViewer.findFirst({
              where: { streamId: stream.id, userId: session.userId },
            }));
          }
          const streamOver = stream.status === StreamStatus.ENDED || stream.status === StreamStatus.CANCELLED;
          if (!session || session.streamId !== stream.id || session.isRemoved || linkDead || blocked || streamOver) {
            this.logger.warn(`Evicting revoked/removed private viewer [${identity}] from [${stream.id}] on rejoin.`);
            await this.video?.kickParticipant(stream.id, identity);
            break;
          }
          // A viewer re-joining on a still-valid session is present again (a reload / network blip had
          // marked the session as left).
          if (session.leftAt) {
            await this.prisma.viewerSession.update({ where: { id: session.id }, data: { leftAt: null } });
          }
        }

        // Track viewer presence (exclude streamer and hidden/admin participants)
        if (!isStreamer && !isHidden && identity && presenceService) {
          await presenceService.addViewer(stream.id, identity);
        }

        // peakViewers uses the presence count (excludes streamer + hidden). Skipped during the reconnect
        // grace period: this write bumps `updatedAt`, which the grace-period watchdog measures from, so
        // every viewer join would otherwise extend the grace.
        const viewerCount = presenceService
          ? await presenceService.getCount(stream.id)
          : Math.max(0, (room.numParticipants || 1) - 1);

        if (stream.status !== StreamStatus.RECONNECTING_GRACE_PERIOD && viewerCount > stream.peakViewers) {
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

        // Same identity re-joined (reload / blip): LiveKit closes the OLD connection and its `left` event
        // can arrive after the new `joined`. If the identity is present again this event is stale:
        // closing sessions / presence now would cut a live viewer off from chat and corrupt the count.
        const stillPresent = identity ? (await this.video?.getParticipantPresence(stream.id, identity)) === true : false;

        // Remove from presence and broadcast updated count
        if (!stillPresent && !isStreamer && !isHidden && identity && presenceService) {
          await presenceService.removeViewer(stream.id, identity);
          presenceService.broadcastCount(stream.id);
        }

        // Check if publisher/streamer dropped (B-13: Do not enter grace period if stream was already ended)
        if (isStreamer && stream.status === StreamStatus.LIVE && !stream.endedAt) {
          this.logger.warn(`Streamer disconnected from [${stream.id}]. Entering 2-minute RECONNECTING_GRACE_PERIOD.`);
          await this.prisma.stream.update({
            where: { id: stream.id },
            data: { status: StreamStatus.RECONNECTING_GRACE_PERIOD },
          });
        }

        // B-16: Record leftAt for the viewer session that actually left.
        if (identity && !stillPresent) {
          let meta: any = {};
          try {
            meta = participant.metadata ? JSON.parse(participant.metadata) : {};
          } catch {
            meta = {};
          }
          const isGuest = identity.startsWith('priv_guest_');
          const sessionId: string | null = meta.sessionId || (isGuest ? identity.replace('priv_guest_', '') : null);
          await this.prisma.viewerSession.updateMany({
            where: {
              streamId: stream.id,
              leftAt: null,
              // Prefer the exact session named in the token; fall back to identity only for tokens
              // that carry no session id (public viewers).
              ...(sessionId ? { id: sessionId } : { userId: identity }),
            },
            data: { leftAt: new Date() },
          });
        }
        break;
      }

      case 'room_finished': {
        const { changed } = await finalizeStreamRecord(this.prisma as any, stream, {
          sessionStatus: 'DISCONNECTED_TIMEOUT' as any,
        });
        if (changed) this.logger.log(`Room finished. Stream [${stream.id}] marked as ENDED.`);

        // Clear presence and broadcast zero count
        if (presenceService) {
          await presenceService.clearStream(stream.id);
          presenceService.broadcastCount(stream.id);
        }
        break;
      }
    }
  }
}
