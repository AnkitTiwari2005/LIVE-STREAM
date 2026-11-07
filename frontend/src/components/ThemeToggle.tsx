'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('sd-theme') as 'dark' | 'light';
      if (saved === 'light' || saved === 'dark') {
        setTheme(saved);
        document.documentElement.setAttribute('data-theme', saved);
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('sd-theme', next);
    } catch {}
  };

  if (!mounted) {
    return (
      <div className={`w-9 h-9 rounded-full border border-gold/20 flex items-center justify-center opacity-0 ${className}`} />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-gold/30 bg-obsidian-soft/80 hover:bg-gold/15 text-gold-pale hover:text-gold transition-all duration-300 shadow-sm ${className}`}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-gold transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-stone-800 transition-transform" />
      )}
    </button>
  );
}
