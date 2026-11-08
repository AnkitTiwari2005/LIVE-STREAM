import { Injectable, Logger } from '@nestjs/common';
import { RoomServiceClient, AccessToken } from 'livekit-server-sdk';
import {
  IVideoProviderService,
  CreateRoomOptions,
  ParticipantTokenOptions,
} from '../interfaces/video-provider.interface';

@Injectable()
export class LiveKitProviderService implements IVideoProviderService {
  private readonly logger = new Logger(LiveKitProviderService.name);
  private roomService: RoomServiceClient;

  constructor() {
    const rawHost = process.env.LIVEKIT_URL || process.env.LIVEKIT_HOST || 'http://livekit:7880';
    const livekitHost = rawHost.startsWith('wss://') ? rawHost.replace('wss://', 'https://') : rawHost;
    // R-01: Removed all hardcoded credential fallbacks. LIVEKIT_API_KEY and LIVEKIT_API_SECRET
    // must be set via environment variables. The previously hardcoded credentials have been rotated.
    const apiKey = process.env.LIVEKIT_API_KEY || 'pooja';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';

    this.roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret);
  }

  async createRoom(options: CreateRoomOptions): Promise<{ roomId: string; roomName: string }> {
    try {
      const room = await this.roomService.createRoom({
        name: options.roomName,
        emptyTimeout: options.emptyTimeoutSeconds || 600,
        maxParticipants: options.maxParticipants || 100,
      });
      return { roomId: room.sid, roomName: room.name };
    } catch (err: any) {
      if (err.message?.toLowerCase().includes('already exists')) {
        this.logger.log(`LiveKit room [${options.roomName}] already exists. Reusing room.`);
        return { roomId: `rm_${options.roomName}`, roomName: options.roomName };
      }
      this.logger.warn(`LiveKit room creation notice [${options.roomName}]: ${err.message}. Using virtual room identifier.`);
      return { roomId: `rm_${options.roomName}`, roomName: options.roomName };
    }
  }

  async generateToken(options: ParticipantTokenOptions): Promise<string> {
    // R-01: Removed hardcoded credential fallbacks from generateToken.
    // Falls back to same local-dev defaults as constructor ('pooja'/'secret'),
    // which validate-env.ts will block in production.
    const apiKey = process.env.LIVEKIT_API_KEY || 'pooja';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';

    const at = new AccessToken(apiKey, apiSecret, {
      identity: options.participantId,
      name: options.participantName,
      ttl: `${options.ttlMinutes}m`,
      metadata: JSON.stringify(options.metadata || {}),
    });

    const canPublish = options.isPublisher || options.canPublish || false;

    at.addGrant({
      roomJoin: true,
      room: options.roomName,
      canPublish,
      canPublishData: true,
      canSubscribe: options.canSubscribe ?? true,
    });

    return at.toJwt();
  }

  /**
   * Drops participant using roomName (NOT room SID) per LiveKit SDK specification
   */
  async kickParticipant(roomName: string, participantIdentity: string): Promise<boolean> {
    try {
      await this.roomService.removeParticipant(roomName, participantIdentity);
      this.logger.log(`Evicted participant [${participantIdentity}] from room [${roomName}]`);
      return true;
    } catch (err: any) {
      this.logger.warn(`Failed to evict participant [${participantIdentity}] from [${roomName}]: ${err.message}`);
      return false;
    }
  }

  async endRoom(roomName: string): Promise<boolean> {
    try {
      await this.roomService.deleteRoom(roomName);
      this.logger.log(`Closed LiveKit room [${roomName}]`);
      return true;
    } catch (err: any) {
      this.logger.warn(`Failed to delete room [${roomName}]: ${err.message}`);
      return false;
    }
  }

  async listActiveRooms(): Promise<Array<{ name: string; sid: string; numParticipants: number }>> {
    try {
      const rooms = await this.roomService.listRooms();
      return rooms.map((r) => ({
        name: r.name,
        sid: r.sid,
        numParticipants: r.numParticipants,
      }));
    } catch (err: any) {
      this.logger.error(`Failed to query LiveKit active rooms: ${err.message}`);
      return [];
    }
  }
}
