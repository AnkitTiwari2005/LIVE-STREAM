'use client';

import Link from 'next/link';
import { PranamIcon, OmIcon, DiyaIcon } from '@/components/icons/SpiritualIcons';

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
} from 'lucide-react';

export default function StudioClient() {
  const { id: paramId } = useParams() as { id: string };
  const router = useRouter();

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
  const [loading, setLoading] = useState(false);

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

  // Initialize stream data and available hardware devices
  useEffect(() => {
    if (!streamId || streamId === 'demo') return;

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

    async function loadStream() {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      try {
        const res = await fetch(`${apiUrl}/streams/${streamId}`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Stream not found');
        setStream(data);

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
            setPrivateLinkData(linkData);
          }
        }
      } catch (err: any) {
        setError(err.message);
      }
    }

    loadStream();

    // Socket.io chat
    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || '';
    const socketInstance = io(socketUrl, {
      auth: { token: storedToken },
      withCredentials: true,
    });
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [streamId, router]);

  // Stage 1: Hardware preview using local tracks
  useEffect(() => {
    if (isLive) return;

    let localVideo: LocalVideoTrack | undefined;
    let localAudio: LocalAudioTrack | undefined;

    async function startPreview() {
      try {
        const tracks = await createLocalTracks({
          video: selectedVideo ? { deviceId: { exact: selectedVideo }, resolution: { width: 640, height: 480, frameRate: 24 } } : true,
          audio: selectedAudio ? { deviceId: { exact: selectedAudio } } : true,
        });

        localVideo = tracks.find((t) => t.kind === 'video') as LocalVideoTrack;
        localAudio = tracks.find((t) => t.kind === 'audio') as LocalAudioTrack;

        setPreviewTracks({ video: localVideo, audio: localAudio });

        if (localVideo && previewRef.current) {
          previewRef.current.innerHTML = '';
          const videoEl = localVideo.attach();
          videoEl.className = 'w-full h-full object-cover';
          previewRef.current.appendChild(videoEl);
        }

        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const vInputs = devices.filter((d) => d.kind === 'videoinput');
          const aInputs = devices.filter((d) => d.kind === 'audioinput');
          setVideoDevices(vInputs);
          setAudioDevices(aInputs);
          if (!selectedVideo && vInputs.length > 0) setSelectedVideo(vInputs[0].deviceId);
          if (!selectedAudio && aInputs.length > 0) setSelectedAudio(aInputs[0].deviceId);
        }
      } catch (err: any) {
        console.warn('Camera preview acquire error:', err.message);
      }
    }

    startPreview();

    return () => {
      localVideo?.stop();
      localAudio?.stop();
    };
  }, [selectedVideo, selectedAudio, isLive]);

  // Stage 2: Transition to LIVE
  const handleGoLive = async () => {
    setError(null);
    setLoading(true);

    const storedToken = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

    try {
      const res = await fetch(`${apiUrl}/streams/${streamId}/go-live`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${storedToken}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not start live stream');

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

  const handleEndStream = async () => {
    if (!confirm('Are you sure you wish to conclude this live pooja session?')) return;

    const storedToken = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

    try {
      await fetch(`${apiUrl}/streams/${streamId}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      setIsLive(false);
      setToken(null);
      router.push('/');
    } catch {
      alert('Failed to end stream');
    }
  };

  return (
    <div className="min-h-screen bg-obsidian text-foreground py-6 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Banner & Emergency Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 bg-obsidian-soft border border-gold/20 p-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isLive ? 'bg-red-600 text-white animate-pulse' : 'bg-stone-800 text-stone-300'}`}>
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              {stream?.title || 'Pandit Live Studio'}
              {isLive && <span className="text-xs bg-red-600 px-2 py-0.5 rounded-full font-bold">LIVE ON AIR</span>}
            </h1>
            <p className="text-xs text-stone-400">
              {stream?.visibility === 'PRIVATE' ? 'Private Sacred Consultation' : 'Public Live Darshan'} • Quality: {stream?.videoQuality || '480p'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {stream?.visibility === 'PRIVATE' && privateLinkData && (
            <button
              onClick={() => setShareModalOpen(true)}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition-colors shadow-md"
            >
              <Share2 className="w-4 h-4" /> WhatsApp Invite Link
            </button>
          )}

          {isLive && (
            <button
              onClick={handleEndStream}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition-colors shadow-md"
            >
              <StopCircle className="w-4 h-4" /> End Live Stream
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-950/90 border border-red-800 text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {stream?.status === 'ENDED' && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-950/70 border border-amber-700/60 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <DiyaIcon size={24} />
            <div>
              <span className="font-bold text-amber-300 block text-sm">Previous Live Broadcast Concluded</span>
              <span>This sacred ritual session has ended. To go live again, configure a fresh broadcast.</span>
            </div>
          </div>
          <Link
            href="/studio/create"
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs transition-colors shrink-0 shadow-md text-center"
          >
            Setup New Broadcast
          </Link>
        </div>
      )}

      {/* Main Studio Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Video Publisher / Preview Area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-stone-800 shadow-2xl flex items-center justify-center">
            {!isLive ? (
              // Stage 1: Local Device Preview
              <div className="relative w-full h-full flex items-center justify-center">
                <div ref={previewRef} className="w-full h-full object-cover" />
                <div className="absolute top-4 left-4 bg-amber-500/90 text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                  STUDIO PREVIEW (OFF AIR)
                </div>
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
                    className="px-3 py-1.5 bg-orange-600/30 hover:bg-orange-600/50 text-orange-300 font-semibold text-xs rounded-lg transition-colors"
                  >
                    Grant Camera & Mic Access
                  </button>
                </div>
              )}

              {stream?.status === 'ENDED' ? (
                <Link
                  href="/studio/create"
                  className="w-full py-3.5 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold rounded-xl text-base shadow-xl transition-all flex items-center justify-center gap-2 text-center"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Setup New Broadcast</span>
                </Link>
              ) : (
                <button
                  onClick={handleGoLive}
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-600 via-red-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold rounded-xl text-base shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Radio className="w-5 h-5 animate-pulse" />
                  {loading ? 'Starting Broadcast Engine...' : (<span className="flex items-center gap-1.5">START LIVE BROADCAST NOW <PranamIcon size={18} /></span>)}
                </button>
              )}
            </div>
          ) : (
            <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl flex items-center justify-between text-xs text-stone-300">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                Audio & Video Broadcasting via Single-port UDP (7882)
              </span>
              <span className="text-stone-400 font-mono">Simulcast Active</span>
            </div>
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
        <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 bg-stone-950">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500 mb-3" />
          <span className="text-xs font-semibold">Broadcasting Live Video & Audio...</span>
        </div>
      )}

      {/* Devotee Remote Video (PIP in Top Right for 2-Way Private Consultation) */}
      {remoteDevoteeTrack && (
        <div className="absolute top-4 right-4 w-40 sm:w-56 aspect-video rounded-2xl overflow-hidden border-2 border-orange-500 shadow-2xl z-30 bg-stone-950">
          <VideoTrack trackRef={remoteDevoteeTrack} className="w-full h-full object-cover" />
          <div className="absolute bottom-1 left-2 bg-stone-950/80 px-2 py-0.5 rounded text-[10px] font-bold text-orange-300">
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
              ? 'bg-emerald-600/90 hover:bg-emerald-500 text-white'
              : 'bg-red-600/90 hover:bg-red-500 text-white animate-bounce'
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
