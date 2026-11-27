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
  useParticipants,
  useRoomContext,
  useLocalParticipant,
  useLocalParticipantPermissions,
  useConnectionState,
} from '@livekit/components-react';
import { Track, ConnectionState } from 'livekit-client';
import {
  ParticipantTile,
  ConnectionBanner,
  ROOM_OPTIONS,
  trackFor,
  useRoomTick,
  isVideoGuest,
  isStreamerParticipant,
  friendlyMediaError,
} from '@/components/video/MediaPieces';
import { io, Socket } from 'socket.io-client';
import { ChatWidget } from '@/components/ChatWidget';
import { FloatingReactionsOverlay, DevotionalEmojiBar } from '@/components/SpiritualReactions';
import { DakshinaModal } from '@/components/DakshinaModal';
import { CoinTopupModal } from '@/components/CoinTopupModal';
import { Users, AlertCircle, Share2, Sparkles, Zap, Calendar, Bell, CheckCircle2, Clock, MessageSquare, Info, LogIn, Gift, Flame, Flag, X, ArrowRight, Eye } from 'lucide-react';
import { KickedScreen } from '@/components/KickedScreen';
import { apiFetch } from '@/lib/api';
import { classifyTick } from '@/lib/meter-tick';
import {
  COINS_PER_MINUTE,
  STARTER_PRICE_INR,
  syncLocalWalletBalance,
} from '@/lib/economy';
import {
  OmIcon,
  DiyaIcon,
  CoinIcon,
  PranamIcon,
  BellIcon,
  VerifiedPanditBadge,
} from '@/components/icons/SpiritualIcons';
import { useToast } from '@/components/Toast';
import { useLang } from '@/lib/i18n/context';
import {
  formatCoins,
  formatLocaleDateTime,
  translateCategoryLabel,
} from '@/lib/i18n/format';

