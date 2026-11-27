import type { Lang } from './context';

/** Formats a date/timestamp cleanly in Indian English or Hindi locale. */
export function formatLocaleDateTime(
  value: string | number | Date | null | undefined,
  lang: Lang,
  fallbackEn = 'Date not recorded',
  fallbackHi = 'तिथि दर्ज नहीं',
): string {
  if (!value) return lang === 'hi' ? fallbackHi : fallbackEn;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return lang === 'hi' ? fallbackHi : fallbackEn;
  try {
    return d.toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return d.toLocaleString();
  }
}

/** Formats a date without time in Indian English or Hindi locale. */
export function formatLocaleDate(
  value: string | number | Date | null | undefined,
  lang: Lang,
  fallbackEn = 'Not scheduled',
  fallbackHi = 'निर्धारित नहीं',
): string {
  if (!value) return lang === 'hi' ? fallbackHi : fallbackEn;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  try {
    return d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return d.toLocaleDateString();
  }
}

export function formatCoins(amount: number, lang: Lang): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  const numStr = safe.toLocaleString('en-IN');
  if (lang === 'hi') return `${numStr} कॉइन`;
  return `${numStr} ${safe === 1 ? 'Coin' : 'Coins'}`;
}

export function formatSignedCoins(amount: number, isCredit: boolean, lang: Lang): string {
  const safe = Number.isFinite(amount) ? Math.abs(Math.round(amount)) : 0;
  const numStr = safe.toLocaleString('en-IN');
  const sign = isCredit ? '+' : '-';
  return lang === 'hi' ? `${sign}${numStr} कॉइन` : `${sign}${numStr} Coins`;
}

export function formatMins(mins: number, lang: Lang): string {
  const safe = Number.isFinite(mins) ? Math.max(0, Math.round(mins)) : 0;
  if (lang === 'hi') return `${safe} मिनट`;
  return `${safe} ${safe === 1 ? 'min' : 'mins'}`;
}

const STREAM_CATEGORY_HI: Record<string, string> = {
  ALL: 'सभी अनुष्ठान',
  'All': 'सभी',
  'All Scheduled Broadcasts': 'सभी निर्धारित प्रसारण',
  Pooja: 'पूजा',
  Aarti: 'आरती',
  'Aarti & Darshan': 'आरती एवं दर्शन',
  Astrology: 'ज्योतिष',
  'Astrology & Kundli': 'ज्योतिष एवं कुंडली',
  Katha: 'कथा',
  'Katha & Path': 'कथा एवं पाठ',
  Discourse: 'प्रवचन',
  'Vedic Ritual': 'वैदिक अनुष्ठान',
  'Vedic Pooja': 'वैदिक पूजा',
  'Vedic Chanting': 'वैदिक मंत्रोच्चार',
  'Vedic Kathas': 'वैदिक कथाएँ',
  Rudrabhishek: 'रुद्राभिषेक',
  'Shiva & Rudra': 'शिव एवं रुद्र',
  'Havans & Yagyas': 'हवन एवं यज्ञ',
  'Samskaras & Family': 'संस्कार एवं परिवार',
  'Dosha Remedies': 'दोष निवारण',
  'Vastu & Hawan': 'वास्तु एवं हवन',
  Karmakand: 'कर्मकांड',
  'Kirtan & Bhajan': 'कीर्तन एवं भजन',
  'Devi Pooja': 'देवी पूजा',
  'Pooja & Hawan': 'पूजा एवं हवन',
};

export function translateCategoryLabel(category: string | null | undefined, lang: Lang): string {
  if (!category) return lang === 'hi' ? 'वैदिक अनुष्ठान' : 'Vedic Ritual';
  if (lang !== 'hi') return category === 'ALL' ? 'All Sacred Rituals' : category;
  return STREAM_CATEGORY_HI[category] || category;
}

const EXPERIENCE_RE = /^(\d+)\s+Years?\s+Seva$/i;
export function formatExperienceLabel(exp: string, lang: Lang): string {
  if (lang !== 'hi') return exp;
  const m = EXPERIENCE_RE.exec(exp.trim());
  if (m) return `${m[1]} वर्ष सेवा`;
  return exp;
}
