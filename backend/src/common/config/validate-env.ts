import { Logger } from '@nestjs/common';

/**
 * Validates critical environment variables and secrets at application boot time (B-08, N-11).
 * Ensures secure production credentials and fails fast against insecure defaults.
 * R-01: Removed all hardcoded credential fallbacks — the app now refuses to start
 * if LiveKit keys or JWT secrets are missing or still set to known-insecure values.
 * N-04: Removed the JWT_2FA_SECRET alias — it must be set independently and must
 * differ from JWT_ACCESS_SECRET. A single leaked secret cannot forge both sessions
 * and two-factor challenges.
 * N-04 (amended): JWT_2FA_SECRET missing in production emits a WARN rather than a hard
 * crash, so the site stays up while the operator adds the env var in hPanel. It is still
 * enforced to be distinct and secure once it IS set.
 */
export function validateProductionSecrets(context: string = 'Bootstrap'): void {
  const logger = new Logger(context);

  // Secrets that MUST be present and secure in production — hard fail if missing.
  const hardRequiredSecrets = [
    {
      name: 'JWT_ACCESS_SECRET',
      insecureDefaults: ['jwt_default_insecure_access_secret_key', 'secret', 'default'],
    },
    {
      name: 'JWT_REFRESH_SECRET',
      insecureDefaults: ['jwt_default_insecure_refresh_secret_key', 'secret', 'default'],
    },
    {
      name: 'LIVEKIT_API_KEY',
      // R-01: Old compromised credentials are now blocked.
      insecureDefaults: ['pooja', 'devkey', 'CHANGE_ME', 'API2RCSWowptwZY'],
    },
    {
      name: 'LIVEKIT_API_SECRET',
      // R-01: Old compromised secret is now blocked.
      insecureDefaults: ['secret', 'secretkey', 'CHANGE_ME', 'rXe7jPbWbNoolgrDdPlLYNTvBQ9XeoYeqtiKqxtP5e7B'],
    },
  ];

  // Secrets that are strongly recommended but only WARN when missing (so the app can
  // start while the operator adds them). They are still validated for quality if set.
  const softRequiredSecrets = [
    {
      name: 'JWT_2FA_SECRET',
      insecureDefaults: ['jwt_default_insecure_2fa_secret_key', 'secret', 'default', 'pooja'],
    },
  ];

  if (process.env.NODE_ENV !== 'production') {
    // In dev/test, only warn — don't crash the dev server
    for (const item of [...hardRequiredSecrets, ...softRequiredSecrets]) {
      const val = process.env[item.name];
      if (!val || val.trim() === '') {
        logger.warn(`[DEV] Missing env var ${item.name} — set it in .env or the app may malfunction.`);
      }
    }
    // N-04: Warn in dev if 2FA secret is same as access secret
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const twoFaSecret = process.env.JWT_2FA_SECRET;
    if (twoFaSecret && accessSecret && twoFaSecret === accessSecret) {
      logger.warn('[DEV] JWT_2FA_SECRET is the same as JWT_ACCESS_SECRET — these must be distinct in production.');
    }
    return;
  }

  // Production: hard fail on missing or insecure REQUIRED secrets
  for (const item of hardRequiredSecrets) {
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
    // R-01: Require JWT secrets to be at least 32 characters in production
    if (item.name.startsWith('JWT_') && val.length < 32) {
      logger.error(`FATAL: ${item.name} is too short — must be at least 32 characters in production.`);
      throw new Error(`Production requires ${item.name} to be at least 32 characters.`);
    }
  }

  // Production: WARN only for soft-required secrets
  for (const item of softRequiredSecrets) {
    const val = process.env[item.name];
    if (!val || val.trim() === '') {
      logger.warn(
        `SECURITY WARNING: ${item.name} is not set in production. 2FA logins will fall back to ` +
        `JWT_ACCESS_SECRET. Add JWT_2FA_SECRET in Hostinger hPanel → Node.js → Environment Variables ` +
        `and restart the application to fully isolate 2FA challenge tokens.`,
      );
      // Fall back to access secret so 2FA challenges still work (less secure but functional)
      process.env.JWT_2FA_SECRET = process.env.JWT_ACCESS_SECRET;
      return; // Skip the distinctness check since we just set it to access secret
    }
    const valLower = val.toLowerCase();
    if (
      item.insecureDefaults.some((def) => valLower === def.toLowerCase()) ||
      valLower.includes('insecure')
    ) {
      logger.error(`FATAL: Insecure or default ${item.name} detected in production!`);
      throw new Error(`Production requires a secure, non-default ${item.name}.`);
    }
    if (val.length < 32) {
      logger.error(`FATAL: ${item.name} is too short — must be at least 32 characters in production.`);
      throw new Error(`Production requires ${item.name} to be at least 32 characters.`);
    }
  }

  // N-04: When JWT_2FA_SECRET IS set, it must be distinct from the other two.
  const accessSecret = process.env.JWT_ACCESS_SECRET ?? '';
  const refreshSecret = process.env.JWT_REFRESH_SECRET ?? '';
  const twoFaSecret = process.env.JWT_2FA_SECRET ?? '';
  if (twoFaSecret && (twoFaSecret === accessSecret || twoFaSecret === refreshSecret)) {
    logger.error('FATAL: JWT_2FA_SECRET must be different from JWT_ACCESS_SECRET and JWT_REFRESH_SECRET!');
    throw new Error('Production requires JWT_2FA_SECRET to be distinct from other JWT secrets.');
  }
}
