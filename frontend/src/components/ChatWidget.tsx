'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Send, Pin, Trash2, VolumeX, ShieldAlert, Sparkles } from 'lucide-react';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    socket.emit('chat:join', { streamId });

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

    return () => {
      socket.off('chat:history');
      socket.off('chat:message');
      socket.off('chat:message_deleted');
      socket.off('chat:message_pinned');
      socket.off('chat:error');
    };
  }, [socket, streamId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;

    if (!currentUser) {
      setErrorBanner('Please sign in to participate in live chat.');
      return;
    }

    socket.emit('chat:send', { streamId, message: input });
    setInput('');
  };

  const handleDelete = (messageId: string) => {
    socket?.emit('chat:delete', { streamId, messageId });
  };

  const handlePin = (messageId: string) => {
    socket?.emit('chat:pin', { streamId, messageId });
  };

  const handleMute = (targetUserId: string) => {
    if (confirm('Mute this user for 15 minutes?')) {
      socket?.emit('chat:mute', { streamId, targetUserId, durationMinutes: 15 });
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <h3 className="font-semibold text-sm text-stone-100">Live Darshan Chat</h3>
        </div>
        <span className="text-[11px] text-stone-400">Max 500 chars</span>
      </div>

      {/* Pinned Message Banner */}
      {pinnedMessage && (
        <div className="bg-amber-950/80 border-b border-amber-800/60 px-3 py-2 flex items-start gap-2 text-xs text-amber-200">
          <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-amber-300">Pinned: </span>
            {pinnedMessage.message}
          </div>
        </div>
      )}

      {/* Error notification */}
      {errorBanner && (
        <div className="bg-red-950/90 border-b border-red-800 px-3 py-1.5 text-xs text-red-200 flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
        {messages.map((msg) => (
          <div key={msg.id} className="group flex items-start justify-between gap-2 p-1.5 rounded hover:bg-stone-800/60 transition-colors">
            <div>
              <span
                className={`font-semibold mr-1.5 ${
                  msg.user.role === 'STREAMER'
                    ? 'text-orange-400'
                    : msg.user.role === 'ADMIN'
                    ? 'text-amber-400'
                    : 'text-stone-300'
                }`}
              >
                {msg.user.role === 'STREAMER' && '🕉️ '}
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
                <button
                  onClick={() => handleDelete(msg.id)}
                  title="Delete message"
                  className="p-1 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleMute(msg.user.id)}
                  title="Mute user for 15 mins"
                  className="p-1 hover:text-orange-400"
                >
                  <VolumeX className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 bg-stone-950 border-t border-stone-800">
        {currentUser ? (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Send sacred offering or prayer..."
              maxLength={500}
              className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="bg-orange-600 hover:bg-orange-500 text-white p-2 rounded-lg transition-colors"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="text-center py-1">
            <a href="/login" className="text-xs text-orange-400 hover:underline font-medium">
              Sign in to participate in sacred live chat 🙏
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
