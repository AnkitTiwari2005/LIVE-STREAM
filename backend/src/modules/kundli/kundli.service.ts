import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { AstroApiError, AstroLogicsClient, AstroEnvelope } from './astrologics.client';
import { KundliBirthDto, KundliChartDto } from './dto/kundli.dto';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 300;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_GENERATE_PER_WINDOW = 10;
const MAX_CHART_PER_WINDOW = 30;
const MAX_SVG_BYTES = 400_000;

const str = (v: unknown, max = 80): string | undefined =>
  typeof v === 'string' && v.length > 0 ? v.slice(0, max) : undefined;
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

@Injectable()
export class KundliService {
  private readonly logger = new Logger(KundliService.name);
  private readonly cache = new Map<string, { exp: number; value: unknown }>();
  private readonly usage = new Map<string, number[]>();

  constructor(private readonly astro: AstroLogicsClient) {}

  isEnabled(): boolean {
    return this.astro.isEnabled();
  }

  // ---------------------------------------------------------------- public API

  async generate(userId: string, dto: KundliBirthDto) {
    this.enforceUserLimit(`g:${userId}`, MAX_GENERATE_PER_WINDOW);
    const { birth, options } = this.buildRequest(dto);

    const key = this.cacheKey('generate', { birth, options });
    const hit = this.cacheGet(key);
    if (hit) return { ...(hit as object), cached: true };

    const body = { birth, options };
    // 1) The kundli itself decides success: it also resolves (or rejects) the birth place.
    const kundli = await this.upstream('/v1/kundli', 'POST', body, 2);

    // 2) Extras are best-effort: if one is unavailable the devotee still gets the chart.
    const [avakhada, dasha] = await Promise.allSettled([
      this.upstream('/v1/kundli/birth-details', 'POST', body, 1),
      this.upstream('/v1/dasha/vimshottari/current', 'POST', { birth, options, at: new Date().toISOString() }, 2),
    ]);

    const result = {
      ...this.mapKundli(kundli),
      avakhada: avakhada.status === 'fulfilled' ? this.mapAvakhada(avakhada.value) : null,
      dasha: dasha.status === 'fulfilled' ? this.mapDasha(dasha.value) : null,
      unavailable: [
        ...(avakhada.status === 'rejected' ? ['avakhada'] : []),
        ...(dasha.status === 'rejected' ? ['dasha'] : []),
      ],
      cached: false,
    };
    if (result.unavailable.length === 0) this.cachePut(key, { ...result, cached: undefined });
    return result;
  }

  async chart(userId: string, dto: KundliChartDto): Promise<string> {
    this.enforceUserLimit(`c:${userId}`, MAX_CHART_PER_WINDOW);
    const { birth, options } = this.buildRequest(dto);
    const varga = dto.varga ?? 'D1';
    const style = dto.style ?? 'north';
    const theme = dto.theme ?? 'light';

    const key = this.cacheKey('chart', { birth, options, varga, style, theme });
    const hit = this.cacheGet(key);
    if (typeof hit === 'string') return hit;

    const svg = (await this.upstream(
      `/v1/charts/${varga}.svg`,
      'POST',
      { birth, options, style, theme },
      2,
      'svg',
    )) as unknown as string;

    const safe = this.assertSafeSvg(svg);
    this.cachePut(key, safe);
    return safe;
  }

  // ----------------------------------------------------------------- internals

  private buildRequest(dto: KundliBirthDto) {
    const date = dto.date;
    const parsed = new Date(`${date}T00:00:00Z`);
    const valid =
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === date && // rejects 2020-02-31 style dates
      date >= '1900-01-01' &&
      parsed.getTime() <= Date.now() + 24 * 3600 * 1000; // tomorrow allowed for timezone skew
    if (!valid) {
      throw new BadRequestException('Please enter a real date of birth between 1900 and today.');
    }

    const accuracy = dto.timeAccuracy ?? (dto.time ? 'exact' : 'unknown');
    if (accuracy !== 'unknown' && !dto.time) {
      throw new BadRequestException(
        'Birth time is required. If you do not know it, choose "I don\'t know my birth time".',
      );
    }

    const placeQuery = (dto.placeQuery || '').trim().replace(/\s+/g, ' ');
    if (!dto.placeId && placeQuery.length < 2) {
      throw new BadRequestException('Please enter your place of birth.');
    }

    const birth: Record<string, unknown> = {
      date,
      ...(accuracy !== 'unknown' ? { time: dto.time } : {}),
      time_accuracy: accuracy,
      place: dto.placeId ? { place_id: dto.placeId } : { query: placeQuery },
      timezone: 'auto',
    };
    const options = { ayanamsa: dto.ayanamsa ?? 'lahiri', lang: dto.lang ?? 'en' };
    return { birth, options };
  }

