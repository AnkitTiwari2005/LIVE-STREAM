'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { DiyaIcon } from '@/components/icons/SpiritualIcons';

export function FestivalBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('sd-fest-v1');
      if (dismissed !== 'x') {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem('sd-fest-v1', 'x');
    } catch {}
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Festival announcement"
      className="relative z-50 flex items-center justify-center gap-3 sm:gap-4 flex-wrap px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white shadow-md border-b border-gold/25"
      style={{
        background:
          'radial-gradient(600px 160px at 50% 120%, rgba(245,179,1,0.28) 0%, rgba(245,179,1,0) 70%), linear-gradient(135deg, #2a0707 0%, #5b1210 55%, #7c2d12 100%)',
      }}
    >
      <div className="flex items-center gap-2">
        <DiyaIcon size={16} className="animate-pulse" />
        <span className="font-bold text-amber-200">Deepotsav Special:</span>
        <span className="text-stone-200 hidden sm:inline">
          Join the Grand Deepotsav Mahotsav &amp; Live Ganga Aarti from Bharat&apos;s sacred ghats
        </span>
        <span className="text-stone-200 sm:hidden">
          Live Aarti from sacred ghats
        </span>
      </div>

      <Link
        href="/#live-section"
        className="inline-flex items-center h-6 sm:h-7 px-3 sm:px-3.5 rounded-full bg-gold hover:bg-gold-deep text-obsidian font-extrabold text-[11px] sm:text-xs transition-transform hover:scale-105 shadow-sm"
      >
        Watch Live Aarti
      </Link>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-1 text-amber-200/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
