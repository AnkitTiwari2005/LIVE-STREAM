/**
 * Compares JWT numeric `iat` (whole seconds) against `passwordChangedAt` in whole seconds.
 * Avoids millisecond-vs-second false rejections when logins/rotations happen in the same second,
 * while invalidating any token minted prior to a password change or global sign-out.
 */
export function isTokenIssuedBeforePasswordChange(
  tokenIatSeconds: number | undefined | null,
  passwordChangedAt: Date | null | undefined,
): boolean {
  if (!passwordChangedAt || typeof tokenIatSeconds !== 'number') {
    return false;
  }
  return Math.floor(tokenIatSeconds) < Math.floor(passwordChangedAt.getTime() / 1000);
}
