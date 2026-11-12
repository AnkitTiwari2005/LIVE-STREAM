'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Video,
  Users,
  RefreshCw,
  ShieldCheck,
  Coins,
  Radio,
} from 'lucide-react';
import {
  OmIcon,
  CoinIcon,
  DiyaIcon,
  PranamIcon,
  VerifiedPanditBadge,
} from '@/components/icons/SpiritualIcons';
import {
  COINS_PER_100_INR,
  COINS_PER_MINUTE,
  STREAMER_SHARE_PERCENT,
  formatInrAmount,
} from '@/lib/economy';

interface PerStreamEarningItem {
  streamId: string;
  title: string;
  visibility: string;
  status: string;
  startedAt: string | null;
  dakshinaCoins: number;
  watchTimeCoins: number;
  totalCoins: number;
  grossInr: number;
  netInr: number;
  platformFeeInr: number;
}

interface RecentDakshinaItem {
  id: string;
  coins: number;
  isLegacyInr: boolean;
  legacyAmountInr: number | null;
  grossInr: number;
  netInr: number;
  platformFeeInr: number;
  devoteeName: string;
  createdAt: string;
  streamId: string;
  streamTitle: string;
}

interface EarningsData {
  totalStreams: number;
  totalCoins: number;
  dakshinaCoins: number;
  watchTimeCoins: number;
  grossInr: number;
  netEarningsInr: number;
  platformFeeInr: number;
  panditSharePercentage: number;
  coinsPer100Inr: number;
  totalWatchMinutes: number;
  totalCoinsConsumed: number;
  perStreamEarnings: PerStreamEarningItem[];
  recentDakshina: RecentDakshinaItem[];
  legacyInr?: {
    totalDakshinaInr: number;
    netEarningsInr: number;
    platformFeeInr: number;
    count: number;
  };
}

