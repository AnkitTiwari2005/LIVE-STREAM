import { Module } from '@nestjs/common';
import { PoojaBookingsController } from './pooja-bookings.controller';
import { PoojaBookingsService } from './pooja-bookings.service';

@Module({
  controllers: [PoojaBookingsController],
  providers: [PoojaBookingsService],
  exports: [PoojaBookingsService],
})
export class PoojaBookingsModule {}
