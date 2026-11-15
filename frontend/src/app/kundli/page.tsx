'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Calendar, Clock, MapPin, Orbit, RefreshCw, RotateCcw } from 'lucide-react';
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

const inputClass =
  'w-full px-3.5 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-sm text-white focus:outline-none focus:border-gold';
const labelClass = 'block text-xs font-semibold text-stone-300 mb-1';
const cardClass = 'bg-obsidian-soft border border-gold/20 rounded-2xl p-5 shadow-lg';

export default function KundliPage() {
  const [auth, setAuth] = useState<'checking' | 'in' | 'out'>('checking');
  const [enabled, setEnabled] = useState<boolean | null>(null);

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

  // Who is looking? (client only: the site is a static export, so read the stored session here)
  useEffect(() => {
    try {
      const token = localStorage.getItem('pooja_token');
      setAuth(token && !isJwtTokenExpired(token) ? 'in' : 'out');
    } catch {
      setAuth('out');
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    fetch(`${apiUrl}/kundli/status`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setEnabled(j ? !!j.enabled : null))
      .catch(() => setEnabled(null));
  }, []);

  // Keep the drawing in step with the site theme (the server caches, so a switch costs nothing).
  useEffect(() => {
    const read = () => setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);

  // Chart drawing: fetched as text, shown through <img> via a blob URL (scripts can never run there).
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

  const hindi = submitted?.lang === 'hi';
  const maha = result?.dasha?.mahadasha;

  return (
    <div className="min-h-screen bg-obsidian text-foreground py-10 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-5 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.2em] text-gold-pale mb-3">
            <Orbit className="w-3.5 h-3.5" /> Janam Kundli
          </p>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white">Your Vedic Birth Chart</h1>
          <p className="text-stone-400 text-sm sm:text-base mt-3 leading-relaxed">
            Lagna, moon sign, nakshatra, planetary positions, avakhada and your running dasha, calculated for your exact
            birth time and place.
          </p>
        </div>

        {/* Form / gate */}
        <div className="max-w-2xl mx-auto">
          {auth === 'checking' && (
            <div className={`${cardClass} text-center text-sm text-stone-400`} aria-busy="true">
              Loading…
            </div>
          )}

          {auth === 'out' && (
            <div className={`${cardClass} text-center`}>
              <OmIcon size={36} className="mx-auto mb-3" />
              <h2 className="font-serif text-xl font-bold text-white mb-1">Sign in to see your kundli</h2>
              <p className="text-xs sm:text-sm text-stone-400 mb-5">
                It is free for every devotee. Sign in or create an account to generate your chart.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={`/login?redirect=${encodeURIComponent('/kundli/')}`}
                  className="px-6 py-2.5 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full text-xs shadow-lg shadow-gold/20 transition"
                >
                  Sign in
                </Link>
                <Link
                  href={`/register?redirect=${encodeURIComponent('/kundli/')}`}
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
              <h2 className="font-serif text-xl font-bold text-white mb-1">Kundli is being set up</h2>
              <p className="text-xs sm:text-sm text-stone-400">
                This service is not switched on yet. Please check back soon.
              </p>
            </div>
          )}

          {auth === 'in' && enabled !== false && (
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
                Your birth details are sent to our astrology calculation partner only to compute this chart. They are not
                saved to your account or our database.
              </p>
            </form>
          )}
        </div>

        {/* What you get (before a result) */}
        {!result && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-10 max-w-4xl mx-auto">
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

        {/* Result */}
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold/30 bg-obsidian-soft hover:bg-gold/10 text-xs font-bold text-gold-pale transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> New kundli
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

            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Stat label="Lagna (Ascendant)" value={result.lagna ? signName(result.lagna.sign, hindi) : 'Needs birth time'} sub={result.lagna ? `${formatDegree(result.lagna.degree)} · ${pretty(result.lagna.nakshatra)} pada ${result.lagna.pada ?? '-'}` : undefined} />
              <Stat label="Moon sign (Rashi)" value={signName(result.moon?.sign, hindi)} />
              <Stat label="Birth nakshatra" value={pretty(result.moon?.nakshatra)} sub={result.moon?.pada ? `Pada ${result.moon.pada}` : undefined} />
              <Stat label="Running mahadasha" value={maha?.planet ? pretty(maha.planet) : '-'} sub={maha ? `${formatDate(maha.start)} to ${formatDate(maha.end)}` : undefined} />
            </div>

            {/* Chart */}
            <div className={cardClass}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="font-serif text-lg font-bold text-gold-pale">Chart</h3>
                <div className="flex flex-wrap gap-2">
                  <Toggle options={[['D1', 'Lagna (D1)'], ['D9', 'Navamsa (D9)']]} value={varga} onChange={(v) => setVarga(v as 'D1' | 'D9')} />
                  <Toggle options={[['north', 'North Indian'], ['south', 'South Indian']]} value={style} onChange={(v) => setStyle(v as 'north' | 'south')} />
                </div>
              </div>
              <div className="relative mx-auto w-full max-w-md aspect-square rounded-xl overflow-hidden border border-gold/15 bg-white/5 flex items-center justify-center">
                {chartUrl && !chartError && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={chartUrl}
                    alt={`${varga === 'D1' ? 'Lagna' : 'Navamsa'} chart in ${style === 'north' ? 'North' : 'South'} Indian style`}
                    className={`w-full h-full object-contain transition-opacity ${chartLoading ? 'opacity-40' : 'opacity-100'}`}
                  />
                )}
                {chartLoading && <RefreshCw className="absolute w-6 h-6 text-gold animate-spin" aria-label="Drawing chart" />}
                {chartError && !chartLoading && (
                  <p className="text-xs text-stone-400 px-6 text-center">The chart drawing could not be loaded. The tables below are complete.</p>
                )}
              </div>
            </div>

            {/* Planets */}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.avakhada && (
                <div className={cardClass}>
                  <h3 className="font-serif text-lg font-bold text-gold-pale mb-3">Avakhada</h3>
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
                  <h3 className="font-serif text-lg font-bold text-gold-pale mb-3">Vimshottari dasha today</h3>
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

            {/* Next step on the platform */}
            <div className="rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/10 to-transparent p-6 text-center">
              <h3 className="font-serif text-xl font-bold text-white">Want it read by a verified pandit?</h3>
              <p className="text-xs sm:text-sm text-stone-400 mt-1 mb-4">
                A chart is only the beginning. Book a personal session with one of our KYC-verified pandits.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/pooja" className="px-6 py-2.5 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full text-xs shadow-lg shadow-gold/20 transition">
                  Book a pooja
                </Link>
                <Link href="/#pandits" className="px-6 py-2.5 border border-gold/40 bg-obsidian-soft hover:bg-gold/10 text-gold-pale font-bold rounded-full text-xs transition">
                  Meet our pandits
                </Link>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 text-center leading-relaxed">
              Calculated with the {result.meta.ayanamsa ? pretty(result.meta.ayanamsa) : 'Lahiri'} ayanamsa using whole-sign houses. Astrology is
              offered for spiritual guidance and personal reflection, not as a substitute for medical, legal or financial advice.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={cardClass}>
      <span className="text-[11px] font-semibold text-stone-400 block">{label}</span>
      <span className="font-serif text-lg sm:text-xl font-bold text-gold block mt-1 break-words">{value}</span>
      {sub && <span className="text-[11px] text-stone-400 mt-1 block break-words">{sub}</span>}
    </div>
  );
}

function Toggle({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex rounded-full border border-gold/25 overflow-hidden text-[11px] font-bold" role="group">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`px-3 py-1.5 transition ${value === v ? 'bg-gold text-obsidian' : 'bg-obsidian-soft text-stone-300 hover:bg-gold/10'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
