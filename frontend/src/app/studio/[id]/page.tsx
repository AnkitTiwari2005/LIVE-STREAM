'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  createLocalTracks,
  LocalVideoTrack,
  LocalAudioTrack,
} from 'livekit-client';
import {
  LiveKitRoom,
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

export default function StreamerStudioPage() {
  const { id: streamId } = useParams() as { id: string };
  const router = useRouter();

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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      try {
        const res = await fetch(`${apiUrl}/streams/${streamId}`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        const data = await res.json();
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

    async function loadDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vInputs = devices.filter((d) => d.kind === 'videoinput');
        const aInputs = devices.filter((d) => d.kind === 'audioinput');

        setVideoDevices(vInputs);
        setAudioDevices(aInputs);
        if (vInputs.length > 0) setSelectedVideo(vInputs[0].deviceId);
        if (aInputs.length > 0) setSelectedAudio(aInputs[0].deviceId);
      } catch (e) {
        console.warn('Could not list media devices:', e);
      }
    }

    loadStream();
    loadDevices();

    // Socket.io chat
    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000';
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
          localVideo.attach(previewRef.current);
        }
      } catch (err: any) {
        console.warn('Camera preview acquire error:', err.message);
      }
    }

    if (selectedVideo || selectedAudio) {
      startPreview();
    }

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
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

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
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

    try {
      await fetch(`${apiUrl}/streams/${streamId}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      router.push('/');
    } catch {
      alert('Failed to end stream');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner & Emergency Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 bg-stone-900 border border-stone-800 p-4 rounded-2xl">
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
              {stream?.visibility === 'PRIVATE' ? '🔒 Private Consultation' : '🌐 Public Darshan'} • Quality: {stream?.videoQuality || '480p'}
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
                <PublisherTrackRenderer />
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

              <button
                onClick={handleGoLive}
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-orange-600 via-red-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold rounded-xl text-base shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Radio className="w-5 h-5 animate-pulse" />
                {loading ? 'Starting Broadcast Engine...' : 'START LIVE BROADCAST NOW 🙏'}
              </button>
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
  );
}

function PublisherTrackRenderer() {
  const { cameraTrack } = useLocalParticipant();
  if (!cameraTrack) {
    return (
      <div className="w-full h-full flex items-center justify-center text-stone-400">
        Initializing local publisher track...
      </div>
    );
  }
  return <VideoTrack trackRef={cameraTrack} className="w-full h-full object-cover" />;
}
