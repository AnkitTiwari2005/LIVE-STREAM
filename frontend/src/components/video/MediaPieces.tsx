'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConnectionState, Participant, RoomOptions, Track, VideoPresets } from 'livekit-client';
import {
  TrackReferenceOrPlaceholder,
  VideoTrack,
  useConnectionQualityIndicator,
  useConnectionState,
  useIsSpeaking,
} from '@livekit/components-react';
import { AlertCircle, Mic, MicOff, Video as VideoIcon, VideoOff, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useLang } from '@/lib/i18n/context';

/* ───────────────────────── room options (shared by all 3 clients) ───────────────────────── */

/** Sensible defaults for devotional calls: echo cancellation on, adaptive quality, simulcast. */
export const ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  videoCaptureDefaults: { resolution: VideoPresets.h540.resolution },
  publishDefaults: {
    simulcast: true,
    videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
    videoEncoding: VideoPresets.h540.encoding,
    stopMicTrackOnMute: false,
  },
};

export function participantRole(p: Participant | undefined): string {
  if (!p?.metadata) return '';
  try {
    return String(JSON.parse(p.metadata).role || '');
  } catch {
    return '';
  }
}

export function isStreamerParticipant(p: Participant | undefined, streamerId?: string): boolean {
  if (!p) return false;
  if (streamerId && p.identity === streamerId) return true;
  return participantRole(p) === 'streamer';
}

export function friendlyMediaError(err: any, lang: 'en' | 'hi' = 'en'): string {
  const L = (en: string, hi: string) => (lang === 'hi' ? hi : en);
  const name = err?.name || '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || /permission/i.test(err?.message || '')) {
    return L(
      'Camera or microphone permission is blocked. Allow access in your browser settings and try again.',
      'कैमरा या माइक्रोफ़ोन की अनुमति अवरुद्ध है। ब्राउज़र सेटिंग में अनुमति दें और पुनः प्रयास करें।',
    );
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return L(
      'No camera or microphone was found on this device.',
      'इस डिवाइस पर कोई कैमरा या माइक्रोफ़ोन नहीं मिला।',
    );
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return L(
      'Your camera or microphone is being used by another app. Close it and try again.',
      'आपका कैमरा या माइक्रोफ़ोन किसी अन्य ऐप द्वारा उपयोग हो रहा है। उसे बंद कर पुनः प्रयास करें।',
    );
  }
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return L(
      'Camera and microphone need a secure (https) connection.',
      'कैमरा और माइक्रोफ़ोन के लिए सुरक्षित (HTTPS) कनेक्शन आवश्यक है।',
    );
  }
  return L(
    'Could not start your camera or microphone.',
    'आपका कैमरा या माइक्रोफ़ोन शुरू नहीं हो सका।',
  );
}

/* ───────────────────────── pre-join lobby ───────────────────────── */

export type LobbyChoice = {
  audio: boolean;
  video: boolean;
  audioDeviceId?: string;
  videoDeviceId?: string;
};

type Dev = { id: string; label: string };

