import { Module, Global } from '@nestjs/common';
import { LiveKitProviderService } from './providers/livekit-provider.service';
import { VIDEO_PROVIDER_TOKEN } from './interfaces/video-provider.interface';
import { LiveKitWebhookController } from './controllers/livekit-webhook.controller';

@Global()
@Module({
  controllers: [LiveKitWebhookController],
  providers: [
    {
      provide: VIDEO_PROVIDER_TOKEN,
      useClass: LiveKitProviderService,
    },
    LiveKitProviderService,
  ],
  exports: [VIDEO_PROVIDER_TOKEN, LiveKitProviderService],
})
export class VideoModule {}
