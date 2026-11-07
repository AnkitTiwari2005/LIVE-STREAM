import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { StreamersService } from './streamers.service';
import { ApplyStreamerDto, ReviewKycDto } from './dto/apply-streamer.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Streamers')
@Controller('streamers')
export class StreamersController {
  constructor(private readonly streamersService: StreamersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Retrieve current authenticated applicant/streamer profile and KYC status (B-15)' })
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.streamersService.getMyProfile(userId);
  }

  @Post('apply')
  @ApiOperation({ summary: 'Submit streamer KYC profile application (FR-S1)' })
  async apply(@CurrentUser('id') userId: string, @Body() dto: ApplyStreamerDto) {
    return this.streamersService.apply(userId, dto);
  }

  @Roles(UserRole.STREAMER)
  @Get('earnings')
  @ApiOperation({ summary: 'Get streamer earnings ledger and Dakshina performance (B-13)' })
  async getEarnings(@CurrentUser('id') userId: string) {
    return this.streamersService.getStreamerEarnings(userId);
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/applications')
  @ApiOperation({ summary: 'Admin queue of pending streamer applications (FR-S2, FR-M2)' })
  async getPendingApplications() {
    return this.streamersService.getPendingApplications();
  }

  @Roles(UserRole.ADMIN)
  @Patch('admin/applications/:id')
  @ApiOperation({ summary: 'Admin approve, reject, or request more info on streamer (FR-S2)' })
  async reviewKyc(
    @Param('id') profileId: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser('email') adminEmail: string,
    @Body() dto: ReviewKycDto,
  ) {
    return this.streamersService.reviewKyc(profileId, adminId, adminEmail, dto);
  }

  @Public()
  @Get('profile/:id')
  @ApiOperation({ summary: 'View public streamer profile with verified badge and streams (FR-S3, FR-S4)' })
  async getPublicProfile(@Param('id') id: string) {
    return this.streamersService.getPublicProfile(id);
  }

  @Post(':id/follow')
  @ApiOperation({ summary: 'Follow a verified streamer (FR-N1)' })
  async follow(@CurrentUser('id') followerId: string, @Param('id') streamerProfileId: string) {
    return this.streamersService.follow(followerId, streamerProfileId);
  }

  @Delete(':id/follow')
  @ApiOperation({ summary: 'Unfollow a streamer (FR-N1)' })
  async unfollow(@CurrentUser('id') followerId: string, @Param('id') streamerProfileId: string) {
    return this.streamersService.unfollow(followerId, streamerProfileId);
  }
}
