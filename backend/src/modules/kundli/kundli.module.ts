import { Module } from '@nestjs/common';
import { AstroLogicsClient } from './astrologics.client';
import { KundliController } from './kundli.controller';
import { KundliService } from './kundli.service';

@Module({
  controllers: [KundliController],
  providers: [AstroLogicsClient, KundliService],
})
export class KundliModule {}
