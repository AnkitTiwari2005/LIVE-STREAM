/**
 * Kundli / Matching language layer: one source of truth for the page AND the PDF.
 * Everything that comes back from the calculation engine as a code (sign, planet, nakshatra, koota, ...)
 * is shown through these tables, so the result is fully Hindi when Hindi is selected.
 * Digits stay Latin on purpose (usual for Indian web and print).
 */
export type Lang = 'en' | 'hi';

const squash = (s?: string | null) => (s || '').toLowerCase().replace(/[^a-z]/g, '');
export const prettySlug = (slug?: string | null): string =>
  slug
    ? slug
        .split('_')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : '-';

/* ----------------------------- signs ----------------------------- */
export const SIGN_ORDER = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
] as const;
export type SignSlug = (typeof SIGN_ORDER)[number];

const SIGN_SANSKRIT = ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'];
const SIGN_HI = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुंभ', 'मीन'];
const SIGN_EN_SHORT = ['Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir', 'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis'];

export function signIndex(sign?: string | null): number {
  const k = squash(sign);
  return SIGN_ORDER.findIndex((s) => s === k);
}

/** English: "Leo (Simha)"  Hindi: "सिंह" */
export function signLabel(sign: string | null | undefined, lang: Lang): string {
  if (!sign) return '-';
  const i = signIndex(sign);
  if (i < 0) return prettySlug(sign);
  return lang === 'hi' ? SIGN_HI[i] : `${prettySlug(SIGN_ORDER[i])} (${SIGN_SANSKRIT[i]})`;
}
export function signShort(i: number, lang: Lang): string {
  return lang === 'hi' ? SIGN_HI[i] : SIGN_EN_SHORT[i];
}

/* ----------------------------- planets ----------------------------- */
const PLANETS: Record<string, { en: string; hi: string; abbrEn: string; abbrHi: string }> = {
  sun: { en: 'Sun', hi: 'सूर्य', abbrEn: 'Su', abbrHi: 'सू' },
  moon: { en: 'Moon', hi: 'चंद्र', abbrEn: 'Mo', abbrHi: 'चं' },
  mars: { en: 'Mars', hi: 'मंगल', abbrEn: 'Ma', abbrHi: 'मं' },
  mercury: { en: 'Mercury', hi: 'बुध', abbrEn: 'Me', abbrHi: 'बु' },
  jupiter: { en: 'Jupiter', hi: 'गुरु', abbrEn: 'Ju', abbrHi: 'गु' },
  venus: { en: 'Venus', hi: 'शुक्र', abbrEn: 'Ve', abbrHi: 'शु' },
  saturn: { en: 'Saturn', hi: 'शनि', abbrEn: 'Sa', abbrHi: 'श' },
  rahu: { en: 'Rahu', hi: 'राहु', abbrEn: 'Ra', abbrHi: 'रा' },
  ketu: { en: 'Ketu', hi: 'केतु', abbrEn: 'Ke', abbrHi: 'के' },
  uranus: { en: 'Uranus', hi: 'अरुण', abbrEn: 'Ur', abbrHi: 'अ' },
  neptune: { en: 'Neptune', hi: 'वरुण', abbrEn: 'Ne', abbrHi: 'व' },
  pluto: { en: 'Pluto', hi: 'यम', abbrEn: 'Pl', abbrHi: 'य' },
  ascendant: { en: 'Ascendant', hi: 'लग्न', abbrEn: 'Asc', abbrHi: 'ल' },
};
const PLANET_ALIAS: Record<string, string> = { surya: 'sun', chandra: 'moon', mangal: 'mars', budh: 'mercury', guru: 'jupiter', brihaspati: 'jupiter', shukra: 'venus', shani: 'saturn', lagna: 'ascendant', northnode: 'rahu', southnode: 'ketu', trueRahu: 'rahu' };
const planetKey = (id?: string | null) => {
  const k = squash(id);
  return PLANETS[k] ? k : PLANET_ALIAS[k] || k;
};
export function planetName(id: string | null | undefined, lang: Lang, fallbackLabel?: string | null): string {
  const p = PLANETS[planetKey(id)] ?? PLANETS[planetKey(fallbackLabel)];
  if (p) return lang === 'hi' ? p.hi : p.en;
  return fallbackLabel || prettySlug(id);
}
export function planetAbbr(id: string | null | undefined, lang: Lang): string {
  const p = PLANETS[planetKey(id)];
  if (p) return lang === 'hi' ? p.abbrHi : p.abbrEn;
  return (id || '?').slice(0, 2);
}

