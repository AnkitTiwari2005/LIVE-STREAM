'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Send, Pin, Trash2, VolumeX, ShieldAlert, Sparkles, Flag, UserX } from 'lucide-react';
import { OmIcon, DiyaIcon, PranamIcon, CoinIcon } from '@/components/icons/SpiritualIcons';
import { KickedScreen } from '@/components/KickedScreen';
import { KickViewerModal } from '@/components/KickViewerModal';

interface ChatMessage {
  id: string;
  message: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
    role: string;
  };
  isPinned?: boolean;
}

interface ChatWidgetProps {
  socket: Socket | null;
  streamId: string;
  isStreamer?: boolean;
  currentUser?: any;
  sessionId?: string | null;
}

export function ChatWidget({ socket, streamId, isStreamer, currentUser, sessionId }: ChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessage, setPinnedMessage] = useState<ChatMessage | null>(null);
  const [input, setInput] = useState('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [muteBanner, setMuteBanner] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [activeUser, setActiveUser] = useState<any>(currentUser || null);
  const [kickedData, setKickedData] = useState<{ reason?: string; blocked: boolean } | null>(null);
  const [kickTarget, setKickTarget] = useState<{ identity: string; displayName: string } | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUser) {
      setActiveUser(currentUser);
    } else if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pooja_user');
      if (stored) {
        try {
          setActiveUser(JSON.parse(stored));
        } catch {}
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (!socket || !streamId) return;

    const joinRoom = () => {
      socket.emit('chat:join', { streamId, sessionId: sessionId || undefined });
    };

    if (socket.connected) {
      joinRoom();
    }
    socket.on('connect', joinRoom);

    socket.on('chat:history', (history: ChatMessage[]) => {
      setMessages(history);
      const pinned = history.find((m) => m.isPinned);
      if (pinned) setPinnedMessage(pinned);
    });

    socket.on('chat:message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('chat:message_deleted', (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      if (pinnedMessage?.id === data.messageId) {
        setPinnedMessage(null);
      }
    });

    socket.on('chat:message_pinned', (data: { messageId: string; message: string }) => {
      setPinnedMessage({
        id: data.messageId,
        message: data.message,
        createdAt: new Date().toISOString(),
        user: { id: '', name: 'Pandit', role: 'STREAMER' },
        isPinned: true,
      });
    });

    socket.on('chat:error', (err: { message: string }) => {
      setErrorBanner(err.message);
      setTimeout(() => setErrorBanner(null), 4000);
    });

    // G7: chat:user_muted is now sent only to the target's identity room (not the whole stream room)
    socket.on('chat:user_muted', (data: { userId: string; durationMinutes: number }) => {
      setMuteBanner(`You have been muted for ${data.durationMinutes} minute(s).`);
      setIsMuted(true);
      // Auto-clear mute banner after duration
      setTimeout(() => {
        setMuteBanner(null);
        setIsMuted(false);
      }, data.durationMinutes * 60 * 1000);
    });

    // Feature C: listen for kick event from streamer/admin
    socket.on('stream:kicked', (data: { reason?: string; blocked: boolean }) => {
      setKickedData(data);
    });

    socket.on('stream:dakshina_received', (dakshina: any) => {
      const coinAmount = dakshina.coins ?? dakshina.amount;
      setMessages((prev) => [
        ...prev,
        {
          id: `dakshina_${Date.now()}_${Math.random()}`,
          message: `Offered ${coinAmount} Coins Sacred Dakshina${dakshina.prayerMessage ? `: "${dakshina.prayerMessage}"` : ''}`,
          createdAt: new Date().toISOString(),
          user: {
            id: '',
            name: `${dakshina.devoteeName}${dakshina.gotra ? ` (${dakshina.gotra})` : ''}`,
            role: 'DEVOTEE',
          },
          isPinned: false,
          isDakshina: true,
        } as any,
      ]);
    });

    return () => {
      socket.off('connect', joinRoom);
      socket.off('chat:history');
      socket.off('chat:message');
      socket.off('chat:message_deleted');
      socket.off('chat:message_pinned');
      socket.off('chat:error');
      socket.off('chat:user_muted');
      socket.off('stream:kicked');
      socket.off('stream:dakshina_received');
    };
  }, [socket, streamId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('pooja_user') : null;
    const resolvedUser = currentUser || (storedUser ? JSON.parse(storedUser) : null);

    // G8: allow guests with sessionId to send without being logged in
    if (!resolvedUser && !sessionId) {
      setErrorBanner('Please sign in to participate in sacred live chat.');
      setTimeout(() => setErrorBanner(null), 4000);
      return;
    }

    if (!socket || !socket.connected) {
      setErrorBanner('Chat server reconnecting. Please wait a moment...');
      setTimeout(() => setErrorBanner(null), 3000);
      return;
    }

    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('pooja_token') : null;

    socket.emit('chat:send', {
      streamId,
      message: trimmed,
      guestName: resolvedUser?.name || 'Devotee',
      token: storedToken,
    });

    setInput('');
  };

  const handlePin = (messageId: string) => {
    if (!socket || !isStreamer) return;
    socket.emit('chat:pin', { streamId, messageId });
  };

  const handleDelete = (messageId: string) => {
    if (!socket || !isStreamer) return;
    socket.emit('chat:delete', { streamId, messageId });
  };

  const handleMute = (targetUserId: string) => {
    if (!socket || !isStreamer) return;
    socket.emit('chat:mute', { streamId, targetUserId, durationMinutes: 15 });
  };

  // G9: kick button opens KickViewerModal
  const handleKick = (identity: string, displayName: string) => {
    if (!isStreamer) return;
    setKickTarget({ identity, displayName });
  };

  const handleReportMessage = async (msg: ChatMessage) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pooja_token') : null;
    if (!token) {
      setErrorBanner('Please sign in to report a message');
      setTimeout(() => setErrorBanner(null), 3000);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      // G10: only pass targetUserId if it looks like a real UUID (not a socket.id or guest string)
      const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isRealUserId = UUID_PATTERN.test(msg.user?.id || '');
      await fetch(`${apiUrl}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetType: 'CHAT_MESSAGE',
          streamId,
          chatMessageId: msg.id,
          ...(isRealUserId ? { targetUserId: msg.user.id } : {}),
          reason: 'Inappropriate or offensive message',
          details: msg.message,
        }),
      });
      setErrorBanner('Report submitted for moderation 🙏');
      setTimeout(() => setErrorBanner(null), 3000);
    } catch {
      setErrorBanner('Failed to submit report');
      setTimeout(() => setErrorBanner(null), 3000);
    }
  };

  const isLoggedIn = Boolean(activeUser) || Boolean(sessionId);

  // Feature C: show kicked screen if user was removed
  if (kickedData) {
    return <KickedScreen reason={kickedData.reason} blocked={kickedData.blocked} />;
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl overflow-hidden shadow-lg dark:shadow-2xl">
      {/* Chat Header */}
      <div className="p-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <OmIcon size={20} className="text-amber-700 dark:text-amber-400" />
          <h2 className="text-sm font-bold text-stone-900 dark:text-white tracking-tight">Sacred Live Chat</h2>
        </div>
        <span className="text-[10px] text-stone-600 dark:text-stone-400 font-medium">Max 500 chars</span>
      </div>

      {/* Pinned Message Banner */}
      {pinnedMessage && (
        <div className="bg-amber-950/60 border-b border-amber-800/60 p-2.5 px-3 flex items-start justify-between gap-2 text-xs text-amber-200">
          <div className="flex items-start gap-1.5 flex-1">
            <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5 fill-amber-400" />
            <div>
              <span className="font-bold text-amber-300 block text-[10px] uppercase tracking-wider">
                Pinned by Pandit
              </span>
              <p className="line-clamp-2 text-stone-200">{pinnedMessage.message}</p>
            </div>
          </div>
          {isStreamer && (
            <button
              onClick={() => setPinnedMessage(null)}
              className="text-amber-400/80 hover:text-white text-[10px]"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Error / Rate Limit Toast */}
      {errorBanner && (
        <div className="bg-red-950/90 border-b border-red-800 px-3 py-1.5 text-xs text-red-200 flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Mute Banner */}
      {muteBanner && (
        <div className="bg-orange-950/80 border-b border-orange-800/60 px-3 py-1.5 text-xs text-orange-200 flex items-center gap-2">
          <VolumeX className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          <span>{muteBanner}</span>
        </div>
      )}

      {/* Message List */}
      <div ref={chatContainerRef} className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-stone-600 dark:text-stone-400 text-center px-4 py-8">
            <DiyaIcon size={36} className="mb-2 text-amber-700 dark:text-amber-400 shrink-0" />
            <span className="text-xs">No messages yet. Send a prayer or chant to start the conversation!</span>
          </div>
        )}

        {messages.map((msg) => {
          const isDakshina = (msg as any).isDakshina;
          if (isDakshina) {
            return (
              <div
                key={msg.id}
                className="p-2.5 rounded-xl bg-amber-50 dark:bg-gradient-to-r dark:from-amber-950/70 dark:via-orange-950/70 dark:to-yellow-950/70 border border-amber-300 dark:border-amber-600/40 shadow-sm dark:shadow-md text-amber-900 dark:text-amber-200"
              >
                <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 mb-0.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <DiyaIcon size={16} />
                    <span>{msg.user.name}</span>
                  </div>
                  {msg.createdAt && (
                    <span className="text-[9px] text-stone-600 dark:text-stone-400 font-mono">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <div className="text-stone-900 dark:text-white font-medium pl-5 text-[11px] leading-relaxed flex items-center gap-1.5">
                  <CoinIcon size={13} className="shrink-0" />
                  <span>{msg.message}</span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className="group flex items-start justify-between gap-2 p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-colors"
            >
              <div>
                <span
                  className={`font-semibold mr-1.5 inline-flex items-center gap-1 ${
                    msg.user.role === 'STREAMER'
                      ? 'text-orange-700 dark:text-orange-400 font-bold'
                      : msg.user.role === 'ADMIN'
                      ? 'text-amber-800 dark:text-amber-400 font-bold'
                      : 'text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {msg.user.role === 'STREAMER' && <OmIcon size={14} />}
                  {msg.user.name}:
                </span>
                <span className="text-stone-900 dark:text-stone-100 break-words">{msg.message}</span>
                {msg.createdAt && (
                  <span className="text-[9px] text-stone-600 dark:text-stone-400 ml-1.5 font-mono select-none">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              <div className="hidden group-hover:flex items-center gap-1 shrink-0 opacity-80">
                {/* Moderation Controls (Streamer / Admin only) */}
                {isStreamer && (
                  <>
                    <button
                      onClick={() => handlePin(msg.id)}
                      title="Pin message"
                      className="p-1 text-stone-600 dark:text-stone-400 hover:text-amber-700 dark:hover:text-amber-400"
                    >
                      <Pin className="w-3 h-3" />
                    </button>
                    {msg.user.id && (
                      <button
                        onClick={() => handleMute(msg.user.id)}
                        title="Mute user for 15 mins"
                        className="p-1 text-stone-600 dark:text-stone-400 hover:text-red-700 dark:hover:text-red-400"
                      >
                        <VolumeX className="w-3 h-3" />
                      </button>
                    )}
                    {/* G9: Kick button */}
                    {msg.user.id && (
                      <button
                        onClick={() => handleKick(msg.user.id, msg.user.name)}
                        title="Remove viewer"
                        className="p-1 text-stone-600 dark:text-stone-400 hover:text-red-700 dark:hover:text-red-400"
                      >
                        <UserX className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(msg.id)}
                      title="Delete message"
                      className="p-1 text-stone-600 dark:text-stone-400 hover:text-red-700 dark:hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
                {/* Report button for all participants */}
                <button
                  onClick={() => handleReportMessage(msg)}
                  title="Report inappropriate message"
                  className="p-1 hover:text-amber-700 dark:hover:text-amber-400 text-stone-600 dark:text-stone-400"
                >
                  <Flag className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/60">
        {isLoggedIn ? (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Chant Har Har Mahadev, Jai Shri Ram..."
              maxLength={500}
              disabled={isMuted}
              className="flex-1 px-3.5 py-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-white placeholder-stone-500 dark:placeholder-stone-400 focus:outline-none focus:border-amber-600 dark:focus:border-orange-500 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={isMuted}
              className="bg-orange-700 hover:bg-orange-600 text-white p-2.5 rounded-xl transition-colors shadow-md shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              title={isMuted ? 'You are muted' : 'Send Message'}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="text-center py-1">
            <a href="/login" className="chat-signin-link text-xs hover:underline font-bold inline-flex items-center gap-1.5">
              <span className="font-bold">Sign in to participate in sacred live chat</span>
              <PranamIcon size={14} className="text-amber-700 dark:text-amber-400" />
            </a>
          </div>
        )}
      </div>

      {/* KickViewerModal */}
      {kickTarget && isStreamer && (
        <KickViewerModal
          streamId={streamId}
          identity={kickTarget.identity}
          displayName={kickTarget.displayName}
          onClose={() => setKickTarget(null)}
          socket={socket}
        />
      )}
    </div>
  );
}
