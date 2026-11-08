import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StreamsService } from './streams.service';
import { CreateStreamDto } from './dto/create-stream.dto';
import { UpdateStreamDto } from './dto/update-stream.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Streams')
@Controller('streams')
export class StreamsController {
  constructor(private readonly streamsService: StreamsService) {}

  @Roles(UserRole.STREAMER)
  @Post()
  @ApiOperation({ summary: 'Create a new stream (FR-L1, FR-L2)' })
  async createStream(
    @CurrentUser('id') streamerId: string,
    @Body() dto: CreateStreamDto,
  ) {
    return this.streamsService.createStream(streamerId, dto);
  }

  @Roles(UserRole.STREAMER)
  @Get('streamer/active-live')
  @ApiOperation({ summary: 'Get streamer active live stream if any' })
  async getActiveLiveStream(@CurrentUser('id') streamerId: string) {
    return this.streamsService.getActiveLiveStreamForStreamer(streamerId);
  }

  @Roles(UserRole.STREAMER)
  @Post('streamer/end-all-active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force-end all orphaned active streams for streamer' })
  async endAllActiveStreams(@CurrentUser('id') streamerId: string) {
    return this.streamsService.endAllActiveLiveStreamsForStreamer(streamerId);
  }

  @Roles(UserRole.STREAMER)
  @Post(':id/go-live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start broadcasting live and get LiveKit publisher token (FR-L2)' })
  async goLive(
    @Param('id') streamId: string,
    @CurrentUser('id') streamerId: string,
    @Body('forceEndPrevious') forceEndPrevious?: boolean,
  ) {
    return this.streamsService.goLive(streamId, streamerId, !!forceEndPrevious);
  }

  @Post(':id/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terminate live stream (FR-L6)' })
  async endStream(
    @Param('id') streamId: string,
    @CurrentUser() user: any,
  ) {
    const isAdmin = user.role === UserRole.ADMIN;
    return this.streamsService.endStream(streamId, user.id, isAdmin);
  }

  @Public()
  @Post([':id/token/viewer', ':id/token'])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get LiveKit viewer token for a public stream (FR-L7)' })
  async getViewerToken(
    @Param('id') streamId: string,
    @Body('guestName') guestName: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const resolvedUserId = userId || (req as any).user?.id;
    return this.streamsService.getViewerToken(streamId, resolvedUserId, guestName, ip);
  }

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'List active and upcoming public streams (FR-L8)' })
  async getPublicStreams(
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    return this.streamsService.getPublicStreams(categoryId, search);
  }

  @Roles(UserRole.STREAMER)
  @Get('streamer/mine')
  @ApiOperation({ summary: 'List all draft, scheduled, and active streams for current streamer (B-14)' })
  async getStreamerMine(@CurrentUser('id') streamerId: string) {
    return this.streamsService.getStreamerMine(streamerId);
  }

  @Roles(UserRole.STREAMER)
  @Get('streamer/past')
  @ApiOperation({ summary: 'Streamer dashboard past streams and stats (FR-L10)' })
  async getStreamerPastStreams(@CurrentUser('id') streamerId: string) {
    return this.streamsService.getStreamerPastStreams(streamerId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get stream details by ID' })
  async getStreamById(@Param('id') id: string, @CurrentUser() caller?: any) {
    return this.streamsService.getStreamById(id, caller);
  }

  @Roles(UserRole.STREAMER)
  @Patch(':id')
  @ApiOperation({ summary: 'Edit draft or scheduled stream (B-14, N-04)' })
  async updateStream(
    @Param('id') id: string,
    @CurrentUser('id') streamerId: string,
    @Body() dto: UpdateStreamDto,
  ) {
    return this.streamsService.updateStream(id, streamerId, dto);
  }

  @Roles(UserRole.STREAMER)
  @Delete(':id')
  @ApiOperation({ summary: 'Cancel/delete draft or scheduled stream (B-14)' })
  async deleteStream(
    @Param('id') id: string,
    @CurrentUser('id') streamerId: string,
  ) {
    return this.streamsService.deleteStream(id, streamerId);
  }
}