/* ----------------------------- nakshatras ----------------------------- */
const NAKSHATRAS: Array<[string, string, string[]]> = [
  ['ashwini', 'अश्विनी', ['ashvini']],
  ['bharani', 'भरणी', []],
  ['krittika', 'कृत्तिका', ['kritika']],
  ['rohini', 'रोहिणी', []],
  ['mrigashira', 'मृगशिरा', ['mrigashirsha', 'mrigasira', 'mriga']],
  ['ardra', 'आर्द्रा', ['aardra']],
  ['punarvasu', 'पुनर्वसु', []],
  ['pushya', 'पुष्य', ['pushyami', 'pusya']],
  ['ashlesha', 'आश्लेषा', ['aslesha']],
  ['magha', 'मघा', ['makha']],
  ['purvaphalguni', 'पूर्वाफाल्गुनी', ['purvaphalgunee', 'pubba']],
  ['uttaraphalguni', 'उत्तराफाल्गुनी', ['uttaraphalgunee', 'uttara']],
  ['hasta', 'हस्त', []],
  ['chitra', 'चित्रा', ['chitta']],
  ['swati', 'स्वाति', ['svati']],
  ['vishakha', 'विशाखा', ['visakha']],
  ['anuradha', 'अनुराधा', []],
  ['jyeshtha', 'ज्येष्ठा', ['jyeshta', 'jyestha']],
  ['mula', 'मूल', ['moola']],
  ['purvaashadha', 'पूर्वाषाढ़ा', ['purvashadha', 'poorvashada']],
  ['uttaraashadha', 'उत्तराषाढ़ा', ['uttarashadha']],
  ['shravana', 'श्रवण', ['sravana', 'shravan']],
  ['dhanishta', 'धनिष्ठा', ['dhanishtha', 'shravishtha']],
  ['shatabhisha', 'शतभिषा', ['shatabisha', 'satabhisha']],
  ['purvabhadrapada', 'पूर्वभाद्रपदा', ['purvabhadra', 'poorvabhadrapada']],
  ['uttarabhadrapada', 'उत्तरभाद्रपदा', ['uttarabhadra']],
  ['revati', 'रेवती', []],
];
const NAK_LOOKUP = new Map<string, string>();
NAKSHATRAS.forEach(([k, hi, alias]) => {
  NAK_LOOKUP.set(k, hi);
  alias.forEach((a) => NAK_LOOKUP.set(a, hi));
});
export function nakshatraName(slug: string | null | undefined, lang: Lang): string {
  if (!slug) return '-';
  if (lang === 'hi') return NAK_LOOKUP.get(squash(slug)) ?? prettySlug(slug);
  return prettySlug(slug);
}

