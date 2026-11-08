import {
  Controller,
  Post,
  Patch,
  Body,
  Get,
  Query,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, ForgotPasswordDto, ResetPasswordDto, VerifyTotpDto } from './dto/login.dto';
import { Response, Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new viewer account (FR-A1, FR-A2)' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email via token (FR-A2)' })
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and set secure HttpOnly cookies (FR-A1, FR-A3)' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);

    if ('requires2FA' in result) {
      return result;
    }

    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Public()
  @Post('verify-totp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 2FA TOTP code for admin login' })
  async verifyTotp(
    @Body() dto: VerifyTotpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyTotpLogin(dto);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post('setup-2fa')
  @ApiOperation({ summary: 'Initialize TOTP 2FA for current user' })
  async setup2FA(
    @CurrentUser('id') userId: string,
    @Body('currentToken') currentToken?: string,
  ) {
    // R-05: If 2FA is already enabled, currentToken (the existing TOTP code) is required
    // to prevent a stolen access token from silently re-enrolling a new 2FA device.
    return this.authService.setupAdmin2FA(userId, currentToken);
  }

  @Post('confirm-2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify code and confirm TOTP 2FA activation' })
  async confirm2FA(
    @CurrentUser('id') userId: string,
    @Body('token') token: string,
  ) {
    return this.authService.confirm2FA(userId, token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification token' })
  async resendVerification(@CurrentUser('id') userId: string) {
    return this.authService.resendVerification(userId);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using HTTP-only refresh cookie or payload' })
  async refresh(
    @Req() req: Request,
    @Body('refreshToken') bodyRefreshToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token || bodyRefreshToken;
    const result = await this.authService.refreshSession(refreshToken);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset link via email (FR-A3)' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token (FR-A3)' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out and clear session cookies (FR-A3)' })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile and session data' })
  async getMe(@CurrentUser() user: any) {
    return user;
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update devotee profile name and details' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body('name') name: string,
  ) {
    return this.authService.updateProfile(userId, { name });
  }

  @Post('delete-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Self-serve account and personal data erasure under DPDP Act 2023' })
  async deleteAccount(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.deleteAccount(userId);
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
    return result;
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/api/v1/auth/refresh',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  }
}
