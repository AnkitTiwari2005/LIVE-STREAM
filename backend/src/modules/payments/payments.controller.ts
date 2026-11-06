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
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreateDakshinaDto } from './dto/create-dakshina.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post('dakshina/create-order')
  async createDakshinaOrder(
    @Body() dto: CreateDakshinaDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.paymentsService.createDakshinaOrder(dto, user?.sub);
  }

  @Public()
  @Post('dakshina/verify')
  async verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: any,
    @Headers('x-razorpay-signature') razorpaySig?: string,
    @Headers('x-webhook-signature') genericSig?: string,
  ) {
    const signature = razorpaySig || genericSig || '';
    return this.paymentsService.handleWebhook(body, signature);
  }

  @Public()
  @Get('dakshina/stream/:streamId')
  async getStreamOfferings(@Param('streamId') streamId: string) {
    return this.paymentsService.getRecentOfferings(streamId);
  }

  @Get('streamer/earnings')
  async getStreamerEarnings(@CurrentUser('id') streamerId: string) {
    return this.paymentsService.getStreamerEarnings(streamerId);
  }
}
