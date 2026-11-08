import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class InternalKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const internalKey = request.headers['x-internal-key'];
    const expectedKey = process.env.INTERNAL_KEY;

    if (!expectedKey || !internalKey || typeof internalKey !== 'string') {
      throw new UnauthorizedException('Invalid or missing internal service key');
    }

    const keyBuf = Buffer.from(internalKey);
    const expectedBuf = Buffer.from(expectedKey);

    // B-28: Constant-time comparison to prevent timing attacks
    if (keyBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(keyBuf, expectedBuf)) {
      throw new UnauthorizedException('Invalid or missing internal service key');
    }

    return true;
  }
}
