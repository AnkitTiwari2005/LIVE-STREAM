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
      className="relative z-50 flex items-center justify-between sm:justify-center gap-2 sm:gap-4 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm !text-white shadow-md border-b border-amber-600/30 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 dark:from-[#2a0707] dark:via-[#5b1210] dark:to-[#7c2d12] pr-8 sm:pr-10"
    >
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 sm:flex-initial">
        <DiyaIcon size={16} className="animate-pulse !text-amber-200 shrink-0" />
        <span className="font-extrabold !text-amber-100 drop-shadow-sm shrink-0 text-[11px] sm:text-xs">Deepotsav:</span>
        <span className="!text-white hidden sm:inline font-medium drop-shadow-sm truncate">
          Join the Grand Deepotsav Mahotsav &amp; Live Ganga Aarti from Bharat&apos;s sacred ghats
        </span>
        <span className="!text-white sm:hidden font-medium drop-shadow-sm truncate text-[11px]">
          Live Aarti from sacred ghats
        </span>
      </div>

      <Link
        href="/#live-section"
        className="inline-flex items-center h-6 sm:h-7 px-2.5 sm:px-3.5 rounded-full bg-amber-100 hover:bg-white text-stone-950 font-extrabold text-[10px] sm:text-xs transition-transform hover:scale-105 shadow-sm shrink-0 whitespace-nowrap ml-1"
      >
        <span className="hidden sm:inline">Watch Live Aarti</span>
        <span className="sm:hidden">Watch Aarti</span>
      </Link>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
        className="absolute right-2 sm:right-3.5 top-1/2 -translate-y-1/2 p-1 !text-white/80 hover:!text-white hover:bg-white/20 rounded-full transition-colors"
      >
        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>
    </div>
  );
}
