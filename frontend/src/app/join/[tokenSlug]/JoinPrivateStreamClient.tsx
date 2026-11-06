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
import {
  Lock,
  ShieldCheck,
  User,
  AlertCircle,
  Play,
  Sparkles,
  Share2,
  Users,
  Volume2,
} from 'lucide-react';

export default function JoinPrivateStreamClient() {
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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [dakshinaModalOpen, setDakshinaModalOpen] = useState(false);
  const [latestDakshina, setLatestDakshina] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inspectLoading, setInspectLoading] = useState(true);

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
  }, [streamId]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    const storedToken = localStorage.getItem('pooja_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (storedToken) headers.Authorization = `Bearer ${storedToken}`;

    let resolvedUserId: string | undefined = currentUser?.id;
    if (!resolvedUserId) {
      try {
        const stored = localStorage.getItem('pooja_user');
        if (stored) resolvedUserId = JSON.parse(stored)?.id;
      } catch {}
    }

    try {
      const res = await fetch(`${apiUrl}/private-links/claim/${tokenSlug}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          password: password || undefined,
          guestName: guestName || undefined,
          userId: resolvedUserId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Access denied');

      setToken(data.token);
      setServerUrl(data.serverUrl);
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
      alert('Private session link copied to clipboard 🙏');
    }
  };

  if (inspectLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-stone-400">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-orange-500 mb-3" />
        <span className="text-sm">Verifying private invitation link...</span>
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
            <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-stone-800 flex items-center justify-center">
              <LiveKitRoom
                serverUrl={serverUrl}
                token={token}
                connect={true}
                video={false}
                audio={false}
                className="w-full h-full"
              >
                {/* RoomAudioRenderer ensures all remote audio tracks are played via HTMLAudioElement */}
                <RoomAudioRenderer />
                <PrivateVideoTrackRenderer />
                <StartAudio label="🔊 Click to Unmute Live Sacred Chanting & Mantras 🙏" />
              </LiveKitRoom>

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
              {streamId && (
                <div className="absolute bottom-4 left-4 z-20">
                  <SpiritualReactions socket={socket} streamId={streamId} />
                </div>
              )}
            </div>

            {/* Stream Metadata & Pandit Info Card */}
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-950 text-red-400 border border-red-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      LIVE
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-950/80 text-orange-400 border border-orange-800">
                      🔒 Private Consultation
                    </span>
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
                    <span>🪔</span>
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
                  <span className="font-semibold text-stone-100 text-sm">
                    🙏 {metadata?.streamerName || 'Acharya Devrat Sharma'}
                  </span>
                  <span className="text-orange-400 font-bold flex items-center gap-0.5" title="Verified Vedic Pandit">
                    <ShieldCheck className="w-3.5 h-3.5 inline" /> Verified Pandit
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
              />
            ) : (
              <div className="w-full h-full bg-stone-900 border border-stone-800 rounded-2xl flex items-center justify-center text-stone-500 text-xs">
                Connecting to sacred pooja chat...
              </div>
            )}
          </div>

          {/* Dakshina Offering Modal */}
          {streamId && (
            <DakshinaModal
              isOpen={dakshinaModalOpen}
              onClose={() => setDakshinaModalOpen(false)}
              streamId={streamId}
              streamerName={metadata?.streamerName || 'Acharya Devrat Sharma'}
              currentUser={currentUser}
            />
          )}
        </div>
      ) : (
        // Verification & Password Claim Screen
        <div className="max-w-md mx-auto bg-stone-900 border border-stone-800 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <span className="text-4xl mb-2 inline-block">🕉️</span>
            <h2 className="text-xl font-bold text-white">Private Pooja Consultation</h2>
            <p className="text-xs text-stone-400 mt-1">
              {metadata?.streamTitle ? `"${metadata.streamTitle}" by ${metadata.streamerName}` : 'Enter your details to join'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
              {(error.includes('logged into your account') || error.includes('Unauthorized')) && (
                <a
                  href={`/login?redirect=/join/${tokenSlug}`}
                  className="mt-1 text-center py-2 px-3 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg transition-colors"
                >
                  Sign In to Devotee Account 🙏
                </a>
              )}
            </div>
          )}

          <form onSubmit={handleClaim} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Your Devotee Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Rahul Sharma"
                  className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {metadata?.requiresPassword && (
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Secret Session Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password provided by Pandit"
                    className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl text-sm shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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

function PrivateVideoTrackRenderer() {
  const tracks = useTracks([Track.Source.Camera]);
  if (tracks.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 bg-stone-950">
        <span className="text-4xl mb-2">🪔</span>
        <span className="text-sm font-medium">Awaiting Pandit video transmission...</span>
      </div>
    );
  }

  return <VideoTrack trackRef={tracks[0]} className="w-full h-full object-contain bg-black" />;
}
