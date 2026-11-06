import { Controller, Get, UseGuards } from '@nestjs/common';
import { InternalKeyGuard } from '../../common/guards/internal-key.guard';
import { PrismaService } from '../../database/prisma.service';
import { StreamStatus } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';

@Controller('internal')
export class InternalController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @UseGuards(InternalKeyGuard)
  @Get('live-count')
  async getLiveCount(): Promise<string> {
    const count = await this.prisma.stream.count({
      where: { status: StreamStatus.LIVE },
    });
    return count.toString();
  }
}
