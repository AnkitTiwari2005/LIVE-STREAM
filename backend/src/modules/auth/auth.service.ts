import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { MailerService } from '../notifications/mailer.service';
import { StorageService } from '../storage/storage.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, ResetPasswordDto, VerifyTotpDto } from './dto/login.dto';
import { CryptoUtil } from '../../common/crypto.util';
import * as bcrypt from 'bcryptjs';
import { Prisma, UserRole, UserStatus, WalletTxType, WalletTxCategory } from '@prisma/client';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly storageService: StorageService,
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

    // Initial wallet has 0 balance. Welcome bonus is credited upon verified email (B-10 Anti-Abuse)
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
            balanceCoins: 0,
            bonusCoins: 0,
            purchasedCoins: 0,
            lifetimeEarned: 0,
            lifetimeSpent: 0,
          },
        },
      },
      include: { wallet: true },
    });

    try {
      await this.mailerService.sendVerificationEmail(user.email, user.name, rawVerifyToken);
      this.logger.log(`Verification email sent to: ${user.email}`);
    } catch (err: any) {
      this.logger.error(`Failed to send verification email: ${err.message}`);
    }

    return {
      message: 'Registration successful. Please check your email to verify your account and claim your 100 welcome darshan coins.',
      userId: user.id,
      email: user.email,
      debugVerifyToken: process.env.NODE_ENV !== 'production' ? rawVerifyToken : undefined,
    };
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isEmailVerified) throw new BadRequestException('Email is already verified');

    const rawVerifyToken = CryptoUtil.generate128BitToken();
    const emailVerifyTokenHash = CryptoUtil.hashSha256(rawVerifyToken);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyTokenHash },
    });

    await this.mailerService.sendVerificationEmail(user.email, user.name, rawVerifyToken);
    return { message: 'A fresh verification email has been dispatched to your inbox.' };
  }

  async verifyEmail(rawToken: string) {
    const tokenHash = CryptoUtil.hashSha256(rawToken);
    const user = await this.prisma.user.findFirst({
      where: { emailVerifyTokenHash: tokenHash },
      include: { wallet: true },
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

    // Credit 100 Welcome Bonus Coins safely if not already awarded
    const existingBonus = await this.prisma.walletTransaction.findFirst({
      where: {
        wallet: { userId: user.id },
        category: WalletTxCategory.JOINING_BONUS,
      },
    });

    if (!existingBonus && user.wallet) {
      await this.prisma.$transaction(async (tx) => {
        await tx.userWallet.update({
          where: { id: user.wallet!.id },
          data: {
            balanceCoins: { increment: 100 },
            bonusCoins: { increment: 100 },
            lifetimeEarned: { increment: 100 },
          },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: user.wallet!.id,
            type: WalletTxType.CREDIT,
            category: WalletTxCategory.JOINING_BONUS,
            amountCoins: 100,
            balanceBefore: user.wallet!.balanceCoins,
            balanceAfter: user.wallet!.balanceCoins + 100,
            referenceId: `signup_bonus_${user.id}`,
            idempotencyKey: `signup_bonus_${user.id}`,
            metadata: { note: 'Auspicious Welcome Darshan Bonus' },
          },
        });
      });
      this.logger.log(`Credited 100 welcome bonus coins to verified user ${user.email}`);
    }

    return { message: 'Email successfully verified! 100 welcome darshan coins have been added to your sacred wallet.' };
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

    // Save secret without activating yet (S-04: require confirmation with valid code first)
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecretEnc: encryptedSecret,
        twoFactorBackupCodes: hashedBackupCodes,
        isTwoFactorEnabled: false,
      },
    });

    return {
      qrCode: qrCodeDataUrl,
      backupCodes,
      message: 'Scan the QR code in your authenticator app and enter the 6-digit code to activate 2FA.',
    };
  }

  async confirm2FA(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecretEnc) {
      throw new BadRequestException('2FA setup has not been initiated');
    }

    const totpSecret = CryptoUtil.decryptAesGcm(user.twoFactorSecretEnc);
    const isValid = authenticator.verify({ token, secret: totpSecret });

    if (!isValid) {
      throw new BadRequestException('Invalid authentication code. Please check your authenticator app and try again.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isTwoFactorEnabled: true },
    });

    return { message: 'Two-factor authentication has been successfully activated for your account.' };
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

    try {
      await this.mailerService.sendPasswordResetEmail(user.email, user.name, rawResetToken);
      this.logger.log(`Password reset link dispatched for ${user.email}`);
    } catch (err: any) {
      this.logger.error(`Failed to send password reset email: ${err.message}`);
    }

    return {
      message: 'If an account with that email exists, a password reset link has been dispatched.',
      debugResetToken: process.env.NODE_ENV !== 'production' ? rawResetToken : undefined,
    };
  }

  async refreshSession(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'jwt_default_insecure_refresh_secret_key',
      });
    } catch {
      throw new UnauthorizedException('Session expired or invalid. Please log in again.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { streamerProfile: true, wallet: true },
    });

    if (!user || user.status === UserStatus.BANNED || user.status === UserStatus.DELETION_REQUESTED) {
      throw new UnauthorizedException('User account is no longer active');
    }

    return this.generateTokens(user);
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

  async updateProfile(userId: string, data: { name?: string }) {
    if (!data.name || data.name.trim().length < 2) {
      throw new BadRequestException('Name must be at least 2 characters long');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { name: data.name.trim() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isEmailVerified: true,
        isTwoFactorEnabled: true,
      },
    });
    return updated;
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { streamerProfile: true },
    });
    if (!user) throw new NotFoundException('User not found');

    // N-06: Guard against deleting the last remaining platform administrator
    if (user.role === UserRole.ADMIN) {
      const activeAdminCount = await this.prisma.user.count({
        where: { role: UserRole.ADMIN, deletedAt: null },
      });
      if (activeAdminCount <= 1) {
        throw new ForbiddenException('Cannot delete the last remaining platform administrator');
      }
    }

    // N-06: Permanently remove KYC documents from storage disk
    if (user.streamerProfile?.kycDocuments) {
      try {
        const docs = Array.isArray(user.streamerProfile.kycDocuments)
          ? user.streamerProfile.kycDocuments
          : [user.streamerProfile.kycDocuments];
        for (const doc of docs) {
          const key = typeof doc === 'string' ? doc : (doc as any)?.storageKey;
          if (key && typeof key === 'string') {
            await this.storageService.deleteFile(key);
          }
        }
      } catch (err: any) {
        this.logger.warn(`Failed to delete some KYC files for user [${userId}]: ${err.message}`);
      }
    }

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
        streamerProfile: user.streamerProfile
          ? {
              update: {
                kycDocuments: Prisma.JsonNull,
                bio: null,
                specialties: [],
                languages: [],
              },
            }
          : undefined,
      },
    });

    // N-06: Do NOT retain the original user's email in the audit log after DPDP erasure
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        actorEmail: '[DPDP_REDACTED]',
        action: 'DPDP_USER_ACCOUNT_DELETED',
        targetResource: `User:${userId}`,
        details: { reason: 'DPDP Act 2023 self-serve deletion request' },
      },
    });

    return { message: 'Account and personal data successfully deleted under DPDP Act 2023.' };
  }
}
