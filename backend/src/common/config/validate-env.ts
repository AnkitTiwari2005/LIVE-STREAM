import { Logger } from '@nestjs/common';

/**
 * Validates critical environment variables and secrets at application boot time (B-08, N-11).
 * Fails fast and throws fatal errors in production if any required secret is missing or set to an insecure default.
 */
export function validateProductionSecrets(context: string = 'Bootstrap'): void {
  const logger = new Logger(context);

  if (process.env.NODE_ENV !== 'production') {
    return;
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
