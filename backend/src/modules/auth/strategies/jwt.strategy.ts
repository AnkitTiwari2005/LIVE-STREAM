import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../database/prisma.service';
import { UserStatus } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  purpose?: string;
  is2FAChallenge?: boolean;
  iat?: number; // H-10: standard JWT issued-at, used to detect pre-reset tokens
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    // N-04: No insecure fallback — if JWT_ACCESS_SECRET is missing the app should
    // have already failed at validateProductionSecrets(). Using a hardcoded default
    // here would let the app start in production with a known, forgeable secret.
    const accessSecret = process.env.JWT_ACCESS_SECRET ?? '';
    if (!accessSecret) {
      throw new Error('JWT_ACCESS_SECRET is required but was not set');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => req?.cookies?.access_token,
        // R-02: REMOVED ExtractJwt.fromUrlQueryParameter('token') — tokens in URLs
        // appear in nginx logs, browser history, and can be stolen via open-redirect
        // or attacker-controlled document links in the KYC admin view.
        // Authentication is now header + httpOnly cookie only.
      ]),
      ignoreExpiration: false,
      secretOrKey: accessSecret,
    });
  }

  async validate(payload: JwtPayload) {
    // C-05: Reject 2FA challenge tokens attempting to access session endpoints
    if (payload.purpose === '2fa_challenge' || payload.is2FAChallenge) {
      throw new UnauthorizedException('2FA challenge token cannot access protected resources');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isEmailVerified: true,
        isTwoFactorEnabled: true,
        passwordChangedAt: true, // H-10: needed to reject tokens issued before a password reset
      },
    });

    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
    }

    // H-10: Reject tokens that were issued before the most recent password reset.
    // This invalidates all existing sessions (mobile, web, stolen tokens) the moment
    // a user resets their password, without needing a database token blacklist.
    if (user.passwordChangedAt && payload.iat) {
      const issuedAt = new Date(payload.iat * 1000);
      if (issuedAt < user.passwordChangedAt) {
        throw new UnauthorizedException('Session expired after password change — please log in again.');
      }
    }

    if (user.status === UserStatus.BANNED) {
      throw new UnauthorizedException('Your account has been permanently suspended');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Your account is temporarily suspended');
    }

    if (user.status === UserStatus.DELETION_REQUESTED) {
      throw new UnauthorizedException('This account has been scheduled for deletion');
    }

    return user;
  }
}