/* ----------------------------- avakhada & traits ----------------------------- */
const AVAKHADA_KEYS: Record<string, { en: string; hi: string }> = {
  varna: { en: 'Varna', hi: 'वर्ण' },
  vashya: { en: 'Vashya', hi: 'वश्य' },
  yoni: { en: 'Yoni', hi: 'योनि' },
  gana: { en: 'Gana', hi: 'गण' },
  nadi: { en: 'Nadi', hi: 'नाड़ी' },
  nakshatra: { en: 'Nakshatra', hi: 'नक्षत्र' },
  rashi: { en: 'Moon Sign (Rashi)', hi: 'चंद्र राशि' },
};
const VALUE_HI: Record<string, Record<string, string>> = {
  varna: { brahmin: 'ब्राह्मण', brahmana: 'ब्राह्मण', kshatriya: 'क्षत्रिय', vaishya: 'वैश्य', shudra: 'शूद्र' },
  vashya: {
    chatushpada: 'चतुष्पद', quadruped: 'चतुष्पद', manava: 'मानव', human: 'मानव', nara: 'नर',
    jalachara: 'जलचर', jalchar: 'जलचर', aquatic: 'जलचर', vanachara: 'वनचर', vanchar: 'वनचर', wild: 'वनचर',
    keeta: 'कीट', keet: 'कीट', insect: 'कीट',
  },
  yoni: {
    ashwa: 'अश्व', horse: 'अश्व', gaja: 'गज', elephant: 'गज', mesha: 'मेष', sheep: 'मेष', ram: 'मेष',
    sarpa: 'सर्प', serpent: 'सर्प', snake: 'सर्प', shwana: 'श्वान', dog: 'श्वान', marjara: 'मार्जार', cat: 'मार्जार',
    mushaka: 'मूषक', rat: 'मूषक', gau: 'गौ', cow: 'गौ', mahisha: 'महिष', buffalo: 'महिष',
    vyaghra: 'व्याघ्र', tiger: 'व्याघ्र', mriga: 'मृग', deer: 'मृग', hare: 'मृग', vanara: 'वानर', monkey: 'वानर',
    nakula: 'नकुल', mongoose: 'नकुल', simha: 'सिंह', lion: 'सिंह',
  },
  gana: { deva: 'देव', manushya: 'मनुष्य', rakshasa: 'राक्षस' },
  nadi: { adi: 'आदि', aadi: 'आदि', madhya: 'मध्य', antya: 'अंत्य' },
};
export function avakhadaKeyLabel(key: string, lang: Lang): string {
  const k = AVAKHADA_KEYS[squash(key)];
  return k ? (lang === 'hi' ? k.hi : k.en) : prettySlug(key);
}
/** Value of an avakhada / trait row. */
export function traitValue(key: string, value: string | null | undefined, lang: Lang): string {
  if (!value) return '-';
  const k = squash(key);
  if (k === 'nakshatra') return nakshatraName(value, lang);
  if (k === 'rashi') return signLabel(value, lang);
  if (lang === 'hi') {
    const hit = VALUE_HI[k]?.[squash(value)];
    if (hit) return hit;
  }
  return prettySlug(value);
}

