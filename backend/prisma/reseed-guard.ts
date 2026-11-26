/**
 * Safety gate for prisma/reseed-accounts.ts, which DELETES every non-admin user together with their
 * wallets, wallet transactions, top-up orders, streams and chat, then creates KYC-approved streamer
 * accounts on @shubhdarshan.com addresses. Run against production it destroys the financial ledger.
 *
 * Returns the password to seed with, or throws before any database call is made.
 */
export function assertSafeToReseed(env: NodeJS.ProcessEnv = process.env): string {
  if (env.CONFIRM_DESTRUCTIVE_RESEED !== 'DELETE_ALL_NON_ADMIN_USERS') {
    throw new Error(
      'Refusing to reseed: this deletes ALL non-admin users, wallets and transactions. ' +
        'Re-run with CONFIRM_DESTRUCTIVE_RESEED=DELETE_ALL_NON_ADMIN_USERS if that is what you want.',
    );
  }
  if (env.NODE_ENV === 'production' && env.ALLOW_PRODUCTION_RESEED !== 'YES_I_AM_SURE') {
    throw new Error(
      'Refusing to reseed with NODE_ENV=production. Set ALLOW_PRODUCTION_RESEED=YES_I_AM_SURE only on a ' +
        'database you have backed up and intend to wipe.',
    );
  }
  const password = env.RESEED_PASSWORD ?? '';
  if (password.length < 12 || password === 'Shubh@2026') {
    throw new Error('Set RESEED_PASSWORD (at least 12 characters, not the old committed default) for the seeded accounts.');
  }
  return password;
}

const BANNED_SEED_PASSWORDS = new Set([
  'SanatanDharma@2026',
  'Shubh@2026',
  'Password123!',
  'changeme',
]);

/**
 * Safety gate for prisma/seed-verified-pandits.ts so it never runs silently against
 * production, never uses a committed default password, and requires explicit operator opt-in.
 */
export function assertSafeToSeedPandits(env: NodeJS.ProcessEnv = process.env): string {
  if (env.CONFIRM_PANDIT_SEED !== 'SEED_VERIFIED_PANDITS') {
    throw new Error(
      'Refusing to run pandit seed: set CONFIRM_PANDIT_SEED=SEED_VERIFIED_PANDITS to opt in explicitly.',
    );
  }
  if (env.NODE_ENV === 'production' && env.ALLOW_PRODUCTION_PANDIT_SEED !== 'YES_I_AM_SURE') {
    throw new Error(
      'Refusing to seed pandits with NODE_ENV=production. Set ALLOW_PRODUCTION_PANDIT_SEED=YES_I_AM_SURE only if intentional.',
    );
  }
  const password = env.SEED_PANDIT_PASSWORD ?? '';
  if (password.length < 12 || BANNED_SEED_PASSWORDS.has(password)) {
    throw new Error(
      'Set SEED_PANDIT_PASSWORD (at least 12 characters, not a committed default) for the seeded accounts.',
    );
  }
  return password;
}