  private async upstream(
    path: string,
    method: 'GET' | 'POST',
    body: unknown,
    cost: number,
    expect: 'json' | 'svg' = 'json',
  ): Promise<AstroEnvelope> {
    try {
      return (await this.astro.request({ method, path, body, cost, expect })) as AstroEnvelope;
    } catch (err) {
      throw this.toHttp(err);
    }
  }

  /** Turn an upstream failure into a safe, friendly HTTP error. */
  private toHttp(err: unknown): HttpException {
    if (err instanceof HttpException) return err;
    if (!(err instanceof AstroApiError)) {
      this.logger.error(`Unexpected Kundli error: ${(err as any)?.message}`);
      return new ServiceUnavailableException({ message: 'Kundli is temporarily unavailable.', code: 'unavailable' });
    }
    switch (err.code) {
      case 'place_ambiguous':
        return new UnprocessableEntityException({
          message: 'More than one place matches. Please choose your birth place from the list.',
          code: 'place_ambiguous',
          candidates: (err.extra.candidates ?? []).slice(0, 10).map((c: any) => ({
            placeId: str(c?.place_id, 100),
            name: str(c?.name, 120),
            state: str(c?.state, 80),
            country: str(c?.country, 80),
          })).filter((c) => c.placeId && c.name),
        });
      case 'place_not_found':
        return new UnprocessableEntityException({
          message: 'We could not find that place. Try adding the district, state or country.',
          code: 'place_not_found',
        });
      case 'time_required':
        return new UnprocessableEntityException({
          message: 'This needs a birth time. Please enter it, or try the approximate time.',
          code: 'time_required',
        });
      case 'invalid_parameter':
      case 'unsupported_date_range':
        return new BadRequestException({ message: 'Please check the birth details you entered.', code: 'invalid_details' });
      case 'busy':
      case 'rate_limited':
        return new ServiceUnavailableException({
          message: 'Many devotees are generating kundlis right now. Please try again in a few seconds.',
          code: 'busy',
        });
      default:
        // Missing/invalid key, exhausted quota, daily ceiling, upstream outage: ops problem, not the user's.
        this.logger.error(`AstroLogics call failed: ${this.astro.describe(err)}`);
        return new ServiceUnavailableException({
          message: 'Kundli is temporarily unavailable. Please try again later.',
          code: 'unavailable',
        });
    }
  }

  // ------------------------------------------------------------------- mapping
  // Only whitelisted, type-checked fields leave the server.

  private mapKundli(env: AstroEnvelope) {
    const d = env.data ?? {};
    const lagna = d.lagna
      ? {
          sign: str(d.lagna.sign),
          signLabel: str(d.lagna.sign_label),
          degree: num(d.lagna.degree),
          nakshatra: str(d.lagna.nakshatra),
          nakshatraLabel: str(d.lagna.nakshatra_label),
          pada: num(d.lagna.pada),
        }
      : null;
    const planets = (Array.isArray(d.planets) ? d.planets : []).slice(0, 12).map((p: any) => ({
      id: str(p?.id, 24),
      label: str(p?.label, 40),
      sign: str(p?.sign, 24),
      degree: num(p?.degree_in_sign),
      nakshatra: str(p?.nakshatra, 40),
      pada: num(p?.pada),
      nakshatraLord: str(p?.nakshatra_lord, 24),
      house: num(p?.house),
      retrograde: p?.retrograde === true,
    }));
    const dl = d.divisional_lagnas && typeof d.divisional_lagnas === 'object' ? d.divisional_lagnas : {};
    const divisionalLagnas: Record<string, string> = {};
    for (const k of Object.keys(dl).slice(0, 20)) {
      const v = str(dl[k], 24);
      if (v && /^D\d{1,2}$/.test(k)) divisionalLagnas[k] = v;
    }
    const moon = planets.find((p: any) => p.id === 'moon');
    return {
      lagna,
      planets,
      divisionalLagnas,
      moon: moon ? { sign: moon.sign, nakshatra: moon.nakshatra, pada: moon.pada } : null,
      meta: {
        ayanamsa: str(env.meta?.ayanamsa, 24),
        timezone: str(env.meta?.timezone_used?.name, 60),
        utcOffset: str(env.meta?.timezone_used?.utc_offset, 12),
      },
      warnings: (env.warnings ?? []).slice(0, 10).map((w: any) => str(typeof w === 'string' ? w : w?.message, 200)).filter(Boolean),
    };
  }