/* ----------------------------- koota (matching) ----------------------------- */
export const KOOTA: Record<string, { en: string; hi: string; explEn: string; explHi: string }> = {
  varna: { en: 'Varna', hi: 'वर्ण', explEn: 'Spiritual ego, work inclination & spiritual compatibility', explHi: 'आध्यात्मिक अहंकार, कार्य-प्रवृत्ति एवं आध्यात्मिक अनुकूलता' },
  vashya: { en: 'Vashya', hi: 'वश्य', explEn: 'Mutual attraction, dominance balance & emotional connection', explHi: 'आपसी आकर्षण, प्रभुत्व का संतुलन एवं भावनात्मक जुड़ाव' },
  tara_dina: { en: 'Tara (Dina)', hi: 'तारा (दिन)', explEn: 'Destiny, health, well-being & mutual prosperity', explHi: 'भाग्य, स्वास्थ्य, कल्याण एवं साझा समृद्धि' },
  yoni: { en: 'Yoni', hi: 'योनि', explEn: 'Intimate compatibility, nature & biological sync', explHi: 'शारीरिक अनुकूलता, स्वभाव एवं प्राकृतिक तालमेल' },
  graha_maitri: { en: 'Graha Maitri', hi: 'ग्रह मैत्री', explEn: 'Mental friendship, intellectual harmony & communication', explHi: 'मानसिक मित्रता, वैचारिक सामंजस्य एवं संवाद' },
  gana: { en: 'Gana', hi: 'गण', explEn: 'Temperament, lifestyle & behavioral compatibility', explHi: 'स्वभाव, जीवनशैली एवं व्यवहारिक अनुकूलता' },
  bhakoot: { en: 'Bhakoot', hi: 'भकूट', explEn: 'Emotional bonding, family prosperity & marital happiness', explHi: 'भावनात्मक बंधन, पारिवारिक समृद्धि एवं वैवाहिक सुख' },
  nadi: { en: 'Nadi', hi: 'नाड़ी', explEn: 'Hereditary health, energetic harmony & genetic compatibility', explHi: 'आनुवंशिक स्वास्थ्य, ऊर्जा-सामंजस्य एवं संतान-स्वास्थ्य संबंधी अनुकूलता' },
};
export function kootaLabel(name: string, upstreamLabel: string | undefined, lang: Lang): string {
  const k = KOOTA[name];
  if (lang === 'hi') return k ? k.hi : upstreamLabel || prettySlug(name);
  return upstreamLabel || (k ? k.en : prettySlug(name));
}
export function kootaExplanation(name: string, lang: Lang): string {
  const k = KOOTA[name];
  if (!k) return lang === 'hi' ? 'वैदिक वैवाहिक अनुकूलता का एक आयाम' : 'Vedic marital compatibility dimension';
  return lang === 'hi' ? k.explHi : k.explEn;
}
/** English keeps the engine's own note; Hindi is derived from the points so it never falls back to English. */
export function kootaNote(score: number, max: number, upstream: string | undefined, lang: Lang): string {
  if (lang !== 'hi') return upstream || 'Calculated';
  if (max > 0 && score >= max) return 'पूर्ण अंक — उत्तम तालमेल';
  if (score <= 0) return 'कोई अंक नहीं — विचार आवश्यक';
  return `आंशिक अंक — ${max} में से ${score}`;
}

export type MatchBand = 'excellent' | 'good' | 'acceptable' | 'low';
export function matchBand(total: number): MatchBand {
  return total >= 28 ? 'excellent' : total >= 21 ? 'good' : total >= 18 ? 'acceptable' : 'low';
}
export function conclusionText(total: number, upstream: string | undefined, lang: Lang): string {
  if (lang !== 'hi') return upstream || (total >= 18 ? 'Acceptable Vedic Match' : 'Consultation Recommended');
  return { excellent: 'उत्तम वैदिक मेल', good: 'अच्छा वैदिक मेल', acceptable: 'स्वीकार्य वैदिक मेल', low: 'परामर्श की सलाह' }[matchBand(total)];
}
export function bandSummary(total: number, lang: Lang): string {
  const b = matchBand(total);
  if (lang === 'hi')
    return {
      excellent: 'गुण मिलान बहुत अच्छा है। परंपरा के अनुसार यह विवाह के लिए श्रेष्ठ अनुकूलता मानी जाती है।',
      good: 'गुण मिलान अच्छा है। अधिकांश आयाम अनुकूल हैं; कमज़ोर कूटों पर आपसी समझ से ध्यान दें।',
      acceptable: 'गुण मिलान न्यूनतम स्वीकार्य स्तर पर है (18 या अधिक)। कुंडलियों का विस्तृत विश्लेषण उपयोगी रहेगा।',
      low: 'गुण मिलान 18 से कम है। आगे बढ़ने से पहले किसी अनुभवी आचार्य से पूरी कुंडली का विश्लेषण कराने की सलाह दी जाती है।',
    }[b];
  return {
    excellent: 'An excellent match. Traditionally this is considered a very strong compatibility for marriage.',
    good: 'A good match. Most dimensions agree; give the weaker kootas some attention through mutual understanding.',
    acceptable: 'The score is at the minimum accepted level (18 or more). A detailed reading of both charts will help.',
    low: 'The score is below 18. We recommend having both full charts read by an experienced Acharya before deciding.',
  }[b];
}

