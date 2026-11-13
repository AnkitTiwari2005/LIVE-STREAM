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
} from '@livekit/components-react';
import { io, Socket } from 'socket.io-client';
import { ChatWidget } from '@/components/ChatWidget';
import { WhatsAppShareModal } from '@/components/WhatsAppShareModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
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
} from 'lucide-react';
import { KickViewerModal } from '@/components/KickViewerModal';

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
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch {}
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
        if (!res.ok) throw new Error(data.message || 'Stream not found');
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

    const onConnect = () => {
      fetchStreamEarnings();
      socketInstance.emit('stream:viewer_list:request', { streamId });
    };

    socketInstance.on('connect', onConnect);
    socketInstance.on('stream:earnings_updated', handleEarningsUpdated);
    socketInstance.on('stream:viewer_count', handleViewerCount);
    socketInstance.on('stream:viewer_list', handleViewerList);
    socketInstance.on('stream:viewer_joined', handleViewerJoined);
    socketInstance.on('stream:viewer_left', handleViewerLeft);

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
      socketInstance.disconnect();
    };
  }, [streamId, router]);

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
        throw new Error(data.message || 'Could not start live stream');
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
      toast.success('Pooja session concluded successfully.');
      router.push('/');
    } catch (err: any) {
      toast.error(err.message || 'Failed to end stream');
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
              {stream?.title || 'Pandit Live Studio'}
              {isLive && <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-bold">LIVE ON AIR</span>}
            </h1>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              {stream?.visibility === 'PRIVATE' ? 'Private Sacred Consultation' : 'Public Live Darshan'} • Quality: {stream?.videoQuality || '480p'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Always-visible Live Stream Coin Earnings Pill */}
          {(() => {
            const earned = streamCoins ?? 0;
            const breakdown = calculateStreamerNetCoinsInr(earned);
            const tooltipText = `Gross: ₹${formatInrAmount(breakdown.grossInr)} • Your 85% Net Share: ₹${formatInrAmount(breakdown.netInr)} (150 coins = ₹100)`;
            return (
              <Link
                href="/streamer/earnings"
                title={tooltipText}
                aria-label={`${earned} Coins Earned in this stream. ${tooltipText}`}
                className="relative inline-flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 px-3.5 py-2 text-xs font-extrabold text-amber-950 dark:text-gold-pale shadow-sm transition-all"
              >
                <CoinIcon size={16} />
                <span>{earned.toLocaleString('en-IN')} Coins</span>
                <span className="text-[10px] font-semibold text-amber-800 dark:text-stone-300 hidden sm:inline">
                  (≈ ₹{formatInrAmount(breakdown.netInr)} net)
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
              title={`Active Devotees: ${viewerCount} • Peak: ${peakViewers}`}
              className="relative inline-flex items-center gap-2 rounded-full border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-400 shadow-sm"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Eye className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>{viewerCount} Live</span>
              </div>
              <span className="text-stone-400 dark:text-stone-600">•</span>
              <span className="text-[10px] text-stone-600 dark:text-stone-400 font-medium">Peak: {peakViewers}</span>
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
              <Users className="w-4 h-4 text-amber-700 dark:text-amber-400" /> Viewers ({viewerCount})
            </button>
          )}

          {stream?.visibility === 'PRIVATE' && privateLinkData && (
            <button
              onClick={() => setShareModalOpen(true)}
              className="flex items-center gap-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition-colors shadow-md"
            >
              <Share2 className="w-4 h-4" /> WhatsApp Invite Link
            </button>
          )}

          {isLive && (
            <button
              onClick={handleEndStream}
              className="flex items-center gap-1.5 bg-red-700 hover:bg-red-600 text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition-colors shadow-md"
            >
              <StopCircle className="w-4 h-4" /> End Live Stream
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
              <span className="font-bold text-amber-950 dark:text-amber-300 block text-sm">Previous Live Session Still Active</span>
              <span className="text-amber-900 dark:text-amber-200 font-medium">You have another live broadcast running. Would you like to end the previous broadcast and go live with this session now?</span>
            </div>
          </div>
          <button
            onClick={() => handleGoLive(true)}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-orange-700 to-amber-700 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl text-xs transition shadow-md shrink-0"
          >
            {loading ? 'Starting...' : 'End Previous & Start Live Now'}
          </button>
        </div>
      )}

      {stream?.status === 'ENDED' && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <DiyaIcon size={24} className="text-amber-800 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-amber-950 dark:text-amber-300 block text-sm">Previous Live Broadcast Concluded</span>
              <span className="text-amber-900 dark:text-amber-200 font-medium">This sacred ritual session has ended. To go live again, configure a fresh broadcast.</span>
            </div>
          </div>
          <Link
            href="/studio/create"
            className="px-4 py-2 bg-orange-700 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-colors shrink-0 shadow-md text-center"
          >
            Setup New Broadcast
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
                  STUDIO PREVIEW (OFF AIR)
                </div>
                {!previewTracks.video && (
                  <div className="video-overlay absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-black/80">
                    <Camera className="w-10 h-10 text-amber-400 mb-3 animate-pulse" />
                    <p className="text-stone-200 text-xs sm:text-sm font-semibold mb-3">
                      Camera preview initializing or access needed
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
                          setError('Please allow camera and mic permissions in your browser address bar.');
                        }
                      }}
                      className="px-4 py-2 bg-gold hover:bg-gold-deep text-obsidian font-bold text-xs rounded-xl shadow-lg transition"
                    >
                      Connect Camera &amp; Mic
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
                  publishDefaults: {
                    simulcast: true, // Multi-layer publishing for viewers on weak 4G
                    videoCodec: 'vp8',
                  },
                }}
                className="w-full h-full"
              >
                <RoomAudioRenderer />
                <PublisherTrackRenderer />
                <div className="absolute top-4 right-4 z-30">
                  <StartAudio label="Unmute Remote Devotee Audio" />
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
                    <Camera className="w-3.5 h-3.5 text-orange-400" /> Select Camera
                  </label>
                  <select
                    value={selectedVideo}
                    onChange={(e) => setSelectedVideo(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {videoDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-stone-400 font-semibold flex items-center gap-1.5 mb-1.5">
                    <Mic className="w-3.5 h-3.5 text-orange-400" /> Select Microphone
                  </label>
                  <select
                    value={selectedAudio}
                    onChange={(e) => setSelectedAudio(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {audioDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Mic ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {videoDevices.length === 0 && (
                <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-2">
                  <span className="text-xs text-stone-400">Camera / mic devices not yet detected</span>
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
                        setError('Please grant camera and microphone permissions in your browser to broadcast.');
                      }
                    }}
                    className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 dark:bg-orange-600/30 dark:hover:bg-orange-600/50 text-orange-950 dark:text-orange-300 border border-orange-300 dark:border-orange-500/30 font-semibold text-xs rounded-lg transition-colors"
                  >
                    Grant Camera & Mic Access
                  </button>
                </div>
              )}

              {stream?.status === 'ENDED' ? (
                <Link
                  href="/studio/create"
                  className="w-full py-3.5 bg-gradient-to-r from-orange-700 via-amber-700 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-xl text-base shadow-xl transition-all flex items-center justify-center gap-2 text-center"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Setup New Broadcast</span>
                </Link>
              ) : (
                <button
                  onClick={() => handleGoLive(false)}
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-700 via-red-700 to-amber-700 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-xl text-base shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Radio className="w-5 h-5 animate-pulse" />
                  {loading ? 'Starting Broadcast Engine...' : (<span className="flex items-center gap-1.5">START LIVE BROADCAST NOW <PranamIcon size={18} /></span>)}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl flex items-center justify-between text-xs text-stone-800 dark:text-stone-300 shadow-sm">
                <span className="flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                  Audio & Video Broadcasting via Single-port UDP (7882)
                </span>
                <span className="text-stone-500 dark:text-stone-400 font-mono">Simulcast Active</span>
              </div>

              {/* Live Viewers Panel */}
              {showViewersPanel && (
                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-gold/30 p-4 rounded-2xl space-y-3 shadow-xl text-stone-900 dark:text-white">
                  <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                      <h3 className="text-sm font-bold text-stone-900 dark:text-white">Active Devotees ({viewers.length})</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (socket) socket.emit('stream:viewer_list:request', { streamId });
                      }}
                      className="text-[11px] text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 font-semibold transition"
                    >
                      Refresh List
                    </button>
                  </div>

                  {viewers.length === 0 ? (
                    <p className="text-xs text-stone-500 dark:text-stone-400 py-3 text-center">No other devotees currently connected in video room.</p>
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
                                Guest
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setKickTarget({ identity: v.identity, displayName: v.displayName })}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60 text-xs transition font-semibold"
                          >
                            <UserX className="w-3.5 h-3.5" /> Remove
                          </button>
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
          streamTitle={stream?.title || 'Private Pooja Session'}
          joinUrl={privateLinkData.joinUrl}
        />
      )}

      <ConfirmDialog
        isOpen={confirmEndOpen}
        title="Conclude Live Pooja Session"
        description="Are you sure you wish to conclude this live pooja session? Connected devotees will see the broadcast conclusion screen."
        confirmLabel="Yes, End Broadcast"
        cancelLabel="Stay Live"
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

function PublisherTrackRenderer() {
  const tracks = useTracks([Track.Source.Camera]);
  const { cameraTrack, localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();

  const toggleMic = async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    }
  };

  const toggleCamera = async () => {
    if (localParticipant) {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    }
  };

  const remoteDevoteeTrack = tracks.find((t) => t.participant.identity !== localParticipant?.identity);

  return (
    <div className="relative w-full h-full">
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
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500 mb-3" />
          <span className="text-xs font-semibold text-stone-200">Broadcasting Live Video &amp; Audio...</span>
        </div>
      )}

      {/* Devotee Remote Video (PIP in Top Right for 2-Way Private Consultation) */}
      {remoteDevoteeTrack && (
        <div className="video-overlay absolute top-4 right-4 w-40 sm:w-56 aspect-video rounded-2xl overflow-hidden border-2 border-orange-500 shadow-2xl z-30 bg-stone-950">
          <VideoTrack trackRef={remoteDevoteeTrack} className="w-full h-full object-cover" />
          <div className="absolute bottom-1 left-2 bg-black/85 px-2 py-0.5 rounded text-[10px] font-bold text-orange-300">
            Devotee Video
          </div>
        </div>
      )}

      {/* Pandit Live Status Badges & Controls Overlay */}
      <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
        <span className="bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg animate-pulse">
          <span className="w-2 h-2 rounded-full bg-white" />
          LIVE ON AIR
        </span>
        <button
          onClick={toggleMic}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg transition-colors backdrop-blur-md ${
            isMicrophoneEnabled
              ? 'bg-emerald-700/95 hover:bg-emerald-600 text-white'
              : 'bg-red-700/95 hover:bg-red-600 text-white animate-bounce'
          }`}
          title="Click to toggle microphone"
        >
          <Mic className="w-3 h-3" />
          {isMicrophoneEnabled ? 'Mic: ON (Broadcasting)' : 'Mic: MUTED'}
        </button>
      </div>
    </div>
  );
}
