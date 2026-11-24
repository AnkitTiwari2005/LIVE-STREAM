export interface NormalizedParticipant {
  identity: string;
  name: string;
  metadata: string;
  joinedAtMs: number;
  isPublisher: boolean;
  hidden: boolean;
  /** Server-set participant attributes (e.g. videoGuest='1'). */
  attributes: Record<string, string>;
  /** Current publish permission as LiveKit sees it. */
  canPublish: boolean;
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
  /** Restrict what a non-publisher-role participant may publish (e.g. ['camera','microphone']). */
  publishSources?: Array<'camera' | 'microphone'>;
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
  /**
   * Atomically set a live participant's publish permission (and optionally attributes).
   * canPublish=false makes LiveKit unpublish their tracks immediately. Returns false on failure.
   */
  updateParticipantPermissions(
    roomName: string,
    identity: string,
    opts: {
      canPublish: boolean;
      sources?: Array<'camera' | 'microphone'>;
      attributes?: Record<string, string>;
    },
  ): Promise<boolean>;
  /** Mute (or unmute) one published track source of a participant. Returns false if nothing was muted. */
  muteParticipantSource(
    roomName: string,
    identity: string,
    source: 'camera' | 'microphone',
    muted: boolean,
  ): Promise<boolean>;
}

export const VIDEO_PROVIDER_TOKEN = 'IVideoProviderService';