/* ----------------------------- dates ----------------------------- */
const MONTHS_HI = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** ISO date or date-time -> "21 Jun 2026" / "21 जून 2026" (UTC date parts, stable across time zones). */
export function formatDateL(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '-';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '-';
  const d = new Date(t);
  const m = d.getUTCMonth();
  return `${d.getUTCDate()} ${lang === 'hi' ? MONTHS_HI[m] : MONTHS_EN[m]} ${d.getUTCFullYear()}`;
}
export function todayText(lang: Lang): string {
  const d = new Date();
  return `${d.getDate()} ${lang === 'hi' ? MONTHS_HI[d.getMonth()] : MONTHS_EN[d.getMonth()]} ${d.getFullYear()}`;
}

/* ----------------------------- UI text ----------------------------- */
const EN = {
  // shared
  brandTagline: 'Sacred Darshan Network',
  poweredLine: 'Vedic calculations by Param Darshan',
  // kundli report
  kundliTitle: 'Janam Kundli',
  kundliSubtitle: 'Vedic Birth Chart',
  yourKundli: 'Your Kundli',
  kundliOf: "{name}'s Kundli",
  birthDetails: 'Birth details',
  name: 'Name',
  dateOfBirth: 'Date of birth',
  timeOfBirth: 'Time of birth',
  placeOfBirth: 'Place of birth',
  timeUnknown: 'Not known',
  timezone: 'Time zone',
  ayanamsa: 'Ayanamsa',
  lahiri: 'Lahiri',
  bornLine: 'Born {date}{time}',
  bornAt: ' at {time}',
  bornNoTime: ' (birth time not known)',
  lagna: 'Lagna (Ascendant)',
  moonSign: 'Moon sign (Rashi)',
  birthNakshatra: 'Birth Nakshatra',
  runningMaha: 'Running mahadasha',
  needsTime: 'Needs birth time',
  padaWord: 'pada',
  padaCap: 'Pada {n}',
  to: 'to',
  planetaryPositions: 'Planetary positions',
  planet: 'Planet',
  sign: 'Sign',
  degree: 'Degree',
  nakshatra: 'Nakshatra',
  house: 'House',
  retroNote: 'R = retrograde. Nakshatra pada in brackets.',
  retroTitle: 'Retrograde',
  retroMark: 'R',
  avakhadaChakra: 'Avakhada Chakra',
  dashaToday: 'Vimshottari Dasha Today',
  mahadasha: 'Mahadasha',
  antardasha: 'Antardasha',
  pratyantardasha: 'Pratyantardasha',
  divisional: 'Divisional charts (ascendant sign)',
  chartDrawing: 'Chart drawing',
  northIndian: 'North Indian',
  southIndian: 'South Indian',
  lagnaD1: 'Lagna (D1)',
  navamsaD9: 'Navamsa (D9)',
  chartAlt: 'Vedic Kundli chart drawing',
  chartMoonNote: 'Birth time not known, so the houses are counted from the Moon (Chandra Lagna).',
  chartAsc: 'Asc',
  chartTitleD1: 'Rashi (D1)',
  chartTitleD9: 'Navamsa (D9)',
  chartMoonTitle: 'Chandra Lagna',
  warnNoTime: 'Without a birth time the ascendant (lagna) and houses cannot be calculated. Sign-based details are shown.',
  warnDasha: 'The dasha could not be loaded right now. Please try again later.',
  warnAvakhada: 'The avakhada could not be loaded right now. Please try again later.',
  warnEngine: 'The calculation engine added these notes (shown in English):',
  ctaTitle: 'Want your Kundli analyzed by an Acharya?',
  ctaText: 'Book a live 1-on-1 consultation session with our KYC-verified Vedic Pandits for personalized guidance.',
  ctaBook: 'Book an Astrologer',
  ctaDirectory: 'Verified Pandits Directory',
  methodNote: 'Calculated with the {ayanamsa} ayanamsa using whole-sign houses.',
  disclaimer: 'Astrology is offered for spiritual guidance and personal reflection, not as a substitute for medical, legal or financial advice.',
  // match report
  matchTitle: 'Kundli Matching',
  matchSubtitle: 'Ashtakoot Guna Milan',
  partner1: 'Partner 1',
  partner2: 'Partner 2',
  scoreLine: 'Compatibility Score',
  outOf: 'out of {max} Gunas',
  percentScore: '{p}% Score',
  nadiYes: 'Nadi Dosha Detected (नाड़ी दोष)',
  nadiNo: 'Nadi Dosha Free (नाड़ी दोष मुक्त)',
  nadiYesNote: 'Same Nadi observed. Astrological consultation & remedies recommended.',
  nadiNoNote: 'Complementary physiological and genetic energies.',
  bhakootYes: 'Bhakoot Dosha Detected (भकूट दोष)',
  bhakootNo: 'Bhakoot Dosha Free (भकूट दोष मुक्त)',
  bhakootYesNote: 'Planetary angle warrants deeper chart inspection.',
  bhakootNoNote: 'Auspicious mutual Moon signs ensuring family happiness.',
  traits: 'Astral Traits Comparison',
  gana: 'Gana',
  nadi: 'Nadi',
  yoni: 'Yoni',
  breakdown: 'Ashtakoot (8 Kootas) Breakdown',
  maxPoints: 'Maximum: {max} Points',
  koota: 'Koota',
  significance: 'Significance',
  score: 'Score',
  max: 'Max',
  notes: 'Alignment Notes',
  total: 'Total Ashtakoot Guna Milan Score',
  resultBadge: 'Ashtakoot Guna Milan Result',
  partnerTag1: '(Partner 1)',
  partnerTag2: '(Partner 2)',
  moonRashi: 'Moon Sign (Rashi)',
  alignOk: 'Acceptable Vedic Alliance',
  alignLow: 'Caution / Remedies Advised',
  calculated: 'Calculated',
  matchCtaTitle: 'Need Personalized Astrological Guidance on this Match?',
  matchCtaText: 'While automated Guna Milan provides a solid foundation, deep horoscope compatibility (Kundli Milan) requires analyzing D9 Navamsa, Mars placement (Mangal Dosha), and Dasha timing. Connect directly with our verified Vedic Astrologers.',
  matchCtaBook: 'Book Astrologer Consultation',
  matchAnother: 'Match Another Kundli',
  outOf36: 'out of 36',
  scoreWord: 'Compatibility Score:',
  gunasWord: 'Gunas',
  maxLabel: 'Maximum: 36 Points',
  interpretation: 'What this means',
  // download
  downloadPdf: 'Download PDF',
  preparingPdf: 'Preparing PDF…',
  pdfFailed: 'The PDF could not be created. Please try again.',
  generatedOn: 'Generated on {date}',
  page: 'Page {n} of {total}',
  pdfFooterNote: 'This report is generated from the details you entered. Nothing is stored on our servers.',
  website: 'Website',
} as const;
export type UiKey = keyof typeof EN;

