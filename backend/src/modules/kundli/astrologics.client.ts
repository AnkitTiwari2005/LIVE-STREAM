import { Injectable, Logger } from '@nestjs/common';
import { isDevMode } from '../../common/runtime-mode';

/** Error from the AstroLogics API (or from the guard rails around it). Never shown to users as-is. */
export class AstroApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly extra: { candidates?: any[]; retryAfterSec?: number; requestId?: string; param?: string } = {},
  ) {
    super(message);
  }
}

export interface AstroEnvelope {
  data: any;
  meta: any;
  warnings: any[];
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const intEnv = (name: string, fallback: number, min: number, max: number): number => {
  const n = parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/**
 * The only place that talks to https://api.astrologics.in.
 *
 * - The secret key lives in ASTROLOGICS_API_KEY on the server and never reaches the browser.
 * - Stays inside the plan's limits (default = free plan: 2 requests/second, 2 in flight) with a
 *   small queue, so a burst of devotees waits a moment instead of getting 429s.
 * - Optional daily credit ceiling (KUNDLI_DAILY_CREDIT_CAP, 0 = off) so one busy day cannot burn
 *   the whole monthly allowance.
 * - Hard timeout on every call; birth data and the key are never logged.
 */
@Injectable()
export class AstroLogicsClient {
  private readonly logger = new Logger(AstroLogicsClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly maxConcurrent = intEnv('ASTROLOGICS_MAX_CONCURRENCY', 2, 1, 50);
  private readonly minIntervalMs = Math.ceil(1000 / intEnv('ASTROLOGICS_MAX_RPS', 2, 1, 100));
  private readonly timeoutMs = intEnv('ASTROLOGICS_TIMEOUT_MS', 12000, 2000, 60000);
  private readonly maxQueue = intEnv('ASTROLOGICS_MAX_QUEUE', 20, 1, 500);
  private readonly dailyCap = intEnv('KUNDLI_DAILY_CREDIT_CAP', 100, 0, 10_000_000);

  private active = 0;
  private nextStart = 0;
  private readonly waiters: Array<() => void> = [];
  private creditDay = '';
  private creditsUsed = 0;

  constructor() {
    this.apiKey = (process.env.ASTROLOGICS_API_KEY || '').trim();
    const base = (process.env.ASTROLOGICS_BASE_URL || 'https://api.astrologics.in').trim().replace(/\/+$/, '');
    // The bearer key must never travel over plain HTTP outside local development.
    this.baseUrl = /^https:\/\//i.test(base) || (isDevMode() && /^http:\/\/(localhost|127\.0\.0\.1)/i.test(base))
      ? base
      : 'https://api.astrologics.in';
  }

  isEnabled(): boolean {
    return this.apiKey.length >= 10 && !/replace|your_/i.test(this.apiKey);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private reserveCredits(cost: number) {
    const day = this.today();
    if (day !== this.creditDay) {
      this.creditDay = day;
      this.creditsUsed = 0;
    }
    if (this.dailyCap > 0 && this.creditsUsed + cost > this.dailyCap) {
      throw new AstroApiError(503, 'daily_cap', 'Daily Kundli credit ceiling reached');
    }
    this.creditsUsed += cost;
  }

  private refundCredits(cost: number) {
    this.creditsUsed = Math.max(0, this.creditsUsed - cost);
  }

  private async acquire(): Promise<void> {
    if (this.active >= this.maxConcurrent) {
      if (this.waiters.length >= this.maxQueue) {
        throw new AstroApiError(503, 'busy', 'Kundli service queue is full');
      }
      // The releasing call hands its slot over, so `active` stays correct.
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    } else {
      this.active++;
    }
    const start = Math.max(Date.now(), this.nextStart);
    this.nextStart = start + this.minIntervalMs;
    const wait = start - Date.now();
    if (wait > 0) await sleep(wait);
  }

  private release() {
    const next = this.waiters.shift();
    if (next) next();
    else this.active = Math.max(0, this.active - 1);
  }

  /** One upstream request, with limiter, credit accounting, timeout and a single 429 retry. */
  async request(opts: {
    method: 'GET' | 'POST';
    path: string;
    body?: unknown;
    cost: number;
    expect: 'json' | 'svg';
  }): Promise<AstroEnvelope | string> {
    if (!this.isEnabled()) {
      throw new AstroApiError(503, 'not_configured', 'ASTROLOGICS_API_KEY is not set');
    }
    this.reserveCredits(opts.cost);
    let succeeded = false;
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        await this.acquire();
        let res: Response;
        try {
          res = await fetch(`${this.baseUrl}${opts.path}`, {
            method: opts.method,
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              Accept: opts.expect === 'svg' ? 'image/svg+xml' : 'application/json',
              ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            },
            body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
            signal: AbortSignal.timeout(this.timeoutMs),
          });
        } catch (err: any) {
          this.release();
          throw new AstroApiError(502, 'upstream_unreachable', `Upstream unreachable: ${err?.name || 'error'}`);
        }
        this.release();

        if (res.ok) {
          succeeded = true;
          if (opts.expect === 'svg') return await res.text();
          const json: any = await res.json().catch(() => null);
          if (!json || typeof json !== 'object' || !('data' in json)) {
            throw new AstroApiError(502, 'bad_response', 'Unexpected upstream response');
          }
          return { data: json.data, meta: json.meta ?? {}, warnings: Array.isArray(json.warnings) ? json.warnings : [] };
        }

        const errBody: any = await res.json().catch(() => ({}));
        const e = errBody?.error ?? {};
        const code = String(e.code || 'upstream_error');
        const retryAfter = Math.min(3, Math.max(1, Number(res.headers.get('retry-after')) || 1));
        if (res.status === 429 && code === 'rate_limited' && attempt === 0) {
          await sleep(retryAfter * 1000);
          continue;
        }
        throw new AstroApiError(res.status, code, String(e.message || 'Upstream error').slice(0, 200), {
          candidates: Array.isArray(e.candidates) ? e.candidates : undefined,
          requestId: typeof e.request_id === 'string' ? e.request_id : undefined,
          param: typeof e.param === 'string' ? e.param : undefined,
          retryAfterSec: retryAfter,
        });
      }
      throw new AstroApiError(503, 'busy', 'Upstream rate limit');
    } finally {
      // Errors are never charged upstream, so hand the reserved credits back.
      if (!succeeded) this.refundCredits(opts.cost);
    }
  }

  /** For logs only: never contains birth data. */
  describe(err: AstroApiError): string {
    return `${err.status} ${err.code}${err.extra.requestId ? ` (${err.extra.requestId})` : ''}`;
  }
}
