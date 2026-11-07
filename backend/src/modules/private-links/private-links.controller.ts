import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PrivateLinksService } from './private-links.service';
import { CreatePrivateLinkDto, ClaimPrivateLinkDto } from './dto/create-private-link.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Private Streams')
@Controller('private-links')
export class PrivateLinksController {
  constructor(private readonly privateLinksService: PrivateLinksService) {}

  @Roles(UserRole.STREAMER)
  @Post()
  @ApiOperation({ summary: 'Generate 128-bit secret private join link and WhatsApp share (FR-P2, FR-P9)' })
  async createLink(
    @CurrentUser('id') streamerId: string,
    @Body() dto: CreatePrivateLinkDto,
  ) {
    return this.privateLinksService.createLink(streamerId, dto);
  }

  @Public()
  @Get('inspect/:tokenSlug')
  @ApiOperation({ summary: 'Inspect join link metadata without side-effects (safe for WhatsApp crawler)' })
  async inspectLink(@Param('tokenSlug') tokenSlug: string) {
    return this.privateLinksService.inspectLink(tokenSlug);
  }

  @Public()
  @Post('claim/:tokenSlug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate link, password & capacity to claim 5-minute video token (FR-P6)' })
  async claimLink(
    @Param('tokenSlug') tokenSlug: string,
    @Body() dto: ClaimPrivateLinkDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);

    // Resolve user ID via multiple fallbacks:
    // 1. @CurrentUser('id') from JwtAuthGuard
    // 2. req.user?.id attached by Passport strategy
    // 3. dto.userId explicitly passed in request body
    // 4. Decode Bearer token directly from Authorization header
    let resolvedUserId = userId || (req as any).user?.id || dto.userId;

    if (!resolvedUserId && req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace(/^Bearer\s+/i, '');
        const base64Payload = token.split('.')[1];
        if (base64Payload) {
          const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'));
          if (payload?.sub) {
            resolvedUserId = payload.sub;
          }
        }
      } catch {
        // Fallback silently if token is malformed
      }
    }

    if (!resolvedUserId && (req as any).cookies?.access_token) {
      try {
        const token = (req as any).cookies.access_token;
        const base64Payload = token.split('.')[1];
        if (base64Payload) {
          const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'));
          if (payload?.sub) {
            resolvedUserId = payload.sub;
          }
        }
      } catch {
        // Fallback silently
      }
    }

    return this.privateLinksService.claimLink(tokenSlug, dto, resolvedUserId, ip);
  }

  @Roles(UserRole.STREAMER)
  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke link and disconnect all active viewers (FR-P5)' })
  async revokeLink(
    @Param('id') linkId: string,
    @CurrentUser('id') streamerId: string,
  ) {
    return this.privateLinksService.revokeLink(linkId, streamerId);
  }

  @Roles(UserRole.STREAMER)
  @Post(':streamId/kick-block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove and block viewer from rejoining stream (FR-P7)' })
  async kickAndBlockViewer(
    @Param('streamId') streamId: string,
    @CurrentUser('id') streamerId: string,
    @Body('targetUserId') targetUserId?: string,
    @Body('targetSessionId') targetSessionId?: string,
    @Body('reason') reason?: string,
  ) {
    return this.privateLinksService.kickAndBlockViewer(
      streamId,
      streamerId,
      targetUserId,
      targetSessionId,
      reason,
    );
  }
}
