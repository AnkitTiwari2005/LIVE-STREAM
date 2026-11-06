'use client';

import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import {
  DiyaIcon,
  LotusIcon,
  PranamIcon,
  BellIcon,
  OmIcon,
  ConchIcon,
} from '@/components/icons/SpiritualIcons';

interface ReactionItem {
  id: string;
  type: string;
  left: number;
}

interface SpiritualReactionsProps {
  socket: Socket | null;
  streamId: string;
}

const REACTION_TYPES = [
  { id: 'diya', name: 'Arpan Diya', Component: DiyaIcon },
  { id: 'lotus', name: 'Offer Pushpa', Component: LotusIcon },
  { id: 'pranam', name: 'Sacred Pranam', Component: PranamIcon },
  { id: 'bell', name: 'Ring Ghanti', Component: BellIcon },
  { id: 'om', name: 'Aum Chant', Component: OmIcon },
  { id: 'conch', name: 'Blow Shankha', Component: ConchIcon },
];

function renderReactionIcon(type: string, size = 32) {
  switch (type) {
    case 'diya':
    case '🪔':
      return <DiyaIcon size={size} />;
    case 'lotus':
    case '🌸':
    case '🌺':
      return <LotusIcon size={size} />;
    case 'pranam':
    case '🙏':
      return <PranamIcon size={size} />;
    case 'bell':
    case '🔔':
      return <BellIcon size={size} />;
    case 'om':
    case '🕉️':
      return <OmIcon size={size} />;
    case 'conch':
    case '🐚':
      return <ConchIcon size={size} />;
    default:
      return <DiyaIcon size={size} />;
  }
}

export function SpiritualReactions({ socket, streamId }: SpiritualReactionsProps) {
  const [activeReactions, setActiveReactions] = useState<ReactionItem[]>([]);

  const triggerReactionAnimation = (type: string) => {
    const newReaction: ReactionItem = {
      id: `${Date.now()}_${Math.random()}`,
      type,
      left: 15 + Math.random() * 70, // random horizontal offset 15% to 85%
    };

    setActiveReactions((prev) => [...prev.slice(-25), newReaction]);

    setTimeout(() => {
      setActiveReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2400);
  };

  useEffect(() => {
    if (!socket || !streamId) return;

    const handleReactionReceived = (data: { streamId: string; emoji: string }) => {
      if (data.streamId !== streamId) return;
      triggerReactionAnimation(data.emoji);
    };

    socket.on('chat:reaction', handleReactionReceived);
    return () => {
      socket.off('chat:reaction', handleReactionReceived);
    };
  }, [socket, streamId]);

  const sendReaction = (type: string) => {
    // 1. Instant local optimistic feedback for user
    triggerReactionAnimation(type);

    // 2. Broadcast via socket to all other room attendees
    if (socket && streamId) {
      socket.emit('chat:reaction', { streamId, emoji: type });
    }
  };

  return (
    <div className="relative">
      {/* Floating particles container */}
      <div className="absolute bottom-16 right-0 w-64 h-80 pointer-events-none overflow-hidden z-40">
        {activeReactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-0 select-none filter drop-shadow-[0_4px_12px_rgba(234,88,12,0.6)]"
            style={{
              left: `${r.left}%`,
              animation: 'floatUpSway 2.4s ease-out forwards',
            }}
          >
            {renderReactionIcon(r.type, 38)}
          </div>
        ))}
      </div>

      {/* Pure SVG Spiritual Reaction Trigger Bar */}
      <div className="flex items-center gap-1 sm:gap-2 bg-stone-900/90 border border-stone-800 rounded-full px-3 py-1.5 backdrop-blur-md shadow-2xl">
        {REACTION_TYPES.map(({ id, name, Component }) => (
          <button
            key={id}
            type="button"
            onClick={() => sendReaction(id)}
            className="hover:scale-125 active:scale-95 transition-transform p-1.5 rounded-full hover:bg-stone-800/80 group"
            title={name}
          >
            <Component size={22} className="group-hover:brightness-110" />
          </button>
        ))}
      </div>

      <style jsx global>{`
        @keyframes floatUpSway {
          0% {
            transform: translateY(0) scale(0.6) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: translateY(-120px) scale(1.1) rotate(8deg);
            opacity: 0.95;
          }
          100% {
            transform: translateY(-240px) scale(0.9) rotate(-8deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
