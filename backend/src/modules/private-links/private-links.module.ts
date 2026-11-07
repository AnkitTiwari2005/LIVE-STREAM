import { Module } from '@nestjs/common';
import { PrivateLinksService } from './private-links.service';
import { PrivateLinksController } from './private-links.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PrivateLinksController],
  providers: [PrivateLinksService],
  exports: [PrivateLinksService],
})
export class PrivateLinksModule {}
