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
import { SpiritualReactions } from '@/components/SpiritualReactions';
import { DakshinaModal } from '@/components/DakshinaModal';
import { CoinTopupModal } from '@/components/CoinTopupModal';
import { Users, AlertCircle, Share2, Sparkles, Zap } from 'lucide-react';
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
  const [dakshinaModalOpen, setDakshinaModalOpen] = useState(false);
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [latestDakshina, setLatestDakshina] = useState<any>(null);

  // Metered Coin State
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [remainingCoins, setRemainingCoins] = useState<number | null>(null);
  const [availableMinutes, setAvailableMinutes] = useState<number | null>(null);
  const [isZeroBalance, setIsZeroBalance] = useState(false);

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

        if (!res.ok) {
          setIsZeroBalance(true);
          return;
        }

        const data = await res.json();
        if (data.canContinue) {
          setRemainingCoins(data.remainingCoins);
          setAvailableMinutes(data.availableMinutes);
        } else {
          setIsZeroBalance(true);
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

      {/* Login Required Notice */}
      {loginRequired && (
        <div className="mb-6 p-6 bg-stone-900 border border-orange-500/40 rounded-3xl text-center max-w-xl mx-auto shadow-2xl">
          <OmIcon size={44} className="mb-3 mx-auto" />
          <h2 className="text-xl font-bold text-white mb-2">Devotee Sign In Required</h2>
          <p className="text-stone-300 text-xs sm:text-sm mb-4">
            Join thousands of devotees receiving live blessings. Create your free account now and get{' '}
            <span className="text-amber-400 font-extrabold inline-flex items-center gap-1">
              <CoinIcon size={16} /> 100 Free Sacred Coins
            </span>{' '}
            (= 20 minutes complimentary live darshan)!
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/register"
              className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold rounded-xl text-sm shadow-md"
            >
              Register & Claim 100 Free Coins
            </Link>
            <Link
              href="/login"
              className="px-4 py-2.5 bg-stone-800 text-stone-300 hover:text-white rounded-xl text-sm"
            >
              Sign In
            </Link>
          </div>
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
            <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-stone-800 flex items-center justify-center">
              {/* Zero Balance Blur & Eviction Overlay */}
              {isZeroBalance ? (
                <div className="absolute inset-0 z-40 bg-stone-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                  <OmIcon size={52} className="mb-3" />
                  <h3 className="text-xl font-bold text-white mb-1">Auspicious Darshan Paused</h3>
                  <p className="text-stone-400 text-xs sm:text-sm max-w-sm mb-6">
                    You have utilized your available darshan coins. Please recharge your wallet to continue receiving live blessings.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                      onClick={() => setTopupModalOpen(true)}
                      className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold rounded-2xl shadow-xl shadow-orange-950/60 flex items-center justify-center gap-2 text-sm"
                    >
                      <Zap className="w-4 h-4 fill-white" />
                      <span>Recharge Coins (from ₹200)</span>
                    </button>
                    <Link
                      href="/"
                      className="text-stone-400 hover:text-stone-200 text-xs font-semibold py-2"
                    >
                      Return to Darshan Schedule
                    </Link>
                  </div>
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
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-orange-500" />
                  <span className="text-xs uppercase tracking-wider font-semibold">
                    Connecting to Sacred Broadcast...
                  </span>
                </div>
              )}

              {/* In-Stream Real-Time Coin Balance HUD */}
              {remainingCoins !== null && !isZeroBalance && (
                <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
                  <button
                    onClick={() => setTopupModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900/80 backdrop-blur-md border border-amber-500/50 hover:border-amber-400 rounded-full text-xs font-bold text-amber-400 shadow-xl transition-all"
                    title="Click to recharge coins"
                  >
                    <CoinIcon size={16} />
                    <span>{remainingCoins} Coins</span>
                    <span className="text-stone-400 text-[10px] font-normal">
                      ({availableMinutes}m left)
                    </span>
                    <span className="text-amber-400 ml-1 font-extrabold">+</span>
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
                      {remainingCoins !== null && (
                        <span className="text-[11px] font-medium text-amber-400/90 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CoinIcon size={12} /> 5 Coins / min
                        </span>
                      )}
                    </div>
                    <h1 className="text-xl font-bold text-white tracking-tight">{stream.title}</h1>
                    <p className="text-xs text-stone-400 mt-1 line-clamp-2">{stream.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDakshinaModalOpen(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-orange-950/40"
                    >
                      <DiyaIcon size={16} />
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
                    <span className="font-semibold text-stone-100 text-sm flex items-center gap-1.5">
                      <PranamIcon size={16} /> {stream.streamer?.name}
                    </span>
                    {stream.streamer?.streamerProfile?.isVerifiedBadge && (
                      <span className="inline-flex items-center gap-1 text-orange-400 font-bold" title="Verified Vedic Pandit">
                        <VerifiedPanditBadge size={16} /> Verified
                      </span>
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

      <CoinTopupModal
        isOpen={topupModalOpen}
        onClose={() => setTopupModalOpen(false)}
        onSuccess={handleTopupSuccess}
      />
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
