'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  useTracks,
  VideoTrack,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { io, Socket } from 'socket.io-client';
import { ChatWidget } from '@/components/ChatWidget';
import { FloatingReactionsOverlay, DevotionalEmojiBar } from '@/components/SpiritualReactions';
import { DakshinaModal } from '@/components/DakshinaModal';
import { CoinTopupModal } from '@/components/CoinTopupModal';
import { Users, AlertCircle, Share2, Sparkles, Zap, Calendar, Bell, CheckCircle2, Clock, MessageSquare, Info, LogIn, Gift, Flame, Flag, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import {
  OmIcon,
  DiyaIcon,
  CoinIcon,
  PranamIcon,
  BellIcon,
  VerifiedPanditBadge,
} from '@/components/icons/SpiritualIcons';

export default function StreamPlayerClient() {
  const { id: paramId } = useParams() as { id: string };
  const [id, setId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.replace(/\/$/, '').split('/').filter(Boolean);
      const urlId = parts[parts.length - 1];
      if (urlId && urlId !== 'stream' && urlId !== 'demo' && urlId !== '[id]') {
        return urlId;
      }
    }
    return paramId || '';
  });

  const [stream, setStream] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loginRequired, setLoginRequired] = useState(false);
  const [streamEnded, setStreamEnded] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [reminderSet, setReminderSet] = useState(false);
  const [dakshinaModalOpen, setDakshinaModalOpen] = useState(false);
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [latestDakshina, setLatestDakshina] = useState<any>(null);
  const [mobileTab, setMobileTab] = useState<'chat' | 'details'>('chat');

  // Metered Coin State
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [remainingCoins, setRemainingCoins] = useState<number | null>(null);
  const [availableMinutes, setAvailableMinutes] = useState<number | null>(null);
  const [isZeroBalance, setIsZeroBalance] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Inappropriate Content / Conduct');
  const [reportDetails, setReportDetails] = useState('');
  const [reporting, setReporting] = useState(false);

  const meterIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.replace(/\/$/, '').split('/').filter(Boolean);
      const urlId = parts[parts.length - 1];
      if (urlId && urlId !== 'stream' && urlId !== 'demo' && urlId !== '[id]') {
        setId(urlId);
      }
    }
  }, [paramId]);

  useEffect(() => {
    const storedUser = localStorage.getItem('pooja_user');
    const storedToken = localStorage.getItem('pooja_token');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch {}
    }

    // Connect to WebSocket chat gateway
    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || '';
    const socketInstance = io(socketUrl, {
      auth: { token: storedToken },
      withCredentials: true,
    });
    setSocket(socketInstance);

    socketInstance.on('stream:dakshina_received', (dakshina: any) => {
      setLatestDakshina(dakshina);
      setTimeout(() => setLatestDakshina(null), 8000);
    });

    return () => {
      socketInstance.off('stream:dakshina_received');
      socketInstance.disconnect();
    };
  }, []);

  const fetchStreamAndToken = async () => {
    if (!id || id === 'demo') return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    const storedToken = localStorage.getItem('pooja_token');

    setError(null);
    setLoginRequired(false);

    try {
      // 1. Fetch stream details
      const streamRes = await fetch(`${apiUrl}/streams/${id}`);
      if (!streamRes.ok) throw new Error('Stream not found');
      const streamData = await streamRes.json();
      setStream(streamData);

      if (streamData.status === 'ENDED') {
        setStreamEnded(true);
        return;
      }

      if (streamData.status === 'SCHEDULED') {
        setIsScheduled(true);
        return;
      }

      setIsScheduled(false);
      setStreamEnded(false);

      // 2. Obtain subscriber LiveKit token (and meter session token)
      const headers: Record<string, string> = {};
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;

      const tokenRes = await fetch(`${apiUrl}/streams/${id}/token`, {
        method: 'POST',
        headers,
      });

      if (tokenRes.status === 401) {
        setLoginRequired(true);
        return;
      }

      if (tokenRes.status === 402) {
        setIsZeroBalance(true);
        setTopupModalOpen(true);
        return;
      }

      if (!tokenRes.ok) {
        const errJson = await tokenRes.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to join stream session');
      }

      const resData = await tokenRes.json();
      setToken(resData.token);
      setServerUrl(resData.serverUrl);

      if (resData.sessionToken) {
        setSessionToken(resData.sessionToken);
      }
      if (typeof resData.remainingCoins === 'number') {
        setRemainingCoins(resData.remainingCoins);
        setAvailableMinutes(resData.availableMinutes);
        setIsZeroBalance(false);
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to sacred stream');
    }
  };

  useEffect(() => {
    fetchStreamAndToken();
  }, [id]);

  // 60-Second Heartbeat Meter Loop
  useEffect(() => {
    if (!sessionToken || !id || isZeroBalance) return;

    if (meterIntervalRef.current) {
      clearInterval(meterIntervalRef.current);
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    const storedToken = localStorage.getItem('pooja_token');

    meterIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${apiUrl}/wallet/meter-tick`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${storedToken}`,
          },
          body: JSON.stringify({
            streamId: id,
            sessionToken,
          }),
        });

        if (res.status === 402) {
          setIsZeroBalance(true);
          setTopupModalOpen(true);
          if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
          return;
        }

        if (!res.ok) {
          // B-10: Transient network error - don't treat as zero balance, allow retry on next interval
          return;
        }

        const data = await res.json();
        if (data.canContinue) {
          setRemainingCoins(data.remainingCoins);
          if (typeof data.availableMinutes === 'number') {
            setAvailableMinutes(data.availableMinutes);
          }
          // B-07: Refresh LiveKit token seamlessly so participant is never disconnected
          if (data.livekitToken) {
            setToken(data.livekitToken);
          }
        } else {
          setIsZeroBalance(true);
          setTopupModalOpen(true);
          setToken(null);
          if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
        }
      } catch (err) {
        console.error('Meter tick error:', err);
      }
    }, 60000); // 60 seconds

    return () => {
      if (meterIntervalRef.current) {
        clearInterval(meterIntervalRef.current);
      }
    };
  }, [sessionToken, id, isZeroBalance]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: stream?.title || 'Shubhdarshan Live Stream',
        text: `Watch live darshan: ${stream?.title}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Sacred broadcast link copied to clipboard!');
    }
  };

  const handleSetReminder = async () => {
    try {
      const data = await apiFetch(`/notifications/remind/${id}`, { method: 'POST' });
      setReminderSet(true);
      alert(data.message || 'Email reminder set! You will be notified when this pooja goes live.');
    } catch (err: any) {
      if (err.status === 401) {
        alert('Please sign in to set email reminders.');
        window.location.href = `/login?redirect=/stream/${id}`;
        return;
      }
      alert(err.message || 'Failed to set reminder.');
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReporting(true);
    try {
      await apiFetch('/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'STREAM',
          streamId: id,
          reason: reportReason,
          details: reportDetails.trim() || undefined,
        }),
      });
      alert('Sacred community report submitted. Our Vedic moderation team will review it.');
      setReportModalOpen(false);
      setReportDetails('');
    } catch (err: any) {
      alert(err.message || 'Failed to submit report.');
    } finally {
      setReporting(false);
    }
  };

  const handleTopupSuccess = (newBalance: number) => {
    setRemainingCoins(newBalance);
    setAvailableMinutes(Math.floor(newBalance / 5));
    setIsZeroBalance(false);
    fetchStreamAndToken();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Low Balance Warning Banner (< 15 coins / 3 mins) */}
      {remainingCoins !== null && remainingCoins <= 15 && remainingCoins > 0 && !isZeroBalance && (
        <div className="mb-4 p-3 bg-amber-950/90 border border-amber-600/70 rounded-2xl flex items-center justify-between gap-3 text-amber-200 animate-pulse shadow-lg">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
            <CoinIcon size={18} />
            <span>
              Low Darshan Balance: {availableMinutes} minute(s) remaining ({remainingCoins} Coins).
            </span>
          </div>
          <button
            onClick={() => setTopupModalOpen(true)}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-1"
          >
            <Zap className="w-3 h-3 fill-stone-950" /> Recharge Now
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-950/80 border border-red-800 rounded-2xl flex items-center gap-3 text-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {streamEnded ? (
        <div className="w-full aspect-video max-h-[600px] bg-stone-900 border border-stone-800 rounded-3xl flex flex-col items-center justify-center p-8 text-center shadow-2xl">
          <PranamIcon size={56} className="mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Pooja Completed</h2>
          <p className="text-stone-400 text-sm max-w-md">
            This live broadcast has concluded. May the sacred blessings be upon you and your family.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video Viewport (Col span 2) */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-gold/20 flex items-center justify-center">
              {/* Scheduled Stream Announcement Overlay */}
              {isScheduled ? (
                <div className="absolute inset-0 z-40 bg-gradient-to-br from-obsidian-deep via-obsidian to-[#241a12] flex flex-col items-center justify-center p-6 text-center">
                  <div className="p-4 bg-gold/10 border border-gold/30 rounded-3xl text-gold mb-4 shadow-xl">
                    <Calendar className="w-10 h-10" />
                  </div>
                  <span className="text-xs uppercase font-extrabold tracking-widest text-gold mb-1">
                    Scheduled Sacred Pooja
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-2 max-w-md">
                    {stream?.title}
                  </h3>
                  {stream?.scheduledAt && (
                    <p className="text-stone-300 text-sm font-semibold mb-3 bg-obsidian-soft/90 border border-gold/20 px-4 py-1.5 rounded-full inline-flex items-center gap-2 shadow">
                      <Clock className="w-4 h-4 text-gold" />
                      {new Date(stream.scheduledAt).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
                    </p>
                  )}
                  <p className="text-stone-400 text-xs max-w-sm mb-6 leading-relaxed">
                    This live pooja broadcast has not commenced yet. Set an email reminder to receive sacred darshan as soon as the Pandit goes live.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                      onClick={handleSetReminder}
                      disabled={reminderSet}
                      className="px-6 py-3 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full shadow-xl shadow-gold/20 flex items-center justify-center gap-2 text-xs sm:text-sm transition-all disabled:opacity-60"
                    >
                      {reminderSet ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-obsidian" />
                          <span>Reminder Scheduled ✓</span>
                        </>
                      ) : (
                        <>
                          <Bell className="w-4 h-4" />
                          <span>Remind Me via Email</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleShare}
                      className="px-5 py-3 bg-obsidian-soft hover:bg-stone-800 text-stone-200 text-xs font-semibold rounded-full border border-gold/20 transition"
                    >
                      Share Pooja Link
                    </button>
                  </div>
                </div>
              ) : isZeroBalance ? (
                <div className="absolute inset-0 z-40 bg-obsidian-deep/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                  <OmIcon size={52} className="mb-3" />
                  <h3 className="font-serif text-2xl font-bold text-white mb-1">Auspicious Darshan Paused</h3>
                  <p className="text-stone-400 text-xs sm:text-sm max-w-sm mb-6 leading-relaxed">
                    You have utilized your available darshan coins. Please recharge your wallet to continue receiving live blessings.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                      onClick={() => setTopupModalOpen(true)}
                      className="w-full sm:w-auto px-6 py-3 bg-gold hover:bg-gold-deep text-obsidian font-extrabold rounded-full shadow-xl shadow-gold/20 flex items-center justify-center gap-2 text-sm transition"
                    >
                      <Zap className="w-4 h-4 fill-obsidian" />
                      <span>Recharge Coins (from ₹200)</span>
                    </button>
                    <Link
                      href="/"
                      className="text-stone-400 hover:text-gold-pale text-xs font-semibold py-2"
                    >
                      Return to Darshan Schedule
                    </Link>
                  </div>
                </div>
              ) : loginRequired ? (
                <div className="absolute inset-0 z-40 bg-gradient-to-b from-stone-950/95 via-stone-900/95 to-black/98 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                  <div className="relative mb-3">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-600/30 via-gold/20 to-orange-500/30 flex items-center justify-center border border-gold/40 shadow-[0_0_30px_rgba(245,158,11,0.35)] animate-pulse">
                      <DiyaIcon size={32} />
                    </div>
                  </div>
                  <span className="text-[11px] uppercase tracking-widest font-extrabold text-gold mb-1">
                    Live Temple Darshan
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-white mb-2 max-w-md">
                    Sign in to Receive Live Blessings
                  </h3>
                  <p className="text-stone-300 text-xs sm:text-sm max-w-md mb-5 leading-relaxed">
                    Create a free account to claim <span className="text-gold font-bold">100 Free Sacred Coins</span> (20 mins of complimentary live darshan) and chant prayers in live chat.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto px-4">
                    <Link
                      href={`/register?redirect=/stream/${id}`}
                      className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-500 via-gold to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-extrabold rounded-full shadow-[0_0_24px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 text-xs sm:text-sm transition-transform active:scale-95"
                    >
                      <Gift className="w-4 h-4 text-stone-950" />
                      <span>Claim 100 Free Coins</span>
                    </Link>
                    <Link
                      href={`/login?redirect=/stream/${id}`}
                      className="w-full sm:w-auto px-5 py-2.5 bg-stone-900/90 hover:bg-stone-800 text-stone-200 hover:text-white text-xs sm:text-sm font-semibold rounded-full border border-gold/30 flex items-center justify-center gap-2 transition"
                    >
                      <LogIn className="w-4 h-4 text-gold" />
                      <span>Sign In to Watch</span>
                    </Link>
                  </div>
                  <span className="text-[10px] text-stone-500 mt-3 font-medium">
                    100% Free registration • Instant darshan access
                  </span>
                </div>
              ) : token && serverUrl ? (
                <LiveKitRoom
                  serverUrl={serverUrl}
                  token={token}
                  connect={true}
                  video={false}
                  audio={false}
                  onDisconnected={() => setStreamEnded(true)}
                  className="w-full h-full"
                >
                  <RoomAudioRenderer />
                  <VideoRenderer />
                  <div className="absolute top-4 left-4 z-30">
                    <StartAudio label="Click to Unmute Live Chanting & Aarti" />
                  </div>
                </LiveKitRoom>
              ) : (
                <div className="flex flex-col items-center gap-3 text-stone-500">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-gold" />
                  <span className="text-xs uppercase tracking-wider font-semibold text-gold-soft">
                    Connecting to Sacred Broadcast...
                  </span>
                </div>
              )}

              {/* In-Stream Real-Time Coin Balance HUD */}
              {remainingCoins !== null && !isZeroBalance && (
                <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
                  <button
                    onClick={() => setTopupModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-obsidian/85 backdrop-blur-md border border-gold/40 hover:border-gold rounded-full text-xs font-bold text-gold-pale shadow-xl transition-all"
                    title="Click to recharge coins"
                  >
                    <CoinIcon size={16} />
                    <span className="text-gold font-extrabold">{remainingCoins} Coins</span>
                    <span className="text-stone-300 text-[10px] font-normal">
                      ({availableMinutes}m left)
                    </span>
                    <span className="text-gold ml-0.5 font-black">+</span>
                  </button>
                </div>
              )}

              {/* Floating Auspicious Dakshina Alert */}
              {latestDakshina && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-stone-950 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce border-2 border-yellow-200">
                  <DiyaIcon size={24} />
                  <div className="text-xs">
                    <span className="font-extrabold">{latestDakshina.devoteeName}</span> offered{' '}
                    <span className="font-black">₹{latestDakshina.amount}</span> Dakshina!
                    {latestDakshina.prayerMessage && (
                      <div className="text-[10px] font-semibold opacity-90 truncate max-w-xs">
                        &ldquo;{latestDakshina.prayerMessage}&rdquo;
                      </div>
                    )}
                  </div>
                  <PranamIcon size={20} />
                </div>
              )}

              {/* Floating Spiritual Reactions Overlay (100% clean, non-obstructive) */}
              <FloatingReactionsOverlay socket={socket} streamId={id} />
            </div>

            {/* Stream Metadata & Actions */}
            {stream && (
              <>
                {/* 1. Compact Header Bar with Actions & Reactions (Always visible on mobile & desktop) */}
                <div className="bg-obsidian-soft border border-gold/15 rounded-2xl p-3 sm:p-5 shadow-lg space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {stream.status === 'LIVE' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-950/80 text-red-400 border border-red-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            LIVE
                          </span>
                        ) : stream.status === 'SCHEDULED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gold/10 text-gold-pale border border-gold/30">
                            <Calendar className="w-3.5 h-3.5 text-gold" />
                            SCHEDULED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-900 text-stone-400 border border-stone-800">
                            CONCLUDED
                          </span>
                        )}
                        <span className="text-xs text-gold-soft font-semibold uppercase tracking-wider">
                          {stream.category?.name}
                        </span>
                        {remainingCoins !== null && (
                          <span className="text-[11px] font-bold text-gold-pale bg-gold/10 border border-gold/25 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CoinIcon size={12} /> 5 Coins / min
                          </span>
                        )}
                      </div>
                      <h1 className="font-serif text-lg sm:text-2xl font-bold text-white tracking-tight leading-snug">
                        {stream.title}
                      </h1>
                      {/* Priest info line */}
                      <div className="flex items-center gap-2 mt-1 text-xs text-stone-300">
                        <span className="font-semibold text-stone-200 flex items-center gap-1">
                          <PranamIcon size={14} /> {stream.streamer?.name}
                        </span>
                        {stream.streamer?.streamerProfile?.isVerifiedBadge && (
                          <span className="inline-flex items-center gap-1 text-gold-soft font-bold text-[11px]" title="Verified Vedic Pandit">
                            <VerifiedPanditBadge size={14} /> Verified
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Devotee Action CTAs (Arpan Dakshina + Share) */}
                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <button
                        onClick={() => setDakshinaModalOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold rounded-full transition-all shadow-[0_0_24px_rgba(245,158,11,0.25)] hover:scale-105 active:scale-95"
                      >
                        <DiyaIcon size={16} />
                        <span>Arpan Dakshina</span>
                      </button>
                      <button
                        onClick={handleShare}
                        className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 bg-obsidian border border-gold/20 hover:bg-stone-900 text-stone-200 text-xs font-semibold rounded-full transition-all shadow"
                      >
                        <Share2 className="w-3.5 h-3.5 text-gold-soft" /> Share
                      </button>
                      <button
                        onClick={() => setReportModalOpen(true)}
                        className="flex items-center gap-1 px-2.5 sm:px-3 py-2 sm:py-2.5 bg-obsidian border border-gold/20 hover:border-red-500/50 hover:text-red-400 text-stone-400 text-xs font-semibold rounded-full transition-all shadow"
                        title="Report this broadcast to moderators"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Report</span>
                      </button>
                    </div>
                  </div>

                  {/* Devotional Emoji Reactions Bar */}
                  <DevotionalEmojiBar socket={socket} streamId={id} />
                </div>

                {/* 2. Mobile Tab Switcher (Visible only on mobile/tablet < lg) */}
                <div className="lg:hidden flex items-center bg-stone-900/90 p-1 rounded-2xl border border-gold/20 shadow-inner">
                  <button
                    onClick={() => setMobileTab('chat')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                      mobileTab === 'chat'
                        ? 'bg-gold text-stone-950 shadow-md font-extrabold'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Sacred Live Chat</span>
                  </button>
                  <button
                    onClick={() => setMobileTab('details')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                      mobileTab === 'details'
                        ? 'bg-gold text-stone-950 shadow-md font-extrabold'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Pooja Details & Pandit</span>
                  </button>
                </div>

                {/* 3. Detailed Information Section (Shown on mobile when 'details' tab selected, ALWAYS visible on desktop) */}
                <div className={`${mobileTab === 'details' ? 'block' : 'hidden lg:block'} bg-obsidian-soft border border-gold/15 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3`}>
                  <h3 className="font-serif text-base font-bold text-white flex items-center gap-2">
                    <OmIcon size={18} /> Sacred Pooja Description
                  </h3>
                  {stream.description ? (
                    <p className="text-xs sm:text-sm text-stone-300 leading-relaxed whitespace-pre-line">
                      {stream.description}
                    </p>
                  ) : (
                    <p className="text-xs text-stone-500 italic">No additional description provided for this pooja.</p>
                  )}

                  <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs text-stone-300">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-100 flex items-center gap-1.5">
                        <PranamIcon size={16} /> Presided by {stream.streamer?.name}
                      </span>
                      {stream.streamer?.streamerProfile?.isVerifiedBadge && (
                        <span className="inline-flex items-center gap-1 text-gold-soft font-bold" title="Verified Vedic Pandit">
                          <VerifiedPanditBadge size={16} /> Verified
                        </span>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-stone-400 font-medium">
                      <Users className="w-3.5 h-3.5 text-gold" /> Live Devotees
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Live Chat Sidebar (On mobile: shown when mobileTab === 'chat'; on desktop: always shown in right column) */}
          <div className={`${mobileTab === 'chat' ? 'block' : 'hidden lg:block'} h-[400px] sm:h-[460px] lg:h-[620px]`}>
            <ChatWidget
              socket={socket}
              streamId={id}
              isStreamer={currentUser?.id === stream?.streamerId}
              currentUser={currentUser}
            />
          </div>
        </div>
      )}

      {stream && (
        <DakshinaModal
          isOpen={dakshinaModalOpen}
          onClose={() => setDakshinaModalOpen(false)}
          streamId={id}
          streamerName={stream.streamer?.name || 'Vedic Pandit'}
          currentUser={currentUser}
        />
      )}

      <CoinTopupModal
        isOpen={topupModalOpen}
        onClose={() => setTopupModalOpen(false)}
        onSuccess={handleTopupSuccess}
      />

      {/* Sacred Broadcast Moderation Report Modal (B-26) */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1c140d] border border-gold/30 rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-xs">
            <button
              onClick={() => setReportModalOpen(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4 text-amber-400 font-bold">
              <Flag className="w-4 h-4" />
              <span className="text-sm text-white">Report Sacred Darshan Broadcast</span>
            </div>

            <p className="text-stone-300 mb-4 leading-relaxed">
              Help maintain sacred dignity and reverence. Reports are reviewed by platform administrators within 2 hours.
            </p>

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-stone-200 mb-1.5">Primary Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-obsidian border border-gold/20 text-stone-200 focus:outline-none focus:border-gold"
                >
                  <option value="Inappropriate Content / Conduct">Inappropriate Content or Conduct</option>
                  <option value="Harassment or Hate Speech">Harassment or Hate Speech</option>
                  <option value="Commercial Spam / Unrelated Content">Commercial Spam / Unrelated Content</option>
                  <option value="Audio/Video Quality / Impersonation">Audio/Video Quality or Impersonation</option>
                  <option value="Other Violation">Other Community Guidelines Violation</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-200 mb-1.5">Additional Details (Optional)</label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Describe specific timestamps or details to help moderators..."
                  className="w-full p-2.5 rounded-xl bg-obsidian border border-gold/20 text-stone-200 focus:outline-none focus:border-gold resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reporting}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold disabled:opacity-50"
                >
                  {reporting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoRenderer() {
  const tracks = useTracks([Track.Source.Camera]);
  if (tracks.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 bg-stone-950">
        <DiyaIcon size={44} className="mb-2" />
        <span className="text-sm font-medium">Awaiting Pandit video transmission...</span>
      </div>
    );
  }

  return <VideoTrack trackRef={tracks[0]} className="w-full h-full object-cover" />;
}
