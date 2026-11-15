/** Display helpers for the Kundli page. Pure functions, no side effects. */

export const SIGN_SANSKRIT: Record<string, string> = {
  aries: 'Mesha',
  taurus: 'Vrishabha',
  gemini: 'Mithuna',
  cancer: 'Karka',
  leo: 'Simha',
  virgo: 'Kanya',
  libra: 'Tula',
  scorpio: 'Vrishchika',
  sagittarius: 'Dhanu',
  capricorn: 'Makara',
  aquarius: 'Kumbha',
  pisces: 'Meena',
};

export const SIGN_HINDI: Record<string, string> = {
  aries: 'मेष',
  taurus: 'वृषभ',
  gemini: 'मिथुन',
  cancer: 'कर्क',
  leo: 'सिंह',
  virgo: 'कन्या',
  libra: 'तुला',
  scorpio: 'वृश्चिक',
  sagittarius: 'धनु',
  capricorn: 'मकर',
  aquarius: 'कुंभ',
  pisces: 'मीन',
};

/** "purva_phalguni" -> "Purva Phalguni" */
export function pretty(slug?: string | null): string {
  if (!slug) return '-';
  return slug
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** "cancer" -> "Cancer (Karka)" or, in Hindi mode, "कर्क (Cancer)" */
export function signName(sign?: string | null, hindi = false): string {
  if (!sign) return '-';
  const key = sign.toLowerCase();
  if (hindi && SIGN_HINDI[key]) return `${SIGN_HINDI[key]} (${pretty(sign)})`;
  return SIGN_SANSKRIT[key] ? `${pretty(sign)} (${SIGN_SANSKRIT[key]})` : pretty(sign);
}

/** 26.3139 -> 26°18′ */
export function formatDegree(deg?: number | null): string {
  if (typeof deg !== 'number' || !Number.isFinite(deg)) return '-';
  const d = Math.floor(deg);
  const m = Math.floor((deg - d) * 60);
  return `${d}°${String(m).padStart(2, '0')}′`;
}

/** ISO date-time -> "21 Jun 2026" (date only, in the viewer's locale, stable across time zones). */
export function formatDate(iso?: string | null): string {
  if (!iso) return '-';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '-';
  return new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Today as YYYY-MM-DD in the viewer's own calendar (for the date input's max). */
export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
