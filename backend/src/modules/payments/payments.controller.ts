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
    const devoteeId = user?.id || user?.sub;
    return this.paymentsService.createDakshinaOrder(dto, devoteeId);
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

  @Get('streamer/earnings')
  async getStreamerEarnings(@CurrentUser('id') streamerId: string) {
    return this.paymentsService.getStreamerEarnings(streamerId);
  }
}
