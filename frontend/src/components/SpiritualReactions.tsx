'use client';

import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface ReactionItem {
  id: string;
  emoji: string;
  left: number;
}

export const SACRED_EMOJIS = [
  { emoji: '🙏', name: 'Pranam Vandana' },
  { emoji: '🪔', name: 'Aarti Diya' },
  { emoji: '🌸', name: 'Pushpa Arpan' },
  { emoji: '🔔', name: 'Maha Ghanti' },
  { emoji: '🕉️', name: 'Om Dhwani' },
  { emoji: '🥥', name: 'Shriphal Prasad' },
  { emoji: '❤️', name: 'Bhakti Prem' },
  { emoji: '✨', name: 'Divya Kripa' },
];

export function mapToEmoji(typeOrEmoji: string): string {
  switch (typeOrEmoji) {
    case 'diya':
    case '🪔':
      return '🪔';
    case 'lotus':
    case '🌸':
    case '🌺':
      return '🌸';
    case 'pranam':
    case '🙏':
      return '🙏';
    case 'bell':
    case '🔔':
      return '🔔';
    case 'om':
    case '🕉️':
      return '🕉️';
    case 'conch':
    case '🐚':
      return '🥥';
    case 'heart':
    case '❤️':
      return '❤️';
    case 'sparkles':
    case '✨':
      return '✨';
    default:
      return typeOrEmoji.length <= 4 ? typeOrEmoji : '🪔';
  }
}

// 1. Floating Reactions Overlay (Placed inside the video container, 100% non-interactive, zero obstruction)
export function FloatingReactionsOverlay({ socket, streamId }: { socket: Socket | null; streamId: string }) {
  const [activeReactions, setActiveReactions] = useState<ReactionItem[]>([]);

  const triggerReactionAnimation = (typeOrEmoji: string) => {
    const emoji = mapToEmoji(typeOrEmoji);
    const newReaction: ReactionItem = {
      id: `${Date.now()}_${Math.random()}`,
      emoji,
      left: 70 + Math.random() * 22, // Floating up the right side (70% - 92%) so video center is completely open!
    };

    setActiveReactions((prev) => [...prev.slice(-25), newReaction]);

    setTimeout(() => {
      setActiveReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2400);
  };

  useEffect(() => {
    const handleLocal = (e: any) => {
      if (e.detail?.emoji) {
        triggerReactionAnimation(e.detail.emoji);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('shubh:local_reaction', handleLocal);
    }

    if (!socket || !streamId) {
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('shubh:local_reaction', handleLocal);
        }
      };
    }

    const handleReactionReceived = (data: { streamId: string; emoji: string }) => {
      if (data.streamId !== streamId) return;
      triggerReactionAnimation(data.emoji);
    };

    socket.on('chat:reaction', handleReactionReceived);
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('shubh:local_reaction', handleLocal);
      }
      socket.off('chat:reaction', handleReactionReceived);
    };
  }, [socket, streamId]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      {activeReactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-4 select-none text-2xl sm:text-3xl filter drop-shadow-[0_4px_12px_rgba(245,158,11,0.6)]"
          style={{
            left: `${r.left}%`,
            animation: 'floatUpSway 2.4s ease-out forwards',
          }}
        >
          {r.emoji}
        </div>
      ))}

      <style jsx global>{`
        @keyframes floatUpSway {
          0% {
            transform: translateY(0) scale(0.6) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: translateY(-120px) scale(1.2) rotate(10deg);
            opacity: 0.95;
          }
          100% {
            transform: translateY(-260px) scale(0.85) rotate(-10deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

// 2. Devotional Emoji Bar (Placed BELOW the video player, in the devotee interaction card)
export function DevotionalEmojiBar({
  socket,
  streamId,
  onReact,
}: {
  socket: Socket | null;
  streamId: string;
  onReact?: (emoji: string) => void;
}) {
  const sendReaction = (emoji: string) => {
    // 1. Trigger local optimistic animation immediately!
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shubh:local_reaction', { detail: { emoji } }));
    }
    if (onReact) onReact(emoji);
    if (socket && streamId) {
      socket.emit('chat:reaction', { streamId, emoji });
    }
  };

  return (
    <div className="flex items-center justify-between gap-1 sm:gap-2 bg-obsidian-deep/80 border border-gold/20 rounded-2xl px-3 py-2 shadow-lg backdrop-blur-md">
      <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider text-gold-soft mr-1">
        Bhav Arpan:
      </span>
      <div className="flex items-center justify-between flex-1 gap-1">
        {SACRED_EMOJIS.map(({ emoji, name }) => (
          <button
            key={emoji}
            type="button"
            onClick={() => sendReaction(emoji)}
            className="flex-1 flex items-center justify-center text-xl sm:text-2xl p-1.5 rounded-xl hover:bg-gold/15 active:scale-130 transition transform hover:scale-115"
            title={name}
            aria-label={name}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// Backwards compatibility export
export function SpiritualReactions(props: { socket: Socket | null; streamId: string }) {
  return (
    <>
      <FloatingReactionsOverlay {...props} />
      <DevotionalEmojiBar {...props} />
    </>
  );
}
