'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Send, Pin, Trash2, VolumeX, ShieldAlert, Sparkles } from 'lucide-react';
import { OmIcon, DiyaIcon, PranamIcon } from '@/components/icons/SpiritualIcons';

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
}

export function ChatWidget({ socket, streamId, isStreamer, currentUser }: ChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessage, setPinnedMessage] = useState<ChatMessage | null>(null);
  const [input, setInput] = useState('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [activeUser, setActiveUser] = useState<any>(currentUser || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      socket.emit('chat:join', { streamId });
    };

    // Join room immediately if already connected, and also on every connect/reconnect
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

    socket.on('stream:dakshina_received', (dakshina: any) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `dakshina_${Date.now()}_${Math.random()}`,
          message: `Offered ₹${dakshina.amount} Sacred Dakshina${dakshina.prayerMessage ? `: "${dakshina.prayerMessage}"` : ''}`,
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
      socket.off('stream:dakshina_received');
    };
  }, [socket, streamId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('pooja_user') : null;
    const activeUser = currentUser || (storedUser ? JSON.parse(storedUser) : null);

    if (!activeUser) {
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

    // Emit chat message event
    socket.emit('chat:send', {
      streamId,
      message: trimmed,
      guestName: activeUser?.name || 'Devotee',
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

  const isLoggedIn = Boolean(activeUser);

  return (
    <div className="flex flex-col h-full bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* Chat Header */}
      <div className="p-4 border-b border-stone-800 bg-stone-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <OmIcon size={20} />
          <h2 className="text-sm font-bold text-white tracking-tight">Sacred Live Chat</h2>
        </div>
        <span className="text-[10px] text-stone-500 font-medium">Max 500 chars</span>
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

      {/* Message List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-stone-500 text-center px-4">
            <PranamIcon size={32} className="mb-2" />
            <span className="text-xs">No messages yet. Send a prayer or chant to start the conversation!</span>
          </div>
        )}

        {messages.map((msg) => {
          const isDakshina = (msg as any).isDakshina;
          if (isDakshina) {
            return (
              <div
                key={msg.id}
                className="p-2.5 rounded-xl bg-gradient-to-r from-amber-950/70 via-orange-950/70 to-yellow-950/70 border border-amber-600/40 shadow-md text-amber-200"
              >
                <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-0.5">
                  <DiyaIcon size={16} />
                  <span>{msg.user.name}</span>
                </div>
                <div className="text-white font-medium pl-5 text-[11px] leading-relaxed">
                  {msg.message}
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className="group flex items-start justify-between gap-2 p-1.5 rounded-lg hover:bg-stone-800/60 transition-colors"
            >
              <div>
                <span
                  className={`font-semibold mr-1.5 inline-flex items-center gap-1 ${
                    msg.user.role === 'STREAMER'
                      ? 'text-orange-400'
                      : msg.user.role === 'ADMIN'
                      ? 'text-amber-400'
                      : 'text-stone-300'
                  }`}
                >
                  {msg.user.role === 'STREAMER' && <OmIcon size={14} />}
                  {msg.user.name}:
                </span>
                <span className="text-stone-100 break-words">{msg.message}</span>
              </div>

              {/* Moderation Controls (Streamer / Admin only) */}
              {isStreamer && (
                <div className="hidden group-hover:flex items-center gap-1 shrink-0 opacity-80">
                  <button
                    onClick={() => handlePin(msg.id)}
                    title="Pin message"
                    className="p-1 hover:text-amber-400"
                  >
                    <Pin className="w-3 h-3" />
                  </button>
                  {msg.user.id && (
                    <button
                      onClick={() => handleMute(msg.user.id)}
                      title="Mute user for 15 mins"
                      className="p-1 hover:text-red-400"
                    >
                      <VolumeX className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(msg.id)}
                    title="Delete message"
                    className="p-1 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-stone-800 bg-stone-950/60">
        {isLoggedIn ? (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Chant Har Har Mahadev, Jai Shri Ram..."
              maxLength={500}
              className="flex-1 px-3.5 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="bg-orange-600 hover:bg-orange-500 text-white p-2.5 rounded-xl transition-colors shadow-md shrink-0"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="text-center py-1">
            <a href="/login" className="text-xs text-orange-400 hover:underline font-semibold inline-flex items-center gap-1.5">
              <span>Sign in to participate in sacred live chat</span>
              <PranamIcon size={14} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
