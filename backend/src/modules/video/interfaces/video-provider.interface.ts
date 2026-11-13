export interface NormalizedParticipant {
  identity: string;
  name: string;
  metadata: string;
  joinedAtMs: number;
  isPublisher: boolean;
  hidden: boolean;
}

export interface CreateRoomOptions {
  roomName: string;
  emptyTimeoutSeconds?: number;
  maxParticipants?: number;
}

export interface ParticipantTokenOptions {
  roomName: string;
  participantId: string;
  participantName: string;
  isPublisher: boolean;
  canPublish?: boolean;
  canSubscribe: boolean;
  ttlMinutes: number;
  metadata?: Record<string, any>;
}

export interface IVideoProviderService {
  createRoom(options: CreateRoomOptions): Promise<{ roomId: string; roomName: string }>;
  generateToken(options: ParticipantTokenOptions): Promise<string>;
  kickParticipant(roomName: string, participantIdentity: string): Promise<boolean>;
  endRoom(roomName: string): Promise<boolean>;
  /** `null` means "LiveKit could not be queried" - callers must NOT treat that as "no rooms". */
  listActiveRooms(): Promise<Array<{ name: string; sid: string; numParticipants: number }> | null>;
  /** Participants currently in the room; `null` if LiveKit could not be queried. */
  getRoomParticipantCount(roomName: string): Promise<number | null>;
  /** true/false = present/absent in the room; `null` if LiveKit could not be queried. */
  getParticipantPresence(roomName: string, identity: string): Promise<boolean | null>;
  listParticipants(roomName: string): Promise<NormalizedParticipant[] | null>;
}

export const VIDEO_PROVIDER_TOKEN = 'IVideoProviderService';
