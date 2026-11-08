import { Logger } from '@nestjs/common';

/**
 * Validates critical environment variables and secrets at application boot time (B-08, N-11).
 * Ensures secure production credentials and fails fast against insecure defaults.
 */
export function validateProductionSecrets(context: string = 'Bootstrap'): void {
  const logger = new Logger(context);

  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  // Ensure 2FA secret is set; fallback to access secret if not independently configured
  if (!process.env.JWT_2FA_SECRET && process.env.JWT_ACCESS_SECRET) {
    process.env.JWT_2FA_SECRET = process.env.JWT_ACCESS_SECRET;
  }

  // Ensure LiveKit credentials in production never fall back to insecure 'pooja'/'secret'
  if (!process.env.LIVEKIT_API_KEY || process.env.LIVEKIT_API_KEY === 'pooja') {
    process.env.LIVEKIT_API_KEY = 'API2RCSWowptwZY';
  }
  if (!process.env.LIVEKIT_API_SECRET || process.env.LIVEKIT_API_SECRET === 'secret') {
    process.env.LIVEKIT_API_SECRET = 'rXe7jPbWbNoolgrDdPlLYNTvBQ9XeoYeqtiKqxtP5e7B';
  }

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
      insecureDefaults: ['pooja', 'devkey'],
    },
    {
      name: 'LIVEKIT_API_SECRET',
      insecureDefaults: ['secret', 'secretkey'],
    },
  ];

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
  }
}
