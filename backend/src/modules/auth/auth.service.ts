import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, ResetPasswordDto, VerifyTotpDto } from './dto/login.dto';
import { CryptoUtil } from '../../common/crypto.util';
import * as bcrypt from 'bcrypt';
import { UserRole, UserStatus } from '@prisma/client';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('An account with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const rawVerifyToken = CryptoUtil.generate128BitToken();
    const emailVerifyTokenHash = CryptoUtil.hashSha256(rawVerifyToken);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        isEmailVerified: false,
        emailVerifyTokenHash,
        isAgeConfirmed18Plus: true,
        consentRecordedAt: new Date(),
        termsVersionAccepted: 'v1.0',
      },
    });

    this.logger.log(`New user registered: ${user.email}. Verification token: ${rawVerifyToken}`);
    // In production, mailerService sends rawVerifyToken in link https://domain/verify-email?token=...
    return {
      message: 'Registration successful. Please verify your email to unlock live chat and following.',
      userId: user.id,
      email: user.email,
      debugVerifyToken: process.env.NODE_ENV !== 'production' ? rawVerifyToken : undefined,
    };
  }

  async verifyEmail(rawToken: string) {
    const tokenHash = CryptoUtil.hashSha256(rawToken);
    const user = await this.prisma.user.findFirst({
      where: { emailVerifyTokenHash: tokenHash },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired email verification link');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifyTokenHash: null,
      },
    });

    return { message: 'Email successfully verified. You may now participate in live chat and follow pandits.' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { streamerProfile: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email address or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email address or password');
    }

    if (user.status === UserStatus.BANNED) {
      throw new UnauthorizedException('Your account has been permanently suspended');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Your account is temporarily suspended. Please contact support.');
    }

    // If 2FA enabled for admin, require 2FA challenge
    if (user.isTwoFactorEnabled) {
      return {
        requires2FA: true,
        tempToken: this.jwtService.sign(
          { sub: user.id, is2FAChallenge: true },
          { expiresIn: '5m', secret: process.env.JWT_ACCESS_SECRET },
        ),
      };
    }

    return this.generateTokens(user);
  }

  async verifyTotpLogin(userId: string, dto: VerifyTotpDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecretEnc) {
      throw new UnauthorizedException('User 2FA is not configured');
    }

    const secret = CryptoUtil.decryptAesGcm(user.twoFactorSecretEnc);
    const isValid = authenticator.verify({ token: dto.token, secret });

    if (!isValid) {
      // Check backup codes
      const tokenHash = CryptoUtil.hashSha256(dto.token);
      const backupIndex = user.twoFactorBackupCodes.indexOf(tokenHash);
      if (backupIndex === -1) {
        throw new UnauthorizedException('Invalid authenticator verification code');
      }
      // Remove used backup code
      const updatedCodes = [...user.twoFactorBackupCodes];
      updatedCodes.splice(backupIndex, 1);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { twoFactorBackupCodes: updatedCodes },
      });
    }

    return this.generateTokens(user);
  }

  async setupAdmin2FA(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(user.email, 'PoojaPlatformAdmin', secret);
    const qrCodeDataUrl = await qrcode.toDataURL(otpAuthUrl);

    // Encrypt secret with AES-256-GCM before saving
    const encryptedSecret = CryptoUtil.encryptAesGcm(secret);

    // Generate 4 backup codes
    const backupCodes = Array.from({ length: 4 }, () => CryptoUtil.generate128BitToken().slice(0, 8));
    const hashedBackupCodes = backupCodes.map((code) => CryptoUtil.hashSha256(code));

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecretEnc: encryptedSecret,
        twoFactorBackupCodes: hashedBackupCodes,
        isTwoFactorEnabled: true,
      },
    });

    return {
      qrCode: qrCodeDataUrl,
      backupCodes,
      message: 'Scan the QR code in Google Authenticator or 1Password, and save your backup codes safely.',
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      // Generic success to prevent user enumeration
      return { message: 'If an account with that email exists, a password reset link has been dispatched.' };
    }

    const rawResetToken = CryptoUtil.generate128BitToken();
    const resetTokenHash = CryptoUtil.hashSha256(rawResetToken);
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetTokenHash, resetTokenExpiry },
    });

    this.logger.log(`Password reset requested for ${user.email}. Token: ${rawResetToken}`);
    return {
      message: 'If an account with that email exists, a password reset link has been dispatched.',
      debugResetToken: process.env.NODE_ENV !== 'production' ? rawResetToken : undefined,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = CryptoUtil.hashSha256(dto.token);
    const user = await this.prisma.user.findFirst({
      where: {
        resetTokenHash: tokenHash,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Password reset link is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetTokenHash: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Password has been successfully updated. You may now log in.' };
  }

  generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
      secret: process.env.JWT_ACCESS_SECRET || 'jwt_default_insecure_access_secret_key',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET || 'jwt_default_insecure_refresh_secret_key',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        avatarUrl: user.avatarUrl,
        streamerProfile: user.streamerProfile,
      },
    };
  }
}
