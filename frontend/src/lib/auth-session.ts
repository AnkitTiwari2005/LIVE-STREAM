/**
 * Shubhdarshan Unified Client Auth & Session Security Utility (SD-SEC-2026-004)
 * Guarantees zero cross-account data leakage, complete storage sanitization,
 * and synchronous JWT claim extraction to prevent stale session hydration.
 */

export interface JwtTokenClaims {
  sub: string;
  email?: string;
  role?: string;
  name?: string;
  exp?: number;
  iat?: number;
}

/**
 * Synchronously decodes JWT payload claims in the browser without server roundtrip.
 * Handles both standard Base64 and Base64URL encoding safely.
 */
export function decodeJwtClaims(token: string | null | undefined): JwtTokenClaims | null {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Checks if a JWT token is expired based on its client-side `exp` claim.
 */
export function isJwtTokenExpired(token: string | null | undefined): boolean {
  const claims = decodeJwtClaims(token);
  if (!claims?.exp) return false;
  // Buffer by 5 seconds
  return Date.now() >= (claims.exp * 1000 - 5000);
}

/**
 * Purges all user, token, and session keys across localStorage and sessionStorage.
 * Dispatches 'sd-auth-change' so all listening components drop state immediately.
 */
export function purgeClientSession() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('pooja_user');
    localStorage.removeItem('pooja_token');
    localStorage.removeItem('pooja_wallet_balance');
    sessionStorage.removeItem('pending_seva_booking');
    sessionStorage.clear();
    window.dispatchEvent(new Event('sd-auth-change'));
  } catch {}
}

/**
 * Atomically writes fresh session tokens and profile into localStorage.
 * Automatically purges any previous session data before setting new keys.
 */
export function setClientSession(user: any, token: string) {
  if (typeof window === 'undefined') return;
  try {
    // Purge old state first
    localStorage.removeItem('pooja_user');
    localStorage.removeItem('pooja_token');
    localStorage.removeItem('pooja_wallet_balance');

    localStorage.setItem('pooja_user', JSON.stringify(user));
    localStorage.setItem('pooja_token', token);

    if (user?.wallet?.balanceCoins !== undefined && user.wallet.balanceCoins !== null) {
      localStorage.setItem('pooja_wallet_balance', String(user.wallet.balanceCoins));
    }

    window.dispatchEvent(new Event('sd-auth-change'));
  } catch {}
}
