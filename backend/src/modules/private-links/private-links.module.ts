import { Module, forwardRef } from '@nestjs/common';
import { PrivateLinksService } from './private-links.service';
import { PrivateLinksController } from './private-links.controller';
import { AuthModule } from '../auth/auth.module';
import { StreamsModule } from '../streams/streams.module';

@Module({
  imports: [AuthModule, forwardRef(() => StreamsModule)],
  controllers: [PrivateLinksController],
  providers: [PrivateLinksService],
  exports: [PrivateLinksService],
})
export class PrivateLinksModule {}
