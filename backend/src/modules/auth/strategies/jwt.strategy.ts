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
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    const accessSecret = process.env.JWT_ACCESS_SECRET || 'jwt_default_insecure_access_secret_key';
    if (process.env.NODE_ENV === 'production' && (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.includes('insecure'))) {
      throw new Error('JWT_ACCESS_SECRET must be securely configured in production');
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
      },
    });

    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
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
