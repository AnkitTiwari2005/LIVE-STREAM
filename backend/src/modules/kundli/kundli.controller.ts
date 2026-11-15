import { Body, Controller, Get, Header, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { KundliBirthDto, KundliChartDto } from './dto/kundli.dto';
import { KundliService } from './kundli.service';

@ApiTags('Kundli')
@Controller('kundli')
export class KundliController {
  constructor(private readonly kundliService: KundliService) {}

  /** Lets the page show a clear message instead of an error when the feature is not configured. */
  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Is the Kundli service configured?' })
  status() {
    return { enabled: this.kundliService.isEnabled() };
  }

  // Signed-in devotees only: every call can spend paid third-party credits.
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @Post('generate')
  @ApiOperation({ summary: 'Generate a Vedic birth chart (kundli), avakhada and current dasha' })
  generate(@CurrentUser('id') userId: string, @Body() dto: KundliBirthDto) {
    return this.kundliService.generate(userId, dto);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('chart')
  @Header('Content-Type', 'image/svg+xml; charset=utf-8')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox")
  @ApiOperation({ summary: 'Chart drawing (D1 / D9, North or South Indian style) as SVG' })
  chart(@CurrentUser('id') userId: string, @Body() dto: KundliChartDto) {
    return this.kundliService.chart(userId, dto);
  }
}