export function MediaLobby({
  title,
  subtitle,
  joinLabel,
  onJoin,
  onCancel,
}: {
  title: string;
  subtitle?: string;
  joinLabel?: string;
  onJoin: (c: LobbyChoice) => void;
  onCancel?: () => void;
}) {
  const { lang } = useLang();
  const L = (en: string, hi: string) => (lang === 'hi' ? hi : en);
  const resolvedJoinLabel = joinLabel || L('Join session', 'सत्र से जुड़ें');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [cams, setCams] = useState<Dev[]>([]);
  const [mics, setMics] = useState<Dev[]>([]);
  const [camId, setCamId] = useState<string>('');
  const [micId, setMicId] = useState<string>('');
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    try {
      ctxRef.current?.close();
    } catch {}
    ctxRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    stop();
    setError(null);
    setStarting(true);
    if (!audioOn && !videoOn) {
      setStarting(false);
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError(L('This browser cannot access a camera or microphone.', 'यह ब्राउज़र कैमरा या माइक्रोफ़ोन एक्सेस नहीं कर सकता।'));
      setAudioOn(false);
      setVideoOn(false);
      setStarting(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioOn
          ? { deviceId: micId ? { exact: micId } : undefined, echoCancellation: true, noiseSuppression: true }
          : false,
        video: videoOn
          ? { deviceId: camId ? { exact: camId } : undefined, width: { ideal: 960 }, height: { ideal: 540 } }
          : false,
      });
      streamRef.current = stream;
      if (videoRef.current && videoOn) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      // Labels are only available after permission is granted.
      const all = await navigator.mediaDevices.enumerateDevices();
      setCams(all.filter((d) => d.kind === 'videoinput').map((d, i) => ({ id: d.deviceId, label: d.label || L(`Camera ${i + 1}`, `कैमरा ${i + 1}`) })));
      setMics(all.filter((d) => d.kind === 'audioinput').map((d, i) => ({ id: d.deviceId, label: d.label || L(`Microphone ${i + 1}`, `माइक्रोफ़ोन ${i + 1}`) })));
      const vt = stream.getVideoTracks()[0]?.getSettings().deviceId;
      const at = stream.getAudioTracks()[0]?.getSettings().deviceId;
      if (vt && !camId) setCamId(vt);
      if (at && !micId) setMicId(at);

      if (audioOn && stream.getAudioTracks().length) {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AC) {
          const ctx: AudioContext = new AC();
          ctxRef.current = ctx;
          const an = ctx.createAnalyser();
          an.fftSize = 512;
          ctx.createMediaStreamSource(stream).connect(an);
          const buf = new Uint8Array(an.fftSize);
          const tick = () => {
            an.getByteTimeDomainData(buf);
            let peak = 0;
            for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
            setLevel(Math.min(1, peak / 64));
            rafRef.current = requestAnimationFrame(tick);
          };
          tick();
        }
      }
    } catch (err: any) {
      setError(friendlyMediaError(err, lang));
      // Let the person still join and listen/watch.
      setAudioOn(false);
      setVideoOn(false);
    } finally {
      setStarting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioOn, videoOn, camId, micId, stop, lang]);

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  const join = () => {
    // Release the devices first - some browsers refuse a second capture of the same device.
    stop();
    onJoin({
      audio: audioOn,
      video: videoOn,
      audioDeviceId: audioOn ? micId || undefined : undefined,
      videoDeviceId: videoOn ? camId || undefined : undefined,
    });
  };

  return (
    <div className="max-w-2xl mx-auto rounded-3xl border border-stone-800 bg-stone-900/80 p-4 sm:p-6 shadow-2xl" data-testid="media-lobby">
      <h2 className="text-lg font-bold text-stone-100">{title}</h2>
      {subtitle && <p className="text-xs text-stone-400 mt-1">{subtitle}</p>}

      <div className="relative mt-4 aspect-video rounded-2xl overflow-hidden bg-black border border-stone-800">
        <video ref={videoRef} muted playsInline className={`w-full h-full object-cover -scale-x-100 ${videoOn ? '' : 'hidden'}`} />
        {!videoOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 gap-2">
            <VideoOff className="w-8 h-8" />
            <span className="text-xs">{L('Camera is off. You will be seen as a name only.', 'कैमरा बंद है। आप केवल नाम के रूप में दिखाई देंगे।')}</span>
          </div>
        )}
        {starting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
          </div>
        )}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          <button
            type="button"
            onClick={() => setAudioOn((v) => !v)}
            aria-pressed={audioOn}
            aria-label={audioOn ? L('Turn microphone off', 'माइक्रोफ़ोन बंद करें') : L('Turn microphone on', 'माइक्रोफ़ोन चालू करें')}
            title={audioOn ? L('Turn microphone off', 'माइक्रोफ़ोन बंद करें') : L('Turn microphone on', 'माइक्रोफ़ोन चालू करें')}
            className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg ${audioOn ? 'bg-emerald-700 text-white' : 'bg-stone-800 text-stone-200'}`}
          >
            {audioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={() => setVideoOn((v) => !v)}
            aria-pressed={videoOn}
            aria-label={videoOn ? L('Turn camera off', 'कैमरा बंद करें') : L('Turn camera on', 'कैमरा चालू करें')}
            title={videoOn ? L('Turn camera off', 'कैमरा बंद करें') : L('Turn camera on', 'कैमरा चालू करें')}
            className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg ${videoOn ? 'bg-emerald-700 text-white' : 'bg-stone-800 text-stone-200'}`}
          >
            {videoOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {audioOn && (
        <div className="mt-3 flex items-center gap-2" aria-label={L('Microphone level', 'माइक्रोफ़ोन स्तर')}>
          <Mic className="w-4 h-4 text-stone-400 shrink-0" />
          <div className="h-1.5 flex-1 rounded-full bg-stone-800 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-[width] duration-75" style={{ width: `${Math.round(level * 100)}%` }} />
          </div>
        </div>
      )}

      {(cams.length > 1 || mics.length > 1) && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {cams.length > 1 && videoOn && (
            <select value={camId} onChange={(e) => setCamId(e.target.value)} aria-label={L('Camera', 'कैमरा')} className="bg-stone-950 border border-stone-700 rounded-lg px-2 py-2 text-xs text-stone-200">
              {cams.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          )}
          {mics.length > 1 && audioOn && (
            <select value={micId} onChange={(e) => setMicId(e.target.value)} aria-label={L('Microphone', 'माइक्रोफ़ोन')} className="bg-stone-950 border border-stone-700 rounded-lg px-2 py-2 text-xs text-stone-200">
              {mics.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {error && (
        <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-amber-700/50 bg-amber-950/40 p-3 text-xs text-amber-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p>{error}</p>
            <button type="button" onClick={() => { setAudioOn(true); setVideoOn(true); }} className="mt-1 underline font-semibold">
              {L('Try again', 'पुनः प्रयास करें')}
            </button>
          </div>
        </div>
      )}

      <p className="mt-3 text-[11px] text-stone-500">{L('Use headphones if you can - it prevents echo for you and Pandit Ji.', 'संभव हो तो हेडफ़ोन उपयोग करें — इससे गूंज (ईको) नहीं होती।')}</p>

      <div className="mt-4 flex gap-2">
        {onCancel && (
          <button type="button" onClick={() => { stop(); onCancel(); }} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-stone-700 text-stone-300 hover:bg-stone-800">
            {L('Back', 'पीछे')}
          </button>
        )}
        <button type="button" onClick={join} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-extrabold bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:brightness-110">
          {resolvedJoinLabel}
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── tiles & indicators ───────────────────────── */

function initials(name?: string) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';
}

export function QualityDot({ participant }: { participant: Participant }) {
  const { lang } = useLang();
  const { quality } = useConnectionQualityIndicator({ participant });
  const q = String(quality);
  const color = q === 'excellent' ? 'bg-emerald-400' : q === 'good' ? 'bg-yellow-400' : q === 'poor' ? 'bg-red-500' : 'bg-stone-500';
  return <span title={`${lang === 'hi' ? 'कनेक्शन:' : 'Connection:'} ${q}`} className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />;
}

/** One person: video if their camera is on, otherwise an avatar - with name, mic state, speaking ring. */
export function ParticipantTile({
  participant,
  cameraRef,
  micMuted,
  label,
  badge,
  mirror,
  fit = 'cover',
  className = '',
  children,
}: {
  participant: Participant;
  cameraRef?: TrackReferenceOrPlaceholder;
  micMuted: boolean;
  label: string;
  badge?: string;
  mirror?: boolean;
  fit?: 'cover' | 'contain';
  className?: string;
  children?: React.ReactNode;
}) {
  const speaking = useIsSpeaking(participant);
  const hasVideo = !!cameraRef && !!cameraRef.publication && !cameraRef.publication.isMuted;
  return (
    <div
      className={`relative overflow-hidden bg-stone-950 rounded-xl border-2 transition-colors ${speaking ? 'border-emerald-400' : 'border-stone-800'} ${className}`}
      data-participant={participant.identity}
    >
      {hasVideo ? (
        <VideoTrack
          trackRef={cameraRef as any}
          className={`w-full h-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} ${mirror ? '-scale-x-100' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-900 to-stone-950">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-200 font-bold flex items-center justify-center text-lg sm:text-xl">
            {initials(label)}
          </div>
        </div>
      )}
      <div className="absolute bottom-1 left-1 right-1 flex items-center gap-1 text-[10px] font-semibold text-white">
        <span className="flex items-center gap-1 bg-black/70 rounded px-1.5 py-0.5 max-w-full">
          {micMuted ? <MicOff className="w-3 h-3 text-red-400 shrink-0" /> : <Mic className="w-3 h-3 text-emerald-400 shrink-0" />}
          <span className="truncate">{label}</span>
          {badge && <span className="text-amber-300 shrink-0">· {badge}</span>}
          <QualityDot participant={participant} />
        </span>
      </div>
      {children}
    </div>
  );
}

/** "Reconnecting…" / "Connection lost" strip. Renders nothing while healthy. */
export function ConnectionBanner() {
  const { lang } = useLang();
  const L = (en: string, hi: string) => (lang === 'hi' ? hi : en);
  const state = useConnectionState();
  if (state === ConnectionState.Connected || state === ConnectionState.Connecting) return null;
  const reconnecting = state === ConnectionState.Reconnecting || state === (ConnectionState as any).SignalReconnecting;
  return (
    <div role="status" className="absolute top-0 inset-x-0 z-40 flex items-center justify-center gap-2 bg-amber-600/95 text-stone-950 text-xs font-bold py-1.5">
      {reconnecting ? <Wifi className="w-3.5 h-3.5 animate-pulse" /> : <WifiOff className="w-3.5 h-3.5" />}
      {reconnecting ? L('Reconnecting… your call will resume', 'पुनः कनेक्ट हो रहा है… आपकी कॉल जारी रहेगी') : L('Disconnected', 'कनेक्शन कट गया')}
    </div>
  );
}

/** Pick the camera / mic tracks of one participant out of a flat track list. */
export function trackFor(tracks: TrackReferenceOrPlaceholder[], identity: string, source: Track.Source) {
  return tracks.find((t) => t.participant.identity === identity && t.source === source);
}

export function useStableRoomOptions(): RoomOptions {
  return useMemo(() => ROOM_OPTIONS, []);
}

/** Re-render when participants' attributes / permissions change (guest granted or revoked). */
export function useRoomTick(room: import('livekit-client').Room | undefined) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!room) return;
    const bump = () => setTick((t) => t + 1);
    const evs = ['participantAttributesChanged', 'participantPermissionsChanged', 'participantConnected', 'participantDisconnected'] as const;
    evs.forEach((e) => room.on(e as any, bump));
    return () => {
      evs.forEach((e) => room.off(e as any, bump));
    };
  }, [room]);
}

export const isVideoGuest = (p: Participant) => (p.attributes as Record<string, string> | undefined)?.videoGuest === '1';
