'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  useTracks,
  useLocalParticipant,
  useRoomContext,
  VideoTrack,
  AudioTrack,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { io, Socket } from 'socket.io-client';
import { ChatWidget } from '@/components/ChatWidget';
import { DevotionalEmojiBar, FloatingReactionsOverlay } from '@/components/SpiritualReactions';
import { DakshinaModal } from '@/components/DakshinaModal';
import { CoinTopupModal } from '@/components/CoinTopupModal';
import { syncLocalWalletBalance } from '@/lib/economy';
import { useToast } from '@/components/Toast';
import {
  Lock,
  User,
  AlertCircle,
  Play,
  Share2,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Volume2,
  Eye,
} from 'lucide-react';
import { KickedScreen } from '@/components/KickedScreen';
import {
  OmIcon,
  DiyaIcon,
  PranamIcon,
  CoinIcon,
  VerifiedPanditBadge,
} from '@/components/icons/SpiritualIcons';

export default function JoinPrivateStreamClient() {
  const toast = useToast();
  const { tokenSlug: paramSlug } = useParams() as { tokenSlug: string };
  const [tokenSlug, setTokenSlug] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.replace(/\/$/, '').split('/').filter(Boolean);
      const urlSlug = parts[parts.length - 1];
      if (urlSlug && urlSlug !== 'join' && urlSlug !== 'invite' && urlSlug !== '[tokenSlug]') {
        return urlSlug;
      }
    }
    return paramSlug || '';
  });

  const [metadata, setMetadata] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [guestName, setGuestName] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string>('');
  const [streamId, setStreamId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [dakshinaModalOpen, setDakshinaModalOpen] = useState(false);
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [resumeDakshinaAfterTopup, setResumeDakshinaAfterTopup] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [latestDakshina, setLatestDakshina] = useState<any>(null);
  const dakshinaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inspectLoading, setInspectLoading] = useState(true);

  // Live Presence & Moderation State
  const [viewerCount, setViewerCount] = useState<number | null>(null);
  const [kicked, setKicked] = useState<{ reason?: string; blocked: boolean } | null>(null);
  const kickedRef = useRef<boolean>(false);

  // Auto-populate logged-in user name
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pooja_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCurrentUser(parsed);
          if (parsed.name) {
            setGuestName(parsed.name);
          }
        } catch {}
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.replace(/\/$/, '').split('/').filter(Boolean);
      const urlSlug = parts[parts.length - 1];
      if (urlSlug && urlSlug !== 'join' && urlSlug !== 'invite' && urlSlug !== '[tokenSlug]') {
        setTokenSlug(urlSlug);
      }
    }
  }, [paramSlug]);

  // Safe inspection on load
  useEffect(() => {
    if (!tokenSlug || tokenSlug === 'invite') {
      setInspectLoading(false);
      return;
    }

    async function inspect() {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      try {
        const res = await fetch(`${apiUrl}/private-links/inspect/${tokenSlug}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Invalid or expired link');
        setMetadata(data);
        if (data.streamId) {
          setStreamId(data.streamId);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setInspectLoading(false);
      }
    }
    inspect();
  }, [tokenSlug]);

  // Connect to WebSocket chat gateway when streamId is available
  useEffect(() => {
    if (!streamId) return;

    const storedToken = localStorage.getItem('pooja_token');
    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || '';
    const socketInstance = io(socketUrl, {
      auth: { token: storedToken, sessionId },
      withCredentials: true,
    });
    setSocket(socketInstance);

    socketInstance.on('stream:dakshina_received', (dakshina: any) => {
      setLatestDakshina(dakshina);
      if (dakshinaTimerRef.current) clearTimeout(dakshinaTimerRef.current);
      dakshinaTimerRef.current = setTimeout(() => setLatestDakshina(null), 8000);
    });

    socketInstance.on('stream:viewer_count', (data: { streamId: string; count: number }) => {
      if (data?.streamId === streamId && typeof data.count === 'number') {
        setViewerCount(data.count);
      }
    });

    socketInstance.on('stream:kicked', (data: { reason?: string; blocked: boolean }) => {
      kickedRef.current = true;
      setKicked(data);
      setToken(null);
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
  }, [streamId, sessionId]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    const storedToken = localStorage.getItem('pooja_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (storedToken) headers.Authorization = `Bearer ${storedToken}`;

    try {
      const res = await fetch(`${apiUrl}/private-links/claim/${tokenSlug}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          password: password || undefined,
          guestName: guestName || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Access denied');

      setToken(data.token);
      setServerUrl(data.serverUrl);
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
      if (data.streamId) {
        setStreamId(data.streamId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: metadata?.streamTitle || 'Private Pooja Session',
        text: `Join private sacred pooja: ${metadata?.streamTitle}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Private session link copied to clipboard!');
    }
  };

  if (kicked) {
    return <KickedScreen reason={kicked.reason} blocked={kicked.blocked} />;
  }

  if (inspectLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-stone-400 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-orange-500" />
        <span className="text-xs uppercase tracking-wider font-semibold">Validating Sacred Join Link...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {token ? (
        // Connected to Private Stream Video Room with Full Two-Column Devotee Interface
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video Viewport (Col span 2) */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Video container — no absolute controls inside, keeps full viewable area */}
            <div className="player-container video-overlay relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-stone-800 flex items-center justify-center">
              <LiveKitRoom
                serverUrl={serverUrl}
                token={token}
                connect={true}
                video={false}
                audio={false}
                onDisconnected={() => {
                  if (kickedRef.current) return;
                  setToken(null);
                }}
                className="w-full h-full"
              >
                {/* RoomAudioRenderer ensures remote audio tracks are played via HTMLAudioElement */}
                <RoomAudioRenderer />
                <PrivateTwoWayConsultationRenderer onLeave={() => setToken(null)} socket={socket} streamId={streamId} />
              </LiveKitRoom>

              {/* Floating Auspicious Dakshina Alert */}
              {latestDakshina && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-stone-950 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce border-2 border-yellow-200">
                  <DiyaIcon size={22} />
                  <div className="text-xs">
                    <span className="font-extrabold">{latestDakshina.devoteeName}</span> offered{' '}
                    <span className="font-black inline-flex items-center gap-1">
                      <CoinIcon size={13} /> {latestDakshina.coins ?? latestDakshina.amount} Coins
                    </span>{' '}
                    Dakshina!
                    {latestDakshina.prayerMessage && (
                      <div className="text-[10px] font-semibold opacity-90 truncate max-w-xs">
                        &ldquo;{latestDakshina.prayerMessage}&rdquo;
                      </div>
                    )}
                  </div>
                  <PranamIcon size={18} />
                </div>
              )}
            </div>

            {/* Spiritual Reactions + Controls — BELOW the video, never overlapping it */}
            <div className="flex items-center justify-between gap-3 px-1">
              {/* Emoji Reactions */}
              {streamId && (
                <div className="flex-1 min-w-0">
                  <DevotionalEmojiBar socket={socket} streamId={streamId} />
                </div>
              )}
            </div>

            {/* Stream Metadata & Pandit Info Card */}
            <div className="bg-obsidian-soft border border-gold/25 rounded-2xl p-5 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-950 text-red-400 border border-red-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      LIVE
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-950/80 text-orange-400 border border-orange-800">
                      <Lock className="w-3 h-3 text-orange-400" /> Private Consultation
                    </span>
                    {typeof viewerCount === 'number' && viewerCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gold/10 text-gold-pale border border-gold/30">
                        <Eye className="w-3 h-3 text-amber-400" /> {viewerCount} Connected
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl font-bold text-white tracking-tight">
                    {metadata?.streamTitle || 'Private Pooja Consultation'}
                  </h1>
                  {metadata?.streamDescription && (
                    <p className="text-xs text-stone-400 mt-1 line-clamp-2">{metadata.streamDescription}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setDakshinaModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-orange-950/40"
                  >
                    <DiyaIcon size={16} />
                    <span>Arpan Dakshina</span>
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-3.5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl transition-all shadow"
                  >
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-stone-800 flex items-center justify-between text-xs text-stone-300">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-100 text-sm flex items-center gap-1.5">
                    <PranamIcon size={16} /> {metadata?.streamerName || 'Acharya Devrat Sharma'}
                  </span>
                  <span className="text-orange-400 font-bold flex items-center gap-1" title="Verified Vedic Pandit">
                    <VerifiedPanditBadge size={14} /> Verified Pandit
                  </span>
                </div>
                <span className="text-stone-400 font-medium">
                  Devotee: <span className="text-white font-semibold">{currentUser?.name || guestName}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Live Chat Sidebar (Col span 1) */}
          <div className="h-[550px] lg:h-[620px]">
            {streamId ? (
              <ChatWidget
                socket={socket}
                streamId={streamId}
                isStreamer={false}
                currentUser={currentUser}
                sessionId={sessionId}
              />
            ) : (
              <div className="w-full h-full bg-obsidian-soft border border-gold/20 rounded-2xl flex items-center justify-center text-stone-400 text-xs">
                Connecting to sacred pooja chat...
              </div>
            )}
          </div>

          {/* Dakshina Offering & Topup Modals */}
          {streamId && (
            <DakshinaModal
              isOpen={dakshinaModalOpen}
              onClose={() => setDakshinaModalOpen(false)}
              streamId={streamId}
              streamerName={metadata?.streamerName || 'Acharya Devrat Sharma'}
              currentUser={currentUser}
              walletBalance={walletBalance}
              onOpenTopup={() => {
                setDakshinaModalOpen(false);
                setResumeDakshinaAfterTopup(true);
                setTopupModalOpen(true);
              }}
              onSuccess={(newBalance) => {
                setWalletBalance(newBalance);
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
            onSuccess={(newBalance) => {
              setWalletBalance(newBalance);
              syncLocalWalletBalance(newBalance);
              if (resumeDakshinaAfterTopup) {
                setResumeDakshinaAfterTopup(false);
                setDakshinaModalOpen(true);
              }
            }}
          />
        </div>
      ) : (
        // Verification & Password Claim Screen
        <div className="max-w-md mx-auto bg-white dark:bg-obsidian-soft border border-stone-200 dark:border-gold/30 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3 text-gold">
              <OmIcon size={44} />
            </div>
            <h2 className="text-xl font-bold text-stone-900 dark:text-foreground tracking-tight">Private Pooja Consultation</h2>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              {metadata?.streamTitle ? `"${metadata.streamTitle}" by ${metadata.streamerName}` : 'Enter your details to join'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
              {(error.includes('logged into your account') || error.includes('Unauthorized')) && (
                <a
                  href={`/login?redirect=/join/${tokenSlug}`}
                  className="mt-1 text-center py-2 px-3 bg-gold hover:bg-gold-deep text-obsidian font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <PranamIcon size={16} />
                  <span>Sign In to Devotee Account</span>
                </a>
              )}
            </div>
          )}

          <form onSubmit={handleClaim} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Your Devotee Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-600 dark:text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Rahul Sharma"
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-50 dark:bg-obsidian border border-stone-200 dark:border-gold/25 rounded-xl text-sm text-stone-900 dark:text-foreground focus:outline-none focus:border-gold"
                />
              </div>
            </div>

            {metadata?.requiresPassword && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Secret Session Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-600 dark:text-stone-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password provided by Pandit"
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 dark:bg-obsidian border border-stone-200 dark:border-gold/25 rounded-xl text-sm text-stone-900 dark:text-foreground focus:outline-none focus:border-gold"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-xl text-sm shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              {loading ? 'Validating Token...' : 'Enter Sacred Pooja Room'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function PrivateTwoWayConsultationRenderer({ onLeave, socket, streamId }: { onLeave: () => void; socket: Socket | null; streamId: string }) {
  const cameraTracks = useTracks([Track.Source.Camera]);
  const audioTracks = useTracks([Track.Source.Microphone]);
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, cameraTrack } = useLocalParticipant();
  const room = useRoomContext();

  const [isAudioPlaybackAllowed, setIsAudioPlaybackAllowed] = useState(true);

  useEffect(() => {
    if (!room) return;
    setIsAudioPlaybackAllowed(room.canPlaybackAudio);
    const handleAudioPlaybackChange = () => {
      setIsAudioPlaybackAllowed(room.canPlaybackAudio);
    };
    room.on('audioPlaybackChanged', handleAudioPlaybackChange);
    return () => {
      room.off('audioPlaybackChanged', handleAudioPlaybackChange);
    };
  }, [room]);

  const unlockAudio = async () => {
    if (room) {
      try {
        await room.startAudio();
        setIsAudioPlaybackAllowed(true);
      } catch (e) {
        console.warn('LiveKit startAudio notice:', e);
      }
    }
  };

  const toggleMic = async () => {
    if (!localParticipant) return;
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (err: any) {
      // Browser permission not yet granted — request it explicitly
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        await localParticipant.setMicrophoneEnabled(true);
      } catch {
        console.warn('Mic permission denied', err);
      }
    }
  };

  const toggleCamera = async () => {
    if (!localParticipant) return;
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch (err: any) {
      // Browser permission not yet granted — request it explicitly
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        await localParticipant.setCameraEnabled(true);
      } catch {
        console.warn('Camera permission denied', err);
      }
    }
  };

  // Find remote tracks (Pandit) vs local tracks (Devotee)
  const remoteCameraTrack = cameraTracks.find((t) => t.participant.identity !== localParticipant?.identity);
  const remoteAudioTrack = audioTracks.find((t) => t.participant.identity !== localParticipant?.identity);

  return (
    // Full video area — no floating control bar here, controls live outside this component
    <div className="relative w-full h-full bg-black cursor-pointer" onClick={unlockAudio}>
      {/* Floating emoji reactions overlay — inside video so emojis float up over the stream */}
      <FloatingReactionsOverlay socket={socket} streamId={streamId} />
      {/* Remote Audio Track Renderer */}
      {remoteAudioTrack && (
        <AudioTrack trackRef={remoteAudioTrack} />
      )}

      {/* Audio Unlock Banner — only shown when browser blocks autoplay */}
      {!isAudioPlaybackAllowed && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            unlockAudio();
          }}
          className="absolute top-4 left-4 z-40 px-4 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 text-stone-950 font-extrabold text-xs rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce border-2 border-yellow-200"
        >
          <Volume2 className="w-4 h-4" />
          <span>Tap to Hear Pandit 🙏</span>
        </button>
      )}

      {/* Remote Pandit Video (Main Screen) */}
      {remoteCameraTrack ? (
        <VideoTrack trackRef={remoteCameraTrack} className="w-full h-full object-contain bg-black" />
      ) : (
        <div className="video-overlay w-full h-full flex flex-col items-center justify-center text-stone-200 bg-stone-950">
          <DiyaIcon size={44} className="mb-2" />
          <span className="text-sm font-medium text-stone-200">Awaiting Pandit video transmission...</span>
        </div>
      )}

      {/* Devotee Self Camera Preview — PiP top-right, only when cam is on */}
      {isCameraEnabled && cameraTrack && (
        <div className="absolute top-4 right-4 w-28 sm:w-36 aspect-video rounded-xl overflow-hidden border-2 border-orange-500/80 shadow-2xl z-20 bg-stone-950">
          <VideoTrack
            trackRef={{
              participant: localParticipant,
              publication: cameraTrack,
              source: Track.Source.Camera,
            }}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-[9px] font-bold text-white">
            You
          </div>
        </div>
      )}

      {/* Controls bar — compact icon-only row at bottom of video, doesn't block content */}
      <div
        className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mic toggle — icon only, labelled via title tooltip */}
        <button
          onClick={toggleMic}
          title={isMicrophoneEnabled ? 'Mute mic' : 'Unmute mic (speak to Pandit)'}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg ${
            isMicrophoneEnabled
              ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
              : 'bg-stone-800/90 hover:bg-stone-700 text-stone-200'
          }`}
        >
          {isMicrophoneEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>

        {/* Camera toggle — icon only */}
        <button
          onClick={toggleCamera}
          title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg ${
            isCameraEnabled
              ? 'bg-stone-700 hover:bg-stone-600 text-white'
              : 'bg-stone-800/90 hover:bg-stone-700 text-stone-200'
          }`}
        >
          {isCameraEnabled ? <VideoIcon className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </button>

        {/* Sound unlock — only shown when audio is blocked */}
        {!isAudioPlaybackAllowed && (
          <button
            onClick={unlockAudio}
            title="Unmute speaker"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-500 hover:bg-amber-400 text-stone-950 transition-all shadow-lg animate-pulse"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Leave — text label since it's a destructive action */}
        <button
          onClick={onLeave}
          title="Leave session"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-700/90 hover:bg-red-600 text-white border border-red-600 transition-all shadow-lg"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </div>
  );
}
