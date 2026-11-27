import { Body, Controller, Delete, Get, Header, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreatePoojaBookingDto, RespondPoojaBookingDto } from './dto/pooja-booking.dto';
import { PoojaBookingsService } from './pooja-bookings.service';

@ApiTags('Pooja Bookings')
@Controller('pooja-bookings')
export class PoojaBookingsController {
  constructor(private readonly poojaBookingsService: PoojaBookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a private 1-on-1 pooja booking request for a verified Pandit Ji' })
  async createBooking(
    @CurrentUser('id') devoteeId: string,
    @Body() dto: CreatePoojaBookingDto,
  ) {
    return this.poojaBookingsService.createBooking(devoteeId, dto);
  }

  @Get('mine')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  @Header('Pragma', 'no-cache')
  @ApiOperation({ summary: 'List pooja booking requests submitted by the signed-in devotee' })
  async getMyBookings(@CurrentUser('id') devoteeId: string) {
    return this.poojaBookingsService.getMyBookings(devoteeId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel or dismiss a devotee pooja booking request' })
  async cancelMyBooking(
    @CurrentUser('id') devoteeId: string,
    @Param('id') bookingId: string,
  ) {
    return this.poojaBookingsService.cancelMyBooking(devoteeId, bookingId);
  }

  @Roles(UserRole.STREAMER, UserRole.ADMIN)
  @Get('streamer/requests')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  @Header('Pragma', 'no-cache')
  @ApiOperation({ summary: 'List pooja requests assigned to the signed-in Pandit Ji' })
  async getStreamerRequests(@CurrentUser('id') panditUserId: string) {
    return this.poojaBookingsService.getStreamerRequests(panditUserId);
  }

  @Roles(UserRole.STREAMER, UserRole.ADMIN)
  @Patch(':id/respond')
  @ApiOperation({ summary: 'Approve or decline an incoming devotee pooja booking request' })
  async respondToRequest(
    @CurrentUser('id') panditUserId: string,
    @Param('id') bookingId: string,
    @Body() dto: RespondPoojaBookingDto,
  ) {
    return this.poojaBookingsService.respondToRequest(panditUserId, bookingId, dto);
  }
}
