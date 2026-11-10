import { Logger } from '@nestjs/common';
import { createHmac } from 'crypto';

const PLACEHOLDER_SUBSTRINGS = [
  'replace_with',
  'replace-with',
  'change_me',
  'changeme',
  'generate_with',
  'insecure',
  'placeholder',
  'platform-domain.com',
  'example.com',
];

export function isPlaceholderValue(val: string): boolean {
  const lower = val.trim().toLowerCase();
  if (!lower) return true;
  if (lower.startsWith('your_') || lower.startsWith('your-')) return true;
  return PLACEHOLDER_SUBSTRINGS.some((marker) => lower.includes(marker));
}

export function deriveTwoFactorSecret(accessSecret: string): string {
  return createHmac('sha256', accessSecret)
    .update('shubhdarshan:2fa-challenge:v1')
    .digest('hex');
}

export function resolveTwoFactorSecret(): string {
  const configured = process.env.JWT_2FA_SECRET?.trim();
  if (configured) return configured;
  const access = process.env.JWT_ACCESS_SECRET?.trim() || 'jwt_default_insecure_access_secret_key';
  return deriveTwoFactorSecret(access);
}

/**
 * Validates critical environment variables and secrets at application boot time (B-08, N-11).
 * Ensures secure production credentials and fails fast against insecure defaults.
 * R-01: Removed all hardcoded credential fallbacks — the app now refuses to start
 * if LiveKit keys or JWT secrets are missing or still set to known-insecure values.
 * N-04 / ENV:
 * - JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be distinct in production.
 * - FRONTEND_ORIGIN is required in production, restricted to a valid https:// origin
 *   with no path, query, fragment, or placeholder domain, and normalized to origin.
 * - If JWT_2FA_SECRET is omitted in production, derive an independent HMAC-SHA256 key
 *   from JWT_ACCESS_SECRET instead of aliasing JWT_ACCESS_SECRET directly.
 * - Untouched .env.example placeholders (replace_with_*, your_*, change_me) are rejected.
 */
