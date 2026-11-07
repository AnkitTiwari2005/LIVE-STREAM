'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Video,
  Users,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { OmIcon, CoinIcon, DiyaIcon, PranamIcon, VerifiedPanditBadge } from '@/components/icons/SpiritualIcons';

interface EarningsData {
  totalStreams: number;
  totalDakshinaInr: number;
  netEarningsInr: number;
  platformFeeInr: number;
  panditSharePercentage: number;
  totalWatchMinutes: number;
  totalCoinsConsumed: number;
  recentDakshina: Array<{
    id: string;
    amount: number;
    devoteeName: string;
    createdAt: string;
    streamTitle: string;
  }>;
}

export default function StreamerEarningsPage() {
  const router = useRouter();
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [pastStreams, setPastStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dakshina' | 'pastStreams'>('dakshina');

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
      setUser(parsedUser);
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
        fetch(`${apiUrl}/streamers/earnings`, { headers }),
        fetch(`${apiUrl}/streams/streamer/past`, { headers }),
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

  return (
    <div className="min-h-screen bg-obsidian text-foreground py-10 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-5 lg:px-8 w-full">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-gold/15">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 text-gold-pale text-xs font-bold border border-gold/30 mb-2">
              <VerifiedPanditBadge size={14} /> Acharya Revenue &amp; Dakshina Portal
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white flex items-center gap-2.5">
              <OmIcon size={28} /> Pandit Earnings Dashboard
            </h1>
            <p className="text-stone-400 text-xs sm:text-sm mt-1">
              Transparent breakdown of devotee dakshina, live chanting minutes, and settlement payouts.
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
          <p className="text-sm">Calculating sacred earnings and dakshina records...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg">
              <span className="text-xs font-semibold text-stone-400 block mb-1">
                Net Earnings ({earnings?.panditSharePercentage || 85}% Share)
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-black text-amber-400">
                  ₹{earnings ? earnings.netEarningsInr.toLocaleString('en-IN') : 0}
                </span>
              </div>
              <span className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Direct Bank Payout Scheduled
              </span>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg">
              <span className="text-xs font-semibold text-stone-400 block mb-1">Total Dakshina Received</span>
              <div className="flex items-center gap-2 mt-1">
                <DiyaIcon size={24} />
                <span className="text-2xl font-black text-white">
                  ₹{earnings ? earnings.totalDakshinaInr.toLocaleString('en-IN') : 0}
                </span>
              </div>
              <span className="text-[11px] text-stone-500 mt-1 block">From devout community offerings</span>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg">
              <span className="text-xs font-semibold text-stone-400 block mb-1">Devotee Chanting Minutes</span>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-5 h-5 text-orange-400" />
                <span className="text-2xl font-black text-orange-400">
                  {earnings ? earnings.totalWatchMinutes : 0} mins
                </span>
              </div>
              <span className="text-[11px] text-stone-500 mt-1 block">
                {earnings ? earnings.totalCoinsConsumed : 0} coins utilized
              </span>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg">
              <span className="text-xs font-semibold text-stone-400 block mb-1">Completed Ceremonies</span>
              <div className="flex items-center gap-2 mt-1">
                <Video className="w-5 h-5 text-stone-300" />
                <span className="text-2xl font-black text-stone-100">{pastStreams.length}</span>
              </div>
              <span className="text-[11px] text-stone-500 mt-1 block">Live & private rituals</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
            <button
              onClick={() => setActiveTab('dakshina')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'dakshina'
                  ? 'bg-orange-600 text-white'
                  : 'text-stone-400 hover:text-white hover:bg-stone-900'
              }`}
            >
              Devotee Dakshina ({earnings?.recentDakshina?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('pastStreams')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'pastStreams'
                  ? 'bg-orange-600 text-white'
                  : 'text-stone-400 hover:text-white hover:bg-stone-900'
              }`}
            >
              Past Broadcasts ({pastStreams.length})
            </button>
          </div>

          {/* Tab Content: Devotee Dakshina */}
          {activeTab === 'dakshina' && (
            <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 bg-stone-950/60 border-b border-stone-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <DiyaIcon size={18} /> Recent Sacred Dakshina Offerings
                </h3>
                <span className="text-xs text-stone-500 font-medium">85% Net Disbursal</span>
              </div>

              {!earnings?.recentDakshina || earnings.recentDakshina.length === 0 ? (
                <div className="p-12 text-center text-stone-400 text-sm space-y-2">
                  <PranamIcon size={36} className="mx-auto" />
                  <p>No dakshina offerings recorded yet.</p>
                  <p className="text-xs text-stone-500">
                    When devotees offer Dakshina during your live poojas, they appear here instantly.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-stone-800">
                  {earnings.recentDakshina.map((d) => (
                    <div
                      key={d.id}
                      className="p-4 flex items-center justify-between gap-4 hover:bg-stone-800/40 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-600/30 flex items-center justify-center text-amber-400 shrink-0">
                          <DiyaIcon size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{d.devoteeName}</h4>
                          <span className="text-xs text-stone-400 block">{d.streamTitle}</span>
                          <span className="text-[11px] text-stone-500">
                            {new Date(d.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-extrabold text-amber-400">₹{d.amount}</span>
                        <span className="text-[10px] text-stone-500 block">
                          Net: ₹{(d.amount * 0.85).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Content: Past Broadcasts */}
          {activeTab === 'pastStreams' && (
            <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 bg-stone-950/60 border-b border-stone-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Video className="w-4 h-4 text-orange-400" /> Completed Ritual Broadcasts
                </h3>
                <span className="text-xs text-stone-500 font-medium">Recorded Session Ledger</span>
              </div>

              {pastStreams.length === 0 ? (
                <div className="p-12 text-center text-stone-400 text-sm space-y-2">
                  <Video className="w-8 h-8 mx-auto text-stone-600" />
                  <p>No past broadcasts found.</p>
                  <Link
                    href="/studio/create"
                    className="inline-block mt-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition"
                  >
                    Setup First Broadcast
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-stone-800">
                  {pastStreams.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-800/40 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 bg-stone-800 px-2 py-0.5 rounded">
                            {s.category?.name || 'Vedic Ritual'}
                          </span>
                          <span className="text-[10px] font-semibold text-stone-500">
                            {s.visibility === 'PRIVATE' ? 'Private Consultation' : 'Public Darshan'}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">{s.title}</h4>
                        <span className="text-xs text-stone-400">
                          {s.startedAt
                            ? new Date(s.startedAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })
                            : 'Date not recorded'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-stone-300">
                        {s.durationSeconds && (
                          <span className="flex items-center gap-1 text-stone-400">
                            <Clock className="w-3.5 h-3.5" />
                            {Math.floor(s.durationSeconds / 60)} mins
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-stone-400">
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
