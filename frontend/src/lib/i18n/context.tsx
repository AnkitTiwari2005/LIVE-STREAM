'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { attachDomTranslator } from './dom-translator';

export type Lang = 'en' | 'hi';

const STORAGE_KEY = 'sd-lang';

interface LangContextValue {
  lang: Lang;
  setLang: (next: Lang) => void;
  toggleLang: () => void;
}

const LangContext = createContext<LangContextValue>({
  lang: 'en',
  setLang: () => {},
  toggleLang: () => {},
});

function readStoredLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'hi' ? 'hi' : 'en';
  } catch {
    return 'en';
  }
}

/**
 * Site language. The server-rendered HTML is always English, so the first client render is English too
 * (no hydration mismatch); the stored choice is applied right after hydration.
 * While the language is English nothing in the page is touched.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    setLangState(readStoredLang());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setLangState(e.newValue === 'hi' ? 'hi' : 'en');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
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
    } catch {
      /* private mode: the choice just lasts for this visit */
    }
  }, []);

  const toggleLang = useCallback(() => setLang(lang === 'hi' ? 'en' : 'hi'), [lang, setLang]);

  const value = useMemo(() => ({ lang, setLang, toggleLang }), [lang, setLang, toggleLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  return useContext(LangContext);
}
