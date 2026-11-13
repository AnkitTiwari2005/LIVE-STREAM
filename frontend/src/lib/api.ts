/**
 * Shubhdarshan Standard Unified API fetch helper (B-18)
 * Verifies res.ok and extracts backend error messages instead of silently continuing
 */
export async function apiFetch<T = any>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
  const url = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

  const headers = new Headers(init?.headers || {});
  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (typeof window !== 'undefined' && !headers.has('Authorization')) {
    const token = localStorage.getItem('pooja_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const res = await fetch(url, {
    cache: init?.cache || 'no-store',
    ...init,
    headers,
  });

  const contentType = res.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const body = isJson ? await res.json().catch(() => ({})) : await res.text();

  if (!res.ok) {
    const message =
      (typeof body === 'object' && body !== null && (body.message || body.error)) ||
      `Request failed with status ${res.status}`;
    const err: any = new Error(Array.isArray(message) ? message.join(', ') : message);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body as T;
}

/**
 * Validates and normalizes internal redirect paths to prevent open redirect vulnerabilities (N-03, B-21)
 */
export function getSafeRedirect(redirectUrl: string | null | undefined): string | null {
  if (!redirectUrl) return null;
  // Must start with single slash, not double slash (//evil.com)
  if (!/^\/(?!\/)/.test(redirectUrl)) return null;
  if (typeof window === 'undefined') return redirectUrl;
  try {
    const parsed = new URL(redirectUrl, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return null;
  }
}