  private mapAvakhada(env: AstroEnvelope) {
    const d = env.data ?? {};
    const out: Record<string, string> = {};
    for (const k of ['varna', 'vashya', 'yoni', 'gana', 'nadi', 'nakshatra']) {
      const v = str(d[k], 60);
      if (v) out[k] = v;
    }
    return Object.keys(out).length ? out : null;
  }

  private mapDasha(env: AstroEnvelope) {
    const d = env.data ?? {};
    const level = (x: any) =>
      x && typeof x === 'object' ? { planet: str(x.planet, 24), start: str(x.start, 40), end: str(x.end, 40) } : null;
    const mahadasha = level(d.mahadasha);
    if (!mahadasha) return null;
    return {
      at: str(d.at, 40),
      mahadasha,
      antardasha: level(d.antardasha),
      pratyantardasha: level(d.pratyantardasha),
    };
  }

  /**
   * The SVG is drawn by a third party and shown in the browser, so refuse anything that could run
   * code. (The page also shows it through <img>, where scripts never run; this is the second lock.)
   */
  private assertSafeSvg(svg: unknown): string {
    if (typeof svg !== 'string' || Buffer.byteLength(svg) > MAX_SVG_BYTES) {
      throw new ServiceUnavailableException({ message: 'Chart is temporarily unavailable.', code: 'unavailable' });
    }
    const body = svg.trim();
    const looksSvg = /^(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(body);
    const dangerous = /<script|<foreignObject|<iframe|<object|<embed|\son[a-z]+\s*=|javascript:|data:text\/html|<!ENTITY/i.test(body);
    if (!looksSvg || dangerous) {
      this.logger.error('Rejected an unsafe or malformed chart SVG from the upstream API');
      throw new ServiceUnavailableException({ message: 'Chart is temporarily unavailable.', code: 'unavailable' });
    }
    return body;
  }

  // ------------------------------------------------------- cache & per-user limit

  private cacheKey(kind: string, payload: unknown): string {
    return `${kind}:${crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;
  }

  private cacheGet(key: string): unknown | undefined {
    const e = this.cache.get(key);
    if (!e) return undefined;
    if (e.exp < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    return e.value;
  }

  private cachePut(key: string, value: unknown) {
    if (this.cache.size >= CACHE_MAX_ENTRIES) {
      // Drop expired first, then the oldest entry (Map keeps insertion order).
      const now = Date.now();
      for (const [k, v] of this.cache) if (v.exp < now) this.cache.delete(k);
      if (this.cache.size >= CACHE_MAX_ENTRIES) this.cache.delete(this.cache.keys().next().value as string);
    }
    this.cache.set(key, { exp: Date.now() + CACHE_TTL_MS, value });
  }

  private enforceUserLimit(bucket: string, max: number) {
    const now = Date.now();
    const recent = (this.usage.get(bucket) ?? []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= max) {
      throw new HttpException(
        { message: 'You have generated many kundlis in a short time. Please wait a few minutes and try again.', code: 'user_limit' },
        429,
      );
    }
    recent.push(now);
    this.usage.set(bucket, recent);
    if (this.usage.size > 5000) {
      for (const [k, v] of this.usage) if (!v.some((t) => now - t < WINDOW_MS)) this.usage.delete(k);
    }
  }
}
