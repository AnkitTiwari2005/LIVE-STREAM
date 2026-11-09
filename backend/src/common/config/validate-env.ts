import { Logger } from '@nestjs/common';

/**
 * Validates critical environment variables and secrets at application boot time (B-08, N-11).
 * Ensures secure production credentials and fails fast against insecure defaults.
 * R-01: Removed all hardcoded credential fallbacks — the app now refuses to start
 * if LiveKit keys or JWT secrets are missing or still set to known-insecure values.
 * N-04: Removed the JWT_2FA_SECRET alias — it must be set independently and must
 * differ from JWT_ACCESS_SECRET. A single leaked secret cannot forge both sessions
 * and two-factor challenges.
 */
export function validateProductionSecrets(context: string = 'Bootstrap'): void {
  const logger = new Logger(context);

  // N-04: DO NOT alias JWT_2FA_SECRET to JWT_ACCESS_SECRET.
  // Previously this was done silently in dev, which meant one leaked access secret
  // could also forge two-factor challenges. Each secret must be set independently.

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
      // R-01: Old compromised credentials are now blocked. New credentials set via Hostinger env vars.
      insecureDefaults: ['pooja', 'devkey', 'CHANGE_ME', 'API2RCSWowptwZY'],
    },
    {
      name: 'LIVEKIT_API_SECRET',
      // R-01: Old compromised secret is now blocked. Credential rotation complete.
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
    // N-04: Warn in dev if 2FA secret is missing or same as access secret
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const twoFaSecret = process.env.JWT_2FA_SECRET;
    if (twoFaSecret && accessSecret && twoFaSecret === accessSecret) {
      logger.warn('[DEV] JWT_2FA_SECRET is the same as JWT_ACCESS_SECRET — these must be distinct in production.');
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

  // N-04: Require all three JWT secrets to be distinct in production.
  // If two secrets are identical, a single compromise breaks two security layers.
  const jwtSecrets = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'JWT_2FA_SECRET'].map(
    (k) => process.env[k] ?? '',
  );
  if (new Set(jwtSecrets).size !== 3) {
    logger.error('FATAL: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET and JWT_2FA_SECRET must all be different!');
    throw new Error('Production requires JWT_ACCESS_SECRET, JWT_REFRESH_SECRET and JWT_2FA_SECRET to be distinct.');
  }
}
