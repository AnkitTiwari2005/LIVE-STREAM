'use client';

import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface ReactionItem {
  id: string;
  emoji: string;
  left: number;
}

interface SpiritualReactionsProps {
  socket: Socket | null;
  streamId: string;
}

export function SpiritualReactions({ socket, streamId }: SpiritualReactionsProps) {
  const [activeReactions, setActiveReactions] = useState<ReactionItem[]>([]);
  const emojis = ['🙏', '🪔', '🌸', '🔔', '🕉️', '🌺'];

  useEffect(() => {
    if (!socket) return;

    const handleReactionReceived = (data: { streamId: string; emoji: string }) => {
      if (data.streamId !== streamId) return;

      const newReaction: ReactionItem = {
        id: `${Date.now()}_${Math.random()}`,
        emoji: data.emoji,
        left: 20 + Math.random() * 60, // random horizontal offset 20% to 80%
      };

      setActiveReactions((prev) => [...prev.slice(-20), newReaction]);

      setTimeout(() => {
        setActiveReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
      }, 2500);
    };

    socket.on('chat:reaction', handleReactionReceived);
    return () => {
      socket.off('chat:reaction', handleReactionReceived);
    };
  }, [socket, streamId]);

  const sendReaction = (emoji: string) => {
    if (!socket) return;
    socket.emit('chat:reaction', { streamId, emoji });
  };

  return (
    <div className="relative">
      {/* Floating particles container */}
      <div className="absolute bottom-16 right-4 w-48 h-80 pointer-events-none overflow-hidden z-40">
        {activeReactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-0 text-3xl animate-float-up opacity-90 transition-all select-none"
            style={{
              left: `${r.left}%`,
              animation: 'floatUp 2.4s ease-out forwards',
            }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Emoji trigger bar */}
      <div className="flex items-center justify-around bg-stone-900/90 border border-stone-800 rounded-full px-3 py-1.5 backdrop-blur-md shadow-lg">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => sendReaction(emoji)}
            className="text-xl sm:text-2xl hover:scale-130 active:scale-95 transition-transform p-1 select-none"
            title={`Offer ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      <style jsx global>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0.6);
            opacity: 1;
          }
          70% {
            opacity: 0.9;
          }
          100% {
            transform: translateY(-240px) scale(1.3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
