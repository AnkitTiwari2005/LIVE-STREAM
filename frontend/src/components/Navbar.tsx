'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Video, ShieldCheck, User, LogOut, Sparkles, Menu, X } from 'lucide-react';

export function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check session
    const storedUser = localStorage.getItem('pooja_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('pooja_user');
    localStorage.removeItem('pooja_token');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-50 bg-stone-950/90 backdrop-blur-md border-b border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-white hover:opacity-90">
          <span className="text-2xl">🕉️</span>
          <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
            Shubhdarshan
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-300">
          <Link href="/" className="hover:text-orange-400 transition-colors">
            Live Darshan
          </Link>
          <Link href="/#upcoming" className="hover:text-orange-400 transition-colors">
            Schedule
          </Link>
          {user?.role === 'STREAMER' && (
            <Link
              href="/studio/create"
              className="flex items-center gap-1.5 text-orange-400 font-semibold hover:text-orange-300"
            >
              <Video className="w-4 h-4" /> Go Live
            </Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 text-amber-400 font-semibold hover:text-amber-300"
            >
              <ShieldCheck className="w-4 h-4" /> Admin Console
            </Link>
          )}
          {user?.role === 'VIEWER' && (
            <Link
              href="/streamer/apply"
              className="flex items-center gap-1.5 text-stone-400 hover:text-white"
            >
              <Sparkles className="w-4 h-4 text-orange-400" /> Apply as Streamer
            </Link>
          )}
        </nav>

        {/* User Account Controls */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-stone-200">
                🙏 {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-stone-400 hover:text-red-400 hover:bg-stone-900 transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-stone-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-lg shadow-md transition-all"
              >
                Join Free
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu toggle button */}
        <div className="flex md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-stone-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-stone-900 border-b border-stone-800 px-4 pt-3 pb-5 space-y-3">
          <Link href="/" className="block py-2 text-stone-200 font-medium">
            Live Darshan
          </Link>
          <Link href="/#upcoming" className="block py-2 text-stone-200 font-medium">
            Schedule
          </Link>
          {user?.role === 'STREAMER' && (
            <Link href="/studio/create" className="block py-2 text-orange-400 font-semibold">
              🎥 Pandit Studio (Go Live)
            </Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link href="/admin" className="block py-2 text-amber-400 font-semibold">
              🛡️ Admin Console
            </Link>
          )}
          {user?.role === 'VIEWER' && (
            <Link href="/streamer/apply" className="block py-2 text-stone-300">
              ✨ Apply as Pandit / Astrologer
            </Link>
          )}
          <div className="pt-3 border-t border-stone-800">
            {user ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-300">Signed in as {user.name}</span>
                <button onClick={handleLogout} className="text-sm text-red-400 font-medium">
                  Log Out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" className="flex-1 text-center py-2 bg-stone-800 rounded-lg text-sm text-white">
                  Sign In
                </Link>
                <Link href="/register" className="flex-1 text-center py-2 bg-orange-600 rounded-lg text-sm text-white font-medium">
                  Join Free
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
