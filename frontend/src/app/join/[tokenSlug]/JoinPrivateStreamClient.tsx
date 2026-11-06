'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { LiveKitRoom, StartAudio, useTracks, VideoTrack } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Lock, ShieldCheck, User, AlertCircle, Play, Sparkles } from 'lucide-react';

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
      } catch (err: any) {
        setError(err.message);
      } finally {
        setInspectLoading(false);
      }
    }
    inspect();
  }, [tokenSlug]);

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      {token ? (
        // Connected to Private Stream Video Room
        <div className="space-y-4">
          <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider">
                🔒 Private Sacred Consultation
              </span>
              <h1 className="text-xl font-bold text-white mt-0.5">
                {metadata?.streamTitle}
              </h1>
            </div>
            <span className="text-xs text-stone-400">By {metadata?.streamerName}</span>
          </div>

          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-stone-800 shadow-2xl">
            <LiveKitRoom
              serverUrl={serverUrl}
              token={token}
              connect={true}
              video={true}
              audio={true}
              className="w-full h-full"
            >
              <StartAudio label="Tap to Unmute Sacred Audio 🙏" />
              <PrivateVideoTrackRenderer />
            </LiveKitRoom>
          </div>
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

  return <VideoTrack trackRef={tracks[0]} className="w-full h-full object-cover" />;
}
