import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Header,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { MeterTickDto } from './dto/meter-tick.dto';
import { CreateTopupOrderDto, VerifyTopupDto } from './dto/topup-order.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  @ApiOperation({ summary: 'Get current user coin wallet balance and watch minutes' })
  async getBalance(@CurrentUser('id') userId: string) {
    return this.walletService.getWalletBalance(userId);
  }

  @Post('meter-tick')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process 60-second public live darshan heartbeat meter tick' })
  async meterTick(
    @CurrentUser('id') userId: string,
    @Body() dto: MeterTickDto,
  ) {
    return this.walletService.processMeterTick(userId, dto);
  }

  @Public()
  @Get('packages')
  @ApiOperation({ summary: 'List available coin top-up packages' })
  async getPackages() {
    return this.walletService.getCoinPackages();
  }

  @Post('topup/create-order')
  @ApiOperation({ summary: 'Initiate Razorpay order for coin package recharge' })
  async createTopupOrder(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTopupOrderDto,
  ) {
    return this.walletService.createTopupOrder(userId, dto);
  }

  @Post('topup/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify payment signature and credit coins to devotee wallet' })
  async verifyTopup(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyTopupDto,
  ) {
    return this.walletService.verifyTopup(userId, dto);
  }

  @Get('transactions')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  @ApiOperation({ summary: 'Get devotee coin transaction history' })
  async getTransactions(@CurrentUser('id') userId: string) {
    return this.walletService.getTransactionHistory(userId);
  }
}