export function validateProductionSecrets(context: string = 'Bootstrap'): void {
  const logger = new Logger(context);

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
      insecureDefaults: ['pooja', 'devkey', 'CHANGE_ME', 'API2RCSWowptwZY'],
    },
    {
      name: 'LIVEKIT_API_SECRET',
      insecureDefaults: ['secret', 'secretkey', 'CHANGE_ME', 'rXe7jPbWbNoolgrDdPlLYNTvBQ9XeoYeqtiKqxtP5e7B'],
    },
  ];

  const softRequiredSecrets = [
    {
      name: 'JWT_2FA_SECRET',
      insecureDefaults: ['jwt_default_insecure_2fa_secret_key', 'secret', 'default', 'pooja'],
    },
  ];

  if (process.env.NODE_ENV !== 'production') {
    for (const item of [...hardRequiredSecrets, ...softRequiredSecrets]) {
      const val = process.env[item.name];
      if (!val || val.trim() === '') {
        logger.warn(`[DEV] Missing env var ${item.name} — set it in .env or the app may malfunction.`);
      }
    }
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (accessSecret && refreshSecret && accessSecret === refreshSecret) {
      logger.warn('[DEV] JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are identical — they must differ in production.');
    }
    const twoFaSecret = process.env.JWT_2FA_SECRET;
    if (twoFaSecret && accessSecret && twoFaSecret === accessSecret) {
      logger.warn('[DEV] JWT_2FA_SECRET is the same as JWT_ACCESS_SECRET — these must be distinct in production.');
    }
    if (!process.env.FRONTEND_ORIGIN) {
      logger.warn('[DEV] Missing FRONTEND_ORIGIN — defaults to http://localhost:3000 in local development.');
    }
    return;
  }

  // Production: hard fail on missing, placeholder, or insecure REQUIRED secrets
  for (const item of hardRequiredSecrets) {
    const val = process.env[item.name]?.trim();
    if (!val) {
      logger.error(`FATAL: Missing required production secret ${item.name}!`);
      throw new Error(`Production requires ${item.name} to be set and non-empty.`);
    }
    const valLower = val.toLowerCase();
    if (
      item.insecureDefaults.some((def) => valLower === def.toLowerCase()) ||
      isPlaceholderValue(val)
    ) {
      logger.error(`FATAL: Insecure or placeholder ${item.name} detected in production!`);
      throw new Error(`Production requires a secure, non-placeholder ${item.name}.`);
    }
    if (item.name.startsWith('JWT_') && val.length < 32) {
      logger.error(`FATAL: ${item.name} is too short — must be at least 32 characters in production.`);
      throw new Error(`Production requires ${item.name} to be at least 32 characters.`);
    }
  }

  // Distinct access and refresh secrets prevent a refresh token from being used as a 30-day access token
  const accessSecret = process.env.JWT_ACCESS_SECRET!.trim();
  const refreshSecret = process.env.JWT_REFRESH_SECRET!.trim();
  if (accessSecret === refreshSecret) {
    logger.error('FATAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be distinct in production!');
    throw new Error('Production requires distinct JWT_ACCESS_SECRET and JWT_REFRESH_SECRET.');
  }

  // Validate FRONTEND_ORIGIN (https only, origin only, no placeholder/local host)
  const rawOrigin = process.env.FRONTEND_ORIGIN?.trim();
  if (!rawOrigin) {
    logger.error('FATAL: Missing required production FRONTEND_ORIGIN!');
    throw new Error('Production requires FRONTEND_ORIGIN to be set to an https:// origin.');
  }

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(rawOrigin);
  } catch {
    logger.error(`FATAL: Invalid FRONTEND_ORIGIN URL: ${rawOrigin}`);
    throw new Error('Production FRONTEND_ORIGIN must be a valid https:// URL.');
  }

  const hostLower = parsedOrigin.hostname.toLowerCase();
  if (
    parsedOrigin.protocol !== 'https:' ||
    (parsedOrigin.pathname !== '/' && parsedOrigin.pathname !== '') ||
    parsedOrigin.search !== '' ||
    parsedOrigin.hash !== '' ||
    parsedOrigin.username !== '' ||
    parsedOrigin.password !== ''
  ) {
    logger.error(`FATAL: FRONTEND_ORIGIN must be an https:// origin with no path, query, or hash: ${rawOrigin}`);
    throw new Error('Production FRONTEND_ORIGIN must be an https:// origin with no path.');
  }

  if (
    hostLower === 'localhost' ||
    hostLower === '127.0.0.1' ||
    hostLower === '0.0.0.0' ||
    hostLower === '::1' ||
    isPlaceholderValue(rawOrigin)
  ) {
    logger.error(`FATAL: Placeholder or loopback FRONTEND_ORIGIN rejected in production: ${parsedOrigin.origin}`);
    throw new Error(`Production requires a public non-placeholder FRONTEND_ORIGIN.`);
  }

  process.env.FRONTEND_ORIGIN = parsedOrigin.origin;

  // Validate ENCRYPTION_MASTER_KEY if present or reject missing/placeholder in production
  const encKey = process.env.ENCRYPTION_MASTER_KEY?.trim();
  if (!encKey || isPlaceholderValue(encKey) || encKey.toLowerCase().includes('default_insecure')) {
    logger.error('FATAL: Missing or placeholder ENCRYPTION_MASTER_KEY in production!');
    throw new Error('Production requires a valid non-placeholder ENCRYPTION_MASTER_KEY.');
  }

  // Production JWT_2FA_SECRET: derive independent HMAC key if unset; otherwise validate & check distinctness
  const twoFaItem = softRequiredSecrets[0];
  const configuredTwoFa = process.env.JWT_2FA_SECRET?.trim();
  if (!configuredTwoFa) {
    logger.warn(
      'SECURITY WARNING: JWT_2FA_SECRET is not set in production. Deriving an independent 2FA challenge key ' +
      'via HMAC-SHA256(JWT_ACCESS_SECRET) instead of aliasing JWT_ACCESS_SECRET. Set a dedicated JWT_2FA_SECRET ' +
      'in environment variables for independent key rotation.',
    );
    process.env.JWT_2FA_SECRET = deriveTwoFactorSecret(accessSecret);
    return;
  }

  const twoFaLower = configuredTwoFa.toLowerCase();
  if (
    twoFaItem.insecureDefaults.some((def) => twoFaLower === def.toLowerCase()) ||
    isPlaceholderValue(configuredTwoFa)
  ) {
    logger.error('FATAL: Insecure or placeholder JWT_2FA_SECRET detected in production!');
    throw new Error('Production requires a secure, non-placeholder JWT_2FA_SECRET.');
  }
  if (configuredTwoFa.length < 32) {
    logger.error('FATAL: JWT_2FA_SECRET is too short — must be at least 32 characters in production.');
    throw new Error('Production requires JWT_2FA_SECRET to be at least 32 characters.');
  }
  if (configuredTwoFa === accessSecret || configuredTwoFa === refreshSecret) {
    logger.error('FATAL: JWT_2FA_SECRET must be different from JWT_ACCESS_SECRET and JWT_REFRESH_SECRET!');
    throw new Error('Production requires JWT_2FA_SECRET to be distinct from other JWT secrets.');
  }
}
