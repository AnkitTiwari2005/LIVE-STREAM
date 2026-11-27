import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
  Inject,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { dbActivity } from '../../common/db-activity.coordinator';
import { MailerService } from '../notifications/mailer.service';
import { StorageService } from '../storage/storage.service';
import { StreamsService } from '../streams/streams.service';
import { TokenBlacklistService } from '../../common/token-blacklist.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, ResetPasswordDto, VerifyTotpDto, UpdateProfileDto, ChangePasswordDto, DisableTwoFactorDto } from './dto/login.dto';
import { CryptoUtil } from '../../common/crypto.util';
import { resolveTwoFactorSecret } from '../../common/config/validate-env';
import { isDevMode, isProductionLike } from '../../common/runtime-mode';
import { isTokenIssuedBeforePasswordChange } from '../../common/token-freshness.util';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Prisma, UserRole, UserStatus, WalletTxType, WalletTxCategory, StreamStatus, KycStatus } from '@prisma/client';
import { calculateCoinEarningsBreakdown } from '../../common/config/economy.constants';
import { performAccountErasureTx, deleteKycFilesBestEffort } from '../../common/account-erasure.util';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';

export function normalizeEmail(email: string): string {
  const trimmed = (email || '').trim().toLowerCase();
  const atIndex = trimmed.indexOf('@');
  if (atIndex === -1) return trimmed;

  const localPart = trimmed.slice(0, atIndex);
  const domainPart = trimmed.slice(atIndex + 1);

  if (domainPart === 'gmail.com' || domainPart === 'googlemail.com') {
    const cleanedLocal = localPart.replace(/\./g, '').split('+')[0];
    return `${cleanedLocal}@${domainPart}`;
  }

  return trimmed;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /**
   * R-05: In-memory TOTP attempt counter, keyed by userId.
   * Each entry stores { count, resetAt } and is scoped to the 5-minute challenge window.
   * We deliberately use a plain Map (not Redis) to avoid adding a Redis dependency to
   * the auth module. Because the 2FA challenge token expires in 5 minutes anyway, the
   * window is naturally bounded — a process restart clears all stale entries.
   * Max 5 wrong codes per challenge; on the 6th the user must restart the login flow.
   */
  private readonly totpFailures = new Map<string, { count: number; resetAt: number }>();

  private getTotpFailCount(userId: string): number {
    const entry = this.totpFailures.get(userId);
    if (!entry) return 0;
    if (Date.now() > entry.resetAt) {
      this.totpFailures.delete(userId);
      return 0;
    }
    return entry.count;
  }

  private getTotpLockRemainingSeconds(userId: string): number {
    const entry = this.totpFailures.get(userId);
    if (!entry) return 0;
    const remainingMs = entry.resetAt - Date.now();
    if (remainingMs <= 0) {
      this.totpFailures.delete(userId);
      return 0;
    }
    if (entry.count < 5) return 0;
    return Math.ceil(remainingMs / 1000);
  }

  private formatTotpWaitTime(seconds: number): string {
    if (seconds <= 60) {
      return `${Math.max(1, seconds)} second${seconds === 1 ? '' : 's'}`;
    }
    const mins = Math.ceil(seconds / 60);
    return `${mins} minute${mins === 1 ? '' : 's'}`;
  }

  private incrementTotpFail(userId: string): number {
    const now = Date.now();
    const entry = this.totpFailures.get(userId);
    const inWindow = entry && now <= entry.resetAt;
    const count = inWindow ? entry.count + 1 : 1;
    // Keep resetAt fixed from the first failure in this 5-minute window so repeated guesses never extend the lock
    const resetAt = inWindow ? entry.resetAt : now + 5 * 60 * 1000;
    this.totpFailures.set(userId, { count, resetAt });
    return count;
  }

  private clearTotpFail(userId: string): void {
    this.totpFailures.delete(userId);
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly storageService: StorageService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    @Optional()
    @Inject(forwardRef(() => StreamsService))
    private readonly streamsService?: StreamsService,
  ) {}

  private findActiveUserByEmail(email: string, include?: Prisma.UserInclude): Promise<any> {
    const trimmed = (email || '').trim();
    const rawLower = trimmed.toLowerCase();
    const normalizedEmail = normalizeEmail(trimmed);
    const emailClauses: Prisma.UserWhereInput[] = [
      { email: { equals: normalizedEmail, mode: 'insensitive' } },
    ];
    if (rawLower && rawLower !== normalizedEmail) {
      emailClauses.push({ email: { equals: rawLower, mode: 'insensitive' } });
    }

    return this.prisma.user.findFirst({
      where: {
        OR: emailClauses,
        deletedAt: null,
      },
      ...(include ? { include } : {}),
    });
  }

  async register(dto: RegisterDto) {
    const normalizedEmail = normalizeEmail(dto.email);
    const existing = await this.findActiveUserByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const rawVerifyToken = CryptoUtil.generate128BitToken();
    const emailVerifyTokenHash = CryptoUtil.hashSha256(rawVerifyToken);

    // Initial wallet has 0 balance. Welcome bonus is credited upon verified email (B-10 Anti-Abuse)
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
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
      debugVerifyToken: isDevMode() ? rawVerifyToken : undefined,
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
      where: {
        emailVerifyTokenHash: tokenHash,
        deletedAt: null,
        status: { not: UserStatus.DELETION_REQUESTED },
      },
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
    const user = await this.findActiveUserByEmail(dto.email, {
      streamerProfile: true,
      wallet: true,
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

    if (user.status === UserStatus.DELETION_REQUESTED) {
      throw new UnauthorizedException(
        'Your account deletion request is pending payout settlement and administrator approval.',
      );
    }

    // If 2FA enabled, require 2FA challenge (unless currently locked from brute-force attempts)
    if (user.isTwoFactorEnabled) {
      const waitSeconds = this.getTotpLockRemainingSeconds(user.id);
      if (waitSeconds > 0) {
        throw new UnauthorizedException(
          `Too many incorrect 2FA verification codes. Please wait ${this.formatTotpWaitTime(waitSeconds)} before trying again.`,
        );
      }
      const secret = resolveTwoFactorSecret();
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

    const secret = resolveTwoFactorSecret();
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.tempToken, { secret });
    } catch {
      throw new UnauthorizedException('2FA challenge token has expired or is invalid. Please return to sign in.');
    }

    if (payload.purpose !== '2fa_challenge' && !payload.is2FAChallenge) {
      throw new UnauthorizedException('Invalid 2FA challenge token');
    }

    const userId = payload.sub;

    // R-05: Enforce a maximum of 5 wrong TOTP codes per 5-minute window without extending resetAt.
    const lockWait = this.getTotpLockRemainingSeconds(userId);
    if (lockWait > 0) {
      throw new UnauthorizedException(
        `Too many incorrect verification codes. Please wait ${this.formatTotpWaitTime(lockWait)} before trying again.`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { streamerProfile: true, wallet: true },
    });
    if (!user || !user.twoFactorSecretEnc) {
      throw new UnauthorizedException('User 2FA is not configured');
    }

    const match = this.verifyTotpOrBackup(user, dto.token);

    if (!match.valid) {
      // R-05: Count this failed attempt (window stays anchored to first failure)
      const fails = this.incrementTotpFail(userId);
      const remaining = Math.max(0, 5 - fails);
      if (remaining > 0) {
        throw new UnauthorizedException(
          `Invalid authenticator verification code. ${remaining} attempt(s) remaining.`,
        );
      }
      const waitAfterLock = this.getTotpLockRemainingSeconds(userId);
      throw new UnauthorizedException(
        `Too many incorrect verification codes. Please wait ${this.formatTotpWaitTime(waitAfterLock)} before trying again.`,
      );
    }

    if (match.usedBackupIndex >= 0) {
      // Remove used backup code
      const updatedCodes = [...user.twoFactorBackupCodes];
      updatedCodes.splice(match.usedBackupIndex, 1);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { twoFactorBackupCodes: updatedCodes },
      });
    }

    // R-05: Successful verification — clear failure counter
    this.clearTotpFail(userId);
    return this.generateTokens(user);
  }

  async setupAdmin2FA(userId: string, currentTotpToken?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // R-05: If 2FA is already active, require the current TOTP code before allowing reset.
    // Without this check, anyone with a stolen access token can silently re-enroll 2FA
    // and lock the real owner out or receive their 2FA codes on a different device.
    if (user.isTwoFactorEnabled) {
      if (!currentTotpToken) {
        throw new BadRequestException(
          '2FA is already enabled. Provide your current 6-digit authenticator code to re-enroll.',
        );
      }
      if (!user.twoFactorSecretEnc) {
        throw new BadRequestException('2FA secret is missing — contact support.');
      }
      const existingSecret = CryptoUtil.decryptAesGcm(user.twoFactorSecretEnc);
      const isValid = authenticator.verify({ token: currentTotpToken, secret: existingSecret });
      if (!isValid) {
        throw new BadRequestException('Current 2FA code is incorrect. Re-enrollment denied.');
      }
    }

    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(user.email, 'ParamDarshanAdmin', secret);
    const qrCodeDataUrl = await qrcode.toDataURL(otpAuthUrl);

    // Encrypt secret with AES-256-GCM before saving
    const encryptedSecret = CryptoUtil.encryptAesGcm(secret);

    // N8: Generate 8 backup codes of 16 hex chars (64 bits entropy), formatted XXXX-XXXX-XXXX-XXXX
    const backupCodes = Array.from({ length: 8 }, () => {
      const raw = crypto.randomBytes(8).toString('hex').toLowerCase();
      return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
    });
    const hashedBackupCodes = backupCodes.map((code) => {
      const normalized = code.replace(/-/g, '');
      return crypto.createHmac('sha256', resolveTwoFactorSecret()).update(normalized).digest('hex');
    });

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
    const user = await this.findActiveUserByEmail(email);
    if (!user || user.status === UserStatus.DELETION_REQUESTED || user.status === UserStatus.BANNED) {
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

    // Fire-and-forget email dispatch asynchronously without awaiting: ensures consistent
    // response timing (~5-10ms) regardless of whether the email exists, preventing timing-based user enumeration.
    this.mailerService
      .sendPasswordResetEmail(user.email, user.name, rawResetToken)
      .then(() => this.logger.log(`Password reset link dispatched for ${user.email}`))
      .catch((err: any) => this.logger.error(`Failed to send password reset email: ${err.message}`));

    return {
      message: 'If an account with that email exists, a password reset link has been dispatched.',
      debugResetToken: isDevMode() ? rawResetToken : undefined,
    };
  }

  private getSecret(name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET', fallback: string): string {
    const val = process.env[name];
    if (val && val.trim() !== '') {
      return val;
    }
    if (isProductionLike()) {
      throw new Error(`FATAL: ${name} must be configured in production.`);
    }
    return fallback;
  }

  async refreshSession(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.getSecret('JWT_REFRESH_SECRET', 'jwt_default_insecure_refresh_secret_key'),
      });
    } catch {
      throw new UnauthorizedException('Session expired or invalid. Please log in again.');
    }

    // N11: Reject revoked refresh tokens and rotate
    if (payload.jti) {
      const isRevoked = await this.tokenBlacklistService.isRevoked(payload.jti);
      if (isRevoked) {
        throw new UnauthorizedException('Session expired or revoked. Please log in again.');
      }
      const ttl = payload.exp ? Math.max(60, payload.exp - Math.floor(Date.now() / 1000)) : 30 * 24 * 3600;
      await this.tokenBlacklistService.revokeToken(payload.jti, ttl);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { streamerProfile: true, wallet: true },
    });

    if (!user || user.status === UserStatus.BANNED || user.status === UserStatus.DELETION_REQUESTED) {
      throw new UnauthorizedException('User account is no longer active');
    }

    // N-03: Apply the same passwordChangedAt check as jwt.strategy.ts validate().
    // Without this, a stolen refresh token could keep minting fresh access tokens for
    // up to 30 days even after the account owner has reset their password.
    // Compare in whole seconds (Math.floor) so a login in the same second as the reset
    // is not incorrectly rejected.
    if (isTokenIssuedBeforePasswordChange(payload.iat, user.passwordChangedAt)) {
      throw new UnauthorizedException('Session expired after password change — please log in again.');
    }

    return this.generateTokens(user);
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = CryptoUtil.hashSha256(dto.token);
    const user = await this.prisma.user.findFirst({
      where: {
        resetTokenHash: tokenHash,
        resetTokenExpiry: { gt: new Date() },
        deletedAt: null,
        status: { not: UserStatus.DELETION_REQUESTED },
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
        // H-10: Record the time the password was changed. The JWT strategy compares
        // the token's iat (issued-at) against this timestamp and rejects tokens issued
        // before the reset, invalidating all existing sessions without needing a
        // token blacklist or database-stored version counter.
        passwordChangedAt: new Date(),
      },
    });

    return { message: 'Password has been successfully updated. You may now log in.' };
  }

  private verifyTotpOrBackup(user: any, rawToken: string): { valid: boolean; usedBackupIndex: number } {
    if (!user?.twoFactorSecretEnc || !rawToken) {
      return { valid: false, usedBackupIndex: -1 };
    }
    const totpSecret = CryptoUtil.decryptAesGcm(user.twoFactorSecretEnc);
    if (authenticator.verify({ token: rawToken, secret: totpSecret })) {
      return { valid: true, usedBackupIndex: -1 };
    }

    const backupCodes: string[] = Array.isArray(user.twoFactorBackupCodes) ? user.twoFactorBackupCodes : [];
    const normalizedToken = rawToken.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const hmacHash = crypto.createHmac('sha256', resolveTwoFactorSecret()).update(normalizedToken).digest('hex');
    const legacyHash = CryptoUtil.hashSha256(rawToken.trim());

    let backupIndex = backupCodes.indexOf(hmacHash);
    if (backupIndex === -1) {
      backupIndex = backupCodes.indexOf(legacyHash);
    }

    return { valid: backupIndex !== -1, usedBackupIndex: backupIndex };
  }

  private nextRotationSecond(currentPasswordChangedAt?: Date | null): number {
    const baseline = Math.floor(Date.now() / 1000) + 1;
    const existing = currentPasswordChangedAt ? Math.floor(currentPasswordChangedAt.getTime() / 1000) + 1 : 0;
    return Math.max(baseline, existing);
  }

  private formatSessionUserPayload(user: any, isLastAdmin = false) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      isTwoFactorEnabled: user.isTwoFactorEnabled === true,
      emailNotification: user.emailNotification ?? true,
      preferredLanguage: user.preferredLanguage ?? 'en',
      avatarUrl: user.avatarUrl,
      hasPassword: Boolean(user.passwordHash),
      ...(user.role === UserRole.ADMIN ? { isLastAdmin } : {}),
      streamerProfile: user.streamerProfile
        ? {
            id: user.streamerProfile.id,
            slug: user.streamerProfile.slug ?? null,
            kycStatus: user.streamerProfile.kycStatus,
            isVerifiedBadge: user.streamerProfile.isVerifiedBadge,
            hasSpecialBadge: user.streamerProfile.hasSpecialBadge,
            specialBadgeTitle: user.streamerProfile.specialBadgeTitle,
          }
        : null,
    };
  }

  generateTokens(user: any, customIatSeconds?: number) {
    const jti = CryptoUtil.generate128BitToken();
    const payload: any = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti,
      ...(typeof customIatSeconds === 'number' ? { iat: customIatSeconds } : {}),
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: this.getSecret('JWT_ACCESS_SECRET', 'jwt_default_insecure_access_secret_key'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '30d',
      secret: this.getSecret('JWT_REFRESH_SECRET', 'jwt_default_insecure_refresh_secret_key'),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        ...this.formatSessionUserPayload(user),
        wallet: user.wallet ? {
          balanceCoins: user.wallet.balanceCoins,
          bonusCoins: user.wallet.bonusCoins,
          purchasedCoins: user.wallet.purchasedCoins,
        } : undefined,
      },
    };
  }

  async getMeExtras(userId: string) {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        passwordHash: true,
        emailNotification: true,
        preferredLanguage: true,
        role: true,
        streamerProfile: {
          select: {
            id: true,
            slug: true,
            kycStatus: true,
            isVerifiedBadge: true,
            hasSpecialBadge: true,
            specialBadgeTitle: true,
          },
        },
      },
    });

    const isLastAdmin =
      row?.role === UserRole.ADMIN
        ? (await this.prisma.user.count({
            where: {
              role: UserRole.ADMIN,
              deletedAt: null,
              status: { not: UserStatus.DELETION_REQUESTED },
            },
          })) <= 1
        : undefined;

    return {
      hasPassword: Boolean(row?.passwordHash),
      ...(row?.emailNotification !== undefined ? { emailNotification: row.emailNotification } : {}),
      ...(row?.preferredLanguage !== undefined ? { preferredLanguage: row.preferredLanguage } : {}),
      ...(row?.streamerProfile !== undefined ? { streamerProfile: row.streamerProfile } : {}),
      ...(isLastAdmin !== undefined ? { isLastAdmin } : {}),
    };
  }

  async getSessionUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { streamerProfile: true },
    });
    if (!user || user.deletedAt || user.status === UserStatus.DELETION_REQUESTED) {
      throw new UnauthorizedException('User account is no longer active');
    }

    let isLastAdmin = false;
    if (user.role === UserRole.ADMIN) {
      const activeAdmins = await this.prisma.user.count({
        where: {
          role: UserRole.ADMIN,
          deletedAt: null,
          status: { not: UserStatus.DELETION_REQUESTED },
        },
      });
      isLastAdmin = activeAdmins <= 1;
    }

    return this.formatSessionUserPayload(user, isLastAdmin);
  }

  async updateProfile(userId: string, data: UpdateProfileDto) {
    const updateData: any = {};

    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length < 2) {
        throw new BadRequestException('Name must be at least 2 characters long');
      }
      updateData.name = data.name.trim();
    }
    if (data.emailNotification !== undefined) {
      updateData.emailNotification = Boolean(data.emailNotification);
    }
    if (data.preferredLanguage !== undefined) {
      updateData.preferredLanguage = data.preferredLanguage;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No profile changes supplied');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { streamerProfile: true },
    });
    return this.formatSessionUserPayload(updated);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { streamerProfile: true, wallet: true },
    });
    if (!user || user.deletedAt || user.status === UserStatus.DELETION_REQUESTED) {
      throw new UnauthorizedException('User account is not active');
    }

    if (user.passwordHash) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required');
      }
      const matchesCurrent = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!matchesCurrent) {
        throw new UnauthorizedException('Current password is incorrect');
      }
      const sameAsOld = await bcrypt.compare(dto.newPassword, user.passwordHash);
      if (sameAsOld) {
        throw new BadRequestException('New password must be different from your current password');
      }
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    const rotationSec = this.nextRotationSecond(user.passwordChangedAt);
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        resetTokenHash: null,
        resetTokenExpiry: null,
        passwordChangedAt: new Date(rotationSec * 1000),
      },
      include: { streamerProfile: true, wallet: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        actorEmail: user.email,
        action: 'PASSWORD_CHANGED',
        targetResource: `User:${userId}`,
        details: { hadPassword: Boolean(user.passwordHash) },
      },
    });

    const tokens = this.generateTokens(updatedUser, rotationSec);
    return {
      ...tokens,
      message: 'Password updated successfully. All other active sessions have been signed out.',
    };
  }

  async logoutAllOtherDevices(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { streamerProfile: true, wallet: true },
    });
    if (!user || user.deletedAt || user.status === UserStatus.DELETION_REQUESTED) {
      throw new UnauthorizedException('User account is not active');
    }

    const rotationSec = this.nextRotationSecond(user.passwordChangedAt);
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordChangedAt: new Date(rotationSec * 1000) },
      include: { streamerProfile: true, wallet: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        actorEmail: user.email,
        action: 'SESSION_LOGOUT_ALL',
        targetResource: `User:${userId}`,
      },
    });

    const tokens = this.generateTokens(updatedUser, rotationSec);
    return {
      ...tokens,
      message: 'Signed out from all other devices and browsers.',
    };
  }

  async disableTwoFactor(userId: string, dto: DisableTwoFactorDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new NotFoundException('User not found');

    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Two-factor authentication is mandatory for administrator accounts');
    }
    if (!user.isTwoFactorEnabled || !user.twoFactorSecretEnc) {
      throw new BadRequestException('Two-factor authentication is not currently enabled');
    }

    if (user.passwordHash) {
      if (!dto.password) {
        throw new BadRequestException('Account password is required to disable 2FA');
      }
      const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
      if (!passwordOk) {
        throw new UnauthorizedException('Incorrect password');
      }
    }

    const codeCheck = this.verifyTotpOrBackup(user, dto.token);
    if (!codeCheck.valid) {
      throw new UnauthorizedException('Invalid 2FA authenticator or backup code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecretEnc: null,
        twoFactorBackupCodes: [],
        isTwoFactorEnabled: false,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        actorEmail: user.email,
        action: 'TWO_FA_DISABLED',
        targetResource: `User:${userId}`,
      },
    });

    return { message: 'Two-factor authentication has been disabled for your account.' };
  }

  async hasPassword(userId: string): Promise<boolean> {
    const row = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    return !!row?.passwordHash;
  }

  async deleteAccount(userId: string, password?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { streamerProfile: true, wallet: true },
    });
    if (!user || user.deletedAt) throw new NotFoundException('User not found');

    // N-06 & N4: Verify password if account has one (Google OAuth-only users have passwordHash === null)
    if (user.passwordHash) {
      if (!password) {
        throw new BadRequestException('Password confirmation is required to delete your account.');
      }
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedException('Incorrect password. Account deletion aborted.');
      }
    }

    // N-06: Guard against deleting the last remaining platform administrator
    if (user.role === UserRole.ADMIN) {
      const activeAdminCount = await this.prisma.user.count({
        where: {
          role: UserRole.ADMIN,
          deletedAt: null,
          status: { not: UserStatus.DELETION_REQUESTED },
        },
      });
      if (activeAdminCount <= 1) {
        throw new ForbiddenException('Cannot delete the last remaining platform administrator');
      }
    }

    const earnedAgg = this.prisma.streamerEarning?.aggregate
      ? await this.prisma.streamerEarning.aggregate({
          where: { streamerId: userId },
          _sum: { coins: true },
        })
      : null;
    const earnedCoins = earnedAgg?._sum?.coins || 0;
    const isPanditAccount =
      user.role === UserRole.STREAMER ||
      user.streamerProfile?.kycStatus === KycStatus.APPROVED ||
      earnedCoins > 0;

    if (isPanditAccount && user.status === UserStatus.DELETION_REQUESTED) {
      throw new ConflictException(
        'Your account deletion request is already pending payout settlement and administrator approval.',
      );
    }

    // N4: Conclude any active, reconnecting, or scheduled streams owned by the user
    const liveStreams = await this.prisma.stream.findMany({
      where: {
        streamerId: userId,
        status: { in: [StreamStatus.LIVE, StreamStatus.RECONNECTING_GRACE_PERIOD, StreamStatus.SCHEDULED] },
      },
    });

    for (const s of liveStreams) {
      try {
        if ((s.status === StreamStatus.LIVE || s.status === StreamStatus.RECONNECTING_GRACE_PERIOD) && this.streamsService) {
          await this.streamsService.endStream(s.id, userId, true);
        } else {
          const isBroadcasting = s.status === StreamStatus.LIVE || s.status === StreamStatus.RECONNECTING_GRACE_PERIOD;
          await this.prisma.stream.update({
            where: { id: s.id },
            data: {
              status: isBroadcasting ? StreamStatus.ENDED : StreamStatus.CANCELLED,
              endedAt: new Date(),
            },
          });
          if (isBroadcasting) {
            dbActivity.markBroadcastDirty();
          }
          dbActivity.markRemindersDirty();
          dbActivity.bumpPublicStreamsVersion();
        }
      } catch (err: any) {
        this.logger.warn(`Failed to conclude stream ${s.id} on user deletion: ${err.message}`);
      }
    }

    // N4: Revoke all private stream links created by this user
    await this.prisma.privateAccessLink.updateMany({
      where: { stream: { streamerId: userId }, isRevoked: false },
      data: { isRevoked: true },
    }).catch(() => {});

    // Pandits must have earned payouts settled (`dueCoins === 0`) and approved by an admin before full erasure.
    if (isPanditAccount) {
      const paidAgg = this.prisma.panditPayout?.aggregate
        ? await this.prisma.panditPayout.aggregate({
            where: { streamerId: userId },
            _sum: { coins: true },
          })
        : null;
      const paidCoins = paidAgg?._sum?.coins || 0;
      const dueCoins = Math.max(0, earnedCoins - paidCoins);
      const dueNetInr = calculateCoinEarningsBreakdown(dueCoins).netInr;

      const requestedAt = new Date();
      const applyPendingRequest = async (tx: any) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            status: UserStatus.DELETION_REQUESTED,
            deletionRequestedAt: requestedAt,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: userId,
            actorEmail: user.email,
            action: 'DPDP_PANDIT_DELETION_REQUESTED',
            targetResource: `User:${userId}`,
            details: {
              reason: 'Pandit account deletion requested; awaiting payout settlement and admin approval',
              earnedCoins,
              paidCoins,
              dueCoins,
              dueNetInr,
            },
          },
        });
      };

      if (typeof (this.prisma as any).$transaction === 'function') {
        await (this.prisma as any).$transaction(applyPendingRequest);
      } else {
        await applyPendingRequest(this.prisma);
      }

      dbActivity.bumpPublicStreamsVersion();
      return {
        pendingApproval: true,
        dueCoins,
        dueNetInr,
        message:
          dueCoins > 0
            ? `Your deletion request has been submitted. Your pending payout of ${dueCoins.toLocaleString()} coins (₹${dueNetInr.toFixed(2)} net) will be settled before an administrator approves final erasure.`
            : 'Your deletion request has been submitted and is awaiting final administrator approval.',
      };
    }

    // Immediate self-serve DPDP erasure for devotee accounts
    const runErasure = (tx: any) =>
      performAccountErasureTx(tx, {
        user,
        actorId: userId,
        actorEmail: '[DPDP_REDACTED]',
        action: 'DPDP_USER_ACCOUNT_DELETED',
        reason: 'DPDP Act 2023 self-serve deletion request',
      });

    const { kycKeys } =
      typeof (this.prisma as any).$transaction === 'function'
        ? await (this.prisma as any).$transaction(runErasure)
        : await runErasure(this.prisma);

    await deleteKycFilesBestEffort(kycKeys, this.storageService, this.logger, userId);

    return {
      pendingApproval: false,
      message:
        'Account and personal data successfully deleted under DPDP Act 2023. Financial transaction records retained anonymously for statutory audit requirements.',
    };
  }
}
