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
import { JwtService } from '@nestjs/jwt';

@ApiTags('Private Streams')
@Controller('private-links')
export class PrivateLinksController {
  constructor(
    private readonly privateLinksService: PrivateLinksService,
    private readonly jwtService: JwtService,
  ) {}

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

    // C-06 Secure Identity Resolution:
    // Prefer JwtAuthGuard's validated req.user; if missing (e.g. direct call or restricted user rejected by guard),
    // verify the JWT signature cleanly and forward iat so the service enforces DB existence, status, and passwordChangedAt.
    let resolvedUserId: string | undefined = userId || (req as any).user?.id;
    let tokenIat: number | undefined;

    if (!resolvedUserId) {
      let rawToken: string | undefined;
      if (req.headers.authorization?.startsWith('Bearer ')) {
        rawToken = req.headers.authorization.slice(7);
      } else if ((req as any).cookies?.access_token) {
        rawToken = (req as any).cookies.access_token;
      }

      const secret =
        process.env.JWT_ACCESS_SECRET ||
        (process.env.NODE_ENV !== 'production' ? 'jwt_default_insecure_access_secret_key' : undefined);

      if (rawToken && secret) {
        try {
          const payload = this.jwtService.verify(rawToken, { secret });
          if (payload?.sub && payload.purpose !== '2fa_challenge' && !payload.is2FAChallenge) {
            resolvedUserId = payload.sub;
            tokenIat = typeof payload.iat === 'number' ? payload.iat : undefined;
          }
        } catch {
          // Token invalid or expired - treat as guest
        }
      }
    }

    return this.privateLinksService.claimLink(tokenSlug, dto, resolvedUserId, ip, tokenIat);
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
