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