const HI: Record<UiKey, string> = {
  brandTagline: 'पवित्र दर्शन नेटवर्क',
  poweredLine: 'परम दर्शन द्वारा वैदिक गणना',
  kundliTitle: 'जन्म कुंडली',
  kundliSubtitle: 'वैदिक जन्म पत्रिका',
  yourKundli: 'आपकी कुंडली',
  kundliOf: '{name} की कुंडली',
  birthDetails: 'जन्म विवरण',
  name: 'नाम',
  dateOfBirth: 'जन्म तिथि',
  timeOfBirth: 'जन्म समय',
  placeOfBirth: 'जन्म स्थान',
  timeUnknown: 'ज्ञात नहीं',
  timezone: 'समय क्षेत्र',
  ayanamsa: 'अयनांश',
  lahiri: 'लाहिड़ी',
  bornLine: 'जन्म: {date}{time}',
  bornAt: ', समय {time}',
  bornNoTime: ' (जन्म समय ज्ञात नहीं)',
  lagna: 'लग्न',
  moonSign: 'चंद्र राशि',
  birthNakshatra: 'जन्म नक्षत्र',
  runningMaha: 'वर्तमान महादशा',
  needsTime: 'जन्म समय आवश्यक',
  padaWord: 'चरण',
  padaCap: 'चरण {n}',
  to: 'से',
  planetaryPositions: 'ग्रह स्थिति',
  planet: 'ग्रह',
  sign: 'राशि',
  degree: 'अंश',
  nakshatra: 'नक्षत्र',
  house: 'भाव',
  retroNote: 'व = वक्री। नक्षत्र चरण कोष्ठक में।',
  retroTitle: 'वक्री',
  retroMark: 'व',
  avakhadaChakra: 'अवकहड़ा चक्र',
  dashaToday: 'आज की विंशोत्तरी दशा',
  mahadasha: 'महादशा',
  antardasha: 'अंतर्दशा',
  pratyantardasha: 'प्रत्यंतर्दशा',
  divisional: 'वर्ग कुंडलियाँ (लग्न राशि)',
  chartDrawing: 'कुंडली चित्र',
  northIndian: 'उत्तर भारतीय',
  southIndian: 'दक्षिण भारतीय',
  lagnaD1: 'लग्न कुंडली (D1)',
  navamsaD9: 'नवांश (D9)',
  chartAlt: 'वैदिक कुंडली चित्र',
  chartMoonNote: 'जन्म समय ज्ञात नहीं है, इसलिए भाव चंद्रमा से गिने गए हैं (चंद्र लग्न)।',
  chartAsc: 'ल',
  chartTitleD1: 'राशि कुंडली (D1)',
  chartTitleD9: 'नवांश कुंडली (D9)',
  chartMoonTitle: 'चंद्र लग्न',
  warnNoTime: 'जन्म समय के बिना लग्न और भाव की गणना नहीं हो सकती। राशि-आधारित विवरण दिखाए गए हैं।',
  warnDasha: 'दशा अभी लोड नहीं हो सकी। कृपया बाद में पुनः प्रयास करें।',
  warnAvakhada: 'अवकहड़ा अभी लोड नहीं हो सका। कृपया बाद में पुनः प्रयास करें।',
  warnEngine: 'गणना इंजन ने ये सूचनाएँ दी हैं (अंग्रेज़ी में):',
  ctaTitle: 'अपनी कुंडली का विश्लेषण किसी आचार्य से करवाना चाहते हैं?',
  ctaText: 'व्यक्तिगत मार्गदर्शन के लिए हमारे केवाईसी-सत्यापित वैदिक पंडितों के साथ लाइव 1-ऑन-1 परामर्श सत्र बुक करें।',
  ctaBook: 'ज्योतिषी बुक करें',
  ctaDirectory: 'सत्यापित पंडित निर्देशिका',
  methodNote: 'गणना {ayanamsa} अयनांश और संपूर्ण-राशि (होल-साइन) भाव पद्धति से की गई है।',
  disclaimer: 'ज्योतिष आध्यात्मिक मार्गदर्शन और व्यक्तिगत चिंतन के लिए है; यह चिकित्सीय, कानूनी या वित्तीय सलाह का विकल्प नहीं है।',
  matchTitle: 'कुंडली मिलान',
  matchSubtitle: 'अष्टकूट गुण मिलान',
  partner1: 'प्रथम व्यक्ति',
  partner2: 'द्वितीय व्यक्ति',
  scoreLine: 'अनुकूलता अंक',
  outOf: '{max} गुणों में से',
  percentScore: '{p}% अंक',
  nadiYes: 'नाड़ी दोष है',
  nadiNo: 'नाड़ी दोष नहीं है',
  nadiYesNote: 'दोनों की नाड़ी समान है। ज्योतिषीय परामर्श एवं उपाय सुझाए जाते हैं।',
  nadiNoNote: 'शारीरिक एवं आनुवंशिक ऊर्जाएँ परस्पर पूरक हैं।',
  bhakootYes: 'भकूट दोष है',
  bhakootNo: 'भकूट दोष नहीं है',
  bhakootYesNote: 'ग्रह-कोण के कारण कुंडली का गहन निरीक्षण आवश्यक है।',
  bhakootNoNote: 'चंद्र राशियों का शुभ संबंध पारिवारिक सुख सुनिश्चित करता है।',
  traits: 'ज्योतिषीय गुणों की तुलना',
  gana: 'गण',
  nadi: 'नाड़ी',
  yoni: 'योनि',
  breakdown: 'अष्टकूट (8 कूट) विवरण',
  maxPoints: 'अधिकतम: {max} अंक',
  koota: 'कूट',
  significance: 'महत्व',
  score: 'प्राप्तांक',
  max: 'पूर्णांक',
  notes: 'टिप्पणी',
  total: 'कुल अष्टकूट गुण मिलान अंक',
  resultBadge: 'अष्टकूट गुण मिलान परिणाम',
  partnerTag1: '(प्रथम व्यक्ति)',
  partnerTag2: '(द्वितीय व्यक्ति)',
  moonRashi: 'चंद्र राशि',
  alignOk: 'स्वीकार्य वैदिक संबंध',
  alignLow: 'सावधानी / उपाय अनुशंसित',
  calculated: 'गणना की गई',
  matchCtaTitle: 'इस मिलान पर व्यक्तिगत ज्योतिषीय मार्गदर्शन चाहिए?',
  matchCtaText: 'स्वचालित गुण मिलान एक ठोस आधार देता है, किंतु गहन कुंडली मिलान के लिए नवांश (D9), मंगल की स्थिति (मांगलिक दोष) और दशा-काल का विश्लेषण आवश्यक है। हमारे सत्यापित वैदिक ज्योतिषियों से सीधे जुड़ें।',
  matchCtaBook: 'ज्योतिषी परामर्श बुक करें',
  matchAnother: 'दूसरी कुंडली मिलाएँ',
  outOf36: '36 में से',
  scoreWord: 'अनुकूलता अंक:',
  gunasWord: 'गुण',
  maxLabel: 'अधिकतम: 36 अंक',
  interpretation: 'इसका अर्थ',
  downloadPdf: 'पीडीएफ डाउनलोड करें',
  preparingPdf: 'पीडीएफ तैयार हो रही है…',
  pdfFailed: 'पीडीएफ नहीं बन सकी। कृपया पुनः प्रयास करें।',
  generatedOn: 'तैयार किया गया: {date}',
  page: 'पृष्ठ {n} / {total}',
  pdfFooterNote: 'यह रिपोर्ट आपके दिए विवरण से तैयार की गई है। हमारे सर्वर पर कुछ भी सहेजा नहीं जाता।',
  website: 'वेबसाइट',
};

export type Texts = { [K in UiKey]: string } & { f: (key: UiKey, vars?: Record<string, string | number>) => string };

export function texts(lang: Lang): Texts {
  const table: Record<UiKey, string> = lang === 'hi' ? HI : (EN as unknown as Record<UiKey, string>);
  const f = (key: UiKey, vars?: Record<string, string | number>) =>
    table[key].replace(/\{(\w+)\}/g, (_, k) => String(vars?.[k] ?? ''));
  return Object.assign({ f }, table) as Texts;
}

/** Exposed for the drift test and the PDF. */
export const UI_TABLES = { en: EN as unknown as Record<UiKey, string>, hi: HI };
