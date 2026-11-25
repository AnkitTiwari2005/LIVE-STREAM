import { Logger } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';

const ERROR_LOG_THROTTLE_MS = 60_000;

/**
 * Returns the configured Redis URL, or null when Redis is intentionally disabled.
 * Never falls back to localhost:6379 so single-instance deployments without Redis
 * stay cleanly in in-memory mode with zero socket or log noise.
 */
export function resolveRedisUrl(): string | null {
  const raw = process.env.REDIS_URL?.trim();
  return raw ? raw : null;
}

/**
 * Creates and connects an optional ioredis client when REDIS_URL is configured.
 * Logs once when disabled and throttles repeated connection errors.
 */
export function createOptionalRedisClient(
  logger: Logger,
  label: string,
  extraOptions: RedisOptions = {},
): Redis | null {
  const redisUrl = resolveRedisUrl();
  if (!redisUrl) {
    logger.log(`${label}: REDIS_URL not set — using in-memory mode.`);
    return null;
  }

  let lastErrorLogAt = 0;
  const logThrottled = (msg: string) => {
    const now = Date.now();
    if (now - lastErrorLogAt >= ERROR_LOG_THROTTLE_MS) {
      lastErrorLogAt = now;
      logger.warn(`${label} Redis unavailable (${msg}) — using in-memory fallback.`);
    }
  };

  try {
    const client = new Redis(redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 0,
      retryStrategy: (times: number) => Math.min(times * 1000, 30_000),
      ...extraOptions,
    });
    client.on('error', (err) => logThrottled(err.message || 'connection error'));
    client.connect().catch((err) => logThrottled(err?.message || 'connect failed'));
    return client;
  } catch (err: any) {
    logger.warn(`${label}: failed to initialize Redis (${err?.message}); using in-memory fallback.`);
    return null;
  }
}
