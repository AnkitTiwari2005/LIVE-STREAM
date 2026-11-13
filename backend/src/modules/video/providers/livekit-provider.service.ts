import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { RoomServiceClient, AccessToken } from 'livekit-server-sdk';
import {
  IVideoProviderService,
  CreateRoomOptions,
  ParticipantTokenOptions,
  NormalizedParticipant,
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
      // The room did NOT get created. Pretending it did marks the stream LIVE with no media room
      // (the server runs with auto_create:false), so viewers pay for a stream nobody can join.
      // Dev-only escape hatch: LIVEKIT_AUTO_CREATE=true (the server then creates rooms on first join).
      if (process.env.LIVEKIT_AUTO_CREATE === 'true') {
        this.logger.warn(`LiveKit room creation failed [${options.roomName}]: ${err.message}. LIVEKIT_AUTO_CREATE=true, continuing.`);
        return { roomId: `rm_${options.roomName}`, roomName: options.roomName };
      }
      this.logger.error(`LiveKit room creation failed [${options.roomName}]: ${err.message}`);
      throw new ServiceUnavailableException('Video service is unavailable right now. Please try again in a moment.');
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
      // A room that no longer exists is the goal state, not a failure.
      if (/not\s*found|does not exist|no such room/i.test(String(err?.message))) {
        return true;
      }
      this.logger.warn(`Failed to delete room [${roomName}]: ${err.message}`);
      return false;
    }
  }

  async listActiveRooms(): Promise<Array<{ name: string; sid: string; numParticipants: number }> | null> {
    try {
      const rooms = await this.roomService.listRooms();
      return rooms.map((r) => ({
        name: r.name,
        sid: r.sid,
        numParticipants: r.numParticipants,
      }));
    } catch (err: any) {
      this.logger.error(`Failed to query LiveKit active rooms: ${err.message}`);
      return null;
    }
  }

  async getRoomParticipantCount(roomName: string): Promise<number | null> {
    try {
      const rooms = await this.roomService.listRooms([roomName]);
      return rooms.find((r) => r.name === roomName)?.numParticipants ?? 0;
    } catch (err: any) {
      this.logger.warn(`Failed to read participant count for [${roomName}]: ${err.message}`);
      return null;
    }
  }

  async getParticipantPresence(roomName: string, identity: string): Promise<boolean | null> {
    try {
      await this.roomService.getParticipant(roomName, identity);
      return true;
    } catch (err: any) {
      if (/not\s*found|does not exist|no such/i.test(String(err?.message))) return false;
      this.logger.warn(`Failed to read participant [${identity}] in [${roomName}]: ${err.message}`);
      return null;
    }
  }

  async listParticipants(roomName: string): Promise<NormalizedParticipant[] | null> {
    try {
      const participants = await this.roomService.listParticipants(roomName);
      return participants.map((p) => ({
        identity: p.identity,
        name: p.name,
        metadata: p.metadata,
        // p.joinedAt is bigint (Unix seconds) — convert safely to avoid JSON.stringify crash
        joinedAtMs: Number(p.joinedAt) * 1000,
        isPublisher: p.isPublisher,
        hidden: p.permission?.hidden ?? false,
      }));
    } catch (err: any) {
      // null = "could not ask LiveKit" (never the same as "nobody is in the room")
      this.logger.warn(`listParticipants [${roomName}]: ${err.message}`);
      return null;
    }
  }
}
