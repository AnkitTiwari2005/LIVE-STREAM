'use client';

import React, { useState, useEffect } from 'react';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sd-theme');
      if (stored === 'light' || stored === 'dark') {
        setTheme(stored);
        document.documentElement.setAttribute('data-theme', stored);
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        setTheme('light');
      }
    } catch {
      setTheme('light');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      localStorage.setItem('sd-theme', nextTheme);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`sd-theme shrink-0 ${className}`}
      aria-label={theme === 'dark' ? 'Switch to Surya Day Mode' : 'Switch to Sacred Night Mode'}
      title={theme === 'dark' ? 'Switch to Surya Day Mode' : 'Switch to Sacred Night Mode'}
    >
      <svg
        className="moon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" />
      </svg>
      <svg
        className="sun"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
