'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('shubhdarshan_theme');
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
      document.documentElement.setAttribute('data-theme', stored);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      setTheme('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('shubhdarshan_theme', nextTheme);
  };

  if (!mounted) {
    return (
      <div className={`h-9 w-9 rounded-full border border-gold/20 bg-obsidian-soft/60 ${className}`} />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative h-9 w-9 rounded-full border border-gold/30 bg-obsidian-soft/80 hover:bg-stone-900 flex items-center justify-center text-gold-pale hover:text-gold transition-all shadow-sm ${className}`}
      title={theme === 'dark' ? 'Switch to Surya Day Mode' : 'Switch to Sacred Night Mode'}
      aria-label="Toggle theme mode"
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-gold hover:rotate-45 transition-transform duration-300" />
      ) : (
        <Moon className="w-4 h-4 text-amber-600 hover:-rotate-12 transition-transform duration-300" />
      )}
    </button>
  );
}
