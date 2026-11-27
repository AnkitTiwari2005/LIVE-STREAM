'use client';

import Link from 'next/link';
import { PranamIcon, OmIcon, DiyaIcon, CoinIcon } from '@/components/icons/SpiritualIcons';
import { calculateStreamerNetCoinsInr, formatInrAmount } from '@/lib/economy';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  createLocalTracks,
  LocalVideoTrack,
  LocalAudioTrack,
  Track,
} from 'livekit-client';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  useTracks,
  VideoTrack,
  AudioTrack,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
} from '@livekit/components-react';
import { io, Socket } from 'socket.io-client';
import { ChatWidget } from '@/components/ChatWidget';
import { WhatsAppShareModal } from '@/components/WhatsAppShareModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { apiFetch } from '@/lib/api';
import { decodeJwtClaims, purgeClientSession } from '@/lib/auth-session';
import { useToast } from '@/components/Toast';
import { useLang } from '@/lib/i18n/context';
import { formatCoins } from '@/lib/i18n/format';
import {
  Camera,
  Mic,
  Settings,
  Radio,
  StopCircle,
  Share2,
  Users,
  AlertCircle,
  Check,
  Sparkles,
  Eye,
  UserX,
  Video as VideoGuestIcon,
  VideoOff,
  MicOff,
  Hand,
} from 'lucide-react';
import { KickViewerModal } from '@/components/KickViewerModal';
import {
  ParticipantTile,
  ConnectionBanner,
  ROOM_OPTIONS,
  trackFor,
  useRoomTick,
  isVideoGuest,
  friendlyMediaError,
} from '@/components/video/MediaPieces';

export interface ViewerEntry {
  identity: string;
  displayName: string;
  isGuest: boolean;
  joinedAtMs: number;
}

