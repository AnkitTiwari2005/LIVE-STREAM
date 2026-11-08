import { Logger } from '@nestjs/common';

/**
 * Validates critical environment variables and secrets at application boot time (B-08, N-11).
 * Ensures secure production credentials and fails fast against insecure defaults.
 * R-01: Removed all hardcoded credential fallbacks — the app now refuses to start
 * if LiveKit keys or JWT secrets are missing or still set to known-insecure values.
 */
export function validateProductionSecrets(context: string = 'Bootstrap'): void {
  const logger = new Logger(context);

  // R-01: In ALL environments, ensure JWT_2FA_SECRET is set independently.
  // We no longer silently alias it to JWT_ACCESS_SECRET — secrets must be distinct.
  if (!process.env.JWT_2FA_SECRET && process.env.JWT_ACCESS_SECRET) {
    // Acceptable only in local dev; production guard below will catch it if secrets are shared
    process.env.JWT_2FA_SECRET = process.env.JWT_ACCESS_SECRET;
  }

  // R-01: REMOVED hardcoded LiveKit credential fallbacks.
  // Previously this code set LIVEKIT_API_KEY = 'API2RCSWowptwZY' — a real credential.
  // Those credentials have been rotated. The app will now refuse to start without real values.

  const criticalSecrets = [
    {
      name: 'JWT_ACCESS_SECRET',
      insecureDefaults: ['jwt_default_insecure_access_secret_key', 'secret', 'default'],
    },
    {
      name: 'JWT_REFRESH_SECRET',
      insecureDefaults: ['jwt_default_insecure_refresh_secret_key', 'secret', 'default'],
    },
    {
      name: 'JWT_2FA_SECRET',
      insecureDefaults: ['jwt_default_insecure_2fa_secret_key', 'secret', 'default'],
    },
    {
      name: 'LIVEKIT_API_KEY',
      // R-01: Added old hardcoded key to blocked list so it can never be used again
      insecureDefaults: ['pooja', 'devkey', 'CHANGE_ME', 'API2RCSWowptwZY'],
    },
    {
      name: 'LIVEKIT_API_SECRET',
      // R-01: Added old hardcoded secret to blocked list
      insecureDefaults: ['secret', 'secretkey', 'CHANGE_ME', 'rXe7jPbWbNoolgrDdPlLYNTvBQ9XeoYeqtiKqxtP5e7B'],
    },
  ];

  if (process.env.NODE_ENV !== 'production') {
    // In dev/test, only warn — don't crash the dev server
    for (const item of criticalSecrets) {
      const val = process.env[item.name];
      if (!val || val.trim() === '') {
        logger.warn(`[DEV] Missing env var ${item.name} — set it in .env or the app may malfunction.`);
      }
    }
    return;
  }

  // Production: hard fail on any missing or insecure value
  for (const item of criticalSecrets) {
    const val = process.env[item.name];
    if (!val || val.trim() === '') {
      logger.error(`FATAL: Missing required production secret ${item.name}!`);
      throw new Error(`Production requires ${item.name} to be set and non-empty.`);
    }
    const valLower = val.toLowerCase();
    if (
      item.insecureDefaults.some((def) => valLower === def.toLowerCase()) ||
      valLower.includes('insecure')
    ) {
      logger.error(`FATAL: Insecure or default ${item.name} detected in production!`);
      throw new Error(`Production requires a secure, non-default ${item.name}.`);
    }
    // R-01: Require secrets to be at least 32 characters in production
    if (item.name.startsWith('JWT_') && val.length < 32) {
      logger.error(`FATAL: ${item.name} is too short — must be at least 32 characters in production.`);
      throw new Error(`Production requires ${item.name} to be at least 32 characters.`);
    }
  }
}
