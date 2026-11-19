'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  Orbit,
  RefreshCw,
  RotateCcw,
  HeartHandshake,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { DiyaIcon, OmIcon } from '@/components/icons/SpiritualIcons';
import { apiFetch } from '@/lib/api';
import { isJwtTokenExpired, purgeClientSession } from '@/lib/auth-session';
import { formatDate, formatDegree, pretty, signName, todayLocal } from './kundli-utils';

interface Planet {
  id?: string;
  label?: string;
  sign?: string;
  degree?: number;
  nakshatra?: string;
  pada?: number;
  nakshatraLord?: string;
  house?: number;
  retrograde?: boolean;
}
interface DashaLevel {
  planet?: string;
  start?: string;
  end?: string;
}
interface KundliResult {
  lagna: { sign?: string; signLabel?: string; degree?: number; nakshatra?: string; nakshatraLabel?: string; pada?: number } | null;
  planets: Planet[];
  divisionalLagnas: Record<string, string>;
  moon: { sign?: string; nakshatra?: string; pada?: number } | null;
  avakhada: Record<string, string> | null;
  dasha: { at?: string; mahadasha: DashaLevel; antardasha: DashaLevel | null; pratyantardasha: DashaLevel | null } | null;
  unavailable: string[];
  warnings: string[];
  meta: { ayanamsa?: string; timezone?: string; utcOffset?: string };
}
interface Candidate {
  placeId: string;
  name: string;
  state?: string;
  country?: string;
}
interface Payload {
  date: string;
  time?: string;
  timeAccuracy?: 'unknown';
  placeQuery?: string;
  placeId?: string;
  lang: 'en' | 'hi';
}

interface MatchKoota {
  name: string;
  label: string;
  score: number;
  max: number;
  note?: string;
}

interface MatchPersonDetails {
  rashi?: string;
  nakshatra?: string;
  gana?: string;
  nadi?: string;
  yoni?: string;
}

interface MatchResult {
  total: number;
  max: number;
  percentage: number;
  conclusion: string;
  kootas: MatchKoota[];
  doshas: {
    nadi: boolean;
    bhakoot: boolean;
  };
  personA: MatchPersonDetails | null;
  personB: MatchPersonDetails | null;
  meta: { ayanamsa?: string };
}

const inputClass =
  'w-full px-3.5 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-sm text-white focus:outline-none focus:border-gold';
const labelClass = 'block text-xs font-semibold text-stone-300 mb-1';
const cardClass = 'bg-obsidian-soft border border-gold/20 rounded-2xl p-5 shadow-lg';

const KOOTA_EXPLANATIONS: Record<string, string> = {
  varna: 'Spiritual ego, work inclination & spiritual compatibility',
  vashya: 'Mutual attraction, dominance balance & emotional connection',
  tara_dina: 'Destiny, health, well-being & mutual prosperity',
  yoni: 'Intimate compatibility, nature & biological sync',
  graha_maitri: 'Mental friendship, intellectual harmony & communication',
  gana: 'Temperament, lifestyle & behavioral compatibility',
  bhakoot: 'Emotional bonding, family prosperity & marital happiness',
  nadi: 'Hereditary health, energetic harmony & genetic compatibility',
};