export default function StudioClient() {
  const { id: paramId } = useParams() as { id: string };
  const router = useRouter();
  const toast = useToast();
  const { lang, t: L } = useLang();

  const [streamId, setStreamId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.replace(/\/$/, '').split('/').filter(Boolean);
      const urlId = parts[parts.length - 1];
      if (urlId && urlId !== 'studio' && urlId !== 'demo' && urlId !== '[id]') {
        return urlId;
      }
    }
    return paramId || '';
  });

  const [stream, setStream] = useState<any>(null);
  const [isLive, setIsLive] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [endingStream, setEndingStream] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Hardware Preview state (Stage 1)
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [selectedAudio, setSelectedAudio] = useState<string>('');
  const [previewTracks, setPreviewTracks] = useState<{ video?: LocalVideoTrack; audio?: LocalAudioTrack }>({});
  const previewRef = useRef<HTMLDivElement>(null);

  // Private stream WhatsApp share modal
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [privateLinkData, setPrivateLinkData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeConflict, setActiveConflict] = useState(false);
  const [loading, setLoading] = useState(false);
  const [streamCoins, setStreamCoins] = useState<number | null>(null);
  const [lastDelta, setLastDelta] = useState<number | null>(null);
  const deltaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const devicesLoadedRef = useRef(false);

  // Live Presence & Moderation State
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [peakViewers, setPeakViewers] = useState<number>(0);
  const [viewers, setViewers] = useState<ViewerEntry[]>([]);
  const [showViewersPanel, setShowViewersPanel] = useState<boolean>(false);
  const [kickTarget, setKickTarget] = useState<{ identity: string; displayName: string } | null>(null);
  // Public-stream video guest (one devotee at a time, this session only)
  const [videoGuest, setVideoGuest] = useState<{ identity: string; name?: string } | null>(null);
  const [videoRequests, setVideoRequests] = useState<Array<{ identity: string; name: string; at: number }>>([]);
  const [dismissedReqs, setDismissedReqs] = useState<Set<string>>(new Set());
  const [guestBusy, setGuestBusy] = useState<string | null>(null);

  // Ensure streamId updates if URL changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.replace(/\/$/, '').split('/').filter(Boolean);
      const urlId = parts[parts.length - 1];
      if (urlId && urlId !== 'studio' && urlId !== 'demo' && urlId !== '[id]') {
        setStreamId(urlId);
      }
    }
  }, [paramId]);

  // Screen Wake Lock API
  useEffect(() => {
    let wakeLock: any = null;
    const requestLock = async () => {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        } catch (e) {
          console.warn('Wake Lock request failed:', e);
        }
      }
    };

    requestLock();
    document.addEventListener('visibilitychange', requestLock);
    return () => {
      document.removeEventListener('visibilitychange', requestLock);
      if (wakeLock) wakeLock.release();
    };
  }, []);

  // Initialize stream data, live stream earnings, and available hardware devices
  useEffect(() => {
    if (!streamId || streamId === 'demo') return;

    setStreamCoins(null);
    setLastDelta(null);

    const storedUser = localStorage.getItem('pooja_user');
    const storedToken = localStorage.getItem('pooja_token');
    if (!storedToken) {
      router.push('/login');
      return;
    }

    const claims = decodeJwtClaims(storedToken);
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (!claims?.sub || parsed.id === claims.sub) {
          setCurrentUser(parsed);
        } else {
          // Contaminated session: drop immediately
          localStorage.removeItem('pooja_user');
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      }
    }

    let isDisposed = false;

    async function fetchStreamEarnings() {
      try {
        const earnings = await apiFetch<any>(`/streamers/streams/${streamId}/earnings`);
        if (!isDisposed && typeof earnings?.totalCoins === 'number') {
          setStreamCoins((prev) =>
            prev === null ? earnings.totalCoins : Math.max(prev, earnings.totalCoins),
          );
        }
      } catch {
        // Non-fatal on transient reconnect blips
      }
    }

    async function loadStream() {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      try {
        const res = await fetch(`${apiUrl}/streams/${streamId}`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || L('Stream not found', 'प्रसारण नहीं मिला'));
        if (!isDisposed) {
          setStream(data);
          if (typeof data.peakViewers === 'number') {
            setPeakViewers(data.peakViewers);
          }
        }

        // If stream is private, auto-generate private link
        if (data.visibility === 'PRIVATE') {
          const linkRes = await fetch(`${apiUrl}/private-links`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${storedToken}`,
            },
            body: JSON.stringify({ streamId }),
          });
          if (linkRes.ok) {
            const linkData = await linkRes.json();
            if (!isDisposed) setPrivateLinkData(linkData);
          }
        }
      } catch (err: any) {
        if (!isDisposed) setError(err.message);
      }
    }

    loadStream();
    fetchStreamEarnings();

    // Socket.io chat & private live streamer earnings listener
    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || '';
    const socketInstance = io(socketUrl, {
      auth: { token: storedToken },
      withCredentials: true,
    });
    setSocket(socketInstance);

    const handleEarningsUpdated = (payload: any) => {
      if (!payload || payload.streamId !== streamId) return;
      if (typeof payload.totalCoins === 'number') {
        setStreamCoins((prev) => Math.max(prev ?? 0, payload.totalCoins));
      }
      if (typeof payload.delta === 'number' && payload.delta > 0) {
        setLastDelta(payload.delta);
        if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);
        deltaTimerRef.current = setTimeout(() => {
          setLastDelta(null);
        }, 3000);
      }
    };

    const handleViewerCount = (payload: any) => {
      if (!payload || payload.streamId !== streamId) return;
      if (typeof payload.count === 'number') {
        setViewerCount(payload.count);
        setPeakViewers((prev) => Math.max(prev, payload.count));
      }
    };

    const handleViewerList = (list: ViewerEntry[]) => {
      if (Array.isArray(list)) {
        setViewers(list);
      }
    };

    const handleViewerJoined = (viewer: ViewerEntry) => {
      if (viewer && viewer.identity) {
        setViewers((prev) => {
          const filtered = prev.filter((v) => v.identity !== viewer.identity);
          return [...filtered, viewer];
        });
      }
    };

    const handleViewerLeft = (data: { identity: string }) => {
      if (data?.identity) {
        setViewers((prev) => prev.filter((v) => v.identity !== data.identity));
      }
    };

    const handleGuestChanged = (d: { identity: string; name?: string; active: boolean }) => {
      if (!d?.identity) return;
      if (d.active) setVideoGuest({ identity: d.identity, name: d.name });
      else setVideoGuest((cur) => (cur && cur.identity === d.identity ? null : cur));
    };

    const handleVideoRequests = (d: { streamId: string; requests: Array<{ identity: string; name: string; at: number }> }) => {
      if (!d || d.streamId !== streamId || !Array.isArray(d.requests)) return;
      setVideoRequests(d.requests);
      // A devotee who cancelled and asks again should show up again.
      setDismissedReqs((prev) => {
        const live = new Set(d.requests.map((r) => r.identity));
        const next = new Set(Array.from(prev).filter((id) => live.has(id)));
        return next.size === prev.size ? prev : next;
      });
    };

    const onConnect = () => {
      fetchStreamEarnings();
      socketInstance.emit('stream:viewer_list:request', { streamId });
      socketInstance.emit('video:requests:list', { streamId });
    };

    socketInstance.on('connect', onConnect);
    socketInstance.on('stream:earnings_updated', handleEarningsUpdated);
    socketInstance.on('stream:viewer_count', handleViewerCount);
    socketInstance.on('stream:viewer_list', handleViewerList);
    socketInstance.on('stream:viewer_joined', handleViewerJoined);
    socketInstance.on('stream:viewer_left', handleViewerLeft);
    socketInstance.on('video:guest_changed', handleGuestChanged);
    socketInstance.on('video:requests', handleVideoRequests);

    return () => {
      isDisposed = true;
      if (deltaTimerRef.current) {
        clearTimeout(deltaTimerRef.current);
        deltaTimerRef.current = null;
      }
      socketInstance.off('connect', onConnect);
      socketInstance.off('stream:earnings_updated', handleEarningsUpdated);
      socketInstance.off('stream:viewer_count', handleViewerCount);
      socketInstance.off('stream:viewer_list', handleViewerList);
      socketInstance.off('stream:viewer_joined', handleViewerJoined);
      socketInstance.off('stream:viewer_left', handleViewerLeft);
      socketInstance.off('video:guest_changed', handleGuestChanged);
      socketInstance.off('video:requests', handleVideoRequests);
      socketInstance.disconnect();
    };
  }, [streamId, router]);

  // ── Video guest / per-participant media controls ───────────────────────────
  const isPublicStream = stream?.visibility !== 'PRIVATE';

  // Who holds the slot right now (survives a studio page refresh).
  useEffect(() => {
    if (!isLive || !isPublicStream || !streamId || streamId === 'demo') return;
    apiFetch(`/streams/${streamId}/video-guest`)
      .then((r: any) => setVideoGuest(r?.guest ? { identity: r.guest.identity, name: r.guest.name } : null))
      .catch(() => {});
  }, [isLive, isPublicStream, streamId]);

  // Tell the pandit when someone asks, even if the panel is closed.
  const seenReqsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const r of videoRequests) {
      if (!seenReqsRef.current.has(r.identity)) {
        seenReqsRef.current.add(r.identity);
        toast.info(
          L(
            `${r.name} would like to show their video. Open Viewers to allow.`,
            `${r.name} अपना वीडियो दिखाना चाहते हैं। अनुमति देने के लिए "दर्शक" खोलें।`,
          ),
        );
      }
    }
    const live = new Set(videoRequests.map((r) => r.identity));
    Array.from(seenReqsRef.current).forEach((id) => {
      if (!live.has(id)) seenReqsRef.current.delete(id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRequests]);

  const grantVideo = async (identity: string, name: string) => {
    if (guestBusy) return;
    setGuestBusy(identity);
    try {
      const replace = !!videoGuest && videoGuest.identity !== identity;
      const r: any = await apiFetch(`/streams/${streamId}/video-guest/${encodeURIComponent(identity)}/grant`, {
        method: 'POST',
        body: JSON.stringify({ replace }),
      });
      setVideoGuest({ identity, name: r?.guest?.name || name });
      toast.success(
        L(`${name} can now turn on their video.`, `${name} अब अपना वीडियो चालू कर सकते हैं।`),
      );
    } catch (err: any) {
      toast.error(err?.message || L('Could not give video access.', 'वीडियो अनुमति नहीं दी जा सकी।'));
    } finally {
      setGuestBusy(null);
    }
  };

  const stopVideoGuest = async (identity: string) => {
    if (guestBusy) return;
    setGuestBusy(identity);
    try {
      await apiFetch(`/streams/${streamId}/video-guest/${encodeURIComponent(identity)}/revoke`, { method: 'POST' });
      setVideoGuest((cur) => (cur && cur.identity === identity ? null : cur));
      toast.success(L('Video access taken back.', 'वीडियो अनुमति वापस ली गई।'));
    } catch (err: any) {
      toast.error(err?.message || L('Could not take back video access.', 'वीडियो अनुमति वापस नहीं ली जा सकी।'));
    } finally {
      setGuestBusy(null);
    }
  };

  const muteParticipant = async (identity: string, source: 'camera' | 'microphone') => {
    try {
      await apiFetch(`/streams/${streamId}/participants/${encodeURIComponent(identity)}/mute`, {
        method: 'POST',
        body: JSON.stringify({ source }),
      });
    } catch (err: any) {
      toast.error(err?.message || L('Could not change their audio/video.', 'उनका ऑडियो/वीडियो बदला नहीं जा सका।'));
    }
  };

  const pendingRequests = videoRequests.filter((r) => !dismissedReqs.has(r.identity));

  // Stage 1: Hardware preview using local tracks with robust fallback
  useEffect(() => {
    if (isLive) return;

    let localVideo: LocalVideoTrack | undefined;
    let localAudio: LocalAudioTrack | undefined;
    let isCancelled = false;

    async function startPreview() {
      try {
        let tracks: any[] = [];
        try {
          // Attempt acquire with user preferences (ideal constraints prevent OverconstrainedError)
          tracks = await createLocalTracks({
            video: selectedVideo ? { deviceId: { ideal: selectedVideo } } : true,
            audio: selectedAudio ? { deviceId: { ideal: selectedAudio } } : true,
          });
        } catch (constraintErr) {
          console.warn('Constrained track acquire failed, falling back to basic tracks:', constraintErr);
          // Resilient fallback: acquire default video and audio without constraints
          tracks = await createLocalTracks({ video: true, audio: true });
        }

        if (isCancelled) {
          tracks.forEach((t) => t.stop());
          return;
        }

        localVideo = tracks.find((t) => t.kind === 'video') as LocalVideoTrack;
        localAudio = tracks.find((t) => t.kind === 'audio') as LocalAudioTrack;

        setPreviewTracks({ video: localVideo, audio: localAudio });

        if (localVideo && previewRef.current) {
          previewRef.current.innerHTML = '';
          const videoEl = localVideo.attach();
          videoEl.className = 'w-full h-full object-cover';
          videoEl.muted = true;
          videoEl.autoplay = true;
          videoEl.setAttribute('playsinline', 'true');
          videoEl.setAttribute('muted', 'true');
          videoEl.play().catch(() => {});
          previewRef.current.appendChild(videoEl);
        }

        // Enumerate devices once
        if (!devicesLoadedRef.current && navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const vInputs = devices.filter((d) => d.kind === 'videoinput');
          const aInputs = devices.filter((d) => d.kind === 'audioinput');
          setVideoDevices(vInputs);
          setAudioDevices(aInputs);
          devicesLoadedRef.current = true;
        }
      } catch (err: any) {
        console.warn('Camera preview acquire error:', err.message);
      }
    }

    startPreview();

    return () => {
      isCancelled = true;
      localVideo?.stop();
      localAudio?.stop();
    };
  }, [selectedVideo, selectedAudio, isLive]);

  // Stage 2: Transition to LIVE with conflict resolution
  const handleGoLive = async (forceEndPrevious = false) => {
    setError(null);
    setActiveConflict(false);
    setLoading(true);

    const storedToken = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

    try {
      const res = await fetch(`${apiUrl}/streams/${streamId}/go-live`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${storedToken}`,
        },
        body: JSON.stringify({ forceEndPrevious }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.message && data.message.includes('already have another live broadcast')) {
          setActiveConflict(true);
        }
        throw new Error(data.message || L('Could not start live stream', 'लाइव प्रसारण शुरू नहीं हो सका'));
      }

      // Stop local preview tracks so LiveKit can capture the device
      previewTracks.video?.stop();
      previewTracks.audio?.stop();

      setToken(data.publisherToken);
      setServerUrl(data.serverUrl);
      setIsLive(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEndStream = () => {
    setConfirmEndOpen(true);
  };

  const confirmEndStream = async () => {
    setEndingStream(true);
    try {
      await apiFetch(`/streams/${streamId}/end`, { method: 'POST' });
      setIsLive(false);
      setToken(null);
      setConfirmEndOpen(false);
      toast.success(L('Pooja session concluded successfully.', 'पूजा सत्र सफलतापूर्वक समाप्त हुआ।'));
      router.push('/');
    } catch (err: any) {
      toast.error(err.message || L('Failed to end stream', 'प्रसारण समाप्त नहीं हो सका'));
    } finally {
      setEndingStream(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian text-foreground py-6 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Banner & Emergency Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 bg-obsidian-soft border border-gold/20 p-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isLive ? 'bg-red-600 text-white animate-pulse' : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'}`}>
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
              {stream?.title || L('Pandit Live Studio', 'पंडित लाइव स्टूडियो')}
              {isLive && (
                <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-bold">
                  {L('LIVE ON AIR', 'लाइव ऑन एयर')}
                </span>
              )}
            </h1>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              {stream?.visibility === 'PRIVATE'
                ? L('Private Sacred Consultation', 'निजी पावन परामर्श')
                : L('Public Live Darshan', 'सार्वजनिक लाइव दर्शन')}{' '}
              • {L('Quality:', 'गुणवत्ता:')} {stream?.videoQuality || '480p'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Always-visible Live Stream Coin Earnings Pill */}
          {(() => {
            const earned = streamCoins ?? 0;
            const breakdown = calculateStreamerNetCoinsInr(earned);
            const tooltipText =
              lang === 'hi'
                ? `सकल: ₹${formatInrAmount(breakdown.grossInr)} • आपका 85% शुद्ध हिस्सा: ₹${formatInrAmount(breakdown.netInr)} (150 कॉइन = ₹100)`
                : `Gross: ₹${formatInrAmount(breakdown.grossInr)} • Your 85% Net Share: ₹${formatInrAmount(breakdown.netInr)} (150 coins = ₹100)`;
            return (
              <Link
                href="/streamer/earnings"
                title={tooltipText}
                aria-label={
                  lang === 'hi'
                    ? `इस प्रसारण में ${earned} कॉइन अर्जित। ${tooltipText}`
                    : `${earned} Coins Earned in this stream. ${tooltipText}`
                }
                className="relative inline-flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 px-3.5 py-2 text-xs font-extrabold text-amber-950 dark:text-gold-pale shadow-sm transition-all"
              >
                <CoinIcon size={16} />
                <span>{formatCoins(earned, lang)}</span>
                <span className="text-[10px] font-semibold text-amber-800 dark:text-stone-300 hidden sm:inline">
                  (≈ ₹{formatInrAmount(breakdown.netInr)} {L('net', 'शुद्ध')})
                </span>
                {lastDelta !== null && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black animate-bounce shadow">
                    +{lastDelta}
                  </span>
                )}
              </Link>
            );
          })()}

          {/* Live Viewer Count Pill */}
          {isLive && (
            <div
              title={
                lang === 'hi'
                  ? `सक्रिय भक्त: ${viewerCount} • अधिकतम: ${peakViewers}`
                  : `Active Devotees: ${viewerCount} • Peak: ${peakViewers}`
              }
              className="relative inline-flex items-center gap-2 rounded-full border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-400 shadow-sm"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Eye className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>{viewerCount} {L('Live', 'लाइव')}</span>
              </div>
              <span className="text-stone-400 dark:text-stone-600">•</span>
              <span className="text-[10px] text-stone-600 dark:text-stone-400 font-medium">
                {L('Peak:', 'अधिकतम:')} {peakViewers}
              </span>
            </div>
          )}

          {/* Toggle Viewers Moderation Panel */}
          {isLive && (
            <button
              type="button"
              onClick={() => {
                const next = !showViewersPanel;
                setShowViewersPanel(next);
                if (next && socket) {
                  socket.emit('stream:viewer_list:request', { streamId });
                }
              }}
              className={`flex items-center gap-1.5 text-xs font-semibold py-2 px-3.5 rounded-xl transition-colors shadow-sm ${
                showViewersPanel
                  ? 'bg-amber-700 hover:bg-amber-600 text-white shadow-amber-900/40'
                  : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700'
              }`}
            >
              <Users className="w-4 h-4 text-amber-700 dark:text-amber-400" /> {L('Viewers', 'दर्शक')} ({viewerCount})
              {isPublicStream && pendingRequests.length > 0 && (
                <span
                  className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 animate-pulse"
                  title={L('Video requests', 'वीडियो अनुरोध')}
                >
                  <Hand className="w-3 h-3" />{pendingRequests.length}
                </span>
              )}
            </button>
          )}

          {stream?.visibility === 'PRIVATE' && privateLinkData && (
            <button
              onClick={() => setShareModalOpen(true)}
              className="flex items-center gap-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition-colors shadow-md"
            >
              <Share2 className="w-4 h-4" /> {L('WhatsApp Invite Link', 'WhatsApp आमंत्रण लिंक')}
            </button>
          )}

          {isLive && (
            <button
              onClick={handleEndStream}
              className="flex items-center gap-1.5 bg-red-700 hover:bg-red-600 text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition-colors shadow-md"
            >
              <StopCircle className="w-4 h-4" /> {L('End Live Stream', 'लाइव प्रसारण समाप्त करें')}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/90 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {activeConflict && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/80 border border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-800 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-amber-950 dark:text-amber-300 block text-sm">
                {L('Previous Live Session Still Active', 'पिछला लाइव सत्र अभी भी सक्रिय है')}
              </span>
              <span className="text-amber-900 dark:text-amber-200 font-medium">
                {L(
                  'You have another live broadcast running. Would you like to end the previous broadcast and go live with this session now?',
                  'आपका एक अन्य लाइव प्रसारण चल रहा है। क्या आप पिछला प्रसारण समाप्त करके अभी इस सत्र को लाइव करना चाहते हैं?',
                )}
              </span>
            </div>
          </div>
          <button
            onClick={() => handleGoLive(true)}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-orange-700 to-amber-700 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl text-xs transition shadow-md shrink-0"
          >
            {loading ? L('Starting...', 'शुरू हो रहा है...') : L('End Previous & Start Live Now', 'पिछला समाप्त करें व अभी लाइव हों')}
          </button>
        </div>
      )}

      {stream?.status === 'ENDED' && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <DiyaIcon size={24} className="text-amber-800 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-amber-950 dark:text-amber-300 block text-sm">
                {L('Previous Live Broadcast Concluded', 'पिछला लाइव प्रसारण समाप्त हो चुका है')}
              </span>
              <span className="text-amber-900 dark:text-amber-200 font-medium">
                {L(
                  'This sacred ritual session has ended. To go live again, configure a fresh broadcast.',
                  'यह पावन अनुष्ठान सत्र समाप्त हो चुका है। फिर से लाइव जाने के लिए नया प्रसारण सेटअप करें।',
                )}
              </span>
            </div>
          </div>
          <Link
            href="/studio/create"
            className="px-4 py-2 bg-orange-700 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-colors shrink-0 shadow-md text-center"
          >
            {L('Setup New Broadcast', 'नया प्रसारण सेटअप करें')}
          </Link>
        </div>
      )}

      {/* Main Studio Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Video Publisher / Preview Area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="player-container video-overlay relative aspect-video bg-black rounded-2xl overflow-hidden border border-stone-800 shadow-2xl flex items-center justify-center">
            {!isLive ? (
              // Stage 1: Local Device Preview
              <div className="video-overlay relative w-full h-full flex items-center justify-center bg-stone-950">
                <div ref={previewRef} className="w-full h-full object-cover" />
                <div className="absolute top-4 left-4 bg-amber-400 text-stone-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow z-10">
                  {L('STUDIO PREVIEW (OFF AIR)', 'स्टूडियो पूर्वावलोकन (ऑफ़ एयर)')}
                </div>
                {!previewTracks.video && (
                  <div className="video-overlay absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-black/80">
                    <Camera className="w-10 h-10 text-amber-400 mb-3 animate-pulse" />
                    <p className="text-stone-200 text-xs sm:text-sm font-semibold mb-3">
                      {L('Camera preview initializing or access needed', 'कैमरा पूर्वावलोकन शुरू हो रहा है या अनुमति आवश्यक है')}
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                          s.getTracks().forEach((t) => t.stop());
                          const devices = await navigator.mediaDevices.enumerateDevices();
                          const v = devices.filter((d) => d.kind === 'videoinput');
                          const a = devices.filter((d) => d.kind === 'audioinput');
                          setVideoDevices(v);
                          setAudioDevices(a);
                          if (v.length > 0) setSelectedVideo(v[0].deviceId);
                          if (a.length > 0) setSelectedAudio(a[0].deviceId);
                        } catch (e: any) {
                          setError(
                            L(
                              'Please allow camera and mic permissions in your browser address bar.',
                              'कृपया अपने ब्राउज़र एड्रेस बार में कैमरा व माइक की अनुमति दें।',
                            ),
                          );
                        }
                      }}
                      className="px-4 py-2 bg-gold hover:bg-gold-deep text-obsidian font-bold text-xs rounded-xl shadow-lg transition"
                    >
                      {L('Connect Camera & Mic', 'कैमरा व माइक जोड़ें')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Stage 2: LiveKit Publishing Room with Simulcast
              <LiveKitRoom
                serverUrl={serverUrl}
                token={token!}
                connect={true}
                video={true}
                audio={true}
                options={{
                  ...ROOM_OPTIONS,
                  publishDefaults: {
                    ...ROOM_OPTIONS.publishDefaults,
                    simulcast: true, // Multi-layer publishing for viewers on weak 4G
                    videoCodec: 'vp8',
                  },
                }}
                className="w-full h-full"
              >
                <RoomAudioRenderer />
                <PublisherTrackRenderer
                  isPrivate={stream?.visibility === 'PRIVATE'}
                  onMute={muteParticipant}
                  onStopGuest={stopVideoGuest}
                  onRemove={(identity, displayName) => setKickTarget({ identity, displayName })}
                />
                <div className="absolute top-4 right-4 z-30">
                  <StartAudio label={L('Unmute Remote Devotee Audio', 'भक्तों का ऑडियो अनम्यूट करें')} />
                </div>
              </LiveKitRoom>
            )}
          </div>

          {/* Controls: Go Live or Device Selector */}
          {!isLive ? (
            <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-stone-400 font-semibold flex items-center gap-1.5 mb-1.5">
                    <Camera className="w-3.5 h-3.5 text-orange-400" /> {L('Select Camera', 'कैमरा चुनें')}
                  </label>
                  <select
                    value={selectedVideo}
                    onChange={(e) => setSelectedVideo(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {videoDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || L(`Camera ${d.deviceId.slice(0, 5)}`, `कैमरा ${d.deviceId.slice(0, 5)}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-stone-400 font-semibold flex items-center gap-1.5 mb-1.5">
                    <Mic className="w-3.5 h-3.5 text-orange-400" /> {L('Select Microphone', 'माइक्रोफ़ोन चुनें')}
                  </label>
                  <select
                    value={selectedAudio}
                    onChange={(e) => setSelectedAudio(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {audioDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || L(`Mic ${d.deviceId.slice(0, 5)}`, `माइक ${d.deviceId.slice(0, 5)}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {videoDevices.length === 0 && (
                <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-2">
                  <span className="text-xs text-stone-400">
                    {L('Camera / mic devices not yet detected', 'कैमरा / माइक उपकरण अभी पहचाने नहीं गए हैं')}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                        stream.getTracks().forEach((t) => t.stop());
                        const devices = await navigator.mediaDevices.enumerateDevices();
                        const vInputs = devices.filter((d) => d.kind === 'videoinput');
                        const aInputs = devices.filter((d) => d.kind === 'audioinput');
                        setVideoDevices(vInputs);
                        setAudioDevices(aInputs);
                        if (vInputs.length > 0) setSelectedVideo(vInputs[0].deviceId);
                        if (aInputs.length > 0) setSelectedAudio(aInputs[0].deviceId);
                      } catch (err: any) {
                        setError(
                          L(
                            'Please grant camera and microphone permissions in your browser to broadcast.',
                            'प्रसारण के लिए कृपया अपने ब्राउज़र में कैमरा व माइक्रोफ़ोन की अनुमति दें।',
                          ),
                        );
                      }
                    }}
                    className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 dark:bg-orange-600/30 dark:hover:bg-orange-600/50 text-orange-950 dark:text-orange-300 border border-orange-300 dark:border-orange-500/30 font-semibold text-xs rounded-lg transition-colors"
                  >
                    {L('Grant Camera & Mic Access', 'कैमरा व माइक की अनुमति दें')}
                  </button>
                </div>
              )}

              {stream?.status === 'ENDED' ? (
                <Link
                  href="/studio/create"
                  className="w-full py-3.5 bg-gradient-to-r from-orange-700 via-amber-700 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-xl text-base shadow-xl transition-all flex items-center justify-center gap-2 text-center"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>{L('Setup New Broadcast', 'नया प्रसारण सेटअप करें')}</span>
                </Link>
              ) : (
                <button
                  onClick={() => handleGoLive(false)}
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-700 via-red-700 to-amber-700 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-xl text-base shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Radio className="w-5 h-5 animate-pulse" />
                  {loading ? (
                    L('Starting Broadcast Engine...', 'प्रसारण इंजन शुरू हो रहा है...')
                  ) : (
                    <span className="flex items-center gap-1.5">
                      {L('START LIVE BROADCAST NOW', 'अभी लाइव प्रसारण शुरू करें')} <PranamIcon size={18} />
                    </span>
                  )}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl flex items-center justify-between text-xs text-stone-800 dark:text-stone-300 shadow-sm">
                <span className="flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                  {L('Audio & Video Broadcasting via Single-port UDP (7882)', 'सिंगल-पोर्ट UDP (7882) द्वारा ऑडियो व वीडियो प्रसारण')}
                </span>
                <span className="text-stone-500 dark:text-stone-400 font-mono">{L('Simulcast Active', 'Simulcast सक्रिय')}</span>
              </div>


              {/* Video guest slot - public streams only */}
              {isPublicStream && (
                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl text-xs text-stone-800 dark:text-stone-300 shadow-sm" data-testid="video-guest-card">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <VideoGuestIcon className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-stone-900 dark:text-white">
                          {L('Video guest (one devotee at a time)', 'वीडियो अतिथि (एक समय में एक भक्त)')}
                        </p>
                        <p className="text-stone-500 dark:text-stone-400 truncate">
                          {videoGuest
                            ? lang === 'hi'
                              ? `${videoGuest.name || 'एक भक्त'} वीडियो दिखा सकते हैं व बोल सकते हैं। उनके जाने या प्रसारण समाप्त होने पर बंद होगा।`
                              : `${videoGuest.name || 'A devotee'} can show video and speak. Ends when they leave or this stream ends.`
                            : L(
                                'No one has the video slot. Open Viewers and tap "Give video" next to a devotee.',
                                'अभी किसी के पास वीडियो स्लॉट नहीं है। "दर्शक" खोलें और किसी भक्त के सामने "वीडियो दें" चुनें।',
                              )}
                        </p>
                      </div>
                    </div>
                    {videoGuest && (
                      <button
                        type="button"
                        disabled={guestBusy !== null}
                        onClick={() => stopVideoGuest(videoGuest.identity)}
                        className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold"
                      >
                        <VideoOff className="w-3.5 h-3.5" /> {L('Stop video', 'वीडियो बंद करें')}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Live Viewers Panel */}
              {showViewersPanel && (
                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-gold/30 p-4 rounded-2xl space-y-3 shadow-xl text-stone-900 dark:text-white">
                  <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                      <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                        {L('Active Devotees', 'सक्रिय भक्त')} ({viewers.length})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (socket) socket.emit('stream:viewer_list:request', { streamId });
                      }}
                      className="text-[11px] text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 font-semibold transition"
                    >
                      {L('Refresh List', 'सूची ताज़ा करें')}
                    </button>
                  </div>

                  {isPublicStream && pendingRequests.length > 0 && (
                    <div className="rounded-xl border border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/30 p-2.5 space-y-2" data-testid="video-requests">
                      <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                        <Hand className="w-3.5 h-3.5" /> {L('Asking to show video', 'वीडियो दिखाने का अनुरोध')}
                      </p>
                      {pendingRequests.map((r) => (
                        <div key={r.identity} className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold truncate">{r.name}</span>
                          <span className="flex gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={guestBusy !== null || !viewers.some((v) => v.identity === r.identity)}
                              onClick={() => grantVideo(r.identity, r.name)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold"
                            >
                              {videoGuest && videoGuest.identity !== r.identity
                                ? L('Replace current', 'वर्तमान को बदलें')
                                : L('Allow', 'अनुमति दें')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDismissedReqs((prev) => new Set(prev).add(r.identity))}
                              className="px-2.5 py-1 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold"
                            >
                              {L('Dismiss', 'खारिज करें')}
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {viewers.length === 0 ? (
                    <p className="text-xs text-stone-500 dark:text-stone-400 py-3 text-center">
                      {L('No other devotees currently connected in video room.', 'अभी वीडियो कक्ष में कोई अन्य भक्त जुड़ा नहीं है।')}
                    </p>
                  ) : (
                    <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                      {viewers.map((v) => (
                        <div
                          key={v.identity}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-950/80 border border-stone-200 dark:border-stone-800 text-xs hover:border-amber-300 dark:hover:border-gold/20 transition shadow-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-900 dark:text-white">{v.displayName}</span>
                            {v.isGuest && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800/60 text-[10px] font-medium">
                                {L('Guest', 'अतिथि')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                          {isPublicStream && !v.isGuest && (
                            videoGuest?.identity === v.identity ? (
                              <button
                                type="button"
                                disabled={guestBusy !== null}
                                onClick={() => stopVideoGuest(v.identity)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white text-xs font-semibold"
                              >
                                <VideoOff className="w-3.5 h-3.5" /> {L('Stop video', 'वीडियो बंद करें')}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={guestBusy !== null}
                                onClick={() => grantVideo(v.identity, v.displayName)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 disabled:opacity-60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold"
                              >
                                <VideoGuestIcon className="w-3.5 h-3.5" />{' '}
                                {videoGuest ? L('Replace with this', 'इनसे बदलें') : L('Give video', 'वीडियो दें')}
                              </button>
                            )
                          )}
                          <button
                            type="button"
                            onClick={() => setKickTarget({ identity: v.identity, displayName: v.displayName })}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60 text-xs transition font-semibold"
                          >
                            <UserX className="w-3.5 h-3.5" /> {L('Remove', 'हटाएँ')}
                          </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Column: Moderation Live Chat Sidebar */}
        <div className="h-[550px] lg:h-[620px]">
          <ChatWidget
            socket={socket}
            streamId={streamId}
            isStreamer={true}
            currentUser={currentUser}
          />
        </div>
      </div>

      {/* WhatsApp Share Modal for Private Streams */}
      {privateLinkData && (
        <WhatsAppShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          streamTitle={stream?.title || L('Private Pooja Session', 'निजी पूजा सत्र')}
          joinUrl={privateLinkData.joinUrl}
        />
      )}

      <ConfirmDialog
        isOpen={confirmEndOpen}
        title={L('Conclude Live Pooja Session', 'लाइव पूजा सत्र समाप्त करें')}
        description={L(
          'Are you sure you wish to conclude this live pooja session? Connected devotees will see the broadcast conclusion screen.',
          'क्या आप वाकई इस लाइव पूजा सत्र को समाप्त करना चाहते हैं? जुड़े हुए भक्तों को प्रसारण समाप्ति स्क्रीन दिखाई देगी।',
        )}
        confirmLabel={L('Yes, End Broadcast', 'हाँ, प्रसारण समाप्त करें')}
        cancelLabel={L('Stay Live', 'लाइव बने रहें')}
        variant="danger"
        loading={endingStream}
        onConfirm={confirmEndStream}
        onCancel={() => setConfirmEndOpen(false)}
      />

      {kickTarget && (
        <KickViewerModal
          streamId={streamId}
          identity={kickTarget.identity}
          displayName={kickTarget.displayName}
          onClose={() => {
            setKickTarget(null);
            if (socket) socket.emit('stream:viewer_list:request', { streamId });
          }}
          socket={socket}
        />
      )}
      </div>
    </div>
  );
}

function PublisherTrackRenderer({
  isPrivate,
  onMute,
  onStopGuest,
  onRemove,
}: {
  isPrivate: boolean;
  onMute: (identity: string, source: 'camera' | 'microphone') => void;
  onStopGuest: (identity: string) => void;
  onRemove: (identity: string, displayName: string) => void;
}) {
  const room = useRoomContext();
  useRoomTick(room);
  const participants = useParticipants();
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone], { onlySubscribed: false });
  const { cameraTrack, localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const toast = useToast();
  const { lang, t: L } = useLang();
  const [busy, setBusy] = useState(false);

  const toggleMic = async () => {
    if (!localParticipant || busy) return;
    setBusy(true);
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (err: any) {
      toast.error(friendlyMediaError(err, lang));
    } finally {
      setBusy(false);
    }
  };

  const toggleCamera = async () => {
    if (!localParticipant || busy) return;
    setBusy(true);
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch (err: any) {
      toast.error(friendlyMediaError(err, lang));
    } finally {
      setBusy(false);
    }
  };

  // Private: every devotee in the room. Public: only the (single) video guest.
  const remotes = participants.filter((p) => !p.isLocal);
  const shown = isPrivate ? remotes : remotes.filter((p) => isVideoGuest(p));
  const camOf = (id: string) => trackFor(tracks, id, Track.Source.Camera);
  const micMutedOf = (id: string) => {
    const m = trackFor(tracks, id, Track.Source.Microphone);
    return !m || !m.publication || m.publication.isMuted;
  };

  return (
    <div className="relative w-full h-full">
      <ConnectionBanner />
      {cameraTrack && cameraTrack.track ? (
        <VideoTrack
          trackRef={{
            participant: localParticipant,
            publication: cameraTrack,
            source: Track.Source.Camera,
          }}
          className="w-full h-full object-contain bg-black"
        />
      ) : (
        <div className="video-overlay w-full h-full flex flex-col items-center justify-center text-stone-200 bg-stone-950">
          {isCameraEnabled ? (
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500 mb-3" />
          ) : (
            <VideoOff className="w-8 h-8 mb-3 text-stone-400" />
          )}
          <span className="text-xs font-semibold text-stone-200">
            {isCameraEnabled
              ? L('Starting camera…', 'कैमरा शुरू हो रहा है…')
              : L('Your camera is off. Devotees hear you but cannot see you.', 'आपका कैमरा बंद है। भक्त आपकी आवाज़ सुन सकते हैं, पर आपको देख नहीं सकते।')}
          </span>
        </div>
      )}

      {/* Devotee tiles - private: everyone in the room; public: the video guest */}
      {shown.length > 0 && (
        <div className="video-overlay absolute top-14 right-3 z-30 flex flex-col gap-2 max-h-[75%] overflow-y-auto">
          {shown.slice(0, 4).map((p) => {
            const guest = isVideoGuest(p);
            const name = (p.name || '').trim() || L('Devotee', 'भक्त');
            return (
              <ParticipantTile
                key={p.identity}
                participant={p}
                cameraRef={camOf(p.identity)}
                micMuted={micMutedOf(p.identity)}
                label={name}
                badge={guest ? L('Video guest', 'वीडियो अतिथि') : undefined}
                className="w-40 sm:w-56 aspect-video shadow-2xl !border-orange-500/70"
              >
                <div className="absolute top-1 right-1 flex gap-1">
                  <button
                    type="button"
                    title={L('Mute their microphone', 'उनका माइक्रोफ़ोन म्यूट करें')}
                    onClick={() => onMute(p.identity, 'microphone')}
                    className="w-6 h-6 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center"
                  >
                    <MicOff className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    title={L('Turn off their camera', 'उनका कैमरा बंद करें')}
                    onClick={() => onMute(p.identity, 'camera')}
                    className="w-6 h-6 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center"
                  >
                    <VideoOff className="w-3 h-3" />
                  </button>
                  {guest ? (
                    <button
                      type="button"
                      title={L('Take back video access', 'वीडियो अनुमति वापस लें')}
                      onClick={() => onStopGuest(p.identity)}
                      className="px-1.5 h-6 rounded-full bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold"
                    >
                      {L('Stop', 'रोकें')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      title={L('Remove from session', 'सत्र से हटाएँ')}
                      onClick={() => onRemove(p.identity, name)}
                      className="w-6 h-6 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center"
                    >
                      <UserX className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </ParticipantTile>
            );
          })}
          {shown.length > 4 && (
            <span className="text-[10px] font-bold text-white bg-black/70 rounded px-2 py-0.5 self-end">
              +{shown.length - 4} {L('more', 'अन्य')}
            </span>
          )}
        </div>
      )}

      {/* Pandit Live Status Badges & Controls Overlay */}
      <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
        <span className="bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg animate-pulse">
          <span className="w-2 h-2 rounded-full bg-white" />
          {L('LIVE ON AIR', 'लाइव ऑन एयर')}
        </span>
        <button
          onClick={toggleMic}
          disabled={busy}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg transition-colors backdrop-blur-md ${
            isMicrophoneEnabled
              ? 'bg-emerald-700/95 hover:bg-emerald-600 text-white'
              : 'bg-red-700/95 hover:bg-red-600 text-white animate-bounce'
          }`}
          title={L('Click to toggle microphone', 'माइक्रोफ़ोन चालू/बंद करने के लिए क्लिक करें')}
        >
          <Mic className="w-3 h-3" />
          {isMicrophoneEnabled ? L('Mic: ON (Broadcasting)', 'माइक: चालू (प्रसारण जारी)') : L('Mic: MUTED', 'माइक: म्यूट')}
        </button>
        <button
          onClick={toggleCamera}
          disabled={busy}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg transition-colors backdrop-blur-md ${
            isCameraEnabled ? 'bg-stone-800/90 hover:bg-stone-700 text-white' : 'bg-red-700/95 hover:bg-red-600 text-white'
          }`}
          title={L('Click to toggle camera', 'कैमरा चालू/बंद करने के लिए क्लिक करें')}
        >
          {isCameraEnabled ? <VideoGuestIcon className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
          {isCameraEnabled ? L('Camera: ON', 'कैमरा: चालू') : L('Camera: OFF', 'कैमरा: बंद')}
        </button>
      </div>
    </div>
  );
}