export default function StreamerEarningsPage() {
  const router = useRouter();
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [pastStreams, setPastStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'perStream' | 'dakshina' | 'pastStreams'>('perStream');

  const loadData = async () => {
    setLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('pooja_token') : null;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('pooja_user') : null;

    if (!token || !storedUser) {
      router.push('/login?redirect=/streamer/earnings');
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.role !== 'STREAMER' && parsedUser.role !== 'ADMIN') {
        router.push('/');
        return;
      }
    } catch {
      router.push('/login');
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [earningsRes, pastRes] = await Promise.all([
        fetch(`${apiUrl}/streamers/earnings`, { headers, cache: 'no-store' }),
        fetch(`${apiUrl}/streams/streamer/past`, { headers, cache: 'no-store' }),
      ]);

      if (earningsRes.ok) {
        setEarnings(await earningsRes.json());
      }
      if (pastRes.ok) {
        setPastStreams(await pastRes.json());
      }
    } catch (err) {
      console.error('Failed to load streamer earnings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const sharePercent = earnings?.panditSharePercentage ?? STREAMER_SHARE_PERCENT;
  const coinsPer100 = earnings?.coinsPer100Inr ?? COINS_PER_100_INR;

  return (
    <div className="min-h-screen bg-obsidian text-foreground py-10 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-5 lg:px-8 w-full">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-gold/15">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 text-gold-pale text-xs font-bold border border-gold/30 mb-2">
              <VerifiedPanditBadge size={14} /> Acharya Coin Revenue &amp; Dakshina Portal
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white flex items-center gap-2.5">
              <OmIcon size={28} /> Pandit Earnings Dashboard
            </h1>
            <p className="text-stone-400 text-xs sm:text-sm mt-1">
              Coin-based Dakshina &amp; live chanting watch-time ledger ({coinsPer100} coins = ₹100 • {sharePercent}% Acharya share).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2.5 bg-obsidian-soft hover:bg-stone-800 border border-gold/20 rounded-full text-stone-300 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 text-gold ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/studio/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full text-xs shadow-lg shadow-gold/20 transition"
            >
              <Video className="w-4 h-4" /> Go Live Now
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-stone-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-orange-500" />
            <p className="text-sm">Calculating sacred coin earnings and dakshina records...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Primary Coin-First KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Coins Earned */}
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm dark:shadow-lg">
                <span className="text-xs font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                  Total Coins Earned
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <CoinIcon size={24} />
                  <span className="text-2xl font-black text-amber-700 dark:text-gold">
                    {(earnings?.totalCoins ?? 0).toLocaleString('en-IN')} Coins
                  </span>
                </div>
                <span className="text-[11px] text-stone-600 dark:text-stone-400 mt-1 block">
                  Gross Value: ₹{formatInrAmount(earnings?.grossInr ?? 0)}
                </span>
              </div>

              {/* Net INR Payout */}
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm dark:shadow-lg">
                <span className="text-xs font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                  Net INR Equivalent ({sharePercent}% Share)
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                    ₹{formatInrAmount(earnings?.netEarningsInr ?? 0)}
                  </span>
                </div>
                <span className="text-[11px] text-stone-600 dark:text-stone-400 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <span>
                    Fee ({100 - sharePercent}%): ₹{formatInrAmount(earnings?.platformFeeInr ?? 0)}
                  </span>
                </span>
              </div>

              {/* Dakshina vs Watch-Time Split */}
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm dark:shadow-lg">
                <span className="text-xs font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                  Dakshina vs Watch-Time Split
                </span>
                <div className="mt-1 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-900 dark:text-white">
                    <span className="inline-flex items-center gap-1.5">
                      <DiyaIcon size={15} className="text-amber-700 dark:text-amber-400" />
                      Dakshina
                    </span>
                    <span className="text-amber-700 dark:text-amber-400">
                      {(earnings?.dakshinaCoins ?? 0).toLocaleString('en-IN')} C
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-stone-900 dark:text-white">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-orange-700 dark:text-orange-400" />
                      Watch-Time
                    </span>
                    <span className="text-orange-700 dark:text-orange-400">
                      {(earnings?.watchTimeCoins ?? 0).toLocaleString('en-IN')} C
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-stone-600 dark:text-stone-400 mt-1.5 block">
                  {COINS_PER_MINUTE} coins / watched minute
                </span>
              </div>

              {/* Watch Minutes & Streams */}
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm dark:shadow-lg">
                <span className="text-xs font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                  Devotee Chanting Minutes
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-5 h-5 text-orange-700 dark:text-orange-400" />
                  <span className="text-2xl font-black text-orange-700 dark:text-orange-400">
                    {(earnings?.totalWatchMinutes ?? 0).toLocaleString('en-IN')} mins
                  </span>
                </div>
                <span className="text-[11px] text-stone-600 dark:text-stone-400 mt-1 block">
                  Across {earnings?.totalStreams ?? 0} sacred broadcasts
                </span>
              </div>
            </div>

            {/* Conditional Legacy INR History Notice (pre-cutover direct Razorpay rows) */}
            {earnings?.legacyInr && earnings.legacyInr.count > 0 && (
              <div className="rounded-2xl border border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-950 dark:text-amber-200">
                <div>
                  <span className="font-bold">Legacy Direct-INR Dakshina History ({earnings.legacyInr.count} offerings): </span>
                  <span>
                    Gross ₹{formatInrAmount(earnings.legacyInr.totalDakshinaInr)} • Net ({sharePercent}%) ₹
                    {formatInrAmount(earnings.legacyInr.netEarningsInr)}
                  </span>
                </div>
                <span className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold">
                  Preserved separately from Coin Ledger
                </span>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-3">
              <button
                onClick={() => setActiveTab('perStream')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'perStream'
                    ? 'bg-orange-700 text-white shadow-sm'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-900'
                }`}
              >
                Per-Stream Breakdown ({earnings?.perStreamEarnings?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('dakshina')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'dakshina'
                    ? 'bg-orange-700 text-white shadow-sm'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-900'
                }`}
              >
                Recent Dakshina ({earnings?.recentDakshina?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('pastStreams')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'pastStreams'
                    ? 'bg-orange-700 text-white shadow-sm'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-900'
                }`}
              >
                Past Broadcasts ({pastStreams.length})
              </button>
            </div>

            {/* Tab 1: Per-Stream Coin & INR Earnings Breakdown */}
            {activeTab === 'perStream' && (
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
                <div className="p-4 bg-stone-50 dark:bg-stone-950/60 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-700 dark:text-amber-400" /> Earnings by Broadcast
                  </h3>
                  <span className="text-xs text-stone-600 dark:text-stone-400 font-medium">
                    {coinsPer100} Coins = ₹100 ({sharePercent}% Net)
                  </span>
                </div>

                {!earnings?.perStreamEarnings || earnings.perStreamEarnings.length === 0 ? (
                  <div className="p-12 text-center text-stone-600 dark:text-stone-400 text-sm space-y-2">
                    <PranamIcon size={36} className="mx-auto" />
                    <p>No broadcast earnings recorded yet.</p>
                    <p className="text-xs">
                      Go live to start earning Watch-Time coins and Sacred Dakshina from devotees.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-100 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Broadcast</th>
                          <th className="py-3 px-4 text-right">Dakshina</th>
                          <th className="py-3 px-4 text-right">Watch-Time</th>
                          <th className="py-3 px-4 text-right">Total Coins</th>
                          <th className="py-3 px-4 text-right">Net INR ({sharePercent}%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                        {earnings.perStreamEarnings.map((item) => (
                          <tr
                            key={item.streamId}
                            className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2 mb-0.5">
                                {item.status === 'LIVE' && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold">
                                    <Radio className="w-2.5 h-2.5" /> LIVE
                                  </span>
                                )}
                                <span className="text-[10px] font-semibold text-stone-600 dark:text-stone-400 uppercase">
                                  {item.visibility}
                                </span>
                              </div>
                              <div className="font-bold text-stone-900 dark:text-white">{item.title}</div>
                              <div className="text-[11px] text-stone-500 dark:text-stone-400">
                                {item.startedAt
                                  ? new Date(item.startedAt).toLocaleString('en-IN', {
                                      dateStyle: 'medium',
                                      timeStyle: 'short',
                                    })
                                  : 'Not yet started'}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right font-semibold text-stone-800 dark:text-stone-200 whitespace-nowrap">
                              {item.dakshinaCoins.toLocaleString('en-IN')} C
                            </td>
                            <td className="py-3.5 px-4 text-right font-semibold text-stone-800 dark:text-stone-200 whitespace-nowrap">
                              {item.watchTimeCoins.toLocaleString('en-IN')} C
                            </td>
                            <td className="py-3.5 px-4 text-right font-extrabold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                              {item.totalCoins.toLocaleString('en-IN')} C
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                                ₹{formatInrAmount(item.netInr)}
                              </span>
                              <span className="block text-[10px] text-stone-500 dark:text-stone-400">
                                Gross ₹{formatInrAmount(item.grossInr)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Devotee Dakshina */}
            {activeTab === 'dakshina' && (
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
                <div className="p-4 bg-stone-50 dark:bg-stone-950/60 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                    <DiyaIcon size={18} className="text-amber-700 dark:text-amber-400" /> Recent Sacred Dakshina Offerings
                  </h3>
                  <span className="text-xs text-stone-600 dark:text-stone-400 font-medium">
                    {sharePercent}% Net Disbursal
                  </span>
                </div>

                {!earnings?.recentDakshina || earnings.recentDakshina.length === 0 ? (
                  <div className="p-12 text-center text-stone-600 dark:text-stone-400 text-sm space-y-2">
                    <PranamIcon size={36} className="mx-auto" />
                    <p>No dakshina offerings recorded yet.</p>
                    <p className="text-xs text-stone-600 dark:text-stone-400">
                      When devotees offer Coin Dakshina during your live poojas, they appear here instantly.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-200 dark:divide-stone-800">
                    {earnings.recentDakshina.map((d) => (
                      <div
                        key={d.id}
                        className="p-4 flex items-center justify-between gap-4 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-600/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                            <CoinIcon size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-stone-900 dark:text-white">{d.devoteeName}</h4>
                              {d.isLegacyInr && (
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                                  Legacy INR
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-stone-600 dark:text-stone-400 block">{d.streamTitle}</span>
                            <span className="text-[11px] text-stone-600 dark:text-stone-400">
                              {new Date(d.createdAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {d.isLegacyInr ? (
                            <span className="text-base font-extrabold text-amber-700 dark:text-amber-400">
                              ₹{formatInrAmount(d.legacyAmountInr ?? d.grossInr)}
                            </span>
                          ) : (
                            <span className="text-base font-extrabold text-amber-700 dark:text-amber-400 inline-flex items-center gap-1 justify-end">
                              <CoinIcon size={15} />
                              <span>{d.coins.toLocaleString('en-IN')} Coins</span>
                            </span>
                          )}
                          <span className="text-[10px] text-stone-600 dark:text-stone-400 block">
                            Gross ₹{formatInrAmount(d.grossInr)} • Net ₹{formatInrAmount(d.netInr)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Past Broadcasts */}
            {activeTab === 'pastStreams' && (
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
                <div className="p-4 bg-stone-50 dark:bg-stone-950/60 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                    <Video className="w-4 h-4 text-orange-700 dark:text-orange-400" /> Completed Ritual Broadcasts
                  </h3>
                  <span className="text-xs text-stone-600 dark:text-stone-400 font-medium">Recorded Session Ledger</span>
                </div>

                {pastStreams.length === 0 ? (
                  <div className="p-12 text-center text-stone-600 dark:text-stone-400 text-sm space-y-2">
                    <Video className="w-8 h-8 mx-auto text-stone-500 dark:text-stone-600" />
                    <p>No past broadcasts found.</p>
                    <Link
                      href="/studio/create"
                      className="inline-block mt-2 px-4 py-2 bg-orange-700 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition"
                    >
                      Setup First Broadcast
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-200 dark:divide-stone-800">
                    {pastStreams.map((s) => (
                      <div
                        key={s.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded">
                              {s.category?.name || 'Vedic Ritual'}
                            </span>
                            <span className="text-[10px] font-semibold text-stone-600 dark:text-stone-400">
                              {s.visibility === 'PRIVATE' ? 'Private Consultation' : 'Public Darshan'}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-stone-900 dark:text-white">{s.title}</h4>
                          <span className="text-xs text-stone-600 dark:text-stone-400">
                            {s.startedAt
                              ? new Date(s.startedAt).toLocaleString('en-IN', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })
                              : 'Date not recorded'}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-stone-600 dark:text-stone-300">
                          {s.durationSeconds && (
                            <span className="flex items-center gap-1 text-stone-500 dark:text-stone-400">
                              <Clock className="w-3.5 h-3.5" />
                              {Math.floor(s.durationSeconds / 60)} mins
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-stone-500 dark:text-stone-400">
                            <Users className="w-3.5 h-3.5" />
                            {s.peakViewers || 0} peak viewers
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
