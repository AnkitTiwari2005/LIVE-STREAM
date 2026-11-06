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
  listActiveRooms(): Promise<Array<{ name: string; sid: string; numParticipants: number }>>;
}

export const VIDEO_PROVIDER_TOKEN = 'IVideoProviderService';
