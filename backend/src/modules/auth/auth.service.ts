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
import { UserRole, UserStatus, WalletTxType, WalletTxCategory } from '@prisma/client';
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
        wallet: {
          create: {
            balanceCoins: 100,
            bonusCoins: 100,
            purchasedCoins: 0,
            lifetimeEarned: 100,
            lifetimeSpent: 0,
            transactions: {
              create: {
                type: WalletTxType.CREDIT,
                category: WalletTxCategory.JOINING_BONUS,
                amountCoins: 100,
                balanceBefore: 0,
                balanceAfter: 100,
                referenceId: `signup_bonus_${dto.email.toLowerCase()}`,
                metadata: { note: 'Auspicious Welcome Darshan Bonus' },
              },
            },
          },
        },
      },
      include: { wallet: true },
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
      include: { streamerProfile: true, wallet: true },
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
      const secret = process.env.JWT_2FA_SECRET || process.env.JWT_ACCESS_SECRET;
      return {
        requires2FA: true,
        tempToken: this.jwtService.sign(
          { sub: user.id, purpose: '2fa_challenge', is2FAChallenge: true },
          { expiresIn: '5m', secret },
        ),
      };
    }

    return this.generateTokens(user);
  }

  async verifyTotpLogin(dto: VerifyTotpDto) {
    if (!dto.tempToken) {
      throw new BadRequestException('tempToken is required for 2FA verification');
    }

    const secret = process.env.JWT_2FA_SECRET || process.env.JWT_ACCESS_SECRET;
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.tempToken, { secret });
    } catch {
      throw new UnauthorizedException('2FA challenge token has expired or is invalid. Please sign in again.');
    }

    if (payload.purpose !== '2fa_challenge' && !payload.is2FAChallenge) {
      throw new UnauthorizedException('Invalid 2FA challenge token');
    }

    const userId = payload.sub;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { streamerProfile: true, wallet: true },
    });
    if (!user || !user.twoFactorSecretEnc) {
      throw new UnauthorizedException('User 2FA is not configured');
    }

    const totpSecret = CryptoUtil.decryptAesGcm(user.twoFactorSecretEnc);
    const isValid = authenticator.verify({ token: dto.token, secret: totpSecret });

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
    const otpAuthUrl = authenticator.keyuri(user.email, 'ShubhdarshanAdmin', secret);
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
      expiresIn: '7d',
      secret: process.env.JWT_ACCESS_SECRET || 'jwt_default_insecure_access_secret_key',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '30d',
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
        wallet: user.wallet ? {
          balanceCoins: user.wallet.balanceCoins,
          bonusCoins: user.wallet.bonusCoins,
          purchasedCoins: user.wallet.purchasedCoins,
        } : undefined,
      },
    };
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const anonymizedEmail = `deleted_${Date.now()}_${user.id.slice(0, 8)}@shubhdarshan.privacy`;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.DELETION_REQUESTED,
        deletedAt: new Date(),
        passwordHash: null,
        emailVerifyTokenHash: null,
        email: anonymizedEmail,
        name: 'Deleted Devotee',
        avatarUrl: null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        actorEmail: user.email,
        action: 'DPDP_USER_ACCOUNT_DELETED',
        targetResource: `User:${userId}`,
        details: { reason: 'DPDP Act 2023 self-serve deletion request' },
      },
    });

    return { message: 'Account and personal data successfully deleted under DPDP Act 2023.' };
  }
}
