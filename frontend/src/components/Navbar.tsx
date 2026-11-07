'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Video,
  ShieldCheck,
  LogOut,
  Sparkles,
  Menu,
  X,
  PlusCircle,
  HelpCircle,
  Flame,
  Users,
  Calendar,
  ChevronDown,
  User,
  Search,
} from 'lucide-react';
import { CoinTopupModal } from './CoinTopupModal';
import { SearchPalette } from './SearchPalette';
import { ThemeToggle } from './ThemeToggle';
import { OmIcon, CoinIcon, PranamIcon } from '@/components/icons/SpiritualIcons';

export function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userDropdownOpen]);

  useEffect(() => {
    // Check session
    const storedUser = localStorage.getItem('pooja_user');
    const storedToken = localStorage.getItem('pooja_token');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        if (parsed.wallet?.balanceCoins !== undefined) {
          setCoinBalance(parsed.wallet.balanceCoins);
        }
      } catch {}
    }

    if (storedToken) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

      // Validate session with /auth/me to eliminate ghost logins if token expired
      fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => {
          if (res.status === 401) {
            localStorage.removeItem('pooja_user');
            localStorage.removeItem('pooja_token');
            setUser(null);
            setCoinBalance(null);
            return null;
          }
          return res.ok ? res.json() : null;
        })
        .then((freshUser) => {
          if (freshUser) {
            setUser(freshUser);
            localStorage.setItem('pooja_user', JSON.stringify(freshUser));
          }
        })
        .catch(() => {});

      // Fetch live wallet balance from backend
      fetch(`${apiUrl}/wallet/balance`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && typeof data.balanceCoins === 'number') {
            setCoinBalance(data.balanceCoins);
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleLogout = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      await fetch(`${apiUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {}
    localStorage.removeItem('pooja_user');
    localStorage.removeItem('pooja_token');
    setUser(null);
    setCoinBalance(null);
    window.location.href = '/';
  };

  return (
    <>
      <header className="sticky top-0 z-50 glass-strong border-b border-gold/15 py-3 shadow-[0_8px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4">
          {/* 1. Sacred Brand Logo with Diya & Sanskrit Typography */}
          <Link href="/" className="group flex items-center gap-3 shrink-0">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-gradient-to-b from-[#2a1e12] to-obsidian shadow-[0_0_18px_rgba(245,158,11,0.25)] transition group-hover:border-gold/70">
              <Flame className="h-5 w-5 text-gold animate-flame" />
              <span className="absolute inset-0 rounded-full bg-gold/15 blur-md transition group-hover:bg-gold/30" />
            </span>
            <span className="leading-tight">
              <span className="block font-serif text-xl sm:text-2xl font-bold tracking-wide text-gold-pale group-hover:text-gold transition">
                Shubhdarshan
              </span>
              <span className="block text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.28em] text-gold-soft/80">
                Sacred Darshan Network
              </span>
            </span>
          </Link>

          {/* 2. Center Navigation Links (Clean, Balanced & Single Line) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs xl:text-sm font-semibold tracking-wide text-stone-300">
            <Link
              href="/"
              className="whitespace-nowrap shrink-0 rounded-full px-2.5 xl:px-3 py-1.5 transition text-gold-pale hover:text-white flex items-center gap-1.5 hover:bg-gold/10"
            >
              <span>Live Darshan</span>
              <span className="live-dot shrink-0" />
            </Link>
            <Link
              href="/#upcoming"
              className="whitespace-nowrap shrink-0 rounded-full px-2 xl:px-3 py-1.5 transition hover:text-gold-pale hover:bg-gold/5"
            >
              Schedule
            </Link>
            <Link
              href="/#pandits"
              className="whitespace-nowrap shrink-0 rounded-full px-2 xl:px-3 py-1.5 transition hover:text-gold-pale hover:bg-gold/5"
            >
              Verified Pandits
            </Link>
            <Link
              href="/about"
              className="whitespace-nowrap shrink-0 rounded-full px-2 xl:px-3 py-1.5 transition hover:text-gold-pale hover:bg-gold/5"
            >
              About
            </Link>
            <Link
              href="/faq"
              className="whitespace-nowrap shrink-0 rounded-full px-2 xl:px-3 py-1.5 transition hover:text-gold-pale hover:bg-gold/5 flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5 text-gold-soft/80 shrink-0" />
              <span>FAQ</span>
            </Link>
          </nav>

          {/* 3. User Controls & Role Actions (Never Crowded, Never Escaping Screen) */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-2.5 shrink-0">
            {/* Search Palette Trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-1.5 h-9 px-2.5 xl:px-3 rounded-full border border-gold/25 bg-obsidian-soft/70 hover:bg-stone-900 text-stone-400 hover:text-stone-200 text-xs font-medium transition shadow-sm"
              aria-label="Search pooja and aarti"
            >
              <Search className="w-3.5 h-3.5 text-gold-soft shrink-0" />
              <span className="hidden 2xl:inline">Search...</span>
              <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-stone-800 text-stone-400 border border-stone-700 font-mono">/</kbd>
            </button>

            {/* Theme Toggle Button (Surya Day / Sacred Night) */}
            <ThemeToggle />

            {/* Quick Broadcaster Studio (Streamers only) */}
            {user?.role === 'STREAMER' && (
              <Link
                href="/studio/create"
                className="whitespace-nowrap shrink-0 flex items-center gap-1.5 rounded-full bg-gold/15 hover:bg-gold/25 border border-gold/30 px-3 py-1.5 text-xs font-bold text-gold-pale transition shadow-sm"
                title="Open Studio"
              >
                <Video className="w-3.5 h-3.5 text-gold shrink-0" />
                <span>Studio</span>
              </Link>
            )}

            {/* Quick Admin Console (Admin only) */}
            {user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="whitespace-nowrap shrink-0 flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-950/60 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-900/60 transition shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Admin</span>
              </Link>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                {/* Gold Coin Wallet Pill */}
                <button
                  onClick={() => setTopupModalOpen(true)}
                  className="whitespace-nowrap shrink-0 group flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-bold text-gold-pale transition hover:border-gold/60 hover:bg-gold/20 shadow-sm"
                  title="Your Sacred Coins (Click to Recharge)"
                >
                  <CoinIcon size={14} className="text-gold shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="font-extrabold text-gold">{coinBalance !== null ? coinBalance : 100}</span>
                  <span className="text-[10px] text-stone-300 font-medium">Coins</span>
                  <PlusCircle className="w-3.5 h-3.5 text-gold shrink-0 group-hover:text-gold-soft" />
                </button>

                {/* Devotee / Pandit Profile with Solid High-Contrast Dropdown */}
                <div className="relative shrink-0" ref={dropdownRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="whitespace-nowrap shrink-0 flex items-center gap-1.5 text-xs font-semibold text-stone-200 hover:text-gold-pale transition px-3 py-1.5 rounded-full bg-obsidian-soft border border-gold/20 hover:border-gold/40 max-w-[140px]"
                    title="Devotee & Broadcaster Menu"
                  >
                    <PranamIcon size={14} className="text-gold shrink-0" />
                    <span className="truncate">{user.name?.split(' ')[0] || user.name}</span>
                    <ChevronDown className="w-3 h-3 text-gold-soft shrink-0" />
                  </button>

                  {userDropdownOpen && (
                    <div className="navbar-user-dropdown absolute right-0 top-full mt-2 w-64 rounded-2xl p-2.5 z-[9999] text-xs">
                      {/* Opaque user info header */}
                      <div className="p-3 rounded-xl bg-[#241a12] border border-gold/25 mb-2 shadow-sm">
                        <div className="font-bold text-white text-sm truncate">{user.name}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-gold font-bold uppercase tracking-wider">{user.role || 'DEVOTEE'}</span>
                          <span className="text-[10px] text-stone-300 font-medium">{coinBalance !== null ? `${coinBalance} Coins` : ''}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {user.role === 'STREAMER' && (
                          <>
                            <Link
                              href="/studio/create"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                            >
                              <Video className="w-4 h-4 text-gold shrink-0" />
                              <span>Broadcaster Studio</span>
                            </Link>
                            <Link
                              href="/streamer/earnings"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                            >
                              <CoinIcon size={16} className="text-gold shrink-0" />
                              <span>Earnings & Dakshina</span>
                            </Link>
                          </>
                        )}
                        {user.role === 'ADMIN' && (
                          <Link
                            href="/admin"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-amber-300 hover:bg-amber-950/40 rounded-xl transition font-medium"
                          >
                            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>Admin Console</span>
                          </Link>
                        )}
                        {user.role === 'VIEWER' && (
                          <Link
                            href="/streamer/apply"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                          >
                            <Sparkles className="w-4 h-4 text-gold shrink-0" />
                            <span>Become a Pandit</span>
                          </Link>
                        )}
                        <Link
                          href="/account"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                        >
                          <User className="w-4 h-4 text-stone-400 shrink-0" />
                          <span>Account Settings</span>
                        </Link>
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-red-400 hover:bg-red-950/40 rounded-xl transition font-medium mt-1.5 pt-2 border-t border-stone-800/80"
                        >
                          <LogOut className="w-4 h-4 text-red-400 shrink-0" />
                          <span>Log Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct Visible Logout Icon Button */}
                <button
                  onClick={handleLogout}
                  className="whitespace-nowrap shrink-0 flex items-center justify-center p-2 rounded-full border border-red-900/40 bg-red-950/30 text-stone-300 hover:text-red-400 hover:bg-red-950/60 hover:border-red-700 transition shadow-sm"
                  title="Log Out from Session"
                  aria-label="Log Out"
                >
                  <LogOut className="w-3.5 h-3.5 text-stone-300 hover:text-red-400 shrink-0" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="whitespace-nowrap shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold text-stone-300 hover:text-gold-pale transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="whitespace-nowrap shrink-0 group inline-flex items-center gap-1.5 rounded-full bg-gold px-3.5 py-1.5 text-xs font-bold text-obsidian shadow-[0_0_24px_rgba(245,158,11,0.25)] transition hover:bg-gold-deep"
                >
                  <span>Join Free</span>
                  <span className="rounded-full bg-obsidian/20 px-1.5 py-0.5 text-[10px] font-extrabold text-obsidian shrink-0">
                    +100 Coins
                  </span>
                </Link>
              </div>
            )}
          </div>

          {/* 4. Mobile Menu & Search Toggle Buttons */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="p-1.5 text-stone-300 hover:text-white rounded-full hover:bg-white/5 transition"
              aria-label="Search pooja and darshan"
            >
              <Search className="w-4 h-4 text-gold-soft" />
            </button>
            <ThemeToggle className="h-8 w-8" />
            {user && (
              <button
                onClick={() => setTopupModalOpen(true)}
                className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-xs font-bold text-gold-pale"
              >
                <CoinIcon size={14} className="text-gold" />
                <span>{coinBalance !== null ? coinBalance : 100}</span>
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-full border border-gold/20 text-gold-pale hover:bg-stone-900 transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Panel */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gold/15 bg-obsidian-deep/95 backdrop-blur-xl px-5 py-6 space-y-4">
            <nav className="flex flex-col space-y-3 text-sm">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between text-stone-200 hover:text-gold-pale font-medium py-1.5 border-b border-stone-800/60"
              >
                <span className="flex items-center gap-2 font-semibold text-white">Live Darshan</span>
                <span className="live-dot" />
              </Link>
              <Link
                href="/#upcoming"
                onClick={() => setMobileMenuOpen(false)}
                className="text-stone-200 hover:text-gold-pale font-medium py-1.5 border-b border-stone-800/60"
              >
                Pooja Schedule
              </Link>
              <Link
                href="/#pandits"
                onClick={() => setMobileMenuOpen(false)}
                className="text-stone-200 hover:text-gold-pale font-medium py-1.5 border-b border-stone-800/60"
              >
                Verified Pandits Directory
              </Link>
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="text-stone-200 hover:text-gold-pale font-medium py-1.5 border-b border-stone-800/60"
              >
                About Our Heritage
              </Link>
              <Link
                href="/faq"
                onClick={() => setMobileMenuOpen(false)}
                className="text-stone-200 hover:text-gold-pale font-medium py-1.5 border-b border-stone-800/60"
              >
                FAQ &amp; Support
              </Link>

              {user?.role === 'STREAMER' && (
                <>
                  <Link
                    href="/studio/create"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-gold font-bold py-1.5 flex items-center gap-2"
                  >
                    <Video className="w-4 h-4" /> Broadcaster Studio
                  </Link>
                  <Link
                    href="/streamer/earnings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-gold-pale font-bold py-1.5 flex items-center gap-2"
                  >
                    <CoinIcon size={16} /> Pandit Earnings &amp; Dakshina
                  </Link>
                </>
              )}

              {user?.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-amber-300 font-bold py-1.5 flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" /> Admin Console
                </Link>
              )}

              {user?.role === 'VIEWER' && (
                <Link
                  href="/streamer/apply"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gold-pale font-medium py-1.5 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-gold" /> Become a Pandit
                </Link>
              )}
            </nav>

            <div className="pt-4 border-t border-stone-800/80">
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-stone-300">
                    <span className="font-semibold text-white">{user.name}</span>
                    <span className="text-gold font-bold">{coinBalance !== null ? coinBalance : 100} Coins</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setTopupModalOpen(true);
                      }}
                      className="px-3 py-2 bg-gold/15 border border-gold/40 text-gold-pale text-xs font-bold rounded-xl text-center"
                    >
                      Top Up Coins
                    </button>
                    <Link
                      href="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3 py-2 bg-obsidian-soft border border-gold/20 text-stone-200 text-xs font-semibold rounded-xl text-center"
                    >
                      Account Settings
                    </Link>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-center text-xs text-red-400 py-2 border border-red-950/40 rounded-xl"
                  >
                    Log Out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-stone-800 text-center text-xs font-bold text-stone-200"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-gold text-obsidian text-center text-xs font-black shadow-lg shadow-gold/20"
                  >
                    Join Free (+100)
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Coin Topup Modal */}
      <CoinTopupModal
        isOpen={topupModalOpen}
        onClose={() => setTopupModalOpen(false)}
        onSuccess={(newBal) => setCoinBalance(newBal)}
      />

      {/* Global Instant Search Command Palette */}
      <SearchPalette
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
}
