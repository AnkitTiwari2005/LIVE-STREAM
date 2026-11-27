'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { attachDomTranslator } from './dom-translator';

export type Lang = 'en' | 'hi';

const STORAGE_KEY = 'sd-lang';

export function bi<T = string>(lang: Lang, en: T, hi: T): T {
  return lang === 'hi' ? hi : en;
}

interface LangContextValue {
  lang: Lang;
  setLang: (next: Lang) => void;
  toggleLang: () => void;
  t: <T = string>(en: T, hi: T) => T;
}

const LangContext = createContext<LangContextValue>({
  lang: 'en',
  setLang: () => {},
  toggleLang: () => {},
  t: <T,>(en: T) => en,
});

function readPreferredLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'hi' || stored === 'en') return stored;
    const rawUser = localStorage.getItem('pooja_user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.preferredLanguage === 'hi') return 'hi';
    }
    return 'en';
  } catch {
    return 'en';
  }
}

/**
 * Site language. The server-rendered HTML is always English, so the first client render is English too
 * (no hydration mismatch); the stored or profile choice is applied right after hydration.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    setLangState(readPreferredLang());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setLangState(e.newValue === 'hi' ? 'hi' : 'en');
    };
    const onAuthChange = () => {
      setLangState(readPreferredLang());
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('sd-auth-change', onAuthChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('sd-auth-change', onAuthChange);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    if (lang !== 'hi') return;
    return attachDomTranslator(document.body);
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      const rawUser = localStorage.getItem('pooja_user');
      if (rawUser) {
        try {
          const parsed = JSON.parse(rawUser);
          parsed.preferredLanguage = next;
          localStorage.setItem('pooja_user', JSON.stringify(parsed));
        } catch {}
      }
      const token = localStorage.getItem('pooja_token');
      if (token) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
        fetch(`${apiUrl}/auth/profile`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ preferredLanguage: next }),
        }).catch(() => {});
      }
    } catch {
      /* private mode: the choice just lasts for this visit */
    }
  }, []);

  const toggleLang = useCallback(() => setLang(lang === 'hi' ? 'en' : 'hi'), [lang, setLang]);
  const t = useCallback(<T = string,>(en: T, hi: T): T => (lang === 'hi' ? hi : en), [lang]);

  const value = useMemo(() => ({ lang, setLang, toggleLang, t }), [lang, setLang, toggleLang, t]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  return useContext(LangContext);
}
