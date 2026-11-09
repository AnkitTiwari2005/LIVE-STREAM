'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { DiyaIcon } from '@/components/icons/SpiritualIcons';

export interface BannerConfig {
  enabled: boolean;
  occasion?: string;
  message?: string;
  mobileMessage?: string;
  ctaText?: string;
  ctaLink?: string;
  gradient?: string;
  updatedAt?: string;
}

export function FestivalBanner() {
  const [banner, setBanner] = useState<BannerConfig | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchBanner = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
        const res = await fetch(`${apiUrl}/admin/banner`);
        if (!res.ok) {
          if (isMounted) setBanner(null);
          return;
        }

        const data: BannerConfig = await res.json();
        if (!isMounted) return;

        if (data && data.enabled) {
          // Bug #7 fix: namespace dismiss key with userId so each account gets its own dismiss state
          const userId = (() => { try { return JSON.parse(localStorage.getItem('pooja_user') || '{}')?.id || 'guest'; } catch { return 'guest'; } })();
          const dismissKey = `sd-fest-${data.updatedAt || data.occasion || 'active'}_${userId}`;
          try {
            if (localStorage.getItem(dismissKey) === 'x') {
              setDismissed(true);
            }
          } catch {}
          setBanner(data);
        } else {
          setBanner(null);
        }
      } catch {
        if (isMounted) setBanner(null);
      }
    };

    fetchBanner();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    if (banner) {
      // Bug #7 fix: same user-scoped key for writing as for reading
      const userId = (() => { try { return JSON.parse(localStorage.getItem('pooja_user') || '{}')?.id || 'guest'; } catch { return 'guest'; } })();
      const dismissKey = `sd-fest-${banner.updatedAt || banner.occasion || 'active'}_${userId}`;
      try {
        localStorage.setItem(dismissKey, 'x');
      } catch {}
    }
  };

  // If banner is disabled, not loaded, or dismissed, render nothing
  if (!banner || !banner.enabled || dismissed) {
    return null;
  }

  const gradientClass =
    banner.gradient === 'kashi-gold'
      ? 'bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-800 dark:from-[#241a0e] dark:via-[#422006] dark:to-[#1c130a]'
      : banner.gradient === 'vedic-saffron'
      ? 'bg-gradient-to-r from-red-700 via-rose-600 to-amber-700 dark:from-[#360909] dark:via-[#5c1111] dark:to-[#381207]'
      : 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 dark:from-[#2a0707] dark:via-[#5b1210] dark:to-[#7c2d12]';

  const occasion = banner.occasion || 'Special Occasion';
  const fullMessage = banner.message || 'Join sacred rituals and live poojas with verified Vedic Pandits';
  const shortMessage = banner.mobileMessage || fullMessage;
  const ctaText = banner.ctaText || 'Watch Live';
  const ctaLink = banner.ctaLink || '/#live-section';

  return (
    <div
      role="region"
      aria-label="Festival announcement"
      className={`relative z-50 flex items-center justify-between sm:justify-center gap-2 sm:gap-4 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm !text-white shadow-md border-b border-amber-600/30 ${gradientClass} pr-8 sm:pr-10 animate-in fade-in duration-200 w-full max-w-full overflow-hidden`}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 sm:flex-initial">
        <DiyaIcon size={16} className="animate-pulse !text-amber-200 shrink-0" />
        <span className="font-extrabold !text-amber-100 drop-shadow-sm shrink-0 text-[11px] sm:text-xs">
          {occasion}:
        </span>
        <span className="!text-white hidden sm:inline font-medium drop-shadow-sm truncate">
          {fullMessage}
        </span>
        <span className="!text-white sm:hidden font-medium drop-shadow-sm truncate text-[11px]">
          {shortMessage}
        </span>
      </div>

      <Link
        href={ctaLink}
        className="fest-banner-cta inline-flex items-center h-6 sm:h-7 px-2.5 sm:px-3.5 rounded-full bg-amber-100 hover:bg-white font-extrabold text-[10px] sm:text-xs transition-transform hover:scale-105 shadow-sm shrink-0 whitespace-nowrap ml-1"
        style={{ color: '#0c0a09' }}
      >
        <span className="font-extrabold" style={{ color: '#0c0a09' }}>{ctaText}</span>
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
