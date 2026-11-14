import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class TokenBlacklistService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private redis: Redis | null = null;
  private readonly inMemoryRevoked = new Map<string, number>(); // jti -> expiresAtMs
  private sweeper: NodeJS.Timeout | null = null;

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          enableOfflineQueue: false,
          retryStrategy: (times: number) => Math.min(times * 500, 10000), // N11: keep reconnecting; never give up permanently
        });
        this.redis.on('error', (err) => {
          this.logger.debug(`TokenBlacklist Redis offline: ${err.message}`);
        });
        this.redis.connect().catch((err) => {
          this.logger.debug(`TokenBlacklist Redis offline: ${err.message}`);
        });
      } catch (err: any) {
        this.logger.debug(`Could not initialize Redis for TokenBlacklist: ${err.message}`);
      }
    }

    // Periodic sweep of expired in-memory blacklist entries every 5 minutes
    this.sweeper = setInterval(() => {
      const now = Date.now();
      for (const [jti, exp] of this.inMemoryRevoked.entries()) {
        if (now > exp) {
          this.inMemoryRevoked.delete(jti);
        }
      }
    }, 5 * 60 * 1000).unref();
  }

  /**
   * Revoke a token by its unique JWT ID (jti) (N11)
   */
  async revokeToken(jti: string, ttlSeconds: number = 30 * 24 * 3600): Promise<void> {
    if (!jti) return;
    const safeTtl = Math.max(60, ttlSeconds);
    const expMs = Date.now() + safeTtl * 1000;
    this.inMemoryRevoked.set(jti, expMs);

    if (this.redis) {
      try {
        await this.redis.set(`auth:revoked:${jti}`, '1', 'EX', safeTtl);
      } catch (err: any) {
        this.logger.debug(`Failed to set revoked token in Redis: ${err.message}`);
      }
    }
  }

  /**
   * Check if a token's jti is revoked (N11)
   */
  async isRevoked(jti: string): Promise<boolean> {
    if (!jti) return false;

    // Check in-memory store
    const expMs = this.inMemoryRevoked.get(jti);
    if (expMs) {
      if (Date.now() < expMs) {
        return true;
      }
      this.inMemoryRevoked.delete(jti);
    }

    // Check Redis store
    if (this.redis) {
      try {
        const val = await this.redis.get(`auth:revoked:${jti}`);
        if (val) return true;
      } catch {
        // Fall back to in-memory status
      }
    }

    return false;
  }

  onModuleDestroy() {
    if (this.sweeper) clearInterval(this.sweeper);
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}
