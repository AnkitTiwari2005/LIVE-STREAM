'use client';

import React from 'react';
import { Sparkles, Award } from 'lucide-react';

interface SpecialPanditBadgeProps {
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
  subtle?: boolean;
}

export function SpecialPanditBadge({
  title = 'आचार्य रत्न',
  size = 'md',
  showIcon = true,
  className = '',
  subtle = false,
}: SpecialPanditBadgeProps) {
  const sizeStyles = {
    sm: {
      wrap: 'px-2 py-0.5 text-[10px] gap-1',
      icon: 'w-3 h-3',
      crown: 'w-2.5 h-2.5',
    },
    md: {
      wrap: 'px-3 py-1 text-xs gap-1.5',
      icon: 'w-3.5 h-3.5',
      crown: 'w-3 h-3',
    },
    lg: {
      wrap: 'px-4 py-1.5 text-sm gap-2',
      icon: 'w-4 h-4',
      crown: 'w-3.5 h-3.5',
    },
  }[size];

  return (
    <div
      title="परम दर्शन विशेष आचार्य सम्मान • सर्वोच्च वैदिक शास्त्र एवं सेवा मर्यादा"
      className={`inline-flex items-center rounded-full font-bold select-none transition-all duration-300 relative group overflow-hidden ${
        subtle
          ? 'bg-amber-950/40 text-amber-300 border border-amber-500/30'
          : 'bg-gradient-to-r from-amber-900/60 via-amber-800/40 to-yellow-950/60 text-amber-100 border border-amber-400/60 shadow-[0_0_16px_rgba(245,158,11,0.3)] hover:shadow-[0_0_22px_rgba(245,158,11,0.45)] hover:border-amber-300'
      } ${sizeStyles.wrap} ${className}`}
    >
      {/* Subtle divine golden sheen overlay */}
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />

      {/* Ornate Sun / Ratna Icon */}
      {showIcon && (
        <span className="relative flex items-center justify-center text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]">
          <svg
            className={sizeStyles.crown}
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* 8-point auspicious Vedic star / ratna */}
            <path d="M12 2L14.2 8.3L20.5 6.1L16.3 11.2L22 14.5L15.6 16.2L16.9 22.6L12 18.2L7.1 22.6L8.4 16.2L2 14.5L7.7 11.2L3.5 6.1L9.8 8.3L12 2Z" />
          </svg>
        </span>
      )}

      {/* Badge Honorific Text */}
      <span className="font-serif tracking-wide bg-gradient-to-r from-amber-100 via-amber-200 to-yellow-200 bg-clip-text text-transparent drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] font-semibold">
        {title}
      </span>

      {/* Trailing sparkle icon */}
      <Sparkles className={`${sizeStyles.icon} text-amber-400 animate-pulse shrink-0`} />
    </div>
  );
}

export default SpecialPanditBadge;
