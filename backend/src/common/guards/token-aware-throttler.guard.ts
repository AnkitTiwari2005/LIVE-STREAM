import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as crypto from 'crypto';

/**
 * N10: /wallet/meter-tick is called once a minute by EVERY viewer. Keyed by IP, a temple hall,
 * a hostel or a mobile carrier's shared (CGNAT) address would trip the per-IP limit and the
 * viewers would be rejected with 429 (and stop being metered / get cut off).
 * For that one route the bucket is the caller's own access token instead of the IP.
 * A forged token only creates its own empty bucket and is rejected by JwtAuthGuard right after,
 * so this cannot be used to dodge the limit for a real account.
 */
const PER_TOKEN_ROUTES = ['/wallet/meter-tick'];

@Injectable()
export class TokenAwareThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const path: string = (req.originalUrl || req.url || '').split('?')[0];
    if (PER_TOKEN_ROUTES.some((r) => path.endsWith(r))) {
      const header: string | undefined = req.headers?.authorization;
      const raw: string | undefined =
        req.cookies?.access_token || (header?.startsWith('Bearer ') ? header.slice(7) : undefined);
      if (raw) {
        return 'tok:' + crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
      }
    }
    return super.getTracker(req);
  }
}
