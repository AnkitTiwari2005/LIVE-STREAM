import { Module, forwardRef } from '@nestjs/common';
import { StreamsService } from './streams.service';
import { StreamsController } from './streams.controller';
import { WalletModule } from '../wallet/wallet.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [WalletModule, forwardRef(() => ChatModule)],
  controllers: [StreamsController],
  providers: [StreamsService],
  exports: [StreamsService],
})
export class StreamsModule {}