export default function KundliPage() {
  const [auth, setAuth] = useState<'checking' | 'in' | 'out'>('checking');
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'janam' | 'matching'>('janam');

  // --- Single Janam Kundli State ---
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [unknownTime, setUnknownTime] = useState(false);
  const [place, setPlace] = useState('');
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [result, setResult] = useState<KundliResult | null>(null);
  const [submitted, setSubmitted] = useState<Payload | null>(null);
  const [shownName, setShownName] = useState('');
  const resultRef = useRef<HTMLDivElement>(null);

  const [style, setStyle] = useState<'north' | 'south'>('north');
  const [varga, setVarga] = useState<'D1' | 'D9'>('D1');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [chartUrl, setChartUrl] = useState<string | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState(false);
  const chartSeq = useRef(0);

  // --- Kundli Matching State ---
  const [nameA, setNameA] = useState('');
  const [dateA, setDateA] = useState('');
  const [timeA, setTimeA] = useState('');
  const [unknownTimeA, setUnknownTimeA] = useState(false);
  const [placeA, setPlaceA] = useState('');
  const [placeIdA, setPlaceIdA] = useState<string | null>(null);
  const [candidatesA, setCandidatesA] = useState<Candidate[] | null>(null);

  const [nameB, setNameB] = useState('');
  const [dateB, setDateB] = useState('');
  const [timeB, setTimeB] = useState('');
  const [unknownTimeB, setUnknownTimeB] = useState(false);
  const [placeB, setPlaceB] = useState('');
  const [placeIdB, setPlaceIdB] = useState<string | null>(null);
  const [candidatesB, setCandidatesB] = useState<Candidate[] | null>(null);

  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [matchSubmitted, setMatchSubmitted] = useState<any | null>(null);
  const matchResultRef = useRef<HTMLDivElement>(null);

  // Check auth and initial query params
  useEffect(() => {
    try {
      const token = localStorage.getItem('pooja_token');
      setAuth(token && !isJwtTokenExpired(token) ? 'in' : 'out');
    } catch {
      setAuth('out');
    }

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'matching') {
        setActiveTab('matching');
      }
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    fetch(`${apiUrl}/kundli/status`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setEnabled(j ? !!j.enabled : null))
      .catch(() => setEnabled(null));
  }, []);

  const handleTabChange = (tab: 'janam' | 'matching') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tab === 'matching') {
        url.searchParams.set('tab', 'matching');
      } else {
        url.searchParams.delete('tab');
      }
      window.history.replaceState(null, '', url.toString());
    }
  };

  // Sync theme
  useEffect(() => {
    const read = () => setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);

  // Janam Kundli SVG chart rendering
  useEffect(() => {
    if (!result || !submitted) return;
    const seq = ++chartSeq.current;
    setChartLoading(true);
    setChartError(false);
    apiFetch<string>('/kundli/chart', {
      method: 'POST',
      body: JSON.stringify({ ...submitted, varga, style, theme }),
    })
      .then((svg) => {
        if (seq !== chartSeq.current || typeof svg !== 'string') return;
        const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
        setChartUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return url;
        });
      })
      .catch(() => {
        if (seq === chartSeq.current) setChartError(true);
      })
      .finally(() => {
        if (seq === chartSeq.current) setChartLoading(false);
      });
  }, [result, submitted, varga, style, theme]);

  useEffect(() => () => {
    chartSeq.current++;
  }, []);

  // Janam Kundli Generator
  const buildPayload = useCallback(
    (chosenPlaceId?: string | null): Payload => ({
      date,
      ...(unknownTime ? { timeAccuracy: 'unknown' as const } : { time }),
      ...(chosenPlaceId ? { placeId: chosenPlaceId } : { placeQuery: place.trim() }),
      lang,
    }),
    [date, time, unknownTime, place, lang],
  );

  const generate = async (chosenPlaceId?: string | null) => {
    setError(null);
    setCandidates(null);
    if (!date) return setError('Please enter your date of birth.');
    if (!unknownTime && !time) return setError('Please enter your birth time, or tick "I don\'t know my birth time".');
    if (!chosenPlaceId && place.trim().length < 2) return setError('Please enter your place of birth.');

    const payload = buildPayload(chosenPlaceId);
    setLoading(true);
    try {
      const data = await apiFetch<KundliResult>('/kundli/generate', { method: 'POST', body: JSON.stringify(payload) });
      setShownName(name.trim());
      setSubmitted(payload);
      setChartUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return null;
      });
      setResult(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (e: any) {
      if (e?.status === 401) {
        purgeClientSession();
        setAuth('out');
      } else if (e?.body?.code === 'place_ambiguous' && Array.isArray(e.body.candidates) && e.body.candidates.length) {
        setCandidates(e.body.candidates);
        setError(e.message);
      } else {
        setError(e?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    chartSeq.current++;
    setResult(null);
    setSubmitted(null);
    setCandidates(null);
    setError(null);
    setChartUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Kundli Matching Calculator
  const matchKundli = async (overrideIdA?: string | null, overrideIdB?: string | null) => {
    setMatchError(null);
    setCandidatesA(null);
    setCandidatesB(null);

    const effIdA = overrideIdA !== undefined ? overrideIdA : placeIdA;
    const effIdB = overrideIdB !== undefined ? overrideIdB : placeIdB;

    if (!dateA) return setMatchError('Please enter Date of Birth for Partner 1.');
    if (!unknownTimeA && !timeA) return setMatchError('Please enter Birth Time for Partner 1, or tick unknown.');
    if (!effIdA && placeA.trim().length < 2) return setMatchError('Please enter Birth Place for Partner 1.');

    if (!dateB) return setMatchError('Please enter Date of Birth for Partner 2.');
    if (!unknownTimeB && !timeB) return setMatchError('Please enter Birth Time for Partner 2, or tick unknown.');
    if (!effIdB && placeB.trim().length < 2) return setMatchError('Please enter Birth Place for Partner 2.');

    const payload = {
      personA: {
        name: nameA.trim() || undefined,
        date: dateA,
        ...(unknownTimeA ? {} : { time: timeA }),
        ...(effIdA ? { placeId: effIdA } : { placeQuery: placeA.trim() }),
      },
      personB: {
        name: nameB.trim() || undefined,
        date: dateB,
        ...(unknownTimeB ? {} : { time: timeB }),
        ...(effIdB ? { placeId: effIdB } : { placeQuery: placeB.trim() }),
      },
      lang,
    };

    setMatchLoading(true);
    try {
      const data = await apiFetch<MatchResult>('/kundli/match', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setMatchResult(data);
      setMatchSubmitted({
        nameA: nameA.trim() || 'Partner 1',
        nameB: nameB.trim() || 'Partner 2',
        ...payload,
      });
      setTimeout(() => matchResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (e: any) {
      if (e?.status === 401) {
        purgeClientSession();
        setAuth('out');
      } else if (e?.body?.code === 'place_ambiguous' && Array.isArray(e.body.candidates) && e.body.candidates.length) {
        const firstCand = (e.body.candidates[0]?.name || '').toLowerCase();
        const qA = placeA.toLowerCase();
        const qB = placeB.toLowerCase();

        let isPersonB = e?.body?.target === 'personB';
        if (!e?.body?.target) {
          if (placeIdA && !placeIdB) {
            isPersonB = true;
          } else if (!placeIdA && placeIdB) {
            isPersonB = false;
          } else if (firstCand && (qB.includes(firstCand) || firstCand.includes(qB.split(',')[0].trim()))) {
            isPersonB = true;
          } else if (firstCand && (qA.includes(firstCand) || firstCand.includes(qA.split(',')[0].trim()))) {
            isPersonB = false;
          }
        }

        if (isPersonB) {
          setCandidatesB(e.body.candidates);
          setCandidatesA(null);
        } else {
          setCandidatesA(e.body.candidates);
          setCandidatesB(null);
        }
        setMatchError(e.message || `Please choose the location from the options below.`);
      } else {
        setMatchError(e?.message || 'Failed to calculate Kundli matching. Please check the birth details.');
      }
    } finally {
      setMatchLoading(false);
    }
  };

  const resetMatch = () => {
    setMatchResult(null);
    setMatchSubmitted(null);
    setCandidatesA(null);
    setCandidatesB(null);
    setMatchError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hindi = (activeTab === 'janam' ? submitted?.lang : matchSubmitted?.lang) === 'hi';
  const maha = result?.dasha?.mahadasha;

  return (
    <div className="min-h-screen bg-obsidian text-foreground py-10 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-5 lg:px-8">
        {/* Navigation Tabs Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex p-1 rounded-full border border-gold/30 bg-stone-900/90 shadow-lg mb-4 backdrop-blur-md">
            <button
              onClick={() => handleTabChange('janam')}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === 'janam'
                  ? 'bg-gold text-obsidian shadow-md'
                  : 'text-stone-300 hover:text-gold-pale hover:bg-gold/10'
              }`}
            >
              <Orbit className="w-4 h-4" />
              <span>Janam Kundli</span>
            </button>
            <button
              onClick={() => handleTabChange('matching')}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === 'matching'
                  ? 'bg-gold text-obsidian shadow-md'
                  : 'text-stone-300 hover:text-gold-pale hover:bg-gold/10'
              }`}
            >
              <HeartHandshake className="w-4 h-4" />
              <span>Kundli Matching</span>
            </button>
          </div>

          {activeTab === 'janam' ? (
            <>
              <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white">Your Vedic Birth Chart</h1>
              <p className="text-stone-400 text-sm sm:text-base mt-3 leading-relaxed">
                Lagna, moon sign, nakshatra, planetary positions, avakhada and running dasha, calculated for your exact
                birth time and place.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white">Vedic Kundli Matching</h1>
              <p className="text-stone-400 text-sm sm:text-base mt-3 leading-relaxed">
                Ashtakoot Guna Milan (36 points), Nadi &amp; Bhakoot dosha evaluation, and astrological compatibility for marriage.
              </p>
            </>
          )}
        </div>

        {/* Global Auth & Service Unavailable Guards */}
        <div className="max-w-3xl mx-auto">
          {auth === 'checking' && (
            <div className={`${cardClass} text-center text-sm text-stone-400`} aria-busy="true">
              Loading sacred calculations…
            </div>
          )}

          {auth === 'out' && (
            <div className={`${cardClass} text-center`}>
              <OmIcon size={36} className="mx-auto mb-3" />
              <h2 className="font-serif text-xl font-bold text-white mb-1">
                {activeTab === 'matching' ? 'Sign in for Kundli Matching' : 'Sign in to see your kundli'}
              </h2>
              <p className="text-xs sm:text-sm text-stone-400 mb-5">
                It is free for every devotee. Sign in or create an account to access Vedic calculations.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={`/login?redirect=${encodeURIComponent(activeTab === 'matching' ? '/kundli?tab=matching' : '/kundli/')}`}
                  className="px-6 py-2.5 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full text-xs shadow-lg shadow-gold/20 transition"
                >
                  Sign in
                </Link>
                <Link
                  href={`/register?redirect=${encodeURIComponent(activeTab === 'matching' ? '/kundli?tab=matching' : '/kundli/')}`}
                  className="px-6 py-2.5 border border-gold/40 bg-obsidian-soft hover:bg-gold/10 text-gold-pale font-bold rounded-full text-xs transition"
                >
                  Create account
                </Link>
              </div>
            </div>
          )}

          {auth === 'in' && enabled === false && (
            <div className={`${cardClass} text-center`}>
              <AlertCircle className="w-8 h-8 text-gold mx-auto mb-2" />
              <h2 className="font-serif text-xl font-bold text-white mb-1">Astrology Engine Offline</h2>
              <p className="text-xs sm:text-sm text-stone-400">
                This service is currently being updated. Please check back soon.
              </p>
            </div>
          )}
        </div>

        {/* =========================================================================
            TAB 1: JANAM KUNDLI (Single Chart)
           ========================================================================= */}
        {auth === 'in' && enabled !== false && activeTab === 'janam' && (
          <div className="max-w-2xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!loading) void generate(null);
              }}
              className={`${cardClass} space-y-4`}
              noValidate
            >
              <div>
                <label htmlFor="kd-name" className={labelClass}>
                  Name <span className="text-stone-500 font-normal">(optional, shown on your chart only)</span>
                </label>
                <input
                  id="kd-name"
                  type="text"
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Devotee name"
                  autoComplete="name"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="kd-date" className={labelClass}>
                    <Calendar className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-gold" />
                    Date of birth <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="kd-date"
                    type="date"
                    value={date}
                    min="1900-01-01"
                    max={todayLocal()}
                    onChange={(e) => setDate(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="kd-time" className={labelClass}>
                    <Clock className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-gold" />
                    Time of birth <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="kd-time"
                    type="time"
                    value={time}
                    disabled={unknownTime}
                    onChange={(e) => setTime(e.target.value)}
                    className={`${inputClass} disabled:opacity-40`}
                  />
                  <label className="mt-2 flex items-center gap-2 text-[11px] text-stone-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={unknownTime}
                      onChange={(e) => setUnknownTime(e.target.checked)}
                      className="accent-amber-500"
                    />
                    I don&apos;t know my birth time
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="kd-place" className={labelClass}>
                  <MapPin className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-gold" />
                  Place of birth <span className="text-red-400">*</span>
                </label>
                <input
                  id="kd-place"
                  type="text"
                  value={place}
                  maxLength={120}
                  onChange={(e) => {
                    setPlace(e.target.value);
                    setPlaceId(null);
                    setCandidates(null);
                  }}
                  placeholder="City, state (e.g. Varanasi, Uttar Pradesh)"
                  autoComplete="off"
                  className={inputClass}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-stone-300">Language</span>
                {(['en', 'hi'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    aria-pressed={lang === l}
                    className={`px-3.5 py-1 rounded-full text-xs font-bold border transition ${
                      lang === l
                        ? 'bg-gold text-obsidian border-gold'
                        : 'bg-obsidian-soft text-stone-300 border-stone-700 hover:border-gold/50'
                    }`}
                  >
                    {l === 'en' ? 'English' : 'हिन्दी'}
                  </button>
                ))}
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {candidates && (
                <div className="rounded-xl border border-gold/25 bg-gold/5 p-3 space-y-2">
                  <p className="text-xs font-semibold text-gold-pale">Choose your birth place</p>
                  {candidates.map((c) => (
                    <button
                      key={c.placeId}
                      type="button"
                      onClick={() => {
                        setPlaceId(c.placeId);
                        setPlace([c.name, c.state, c.country].filter(Boolean).join(', '));
                        void generate(c.placeId);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg border border-stone-700 hover:border-gold bg-stone-900 text-xs text-white transition"
                    >
                      {[c.name, c.state, c.country].filter(Boolean).join(', ')}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gold hover:bg-gold-deep text-obsidian font-bold text-sm rounded-xl shadow transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Calculating your chart…
                  </>
                ) : (
                  <>
                    <Orbit className="w-4 h-4" /> Generate my kundli
                  </>
                )}
              </button>

              <p className="text-[11px] text-stone-500 leading-relaxed text-center">
                Your birth details are sent to our astrology calculation engine only to compute this chart.
              </p>
            </form>

            {!result && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-10">
                {[
                  ['Lagna & Rashi', 'Your ascendant, moon sign and birth nakshatra'],
                  ['Birth chart', 'North or South Indian style, with Navamsa (D9)'],
                  ['Vimshottari dasha', 'The mahadasha and antardasha running today'],
                  ['Avakhada', 'Varna, vashya, yoni, gana and nadi'],
                ].map(([t, d]) => (
                  <div key={t} className={cardClass}>
                    <DiyaIcon size={20} className="mb-2" />
                    <h3 className="font-serif text-base font-bold text-gold-pale">{t}</h3>
                    <p className="text-[11px] sm:text-xs text-stone-400 mt-1 leading-relaxed">{d}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Janam Kundli Results View */}
            {result && submitted && (
              <div ref={resultRef} className="mt-10 space-y-6 scroll-mt-24">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white break-words">
                      {shownName ? `${shownName}'s Kundli` : 'Your Kundli'}
                    </h2>
                    <p className="text-xs text-stone-400 mt-1">
                      Born {formatDate(`${submitted.date}T00:00:00Z`)}
                      {submitted.time ? ` at ${submitted.time}` : ' (birth time not known)'}
                      {result.meta.timezone ? ` · ${result.meta.timezone} (UTC${result.meta.utcOffset ?? ''})` : ''}
                      {result.meta.ayanamsa ? ` · ${pretty(result.meta.ayanamsa)} ayanamsa` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={reset}
                    className="flex items-center gap-1.5 px-4 py-2 border border-stone-700 hover:border-gold rounded-full text-xs font-semibold text-stone-300 hover:text-white transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Another chart
                  </button>
                </div>

                {(result.warnings.length > 0 || result.unavailable.length > 0 || !result.lagna) && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200 space-y-1">
                    {!result.lagna && (
                      <p>Without a birth time the ascendant (lagna) and houses cannot be calculated. Sign-based details are shown.</p>
                    )}
                    {result.unavailable.includes('dasha') && <p>The dasha could not be loaded right now. Please try again later.</p>}
                    {result.unavailable.includes('avakhada') && <p>The avakhada could not be loaded right now. Please try again later.</p>}
                    {result.warnings.map((w) => (
                      <p key={w}>{w}</p>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Stat label="Lagna (Ascendant)" value={result.lagna ? signName(result.lagna.sign, hindi) : 'Needs birth time'} sub={result.lagna ? `${formatDegree(result.lagna.degree)} · ${pretty(result.lagna.nakshatra)} pada ${result.lagna.pada ?? '-'}` : undefined} />
                  <Stat label="Moon sign (Rashi)" value={result.moon ? signName(result.moon.sign, hindi) : '-'} sub={result.moon ? `${pretty(result.moon.nakshatra)} pada ${result.moon.pada ?? '-'}` : undefined} />
                  <Stat label="Birth Nakshatra" value={result.moon ? pretty(result.moon.nakshatra) : '-'} sub={result.moon?.pada ? `Pada ${result.moon.pada}` : undefined} />
                  <Stat label="Running mahadasha" value={maha?.planet ? pretty(maha.planet) : '-'} sub={maha ? `${formatDate(maha.start)} to ${formatDate(maha.end)}` : undefined} />
                </div>

                {/* Chart SVG */}
                <div className={cardClass}>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h3 className="font-serif text-lg font-bold text-gold-pale">Chart drawing</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex rounded-full border border-stone-700 bg-stone-900 p-0.5 text-xs">
                        {(['north', 'south'] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setStyle(s)}
                            className={`px-3 py-1 rounded-full font-bold transition capitalize ${style === s ? 'bg-gold text-obsidian' : 'text-stone-300 hover:text-white'}`}
                          >
                            {s} Indian
                          </button>
                        ))}
                      </div>
                      <div className="inline-flex rounded-full border border-stone-700 bg-stone-900 p-0.5 text-xs">
                        {(['D1', 'D9'] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setVarga(v)}
                            className={`px-3 py-1 rounded-full font-bold transition ${varga === v ? 'bg-gold text-obsidian' : 'text-stone-300 hover:text-white'}`}
                          >
                            {v === 'D1' ? 'Lagna (D1)' : 'Navamsa (D9)'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="relative aspect-square max-w-md mx-auto flex items-center justify-center rounded-xl bg-stone-900/60 border border-stone-800 p-2">
                    {chartUrl && !chartError && (
                      <img src={chartUrl} alt="Vedic Kundli chart drawing" className="w-full h-full object-contain pointer-events-none" />
                    )}
                    {chartLoading && <RefreshCw className="absolute w-6 h-6 text-gold animate-spin" aria-label="Drawing chart" />}
                    {chartError && !chartLoading && (
                      <p className="text-xs text-stone-400 px-6 text-center">The chart drawing could not be loaded. The tables below are complete.</p>
                    )}
                  </div>
                </div>

                {/* Planetary Positions */}
                <div className={cardClass}>
                  <h3 className="font-serif text-lg font-bold text-gold-pale mb-3">Planetary positions</h3>
                  <div className="overflow-x-auto -mx-1">
                    <table className="w-full min-w-[34rem] text-xs text-left">
                      <thead>
                        <tr className="text-stone-400 border-b border-gold/15">
                          <th className="py-2 px-1 font-semibold">Planet</th>
                          <th className="py-2 px-1 font-semibold">Sign</th>
                          <th className="py-2 px-1 font-semibold">Degree</th>
                          <th className="py-2 px-1 font-semibold">Nakshatra</th>
                          <th className="py-2 px-1 font-semibold">House</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.planets.map((p) => (
                          <tr key={p.id} className="border-b border-gold/10 last:border-0 text-stone-200">
                            <td className="py-2 px-1 font-semibold text-white whitespace-nowrap">
                              {p.label || pretty(p.id)}
                              {p.retrograde && <span title="Retrograde" className="ml-1.5 text-[10px] font-bold text-amber-400">R</span>}
                            </td>
                            <td className="py-2 px-1 whitespace-nowrap">{signName(p.sign, hindi)}</td>
                            <td className="py-2 px-1 whitespace-nowrap">{formatDegree(p.degree)}</td>
                            <td className="py-2 px-1 whitespace-nowrap">
                              {pretty(p.nakshatra)} <span className="text-stone-500">({p.pada ?? '-'})</span>
                            </td>
                            <td className="py-2 px-1">{p.house ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-2">R = retrograde. Nakshatra pada in brackets.</p>
                </div>

                {/* Avakhada & Dasha */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.avakhada && (
                    <div className={cardClass}>
                      <h3 className="font-serif text-lg font-bold text-gold-pale mb-3">Avakhada Chakra</h3>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        {Object.entries(result.avakhada).map(([k, v]) => (
                          <div key={k} className="min-w-0">
                            <dt className="text-stone-400 capitalize">{k}</dt>
                            <dd className="font-semibold text-white break-words">{k === 'nakshatra' ? pretty(v) : v}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                  {result.dasha && (
                    <div className={cardClass}>
                      <h3 className="font-serif text-lg font-bold text-gold-pale mb-3">Vimshottari Dasha Today</h3>
                      <ul className="space-y-2 text-xs">
                        {([['Mahadasha', result.dasha.mahadasha], ['Antardasha', result.dasha.antardasha], ['Pratyantardasha', result.dasha.pratyantardasha]] as const).map(
                          ([label, lvl]) =>
                            lvl?.planet ? (
                              <li key={label} className="flex items-baseline justify-between gap-3">
                                <span className="text-stone-400">{label}</span>
                                <span className="text-right min-w-0">
                                  <span className="font-semibold text-white">{pretty(lvl.planet)}</span>
                                  <span className="block text-[11px] text-stone-500">{formatDate(lvl.start)} to {formatDate(lvl.end)}</span>
                                </span>
                              </li>
                            ) : null,
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                {Object.keys(result.divisionalLagnas).length > 0 && (
                  <div className={cardClass}>
                    <h3 className="font-serif text-lg font-bold text-gold-pale mb-3">Divisional charts (ascendant sign)</h3>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {Object.entries(result.divisionalLagnas).map(([k, v]) => (
                        <span key={k} className="px-3 py-1.5 rounded-full border border-gold/25 bg-gold/5 text-stone-200">
                          <span className="font-bold text-gold-pale">{k}</span> {signName(v, hindi)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Consult verified pandit CTA */}
                <div className="rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/10 to-transparent p-6 text-center">
                  <h3 className="font-serif text-xl font-bold text-white">Want your Kundli analyzed by an Acharya?</h3>
                  <p className="text-xs sm:text-sm text-stone-400 mt-1 mb-4">
                    Book a live 1-on-1 consultation session with our KYC-verified Vedic Pandits for personalized guidance.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Link href="/pooja" className="px-6 py-2.5 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full text-xs shadow-lg shadow-gold/20 transition">
                      Book an Astrologer
                    </Link>
                    <Link href="/#pandits" className="px-6 py-2.5 border border-gold/40 bg-obsidian-soft hover:bg-gold/10 text-gold-pale font-bold rounded-full text-xs transition">
                      Verified Pandits Directory
                    </Link>
                  </div>
                </div>

                <p className="text-[11px] text-stone-500 text-center leading-relaxed">
                  Calculated with the {result.meta.ayanamsa ? pretty(result.meta.ayanamsa) : 'Lahiri'} ayanamsa using whole-sign houses.
                  Astrology is offered for spiritual guidance and personal reflection, not as a substitute for medical, legal or financial advice.
                </p>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: KUNDLI MATCHING (Ashtakoot Milan)
           ========================================================================= */}
        {auth === 'in' && enabled !== false && activeTab === 'matching' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!matchLoading) void matchKundli();
              }}
              className={`${cardClass} space-y-6`}
              noValidate
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Partner 1 (e.g. Groom / वर) */}
                <div className="p-4 rounded-xl border border-gold/20 bg-stone-900/40 space-y-3.5">
                  <div className="flex items-center gap-2 border-b border-gold/15 pb-2.5">
                    <span className="w-6 h-6 rounded-full bg-gold/20 text-gold flex items-center justify-center text-xs font-bold">1</span>
                    <h3 className="font-serif text-base font-bold text-gold-pale">Partner 1 (Groom / First Person)</h3>
                  </div>

                  <div>
                    <label className={labelClass}>Full Name <span className="text-stone-500 font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={nameA}
                      maxLength={60}
                      onChange={(e) => setNameA(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      aria-label="Partner 1 full name"
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Date of birth <span className="text-red-400">*</span></label>
                      <input
                        type="date"
                        aria-label="Partner 1 date of birth"
                        value={dateA}
                        min="1900-01-01"
                        max={todayLocal()}
                        onChange={(e) => setDateA(e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Time of birth</label>
                      <input
                        type="time"
                        aria-label="Partner 1 time of birth"
                        value={timeA}
                        disabled={unknownTimeA}
                        onChange={(e) => setTimeA(e.target.value)}
                        className={`${inputClass} disabled:opacity-40`}
                      />
                      <label className="mt-1.5 flex items-center gap-1.5 text-[11px] text-stone-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={unknownTimeA}
                          onChange={(e) => setUnknownTimeA(e.target.checked)}
                          className="accent-amber-500"
                        />
                        Time not known
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Place of birth <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={placeA}
                      maxLength={120}
                      onChange={(e) => {
                        setPlaceA(e.target.value);
                        setPlaceIdA(null);
                        setCandidatesA(null);
                      }}
                      placeholder="City, State (e.g. Delhi, India)"
                      aria-label="Partner 1 place of birth"
                      className={inputClass}
                    />
                  </div>

                  {candidatesA && (
                    <div className="rounded-xl border border-gold/25 bg-gold/5 p-2.5 space-y-1.5">
                      <p className="text-xs font-semibold text-gold-pale">Select Partner 1 location:</p>
                      {candidatesA.map((c) => (
                        <button
                          key={c.placeId}
                          type="button"
                          onClick={() => {
                            setPlaceIdA(c.placeId);
                            setPlaceA([c.name, c.state, c.country].filter(Boolean).join(', '));
                            setCandidatesA(null);
                            void matchKundli(c.placeId, placeIdB);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg border border-stone-700 hover:border-gold bg-stone-900 text-xs text-white transition"
                        >
                          {[c.name, c.state, c.country].filter(Boolean).join(', ')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Partner 2 (e.g. Bride / वधू) */}
                <div className="p-4 rounded-xl border border-gold/20 bg-stone-900/40 space-y-3.5">
                  <div className="flex items-center gap-2 border-b border-gold/15 pb-2.5">
                    <span className="w-6 h-6 rounded-full bg-gold/20 text-gold flex items-center justify-center text-xs font-bold">2</span>
                    <h3 className="font-serif text-base font-bold text-gold-pale">Partner 2 (Bride / Second Person)</h3>
                  </div>

                  <div>
                    <label className={labelClass}>Full Name <span className="text-stone-500 font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={nameB}
                      maxLength={60}
                      onChange={(e) => setNameB(e.target.value)}
                      placeholder="e.g. Priya Verma"
                      aria-label="Partner 2 full name"
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Date of birth <span className="text-red-400">*</span></label>
                      <input
                        type="date"
                        aria-label="Partner 2 date of birth"
                        value={dateB}
                        min="1900-01-01"
                        max={todayLocal()}
                        onChange={(e) => setDateB(e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Time of birth</label>
                      <input
                        type="time"
                        aria-label="Partner 2 time of birth"
                        value={timeB}
                        disabled={unknownTimeB}
                        onChange={(e) => setTimeB(e.target.value)}
                        className={`${inputClass} disabled:opacity-40`}
                      />
                      <label className="mt-1.5 flex items-center gap-1.5 text-[11px] text-stone-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={unknownTimeB}
                          onChange={(e) => setUnknownTimeB(e.target.checked)}
                          className="accent-amber-500"
                        />
                        Time not known
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Place of birth <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={placeB}
                      maxLength={120}
                      onChange={(e) => {
                        setPlaceB(e.target.value);
                        setPlaceIdB(null);
                        setCandidatesB(null);
                      }}
                      placeholder="City, State (e.g. Mumbai, Maharashtra)"
                      aria-label="Partner 2 place of birth"
                      className={inputClass}
                    />
                  </div>

                  {candidatesB && (
                    <div className="rounded-xl border border-gold/25 bg-gold/5 p-2.5 space-y-1.5">
                      <p className="text-xs font-semibold text-gold-pale">Select Partner 2 location:</p>
                      {candidatesB.map((c) => (
                        <button
                          key={c.placeId}
                          type="button"
                          onClick={() => {
                            setPlaceIdB(c.placeId);
                            setPlaceB([c.name, c.state, c.country].filter(Boolean).join(', '));
                            setCandidatesB(null);
                            void matchKundli(placeIdA, c.placeId);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg border border-stone-700 hover:border-gold bg-stone-900 text-xs text-white transition"
                        >
                          {[c.name, c.state, c.country].filter(Boolean).join(', ')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {matchError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{matchError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-stone-300">Language:</span>
                  {(['en', 'hi'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLang(l)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                        lang === l
                          ? 'bg-gold text-obsidian border-gold'
                          : 'bg-obsidian-soft text-stone-300 border-stone-700 hover:border-gold/50'
                      }`}
                    >
                      {l === 'en' ? 'English' : 'हिन्दी'}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={matchLoading}
                  className="w-full sm:w-auto px-8 py-3 bg-gold hover:bg-gold-deep text-obsidian font-bold text-sm rounded-xl shadow-lg shadow-gold/20 transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {matchLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Calculating Ashtakoot Milan…
                    </>
                  ) : (
                    <>
                      <HeartHandshake className="w-4 h-4" /> Match Kundlis (Calculate Milan)
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Ashtakoot Milan Feature Explainer Grid */}
            {!matchResult && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-8">
                {[
                  ['36 Gunas System', 'Classical Vedic Ashtakoot score evaluating 8 critical harmony dimensions'],
                  ['Nadi Dosha Check', 'Verification of genetic & physiological compatibility according to Ayurveda'],
                  ['Bhakoot Harmony', 'Moon sign placement analysis ensuring mutual emotional & familial welfare'],
                  ['Dosha Remedies', 'Immediate guidance & consultation options if major doshas are detected'],
                ].map(([t, d]) => (
                  <div key={t} className={cardClass}>
                    <DiyaIcon size={20} className="mb-2" />
                    <h3 className="font-serif text-sm font-bold text-gold-pale">{t}</h3>
                    <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">{d}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Match Results View */}
            {matchResult && matchSubmitted && (
              <div ref={matchResultRef} className="mt-8 space-y-6 scroll-mt-24">
                {/* Result Top Summary Card */}
                <div className="bg-obsidian-soft border border-gold/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left space-y-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gold/15 text-gold border border-gold/30">
                        <Sparkles className="w-3.5 h-3.5" /> Ashtakoot Guna Milan Result
                      </span>
                      <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                        {matchSubmitted.nameA} &amp; {matchSubmitted.nameB}
                      </h2>
                      <p className="text-xs sm:text-sm text-stone-300">
                        Compatibility Score: <strong className="text-gold-pale">{matchResult.total}</strong> out of <strong className="text-white">{matchResult.max} Gunas</strong> ({matchResult.percentage}%)
                      </p>
                      <div className="pt-2">
                        <span
                          className={`inline-block px-4 py-1.5 rounded-full text-xs font-extrabold border ${
                            matchResult.total >= 28
                              ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                              : matchResult.total >= 18
                              ? 'bg-amber-950/50 border-gold/50 text-gold-pale'
                              : 'bg-red-950/50 border-red-500/50 text-red-300'
                          }`}
                        >
                          {matchResult.conclusion || (matchResult.total >= 18 ? 'Acceptable Vedic Match' : 'Consultation Recommended')}
                        </span>
                      </div>
                    </div>

                    {/* Circular Score Badge */}
                    <div className="shrink-0 flex flex-col items-center justify-center w-36 h-36 rounded-full border-4 border-gold/40 bg-gradient-to-b from-[#2a1e12] to-obsidian shadow-[0_0_25px_rgba(245,158,11,0.25)] text-center p-2">
                      <span className="font-serif text-3xl font-black text-gold">{matchResult.total}</span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">out of 36</span>
                      <span className="text-[10px] text-gold-soft font-semibold mt-0.5">{matchResult.percentage}% Score</span>
                    </div>
                  </div>

                  {/* Dosha Status Bar */}
                  <div className="mt-6 pt-6 border-t border-gold/15 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div
                      className={`p-3.5 rounded-xl border flex items-center gap-2.5 ${
                        matchResult.doshas.nadi
                          ? 'bg-red-950/30 border-red-500/30 text-red-200'
                          : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                      }`}
                    >
                      {matchResult.doshas.nadi ? (
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      <div>
                        <div className="font-bold">
                          {matchResult.doshas.nadi ? 'Nadi Dosha Detected (नाड़ी दोष)' : 'Nadi Dosha Free (नाड़ी दोष मुक्त)'}
                        </div>
                        <div className="text-[10px] opacity-80">
                          {matchResult.doshas.nadi
                            ? 'Same Nadi observed. Astrological consultation & remedies recommended.'
                            : 'Complementary physiological and genetic energies.'}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`p-3.5 rounded-xl border flex items-center gap-2.5 ${
                        matchResult.doshas.bhakoot
                          ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                          : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                      }`}
                    >
                      {matchResult.doshas.bhakoot ? (
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      <div>
                        <div className="font-bold">
                          {matchResult.doshas.bhakoot ? 'Bhakoot Dosha Detected (भकूट दोष)' : 'Bhakoot Dosha Free (भकूट दोष मुक्त)'}
                        </div>
                        <div className="text-[10px] opacity-80">
                          {matchResult.doshas.bhakoot
                            ? 'Planetary angle warrants deeper chart inspection.'
                            : 'Auspicious mutual Moon signs ensuring family happiness.'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Side-by-side Astral Traits (Rashi, Nakshatra, Gana, Nadi, Yoni) */}
                <div className={cardClass}>
                  <h3 className="font-serif text-lg font-bold text-gold-pale mb-4">Astral Traits Comparison</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl border border-gold/15 bg-stone-900/40 space-y-2">
                      <div className="font-bold text-gold border-b border-gold/15 pb-1 mb-2">
                        {matchSubmitted.nameA} (Partner 1)
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-800">
                        <span className="text-stone-400">Moon Sign (Rashi)</span>
                        <span className="font-semibold text-white capitalize">{pretty(matchResult.personA?.rashi)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-800">
                        <span className="text-stone-400">Birth Nakshatra</span>
                        <span className="font-semibold text-white capitalize">{pretty(matchResult.personA?.nakshatra)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-800">
                        <span className="text-stone-400">Gana</span>
                        <span className="font-semibold text-white capitalize">{pretty(matchResult.personA?.gana)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-800">
                        <span className="text-stone-400">Nadi</span>
                        <span className="font-semibold text-white capitalize">{pretty(matchResult.personA?.nadi)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-stone-400">Yoni</span>
                        <span className="font-semibold text-white capitalize">{pretty(matchResult.personA?.yoni)}</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-gold/15 bg-stone-900/40 space-y-2">
                      <div className="font-bold text-gold border-b border-gold/15 pb-1 mb-2">
                        {matchSubmitted.nameB} (Partner 2)
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-800">
                        <span className="text-stone-400">Moon Sign (Rashi)</span>
                        <span className="font-semibold text-white capitalize">{pretty(matchResult.personB?.rashi)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-800">
                        <span className="text-stone-400">Birth Nakshatra</span>
                        <span className="font-semibold text-white capitalize">{pretty(matchResult.personB?.nakshatra)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-800">
                        <span className="text-stone-400">Gana</span>
                        <span className="font-semibold text-white capitalize">{pretty(matchResult.personB?.gana)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-800">
                        <span className="text-stone-400">Nadi</span>
                        <span className="font-semibold text-white capitalize">{pretty(matchResult.personB?.nadi)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-stone-400">Yoni</span>
                        <span className="font-semibold text-white capitalize">{pretty(matchResult.personB?.yoni)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Complete 8 Kootas Detailed Table */}
                <div className={cardClass}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif text-lg font-bold text-gold-pale">Ashtakoot (8 Kootas) Breakdown</h3>
                    <span className="text-xs font-semibold text-stone-400">Maximum: 36 Points</span>
                  </div>
                  <div className="overflow-x-auto -mx-1">
                    <table className="w-full sm:min-w-[34rem] text-xs text-left">
                      <thead>
                        <tr className="text-stone-400 border-b border-gold/15">
                          <th className="py-2.5 px-2 font-semibold">Koota</th>
                          <th className="hidden md:table-cell py-2.5 px-2 font-semibold">Significance</th>
                          <th className="py-2.5 px-2 font-semibold text-center">Score</th>
                          <th className="py-2.5 px-2 font-semibold text-center">Max</th>
                          <th className="hidden sm:table-cell py-2.5 px-2 font-semibold">Alignment Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchResult.kootas.map((k) => (
                          <tr key={k.name} className="border-b border-gold/10 last:border-0 text-stone-200">
                            <td className="py-2.5 px-2 font-semibold text-white md:whitespace-nowrap">
                              {k.label || pretty(k.name)}
                              <span className="md:hidden block text-[10px] text-stone-400 font-normal leading-tight mt-0.5">
                                {KOOTA_EXPLANATIONS[k.name]}
                              </span>
                              {k.note && <span className="sm:hidden block text-[10px] text-stone-300 font-normal leading-tight mt-0.5">{k.note}</span>}
                            </td>
                            <td className="hidden md:table-cell py-2.5 px-2 text-stone-400 max-w-[14rem]">
                              {KOOTA_EXPLANATIONS[k.name] || 'Vedic marital compatibility dimension'}
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-gold">
                              {k.score}
                            </td>
                            <td className="py-2.5 px-2 text-center text-stone-400">
                              {k.max}
                            </td>
                            <td className="hidden sm:table-cell py-2.5 px-2 text-stone-300">
                              {k.note || 'Calculated'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gold/30 font-bold text-white">
                          <td className="py-3 px-2 text-gold-pale font-serif text-sm">
                            Total Ashtakoot Guna Milan Score
                          </td>
                          <td className="hidden md:table-cell" />
                          <td className="py-3 px-2 text-center text-gold font-serif text-base">
                            {matchResult.total}
                          </td>
                          <td className="py-3 px-2 text-center text-stone-300">
                            36
                          </td>
                          <td className="hidden sm:table-cell py-3 px-2 text-xs text-gold-soft">
                            {matchResult.total >= 18 ? 'Acceptable Vedic Alliance' : 'Caution / Remedies Advised'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Consult Pandit CTA and Reset */}
                <div className="rounded-3xl border border-gold/30 bg-gradient-to-br from-gold/15 via-obsidian-soft to-obsidian p-6 sm:p-8 text-center space-y-4">
                  <DiyaIcon size={32} className="mx-auto" />
                  <h3 className="font-serif text-2xl font-bold text-white">
                    Need Personalized Astrological Guidance on this Match?
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-300 max-w-lg mx-auto leading-relaxed">
                    While automated Guna Milan provides a solid foundation, deep horoscope compatibility (Kundli Milan) requires analyzing D9 Navamsa, Mars placement (Mangal Dosha), and Dasha timing. Connect directly with our verified Vedic Astrologers.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <Link
                      href="/pooja"
                      className="px-6 py-2.5 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full text-xs shadow-lg shadow-gold/20 transition flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Book Astrologer Consultation
                    </Link>
                    <button
                      type="button"
                      onClick={resetMatch}
                      className="flex items-center gap-1.5 px-5 py-2.5 border border-stone-700 hover:border-gold rounded-full text-xs font-semibold text-stone-300 hover:text-white transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Match Another Kundli
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={cardClass}>
      <span className="block text-stone-400 text-xs mb-1">{label}</span>
      <span className="block font-serif text-lg font-bold text-white truncate">{value}</span>
      {sub && <span className="block text-[11px] text-stone-500 mt-0.5 truncate">{sub}</span>}
    </div>
  );
}
