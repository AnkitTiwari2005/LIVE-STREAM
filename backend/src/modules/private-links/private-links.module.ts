import { Module } from '@nestjs/common';
import { PrivateLinksService } from './private-links.service';
import { PrivateLinksController } from './private-links.controller';

@Module({
  controllers: [PrivateLinksController],
  providers: [PrivateLinksService],
  exports: [PrivateLinksService],
})
export class PrivateLinksModule {}
