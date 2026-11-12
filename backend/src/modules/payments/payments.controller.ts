import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreateDakshinaDto } from './dto/create-dakshina.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('dakshina')
  @HttpCode(HttpStatus.OK)
  async sendDakshina(
    @Body() dto: CreateDakshinaDto,
    @CurrentUser('id') devoteeId: string,
  ) {
    return this.paymentsService.sendCoinDakshina(dto, devoteeId);
  }

  @Public()
  @SkipThrottle()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request,
    @Body() body: any,
    @Headers('x-razorpay-signature') razorpaySig?: string,
  ) {
    const rawBody = (req as any).rawBody as Buffer | undefined;
    return this.paymentsService.handleWebhook(body, rawBody, razorpaySig);
  }

  @Public()
  @Get('dakshina/stream/:streamId')
  async getStreamOfferings(
    @Param('streamId') streamId: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.paymentsService.getRecentOfferings(streamId, user?.id, user?.role);
  }
}
