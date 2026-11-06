'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
import { SpiritualReactions } from '@/components/SpiritualReactions';
import { DakshinaModal } from '@/components/DakshinaModal';
import { Users, AlertCircle, Share2, Heart, Sparkles } from 'lucide-react';

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
  const [streamEnded, setStreamEnded] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [dakshinaModalOpen, setDakshinaModalOpen] = useState(false);
  const [latestDakshina, setLatestDakshina] = useState<any>(null);

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

  useEffect(() => {
    if (!id || id === 'demo') return;

    async function fetchStreamAndToken() {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const storedToken = localStorage.getItem('pooja_token');

      try {
        // 1. Fetch stream details
        const streamRes = await fetch(`${apiUrl}/streams/${id}`);
        if (!streamRes.ok) throw new Error('Stream not found');
        const streamData = await streamRes.json();
        setStream(streamData);

        // 2. Obtain subscriber LiveKit token
        const headers: Record<string, string> = {};
        if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;

        const tokenRes = await fetch(`${apiUrl}/streams/${id}/token`, {
          method: 'POST',
          headers,
        });

        if (!tokenRes.ok) throw new Error('Failed to join stream session');
        const { token: livekitToken, livekitUrl } = await tokenRes.json();

        setToken(livekitToken);
        setServerUrl(livekitUrl);
      } catch (err: any) {
        setError(err.message || 'Error connecting to sacred stream');
      }
    }

    fetchStreamAndToken();
  }, [id]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: stream?.title || 'Shubhdarshan Live Stream',
        text: `Watch live darshan: ${stream?.title}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Sacred broadcast link copied to clipboard 🙏');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {error && (
        <div className="mb-6 p-4 bg-red-950/80 border border-red-800 rounded-2xl flex items-center gap-3 text-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {streamEnded ? (
        <div className="w-full aspect-video max-h-[600px] bg-stone-900 border border-stone-800 rounded-3xl flex flex-col items-center justify-center p-8 text-center shadow-2xl">
          <span className="text-6xl mb-4">🙏</span>
          <h2 className="text-2xl font-bold text-white mb-2">Pooja Completed</h2>
          <p className="text-stone-400 text-sm max-w-md">
            This live broadcast has concluded. May the sacred blessings be upon you and your family.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video Viewport (Col span 2) */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-stone-800 flex items-center justify-center">
              {token && serverUrl ? (
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
                  <StartAudio label="Click to unmute live chanting & aarti 🔔" />
                </LiveKitRoom>
              ) : (
                <div className="flex flex-col items-center gap-3 text-stone-500">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-orange-500" />
                  <span className="text-xs uppercase tracking-wider font-semibold">
                    Connecting to Sacred Broadcast...
                  </span>
                </div>
              )}

              {/* Floating Auspicious Dakshina Alert */}
              {latestDakshina && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-stone-950 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce border-2 border-yellow-200">
                  <span className="text-xl">🪔</span>
                  <div className="text-xs">
                    <span className="font-extrabold">{latestDakshina.devoteeName}</span> offered <span className="font-black">₹{latestDakshina.amount}</span> Dakshina!
                    {latestDakshina.prayerMessage && (
                      <div className="text-[10px] font-semibold opacity-90 truncate max-w-xs">&ldquo;{latestDakshina.prayerMessage}&rdquo;</div>
                    )}
                  </div>
                  <span className="text-xl">🙏</span>
                </div>
              )}

              {/* Floating Spiritual Reactions Overlay */}
              <div className="absolute bottom-4 left-4 z-20">
                <SpiritualReactions socket={socket} streamId={id} />
              </div>
            </div>

            {/* Stream Metadata & Pandit Info */}
            {stream && (
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-950 text-red-400 border border-red-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        LIVE
                      </span>
                      <span className="text-xs text-stone-400 font-medium">
                        {stream.category?.name}
                      </span>
                    </div>
                    <h1 className="text-xl font-bold text-white tracking-tight">{stream.title}</h1>
                    <p className="text-xs text-stone-400 mt-1 line-clamp-2">{stream.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDakshinaModalOpen(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-orange-950/40"
                    >
                      <span>🪔</span>
                      <span>Arpan Dakshina</span>
                    </button>
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-2 px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl transition-all shadow"
                    >
                      <Share2 className="w-4 h-4" /> Share
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-stone-300">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-100 text-sm">
                      🙏 {stream.streamer?.name}
                    </span>
                    {stream.streamer?.streamerProfile?.isVerifiedBadge && (
                      <span className="text-orange-400 font-bold" title="Verified Pandit">✓ Verified</span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-stone-400 font-medium">
                    <Users className="w-3.5 h-3.5" /> Live Devotees
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right Live Chat Sidebar (Col span 1) */}
          <div className="h-[550px] lg:h-[620px]">
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
    </div>
  );
}

function VideoRenderer() {
  const tracks = useTracks([Track.Source.Camera]);
  if (tracks.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 bg-stone-950">
        <span className="text-4xl mb-2">🪔</span>
        <span className="text-sm font-medium">Awaiting Pandit video transmission...</span>
      </div>
    );
  }

  return <VideoTrack trackRef={tracks[0]} className="w-full h-full object-cover" />;
}
