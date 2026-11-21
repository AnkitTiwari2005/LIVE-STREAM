'use client';

import React from 'react';
import { useLang } from '@/lib/i18n/context';

interface LanguageToggleProps {
  className?: string;
  /** Wide variant for the mobile menu: shows both choices as a segmented control. */
  variant?: 'icon' | 'segmented';
}

/** English / Hindi switch for the whole site. The label shows the language you will switch TO. */
export function LanguageToggle({ className = '', variant = 'icon' }: LanguageToggleProps) {
  const { lang, setLang, toggleLang } = useLang();

  if (variant === 'segmented') {
    const seg = (code: 'en' | 'hi', label: string, aria: string) => (
      <button
        type="button"
        onClick={() => setLang(code)}
        aria-pressed={lang === code}
        aria-label={aria}
        lang={code}
        data-no-translate
        className={`flex-1 px-3 py-1.5 text-xs font-bold transition ${
          lang === code
            ? 'bg-amber-600 dark:bg-gold text-white dark:text-obsidian'
            : 'bg-transparent text-stone-700 dark:text-stone-300 hover:bg-amber-50 dark:hover:bg-gold/10'
        }`}
      >
        {label}
      </button>
    );
    return (
      <div
        role="group"
        aria-label="Language / भाषा"
        data-no-translate
        className={`inline-flex overflow-hidden rounded-full border border-amber-300 dark:border-gold/40 ${className}`}
      >
        {seg('en', 'English', 'English')}
        {seg('hi', 'हिन्दी', 'हिन्दी')}
      </div>
    );
  }

  const toHindi = lang === 'en';
  return (
    <button
      type="button"
      onClick={toggleLang}
      data-no-translate
      lang={toHindi ? 'hi' : 'en'}
      aria-label={toHindi ? 'हिन्दी में देखें (Switch to Hindi)' : 'Switch to English (अंग्रेज़ी)'}
      title={toHindi ? 'हिन्दी में देखें' : 'Switch to English'}
      className={`flex items-center justify-center rounded-full border border-stone-200 dark:border-gold/25 bg-white dark:bg-obsidian-soft hover:bg-stone-50 dark:hover:bg-gold/10 text-amber-800 dark:text-gold-pale text-[11px] font-bold leading-none transition shadow-sm shrink-0 ${className}`}
    >
      {toHindi ? 'हिं' : 'EN'}
    </button>
  );
}
