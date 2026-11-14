import { Module, forwardRef } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { PresenceService } from './presence.service';
import { AuthModule } from '../auth/auth.module';
import { StreamsModule } from '../streams/streams.module';

@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => StreamsModule)],
  providers: [ChatGateway, ChatService, PresenceService],
  exports: [ChatService, ChatGateway, PresenceService],
})
export class ChatModule {}