export default function StreamPlayerClient() {
  const toast = useToast();
  const { lang } = useLang();
  const L = (en: string, hi: string) => (lang === 'hi' ? hi : en);
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
  const [activeOtherLiveStream, setActiveOtherLiveStream] = useState<any>(null);

  const checkActiveLiveStreams = async (currentId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const res = await fetch(`${apiUrl}/streams/public`);
      if (res.ok) {
        const allStreams = await res.json();
        const liveOne = allStreams.find((s: any) => s.status === 'LIVE' && s.id !== currentId);
        if (liveOne) {
          setActiveOtherLiveStream(liveOne);
        }
      }
    } catch {}
  };
  const [loginRequired, setLoginRequired] = useState(false);
  const [streamEnded, setStreamEnded] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [reminderSet, setReminderSet] = useState(false);
  const [dakshinaModalOpen, setDakshinaModalOpen] = useState(false);
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [resumeDakshinaAfterTopup, setResumeDakshinaAfterTopup] = useState(false);
  const [latestDakshina, setLatestDakshina] = useState<any>(null);
  const dakshinaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  // N-06: Reconnect backoff state — cap retries and use exponential delay so a
  // rejected or ended room does not spin in a tight loop requesting new tokens.
  const reconnectAttemptsRef = useRef<number>(0);
  // True only while the LiveKit media connection is actually up: the meter must not bill a viewer
  // who is looking at a spinner (blocked UDP, TURN down, room full, stream not publishing).
  const mediaConnectedRef = useRef<boolean>(false);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showManualReconnect, setShowManualReconnect] = useState(false);
  // N-05: Track consecutive *transient* billing failures separately from auth/balance failures.
  // A 5xx during a deploy, a 429, or a brief network blip should NOT show "out of coins" —
  // the server watchdog (90 s) is the authoritative removal mechanism.
  // Only 401 (expired session) and 402 / canContinue:false are acted on immediately.
  const billingErrorCountRef = useRef<number>(0);
  const recoveryAttemptsRef = useRef<number>(0);
  // N-05: Show a small non-intrusive connection warning instead of the top-up dialog on transient errors.
  const [connectionWarning, setConnectionWarning] = useState(false);

  // Live Presence & Moderation State
  const [viewerCount, setViewerCount] = useState<number | null>(null);
  const [kicked, setKicked] = useState<{ reason?: string; blocked: boolean } | null>(null);
  const kickedRef = useRef<boolean>(false);

  useEffect(() => {
    if (stream?.title) {
      document.title = `${stream.title} | ${lang === 'hi' ? 'परम दर्शन' : 'Param Darshan'}`;
    }
  }, [stream?.title, lang]);

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
      if (dakshinaTimerRef.current) clearTimeout(dakshinaTimerRef.current);
      dakshinaTimerRef.current = setTimeout(() => setLatestDakshina(null), 8000);
    });

    socketInstance.on('stream:viewer_count', (data: { streamId: string; count: number }) => {
      if (data?.streamId === id && typeof data.count === 'number') {
        setViewerCount(data.count);
      }
    });

    socketInstance.on('stream:kicked', (data: { reason?: string; blocked: boolean }) => {
      kickedRef.current = true;
      setKicked(data);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (meterIntervalRef.current) {
        clearInterval(meterIntervalRef.current);
        meterIntervalRef.current = null;
      }
    });

    return () => {
      if (dakshinaTimerRef.current) {
        clearTimeout(dakshinaTimerRef.current);
        dakshinaTimerRef.current = null;
      }
      socketInstance.off('stream:dakshina_received');
      socketInstance.off('stream:viewer_count');
      socketInstance.off('stream:kicked');
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
      if (!streamRes.ok) throw new Error(L('Stream not found', 'प्रसारण नहीं मिला'));
      const streamData = await streamRes.json();
      setStream(streamData);

      if (streamData.status === 'ENDED') {
        setStreamEnded(true);
        checkActiveLiveStreams(id);
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
        const errMsg = errJson.message || L('Failed to join stream session', 'प्रसारण सत्र से जुड़ने में समस्या हुई');
        if (errMsg.toLowerCase().includes('not currently live')) {
          setStreamEnded(true);
          setStream((prev: any) => (prev ? { ...prev, status: 'ENDED' } : prev));
          checkActiveLiveStreams(id);
          return;
        }
        throw new Error(errMsg);
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
        syncLocalWalletBalance(resData.remainingCoins);
      }
    } catch (err: any) {
      const msg = err.message || L('Error connecting to sacred stream', 'पवित्र प्रसारण से जुड़ने में त्रुटि');
      setError(msg);
      if (msg.toLowerCase().includes('not currently live')) {
        setStreamEnded(true);
        checkActiveLiveStreams(id);
      }
    }
  };

  useEffect(() => {
    fetchStreamAndToken();
    // Reset reconnect & recovery counters on fresh mount / id change
    reconnectAttemptsRef.current = 0;
    recoveryAttemptsRef.current = 0;
    billingErrorCountRef.current = 0;
    setShowManualReconnect(false);
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [id]);

  // H-06: Poll scheduled stream status so waiting viewers auto-enter when Pandit goes live.
  // 10 s base interval (not 5 s: hundreds of devotees wait for a popular aarti, many behind one
  // carrier/college NAT that shares the per-IP rate-limit bucket), paused while the tab is hidden,
  // and exponential back-off (to 60 s) on 429 / 5xx / network errors instead of hammering the API.
  useEffect(() => {
    if (!isScheduled || !id || id === 'demo' || streamEnded) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    const BASE_MS = 10_000;
    const MAX_MS = 60_000;
    let delay = BASE_MS;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      if (cancelled) return;
      if (document.visibilityState !== 'hidden') {
        try {
          const res = await fetch(`${apiUrl}/streams/${id}`);
          if (cancelled) return;
          if (!res.ok) {
            delay = Math.min(delay * 2, MAX_MS);
          } else {
            delay = BASE_MS;
            const latest = await res.json();
            if (cancelled) return;
            if (latest.status === 'LIVE') {
              setIsScheduled(false);
              await fetchStreamAndToken();
              return;
            }
            if (latest.status === 'ENDED' || latest.status === 'CANCELLED') {
              setIsScheduled(false);
              setStreamEnded(true);
              checkActiveLiveStreams(id);
              return;
            }
          }
        } catch {
          delay = Math.min(delay * 2, MAX_MS);
        }
      }
      if (!cancelled) timer = setTimeout(tick, delay);
    };

    timer = setTimeout(tick, delay);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isScheduled, id, streamEnded]);

  // 60-Second Heartbeat Meter Loop
  useEffect(() => {
    if (!sessionToken || !id || isZeroBalance) return;

    if (meterIntervalRef.current) {
      clearInterval(meterIntervalRef.current);
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    const storedToken = localStorage.getItem('pooja_token');

    meterIntervalRef.current = setInterval(async () => {
      // No media connection => no billing. The session stops heartbeating, so the server watchdog
      // reaps it after 90 s; if the viewer reconnects later the SESSION_EXPIRED path starts a fresh one.
      if (!mediaConnectedRef.current) return;
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

        const data = await res.json().catch(() => null);
        const action = classifyTick(res.status, data);

        switch (action) {
          case 'LOGIN': {
            if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
            window.location.href = `/login?redirect=/stream/${id}`;
            return;
          }
          case 'TOPUP': {
            billingErrorCountRef.current = 0;
            recoveryAttemptsRef.current = 0;
            setIsZeroBalance(true);
            setTopupModalOpen(true);
            setToken(null);
            setConnectionWarning(false);
            if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
            return;
          }
          case 'ENDED': {
            billingErrorCountRef.current = 0;
            recoveryAttemptsRef.current = 0;
            setStreamEnded(true);
            setToken(null);
            setConnectionWarning(false);
            if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
            return;
          }
          case 'RECOVER': {
            billingErrorCountRef.current = 0;
            setConnectionWarning(false);
            if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
            recoveryAttemptsRef.current += 1;
            if (recoveryAttemptsRef.current > 3) {
              setToken(null);
              setError(L('Your viewing session expired and could not be restored automatically. Please reload the page.', 'आपका दर्शन सत्र समाप्त हो गया और स्वतः बहाल नहीं हो सका। कृपया पृष्ठ को पुनः लोड करें।'));
              return;
            }
            await fetchStreamAndToken();
            return;
          }
          case 'OK': {
            billingErrorCountRef.current = 0;
            recoveryAttemptsRef.current = 0;
            setConnectionWarning(false);
            setRemainingCoins(data.remainingCoins);
            if (typeof data.remainingCoins === 'number') {
              syncLocalWalletBalance(data.remainingCoins);
            }
            if (typeof data.availableMinutes === 'number') {
              setAvailableMinutes(data.availableMinutes);
            }
            return;
          }
          case 'TRANSIENT':
          default: {
            billingErrorCountRef.current += 1;
            if (billingErrorCountRef.current >= 5) {
              setConnectionWarning(false);
              setToken(null);
              setError(L('Unable to reach the billing server. Please reload the page to continue.', 'बिलिंग सर्वर से संपर्क नहीं हो पा रहा है। जारी रखने के लिए कृपया पृष्ठ रीलोड करें।'));
              if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
            } else {
              setConnectionWarning(true);
            }
            return;
          }
        }
      } catch (err) {
        // Network-level failure (offline, DNS) — treat as transient, never open top-up dialog
        billingErrorCountRef.current += 1;
        setConnectionWarning(true);
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
        title: stream?.title || L('Param Darshan Live Stream', 'परम दर्शन लाइव प्रसारण'),
        text: L(`Watch live darshan: ${stream?.title}`, `लाइव दर्शन देखें: ${stream?.title}`),
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success(L('Sacred broadcast link copied to clipboard!', 'पवित्र प्रसारण लिंक कॉपी हो गया!'));
    }
  };

  const handleSetReminder = async () => {
    try {
      const data = await apiFetch(`/notifications/remind/${id}`, { method: 'POST' });
      setReminderSet(true);
      toast.success(data.message || L('Email reminder set! You will be notified when this pooja goes live.', 'ईमेल रिमाइंडर सेट हो गया! पूजा लाइव होते ही आपको सूचना मिलेगी।'));
    } catch (err: any) {
      if (err.status === 401) {
        toast.info(L('Please sign in to set email reminders.', 'ईमेल रिमाइंडर सेट करने के लिए कृपया साइन इन करें।'));
        window.location.href = `/login?redirect=/stream/${id}`;
        return;
      }
      toast.error(err.message || L('Failed to set reminder.', 'रिमाइंडर सेट नहीं हो सका।'));
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
      toast.success(L('Sacred community report submitted. Our Vedic moderation team will review it.', 'रिपोर्ट सबमिट हो गई। हमारी मॉडरेशन टीम शीघ्र इसकी समीक्षा करेगी।'));
      setReportModalOpen(false);
      setReportDetails('');
    } catch (err: any) {
      toast.error(err.message || L('Failed to submit report.', 'रिपोर्ट सबमिट नहीं हो सकी।'));
    } finally {
      setReporting(false);
    }
  };

  const handleTopupSuccess = (newBalance: number) => {
    setRemainingCoins(newBalance);
    setAvailableMinutes(Math.floor(newBalance / COINS_PER_MINUTE));
    setIsZeroBalance(false);
    syncLocalWalletBalance(newBalance);
    if (resumeDakshinaAfterTopup) {
      setResumeDakshinaAfterTopup(false);
      setDakshinaModalOpen(true);
    } else {
      fetchStreamAndToken();
    }
  };

  if (kicked) {
    return <KickedScreen reason={kicked.reason} blocked={kicked.blocked} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* N-05: Transient connection warning — shown on 5xx/429/network errors, NOT on low balance */}
      {connectionWarning && !isZeroBalance && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-stone-800/90 border border-amber-300 dark:border-stone-600/70 rounded-2xl flex items-center justify-between gap-3 text-stone-900 dark:text-stone-200 shadow-lg">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-800 dark:text-amber-400 shrink-0" />
            <span>{L('Connection issue detected — retrying billing. Your stream continues.', 'कनेक्शन में अस्थायी समस्या — बिलिंग पुनः प्रयास कर रही है। आपका प्रसारण जारी है।')}</span>
          </div>
          <button
            onClick={() => setConnectionWarning(false)}
            className="p-1 hover:bg-amber-200/70 dark:hover:bg-stone-700 rounded-lg transition"
            aria-label={L('Dismiss', 'बंद करें')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {/* N-06: Manual reconnect button after backoff exhausted */}
      {showManualReconnect && !streamEnded && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-stone-800/90 border border-amber-400 dark:border-amber-600/40 rounded-2xl flex items-center justify-between gap-3 text-stone-900 dark:text-stone-200 shadow-lg">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-800 dark:text-amber-400 shrink-0" />
            <span>{L('Stream connection lost. Click to reconnect.', 'प्रसारण कनेक्शन टूट गया। पुनः जुड़ने के लिए क्लिक करें।')}</span>
          </div>
          <button
            onClick={() => {
              reconnectAttemptsRef.current = 0;
              setShowManualReconnect(false);
              fetchStreamAndToken();
            }}
            className="px-3 py-1.5 bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold rounded-lg shadow transition"
          >
            {L('Reconnect', 'पुनः जुड़ें')}
          </button>
        </div>
      )}
      {/* Low Balance Warning Banner (< 15 coins / 3 mins) */}
      {remainingCoins !== null && remainingCoins <= 15 && remainingCoins > 0 && !isZeroBalance && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/90 border border-amber-400 dark:border-amber-600/70 rounded-2xl flex items-center justify-between gap-3 text-amber-950 dark:text-amber-200 animate-pulse shadow-lg">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
            <CoinIcon size={18} />
            <span>
              {L(
                `Low Darshan Balance: ${availableMinutes} minute(s) remaining (${remainingCoins} Coins).`,
                `कम दर्शन शेष: ${availableMinutes} मिनट शेष (${remainingCoins} कॉइन)।`,
              )}
            </span>
          </div>
          <button
            onClick={() => setTopupModalOpen(true)}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-1"
          >
            <Zap className="w-3 h-3 fill-stone-950" /> {L('Recharge Now', 'अभी रिचार्ज करें')}
          </button>
        </div>
      )}

      {/* Banner if another Pandit is currently live */}
      {activeOtherLiveStream && (
        <div className="mb-4 p-3.5 bg-amber-50 dark:bg-gradient-to-r dark:from-red-950/90 dark:via-amber-950/90 dark:to-red-950/90 border border-amber-400 dark:border-amber-500/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-950 dark:text-amber-200 shadow-xl animate-pulse">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            <span className="live-dot shrink-0" />
            <span>
              {lang === 'hi' ? (
                <>
                  पंडित जी अभी लाइव हैं: <strong className="text-stone-950 dark:text-white">&ldquo;{activeOtherLiveStream.title}&rdquo;</strong> — {activeOtherLiveStream.streamer?.name || 'आचार्य'} के साथ
                </>
              ) : (
                <>
                  Pandit Ji is live now: <strong className="text-stone-950 dark:text-white">&ldquo;{activeOtherLiveStream.title}&rdquo;</strong> with {activeOtherLiveStream.streamer?.name || 'Acharya'}
                </>
              )}
            </span>
          </div>
          <Link
            href={`/stream/${activeOtherLiveStream.id}`}
            className="px-4 py-1.5 bg-gold hover:bg-gold-deep text-obsidian text-xs font-extrabold rounded-full shadow transition-all shrink-0 flex items-center gap-1.5 hover:scale-105"
          >
            <span>{L('Watch Live Darshan Now', 'अभी लाइव दर्शन देखें')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {error && !streamEnded && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/80 border border-red-300 dark:border-red-800 rounded-2xl flex items-center gap-3 text-red-900 dark:text-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {streamEnded ? (
        <div className="w-full aspect-video max-h-[600px] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl flex flex-col items-center justify-center p-8 text-center shadow-xl">
          <PranamIcon size={56} className="mb-4 text-amber-700 dark:text-amber-500" />
          <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-2">{L('Sacred Broadcast Concluded', 'पवित्र प्रसारण संपन्न हुआ')}</h2>
          <p className="text-stone-600 dark:text-stone-400 text-sm max-w-md mb-4">
            {L(
              `This live broadcast by ${stream?.streamer?.name || 'Pandit Ji'} is not active or has concluded. May divine blessings be upon you.`,
              `${stream?.streamer?.name || 'पंडित जी'} द्वारा यह लाइव प्रसारण समाप्त हो चुका है या सक्रिय नहीं है। ईश्वर का दिव्य आशीर्वाद आप पर बना रहे।`,
            )}
          </p>

          {activeOtherLiveStream ? (
            <div className="mt-2 p-5 rounded-2xl bg-amber-50 dark:bg-gradient-to-r dark:from-amber-500/20 dark:via-orange-500/20 dark:to-amber-500/20 border border-amber-400 dark:border-amber-500/50 text-center max-w-md shadow-xl">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-900 dark:text-amber-300 flex items-center justify-center gap-2 mb-1.5">
                <span className="live-dot" /> {L('Live Darshan Active Right Now', 'इस समय लाइव दर्शन सक्रिय है')}
              </span>
              <p className="text-base font-bold text-stone-950 dark:text-white mb-4">
                &ldquo;{activeOtherLiveStream.title}&rdquo; {L('by', 'द्वारा')} {activeOtherLiveStream.streamer?.name || L('Vedic Pandit Ji', 'वैदिक पंडित जी')}
              </p>
              <Link
                href={`/stream/${activeOtherLiveStream.id}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-orange-500 text-white font-extrabold text-xs shadow-xl hover:scale-105 transition-transform"
              >
                <span>{L('Join Active Live Darshan Now', 'सक्रिय लाइव दर्शन से अभी जुड़ें')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
              <Link
                href="/schedule"
                className="px-5 py-2.5 bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold rounded-full transition"
              >
                {L('View Pooja Schedule', 'पूजा समय-सारिणी देखें')}
              </Link>
              <Link
                href="/"
                className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-200 text-xs font-semibold rounded-full border border-stone-300 dark:border-stone-700 transition"
              >
                {L('Return to Home', 'होम पेज पर लौटें')}
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video Viewport (Col span 2) */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="player-container video-overlay relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-gold/20 flex items-center justify-center">
              {/* Scheduled Stream Announcement Overlay */}
              {isScheduled ? (
                <div className="video-overlay absolute inset-0 z-40 bg-gradient-to-br from-black/90 via-black/85 to-[#241a12]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white">
                  <div className="p-4 bg-amber-500/15 border border-amber-400/40 rounded-3xl text-amber-300 mb-4 shadow-xl">
                    <Calendar className="w-10 h-10" />
                  </div>
                  <span className="text-xs uppercase font-extrabold tracking-widest text-amber-300 mb-1">
                    {L('Scheduled Sacred Pooja', 'निर्धारित पवित्र पूजा')}
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold !text-white mb-2 max-w-md">
                    {stream?.title}
                  </h3>
                  {stream?.scheduledAt && (
                    <p className="!text-stone-200 text-sm font-semibold mb-3 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-full inline-flex items-center gap-2 shadow">
                      <Clock className="w-4 h-4 text-amber-300" />
                      {formatLocaleDateTime(stream.scheduledAt, lang)}
                    </p>
                  )}
                  <p className="!text-stone-300 text-xs max-w-sm mb-6 leading-relaxed">
                    {L(
                      'This live pooja broadcast has not commenced yet. Set an email reminder to receive sacred darshan as soon as Pandit Ji goes live.',
                      'यह लाइव पूजा प्रसारण अभी शुरू नहीं हुआ है। पंडित जी के लाइव होते ही सूचना पाने के लिए ईमेल रिमाइंडर सेट करें।',
                    )}
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
                          <span>{L('Reminder Scheduled ✓', 'रिमाइंडर सेट हो गया ✓')}</span>
                        </>
                      ) : (
                        <>
                          <Bell className="w-4 h-4" />
                          <span>{L('Remind Me via Email', 'ईमेल द्वारा याद दिलाएँ')}</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleShare}
                      className="px-5 py-3 bg-white/10 hover:bg-white/20 !text-white text-xs font-semibold rounded-full border border-white/25 transition shadow-sm backdrop-blur-sm"
                    >
                      {L('Share Pooja Link', 'पूजा लिंक साझा करें')}
                    </button>
                  </div>
                </div>
              ) : isZeroBalance ? (
                <div className="video-overlay absolute inset-0 z-40 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white">
                  <OmIcon size={52} className="mb-3 text-amber-400" />
                  <h3 className="font-serif text-2xl font-bold !text-white mb-1">{L('Auspicious Darshan Paused', 'पवित्र दर्शन विराम पर है')}</h3>
                  <p className="!text-stone-300 text-xs sm:text-sm max-w-sm mb-6 leading-relaxed">
                    {L('You have utilized your available darshan coins. Please recharge your wallet to continue receiving live blessings.', 'आपके उपलब्ध दर्शन कॉइन समाप्त हो गए हैं। लाइव आशीर्वाद प्राप्त करना जारी रखने के लिए कृपया वॉलेट रिचार्ज करें।')}
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                      onClick={() => setTopupModalOpen(true)}
                      className="w-full sm:w-auto px-6 py-3 bg-gold hover:bg-gold-deep text-obsidian font-extrabold rounded-full shadow-xl shadow-gold/20 flex items-center justify-center gap-2 text-sm transition"
                    >
                      <Zap className="w-4 h-4 fill-obsidian" />
                      <span>{L(`Recharge Coins (from ₹${STARTER_PRICE_INR})`, `कॉइन रिचार्ज करें (₹${STARTER_PRICE_INR} से)`)}</span>
                    </button>
                    <Link
                      href="/"
                      className="text-stone-400 hover:text-gold-pale text-xs font-semibold py-2"
                    >
                      {L('Return to Darshan Schedule', 'दर्शन समय-सारिणी पर लौटें')}
                    </Link>
                  </div>
                </div>
              ) : loginRequired ? (
                <div className="video-overlay absolute inset-0 z-40 bg-gradient-to-b from-black/90 via-black/85 to-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white">
                  <div className="relative mb-3">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-600/30 via-gold/20 to-orange-500/30 flex items-center justify-center border border-gold/40 shadow-[0_0_30px_rgba(245,158,11,0.35)] animate-pulse">
                      <DiyaIcon size={32} />
                    </div>
                  </div>
                  <span className="text-[11px] uppercase tracking-widest font-extrabold !text-amber-300 mb-1">
                    {L('Live Temple Darshan', 'लाइव मंदिर दर्शन')}
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold !text-white mb-2 max-w-md">
                    {L('Sign in to Receive Live Blessings', 'लाइव आशीर्वाद पाने के लिए साइन इन करें')}
                  </h3>
                  <p className="!text-stone-200 text-xs sm:text-sm max-w-md mb-5 leading-relaxed">
                    {lang === 'hi' ? (
                      <>
                        <span className="!text-amber-300 font-bold">100 मुफ़्त पवित्र कॉइन</span> (20 मिनट का निःशुल्क लाइव दर्शन) पाने और लाइव चैट में मंत्र-प्रार्थना भेजने के लिए निःशुल्क खाता बनाएँ।
                      </>
                    ) : (
                      <>
                        Create a free account to claim <span className="!text-amber-300 font-bold">100 Free Sacred Coins</span> (20 mins of complimentary live darshan) and chant prayers in live chat.
                      </>
                    )}
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto px-4">
                    <Link
                      href={`/register?redirect=/stream/${id}`}
                      className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-500 via-gold to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-extrabold rounded-full shadow-[0_0_24px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 text-xs sm:text-sm transition-transform active:scale-95"
                    >
                      <Gift className="w-4 h-4 text-stone-950" />
                      <span className="!text-stone-950 font-extrabold">{L('Claim 100 Free Coins', '100 मुफ़्त कॉइन पाएँ')}</span>
                    </Link>
                    <Link
                      href={`/login?redirect=/stream/${id}`}
                      className="w-full sm:w-auto px-5 py-2.5 bg-black/70 hover:bg-black/90 !text-amber-200 hover:!text-white text-xs sm:text-sm font-bold rounded-full border border-amber-400/50 flex items-center justify-center gap-2 transition backdrop-blur-md shadow-lg"
                      style={{ color: '#fef3c7', backgroundColor: 'rgba(20, 14, 10, 0.85)', borderColor: 'rgba(245, 158, 11, 0.5)' }}
                    >
                      <LogIn className="w-4 h-4 !text-amber-300" />
                      <span className="font-bold" style={{ color: '#fef3c7' }}>{L('Sign In to Watch', 'देखने के लिए लॉगिन करें')}</span>
                    </Link>
                  </div>
                  <span className="text-[10px] !text-stone-300 mt-3 font-medium">
                    {L('100% Free registration • Instant darshan access', '100% निःशुल्क पंजीकरण • तुरंत दर्शन प्रवेश')}
                  </span>
                </div>
              ) : token && serverUrl ? (
                <LiveKitRoom
                  serverUrl={serverUrl}
                  token={token}
                  connect={true}
                  options={ROOM_OPTIONS}
                  video={false}
                  audio={false}
                  onConnected={() => {
                    // A successful (re)connect clears the failure history; otherwise after ~5 blips in one
                    // long session the player showed "Reconnect" and stopped retrying while still billing.
                    mediaConnectedRef.current = true;
                    reconnectAttemptsRef.current = 0;
                    setShowManualReconnect(false);
                  }}
                  onDisconnected={() => {
                    mediaConnectedRef.current = false;
                    // Stop auto-reconnect if viewer was kicked
                    if (kickedRef.current) return;

                    // N-06: Backoff reconnect — cap at 5 attempts with exponential delay.
                    // Previously called fetchStreamAndToken() immediately on every disconnect,
                    // causing a tight loop if the room rejected the connection (e.g. stream ended).
                    reconnectAttemptsRef.current += 1;
                    const attempt = reconnectAttemptsRef.current;
                    if (attempt > 5) {
                      // Too many failures — show a manual reconnect button and stop.
                      setShowManualReconnect(true);
                      return;
                    }
                    // Delays: 2s, 4s, 8s, 16s, 32s
                    const delayMs = Math.min(2000 * Math.pow(2, attempt - 1), 32000);
                    reconnectTimerRef.current = setTimeout(() => {
                      fetchStreamAndToken();
                    }, delayMs);
                  }}
                  className="w-full h-full"
                >
                  <RoomAudioRenderer />
                  <VideoRenderer
                    streamerId={stream?.streamerId}
                    streamId={id}
                    socket={socket}
                    canAsk={!!currentUser?.id && currentUser.id !== stream?.streamerId && stream?.visibility !== 'PRIVATE'}
                  />
                  <div className="absolute top-4 left-4 z-30">
                    <StartAudio label={L('Click to Unmute Live Chanting & Aarti', 'लाइव मंत्रोच्चार एवं आरती सुनने के लिए क्लिक करें')} />
                  </div>
                </LiveKitRoom>
              ) : error ? (
                <div className="video-overlay flex flex-col items-center gap-3 p-6 text-center max-w-md">
                  <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400 mb-1">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-stone-100">{error}</span>
                  {activeOtherLiveStream ? (
                    <Link
                      href={`/stream/${activeOtherLiveStream.id}`}
                      className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold hover:bg-gold-deep text-obsidian font-bold text-xs shadow-lg transition"
                    >
                      <span>{L(`Watch ${activeOtherLiveStream.streamer?.name || 'Live Pandit Ji'} Now`, `अभी ${activeOtherLiveStream.streamer?.name || 'लाइव पंडित जी'} को देखें`)}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <button
                      onClick={fetchStreamAndToken}
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-semibold border border-stone-600 transition"
                    >
                      <span>{L('Retry Connection', 'पुनः जुड़ने का प्रयास करें')}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="video-overlay flex flex-col items-center gap-3 text-stone-200">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-gold" />
                  <span className="text-xs uppercase tracking-wider font-semibold text-amber-300">
                    {L('Connecting to Sacred Broadcast...', 'पवित्र प्रसारण से जुड़ रहा है...')}
                  </span>
                </div>
              )}

              {/* In-Stream Real-Time Coin Balance HUD */}
              {remainingCoins !== null && !isZeroBalance && (
                <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 z-30 flex items-center gap-2">
                  <button
                    onClick={() => setTopupModalOpen(true)}
                    className="video-overlay flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 bg-black/85 backdrop-blur-md border border-amber-400/50 hover:border-amber-400 rounded-full text-xs font-bold !text-amber-200 shadow-xl transition-all"
                    title={L('Click to recharge coins', 'कॉइन रिचार्ज करने के लिए क्लिक करें')}
                  >
                    <CoinIcon size={15} />
                    <span className="!text-amber-300 font-extrabold">{formatCoins(remainingCoins, lang)}</span>
                    <span className="!text-stone-200 text-[10px] font-normal hidden xs:inline sm:inline">
                      ({L(`${availableMinutes}m left`, `${availableMinutes} मिनट शेष`)})
                    </span>
                    <span className="!text-amber-300 ml-0.5 font-black text-sm leading-none">+</span>
                  </button>
                </div>
              )}

              {/* Floating Auspicious Dakshina Alert */}
              {latestDakshina && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-stone-950 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce border-2 border-yellow-200">
                  <DiyaIcon size={24} />
                  <div className="text-xs">
                    <span className="font-extrabold">{latestDakshina.devoteeName}</span> {L('offered', 'ने अर्पित किए')}{' '}
                    <span className="font-black inline-flex items-center gap-1">
                      <CoinIcon size={13} /> {formatCoins(Number(latestDakshina.coins ?? latestDakshina.amount), lang)}
                    </span>{' '}
                    {L('Dakshina!', 'दक्षिणा!')}
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
                <div className="bg-white dark:bg-obsidian-soft border border-stone-200 dark:border-gold/15 rounded-2xl p-3 sm:p-5 shadow-lg space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {stream.status === 'LIVE' ? (
                          <>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-500 animate-pulse" />
                              {L('LIVE', 'लाइव')}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-gold/10 text-amber-800 dark:text-gold-pale border border-amber-300 dark:border-gold/30 shadow-sm">
                              <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              <span>{viewerCount ?? stream.peakViewers ?? 0} {L('Watching', 'देख रहे हैं')}</span>
                            </span>
                          </>
                        ) : stream.status === 'SCHEDULED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gold/10 text-gold-pale border border-gold/30">
                            <Calendar className="w-3.5 h-3.5 text-gold" />
                            {L('SCHEDULED', 'निर्धारित')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800">
                            {L('CONCLUDED', 'संपन्न')}
                          </span>
                        )}
                        <span className="text-xs text-amber-700 dark:text-gold-soft font-semibold uppercase tracking-wider">
                          {translateCategoryLabel(stream.category?.name, lang)}
                        </span>
                        {remainingCoins !== null && (
                          <span className="text-[11px] font-bold text-amber-900 dark:text-gold-pale bg-amber-500/10 dark:bg-gold/10 border border-amber-500/25 dark:border-gold/25 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CoinIcon size={12} /> {L('5 Coins / min', '5 कॉइन / मिनट')}
                          </span>
                        )}
                      </div>
                      <h1 className="font-serif text-lg sm:text-2xl font-bold text-stone-900 dark:text-white tracking-tight leading-snug">
                        {stream.title}
                      </h1>
                      {/* Priest info line */}
                      <div className="flex items-center gap-2 mt-1 text-xs text-stone-600 dark:text-stone-300">
                        <span className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1">
                          <PranamIcon size={14} /> {stream.streamer?.name}
                        </span>
                        {stream.streamer?.streamerProfile?.isVerifiedBadge && (
                          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-gold-soft font-bold text-[11px]" title={L('Verified Vedic Pandit', 'सत्यापित वैदिक पंडित')}>
                            <VerifiedPanditBadge size={14} /> {L('Verified', 'सत्यापित')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Devotee Action CTAs (Arpan Dakshina + Share + Report) */}
                    <div className="flex items-center gap-1.5 sm:gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                      <button
                        onClick={() => setDakshinaModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2.5 bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold rounded-full transition-all shadow-[0_0_24px_rgba(245,158,11,0.25)] hover:scale-105 active:scale-95"
                      >
                        <DiyaIcon size={15} />
                        <span>{L('Arpan Dakshina', 'दक्षिणा अर्पण')}</span>
                      </button>
                      <button
                        onClick={handleShare}
                        className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 bg-white dark:bg-obsidian border border-stone-200 dark:border-gold/20 hover:bg-stone-50 dark:hover:bg-stone-900 text-stone-700 dark:text-stone-200 text-xs font-semibold rounded-full transition-all shadow-sm"
                      >
                        <Share2 className="w-3.5 h-3.5 text-amber-700 dark:text-gold-soft" /> {L('Share', 'साझा करें')}
                      </button>
                      <button
                        onClick={() => setReportModalOpen(true)}
                        className="flex items-center gap-1 p-1.5 sm:px-3 sm:py-2.5 bg-white dark:bg-obsidian border border-stone-200 dark:border-gold/20 hover:border-red-500/50 hover:text-red-700 dark:hover:text-red-400 text-stone-600 dark:text-stone-400 text-xs font-semibold rounded-full transition-all shadow-sm"
                        title={L('Report this broadcast to moderators', 'इस प्रसारण की रिपोर्ट करें')}
                        aria-label={L('Report this broadcast to moderators', 'इस प्रसारण की रिपोर्ट करें')}
                      >
                        <Flag className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{L('Report', 'रिपोर्ट')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Devotional Emoji Reactions Bar */}
                  <DevotionalEmojiBar socket={socket} streamId={id} />
                </div>

                {/* 2. Mobile Tab Switcher (Visible only on mobile/tablet < lg) */}
                <div className="lg:hidden flex items-center bg-stone-100 dark:bg-stone-900/90 p-1 rounded-2xl border border-stone-200 dark:border-gold/20 shadow-inner">
                  <button
                    onClick={() => setMobileTab('chat')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                      mobileTab === 'chat'
                        ? 'bg-gold text-white dark:text-stone-950 shadow-md font-extrabold'
                        : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{L('Sacred Live Chat', 'पवित्र लाइव चैट')}</span>
                  </button>
                  <button
                    onClick={() => setMobileTab('details')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                      mobileTab === 'details'
                        ? 'bg-gold text-white dark:text-stone-950 shadow-md font-extrabold'
                        : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
                    }`}
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>{L('Pooja Details & Pandit Ji', 'पूजा विवरण एवं पंडित जी')}</span>
                  </button>
                </div>

                {/* 3. Detailed Information Section (Shown on mobile when 'details' tab selected, ALWAYS visible on desktop) */}
                <div className={`${mobileTab === 'details' ? 'block' : 'hidden lg:block'} bg-white dark:bg-obsidian-soft border border-stone-200 dark:border-gold/15 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-lg space-y-3`}>
                  <h3 className="font-serif text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
                    <OmIcon size={18} /> {L('Sacred Pooja Description', 'पवित्र पूजा विवरण')}
                  </h3>
                  {stream.description ? (
                    <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line">
                      {stream.description}
                    </p>
                  ) : (
                    <p className="text-xs text-stone-600 dark:text-stone-400 italic">{L('No additional description provided for this pooja.', 'इस पूजा के लिए कोई अतिरिक्त विवरण नहीं दिया गया है।')}</p>
                  )}

                  <div className="pt-3 border-t border-stone-200 dark:border-stone-800/80 flex items-center justify-between text-xs text-stone-600 dark:text-stone-300">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                        <PranamIcon size={16} /> {L('Presided by', 'मुख्य आचार्य:')} {stream.streamer?.name}
                      </span>
                      {stream.streamer?.streamerProfile?.isVerifiedBadge && (
                        <span className="inline-flex items-center gap-1 text-amber-800 dark:text-gold-soft font-bold" title={L('Verified Vedic Pandit', 'सत्यापित वैदिक पंडित')}>
                          <VerifiedPanditBadge size={16} /> {L('Verified', 'सत्यापित')}
                        </span>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-stone-600 dark:text-stone-400 font-medium">
                      <Eye className="w-3.5 h-3.5 text-amber-700 dark:text-gold" />
                      <span>{viewerCount ?? stream.peakViewers ?? 0} {L('Live Devotees', 'लाइव श्रद्धालु')}</span>
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
          streamerName={stream.streamer?.name || L('Vedic Pandit Ji', 'वैदिक पंडित जी')}
          currentUser={currentUser}
          walletBalance={remainingCoins}
          onOpenTopup={() => {
            setDakshinaModalOpen(false);
            setResumeDakshinaAfterTopup(true);
            setTopupModalOpen(true);
          }}
          onSuccess={(newBalance) => {
            setRemainingCoins(newBalance);
            setAvailableMinutes(Math.floor(newBalance / COINS_PER_MINUTE));
            syncLocalWalletBalance(newBalance);
          }}
        />
      )}

      <CoinTopupModal
        isOpen={topupModalOpen}
        onClose={() => {
          setTopupModalOpen(false);
          setResumeDakshinaAfterTopup(false);
        }}
        onSuccess={handleTopupSuccess}
      />

      {/* Sacred Broadcast Moderation Report Modal (B-26) */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1c140d] border border-stone-200 dark:border-gold/30 rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-xs">
            <button
              onClick={() => setReportModalOpen(false)}
              aria-label={L('Close', 'बंद करें')}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-900 dark:hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4 text-amber-700 dark:text-amber-400 font-bold">
              <Flag className="w-4 h-4" />
              <span className="text-sm text-stone-900 dark:text-white">{L('Report Sacred Darshan Broadcast', 'पवित्र दर्शन प्रसारण की रिपोर्ट करें')}</span>
            </div>

            <p className="text-stone-600 dark:text-stone-300 mb-4 leading-relaxed">
              {L('Help maintain sacred dignity and reverence. Reports are reviewed by platform administrators within 2 hours.', 'पवित्र मर्यादा एवं आस्था की रक्षा में सहायता करें। सभी रिपोर्टों की समीक्षा 2 घंटे के भीतर की जाती है।')}
            </p>

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-200 mb-1.5">{L('Primary Reason', 'मुख्य कारण')}</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-stone-50 dark:bg-obsidian border border-stone-300 dark:border-gold/20 text-stone-900 dark:text-stone-200 focus:outline-none focus:border-amber-500 dark:focus:border-gold"
                >
                  <option value="Inappropriate Content / Conduct">{L('Inappropriate Content or Conduct', 'अनुचित सामग्री या व्यवहार')}</option>
                  <option value="Harassment or Hate Speech">{L('Harassment or Hate Speech', 'उत्पीड़न या आपत्तिजनक भाषा')}</option>
                  <option value="Commercial Spam / Unrelated Content">{L('Commercial Spam / Unrelated Content', 'व्यावसायिक स्पैम / अप्रासंगिक सामग्री')}</option>
                  <option value="Audio/Video Quality / Impersonation">{L('Audio/Video Quality or Impersonation', 'ऑडियो/वीडियो गुणवत्ता या प्रतिरूपण')}</option>
                  <option value="Other Violation">{L('Other Community Guidelines Violation', 'अन्य सामुदायिक दिशानिर्देश उल्लंघन')}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-200 mb-1.5">{L('Additional Details (Optional)', 'अतिरिक्त विवरण (वैकल्पिक)')}</label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder={L('Describe specific timestamps or details to help moderators...', 'मॉडरेटर्स की सहायता हेतु विवरण या समय लिखें...')}
                  className="w-full p-2.5 rounded-xl bg-stone-50 dark:bg-obsidian border border-stone-300 dark:border-gold/20 text-stone-900 dark:text-stone-200 focus:outline-none focus:border-amber-500 dark:focus:border-gold resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold"
                >
                  {L('Cancel', 'रद्द करें')}
                </button>
                <button
                  type="submit"
                  disabled={reporting}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold disabled:opacity-50"
                >
                  {reporting ? L('Submitting...', 'सबमिट हो रहा है...') : L('Submit Report', 'रिपोर्ट सबमिट करें')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoRenderer({
  streamerId,
  streamId,
  socket,
  canAsk,
}: {
  streamerId?: string;
  streamId: string;
  socket: Socket | null;
  canAsk: boolean;
}) {
  const toast = useToast();
  const { lang } = useLang();
  const L = (en: string, hi: string) => (lang === 'hi' ? hi : en);
  const room = useRoomContext();
  useRoomTick(room);
  const participants = useParticipants();
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone], { onlySubscribed: false });
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled } = useLocalParticipant();
  const perms = useLocalParticipantPermissions();
  const canPublish = !!perms?.canPublish;
  const connected = useConnectionState() === ConnectionState.Connected;

  const [requested, setRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const wasPublisher = useRef(false);

  const pandit = participants.find((p) => isStreamerParticipant(p, streamerId));
  const guest = participants.find((p) => !isStreamerParticipant(p, streamerId) && isVideoGuest(p));
  const camOf = (id: string) => trackFor(tracks, id, Track.Source.Camera);
  const micMutedOf = (id: string) => {
    const m = trackFor(tracks, id, Track.Source.Microphone);
    return !m || !m.publication || m.publication.isMuted;
  };

  const stopLocalMedia = async () => {
    try {
      await room?.localParticipant?.setCameraEnabled(false);
      await room?.localParticipant?.setMicrophoneEnabled(false);
    } catch {}
  };

  // Permission taken away (pandit revoked, replaced someone, or the guest left): release camera + mic.
  useEffect(() => {
    if (wasPublisher.current && !canPublish) {
      stopLocalMedia();
      setRequested(false);
    }
    if (canPublish) setRequested(false);
    wasPublisher.current = canPublish;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPublish]);

  useEffect(() => {
    if (!socket) return;
    const onGranted = () => toast.success(L('Pandit Ji allowed you to show your video. Tap "Turn on camera".', 'पंडित जी ने आपका वीडियो दिखाने की अनुमति दे दी है। "कैमरा चालू करें" दबाएँ।'));
    const onRevoked = (d: { replaced?: boolean }) => {
      toast.info(d?.replaced ? L('Pandit Ji gave the video slot to another devotee.', 'पंडित जी ने वीडियो स्लॉट अन्य भक्त को दिया।') : L('Pandit Ji ended your video.', 'पंडित जी ने आपका वीडियो बंद कर दिया।'));
      stopLocalMedia();
      setRequested(false);
    };
    const onMuted = (d: { source?: string }) =>
      toast.info(d?.source === 'camera' ? L('Pandit Ji turned your camera off.', 'पंडित जी ने आपका कैमरा बंद कर दिया।') : L('Pandit Ji muted your microphone.', 'पंडित जी ने आपका माइक्रोफ़ोन म्यूट कर दिया।'));
    socket.on('video:granted', onGranted);
    socket.on('video:revoked', onRevoked);
    socket.on('video:muted_by_host', onMuted);
    return () => {
      socket.off('video:granted', onGranted);
      socket.off('video:revoked', onRevoked);
      socket.off('video:muted_by_host', onMuted);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, localParticipant]);

  // Leaving the page must never leave a camera running.
  useEffect(() => () => { stopLocalMedia(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleRequest = () => {
    if (!socket) return;
    socket.emit('video:request', { streamId, cancel: requested });
    setRequested(!requested);
    toast.info(requested ? L('Request cancelled.', 'अनुरोध रद्द किया गया।') : L('Request sent. Pandit Ji will see it.', 'अनुरोध भेज दिया गया। पंडित जी शीघ्र देखेंगे।'));
  };

  const toggle = async (kind: 'cam' | 'mic') => {
    if (!localParticipant || busy) return;
    setBusy(true);
    try {
      if (kind === 'cam') await localParticipant.setCameraEnabled(!isCameraEnabled);
      else await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (err: any) {
      toast.error(friendlyMediaError(err, lang));
    } finally {
      setBusy(false);
    }
  };

  const panditCam = pandit ? camOf(pandit.identity) : undefined;
  const panditHasVideo = !!panditCam && !!panditCam.publication && !panditCam.publication.isMuted;

  return (
    <div className="relative w-full h-full">
      <ConnectionBanner />
      {panditHasVideo ? (
        <VideoTrack trackRef={panditCam as any} className="w-full h-full object-cover" />
      ) : (
        <div className="video-overlay w-full h-full flex flex-col items-center justify-center text-stone-200 bg-stone-950">
          <DiyaIcon size={44} className="mb-2" />
          <span className="text-sm font-medium text-stone-200">{L('Awaiting Pandit Ji video transmission...', 'पंडित जी के वीडियो प्रसारण की प्रतीक्षा...')}</span>
        </div>
      )}

      {guest && (
        <div className="video-overlay absolute bottom-14 right-3 z-30" data-testid="video-guest-tile">
          <ParticipantTile
            participant={guest}
            cameraRef={camOf(guest.identity)}
            micMuted={guest.isLocal ? !isMicrophoneEnabled : micMutedOf(guest.identity)}
            label={guest.isLocal ? L('You', 'आप') : (guest.name || L('Devotee', 'भक्त'))}
            badge={L('Video guest', 'वीडियो अतिथि')}
            mirror={guest.isLocal}
            className="w-32 sm:w-48 aspect-video shadow-2xl !border-orange-500/80"
          />
        </div>
      )}

      {/* Devotee controls: ask / turn on camera. Only registered devotees on a live public stream. */}
      {canAsk && connected && (
        <div className="video-overlay absolute bottom-3 left-3 z-30 flex items-center gap-2 max-w-[75%] flex-wrap">
          {canPublish ? (
            <>
              <button
                onClick={() => toggle('cam')}
                disabled={busy}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-lg disabled:opacity-60 ${isCameraEnabled ? 'bg-emerald-700 text-white' : 'bg-amber-500 text-stone-950 animate-pulse'}`}
              >
                {isCameraEnabled ? L('Camera on', 'कैमरा चालू') : L('Turn on camera', 'कैमरा चालू करें')}
              </button>
              <button
                onClick={() => toggle('mic')}
                disabled={busy}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-lg disabled:opacity-60 ${isMicrophoneEnabled ? 'bg-emerald-700 text-white' : 'bg-stone-800/90 text-stone-100'}`}
              >
                {isMicrophoneEnabled ? L('Mic on', 'माइक चालू') : L('Mic off', 'माइक बंद')}
              </button>
              <button
                onClick={stopLocalMedia}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-700/90 text-white shadow-lg"
              >
                {L('Stop video', 'वीडियो बंद करें')}
              </button>
            </>
          ) : (
            <button
              onClick={toggleRequest}
              disabled={!socket}
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-black/75 hover:bg-black/90 border border-amber-400/50 text-amber-200 shadow-lg disabled:opacity-60"
              style={{ color: '#fde68a' }}
            >
              {requested ? L('Cancel video request', 'वीडियो अनुरोध रद्द करें') : L('Ask to show my video', 'मेरा वीडियो दिखाने का अनुरोध करें')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
