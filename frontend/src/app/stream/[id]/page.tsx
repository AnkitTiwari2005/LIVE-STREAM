'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  LiveKitRoom,
  StartAudio,
  useTracks,
  VideoTrack,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { io, Socket } from 'socket.io-client';
import { ChatWidget } from '@/components/ChatWidget';
import { SpiritualReactions } from '@/components/SpiritualReactions';
import { Users, AlertCircle, Share2, Heart, Sparkles } from 'lucide-react';

export default function StreamPlayerPage() {
  const { id } = useParams() as { id: string };
  const [stream, setStream] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamEnded, setStreamEnded] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('pooja_user');
    const storedToken = localStorage.getItem('pooja_token');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch {}
    }

    // Connect to WebSocket chat gateway
    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000';
    const socketInstance = io(socketUrl, {
      auth: { token: storedToken },
      withCredentials: true,
    });
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!id) return;

    async function fetchStreamAndToken() {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const storedToken = localStorage.getItem('pooja_token');

      try {
        // 1. Fetch stream details
        const streamRes = await fetch(`${apiUrl}/streams/${id}`);
        if (!streamRes.ok) throw new Error('Stream not found');
        const streamData = await streamRes.json();
        setStream(streamData);

        if (streamData.status === 'ENDED' || streamData.status === 'CANCELLED') {
          setStreamEnded(true);
          return;
        }

        // 2. Request viewer token
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (storedToken) headers.Authorization = `Bearer ${storedToken}`;

        const tokenRes = await fetch(`${apiUrl}/streams/${id}/token/viewer`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ guestName: 'Devotee' }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) throw new Error(tokenData.message || 'Unable to join stream');

        setToken(tokenData.token);
        setServerUrl(tokenData.serverUrl);
      } catch (err: any) {
        setError(err.message);
      }
    }

    fetchStreamAndToken();
  }, [id]);

  const handleFollow = async () => {
    if (!currentUser) {
      alert('Please sign in to follow this pandit.');
      return;
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    const storedToken = localStorage.getItem('pooja_token');
    try {
      await fetch(`${apiUrl}/streamers/${stream.streamerId}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      setIsFollowing(!isFollowing);
    } catch {
      alert('Failed to update follow status.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {error ? (
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-12 text-center max-w-lg mx-auto">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Notice</h2>
          <p className="text-sm text-stone-300">{error}</p>
        </div>
      ) : streamEnded ? (
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-2xl">
          <span className="text-5xl mb-4 inline-block">🕉️</span>
          <h2 className="text-2xl font-bold text-white mb-2">Sacred Pooja Concluded</h2>
          <p className="text-sm text-stone-300 mb-6">
            The live darshan session has finished. Shubh Ashirwad & Blessings to all devotees. 🙏
          </p>
          <a
            href="/"
            className="inline-block py-2.5 px-6 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            Explore Other Live Darshans
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video Player Container (Col span 2) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-stone-800 shadow-2xl">
              {token ? (
                <LiveKitRoom
                  serverUrl={serverUrl}
                  token={token}
                  connect={true}
                  video={true}
                  audio={true}
                  onDisconnected={() => setStreamEnded(true)}
                  className="w-full h-full"
                >
                  {/* iOS Safari Tap to Unmute Audio Overlay (Crucial fix from v2.1) */}
                  <StartAudio label="Tap to Unmute Sacred Audio 🙏" />
                  <VideoRenderer />
                </LiveKitRoom>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-stone-400">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-orange-500 mb-3" />
                  <span className="text-sm">Connecting to Live Pooja stream...</span>
                </div>
              )}

              {/* Floating Spiritual Reactions Bar */}
              <div className="absolute bottom-4 right-4 z-30">
                <SpiritualReactions socket={socket} streamId={id} />
              </div>
            </div>

            {/* Stream Header & Streamer Info */}
            {stream && (
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
                  <div>
                    <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">
                      {stream.category?.name || 'Vedic Ritual'}
                    </span>
                    <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
                      {stream.title}
                    </h1>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleFollow}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isFollowing
                          ? 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                          : 'bg-orange-600 hover:bg-orange-500 text-white shadow-md'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFollowing ? 'fill-red-500 text-red-500' : ''}`} />
                      {isFollowing ? 'Following' : 'Follow Pandit'}
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
