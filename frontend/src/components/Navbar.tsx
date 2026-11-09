'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Video,
  ShieldCheck,
  LogOut,
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
  CheckCircle2,
} from 'lucide-react';
import { CoinTopupModal } from './CoinTopupModal';
import { SearchPalette } from './SearchPalette';
import { ThemeToggle } from './ThemeToggle';
import { OmIcon, CoinIcon, PranamIcon, DiyaIcon } from '@/components/icons/SpiritualIcons';

export function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Re-read auth state whenever login/logout fires sd-auth-change
  const refreshAuthState = () => {
    // Bug #3 fix: Clear React state FIRST to prevent flash of stale role-based UI
    // (e.g., Admin Console visible briefly for a Viewer after account switch)
    setUser(null);
    setCoinBalance(null);

    const storedUser = localStorage.getItem('pooja_user');
    const storedBalance = localStorage.getItem('pooja_wallet_balance');
    if (storedBalance !== null && !isNaN(Number(storedBalance))) {
      setCoinBalance(Number(storedBalance));
    }
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        if (parsed.wallet?.balanceCoins !== undefined && storedBalance === null) {
          setCoinBalance(parsed.wallet.balanceCoins);
        }
      } catch {}
    } else {
      setUser(null);
      setCoinBalance(null);
    }
  };

  useEffect(() => {
    window.addEventListener('sd-auth-change', refreshAuthState);
    return () => window.removeEventListener('sd-auth-change', refreshAuthState);
  }, []);

  useEffect(() => {
    // Check session & cached wallet balance immediately
    const storedUser = localStorage.getItem('pooja_user');
    const storedToken = localStorage.getItem('pooja_token');
    const storedBalance = localStorage.getItem('pooja_wallet_balance');

    if (storedBalance !== null && !isNaN(Number(storedBalance))) {
      setCoinBalance(Number(storedBalance));
    }

    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        if (parsed.wallet?.balanceCoins !== undefined && storedBalance === null) {
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
            localStorage.removeItem('pooja_wallet_balance');
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
            localStorage.setItem('pooja_wallet_balance', String(data.balanceCoins));
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
    // Bug #2 fix: Clear all user-scoped state on logout so next login starts clean.
    // Note: We do NOT clear shubhdarshan_bookings_<userId> — bookings are preserved
    // per-user and will reappear when the same account logs back in.
    localStorage.removeItem('pooja_user');
    localStorage.removeItem('pooja_token');
    localStorage.removeItem('pooja_wallet_balance');
    setUser(null);
    setCoinBalance(null);
    window.location.href = '/';
  };

  return (
    <>
      <header className="sticky top-0 z-50 glass-strong border-b border-gold/15 py-2 shadow-[0_8px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl w-full max-w-full overflow-x-clip">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-5 lg:px-6 xl:px-8 flex items-center justify-between gap-2 sm:gap-3">
          {/* 1. Sacred Brand Logo & Typography */}
          <Link href="/" className="group flex items-center gap-2 sm:gap-2.5 shrink min-w-0">
            <div className="relative flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-gold/40 bg-gradient-to-b from-[#2a1e12] to-obsidian shadow-[0_0_18px_rgba(245,158,11,0.3)] transition group-hover:border-gold/75 group-hover:shadow-[0_0_22px_rgba(245,158,11,0.5)] p-0.5 overflow-hidden shrink-0">
              <img
                src="/logo.png"
                alt="Shubhdarshan Mandir Logo"
                className="h-full w-full object-contain filter drop-shadow group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <span className="leading-tight min-w-0">
              <span className="block font-serif text-base sm:text-xl font-bold tracking-wide text-gold-pale group-hover:text-gold transition truncate">
                Shubhdarshan
              </span>
              <span className="hidden xs:block text-[7px] sm:text-[8.5px] font-bold uppercase tracking-[0.16em] sm:tracking-[0.24em] text-gold-soft/80 truncate">
                Sacred Darshan Network
              </span>
            </span>
          </Link>

          {/* 2. Center Navigation Links (Clean, Balanced & Uncluttered) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 text-xs xl:text-sm font-semibold tracking-wide text-stone-300">
            <Link
              href="/"
              className="whitespace-nowrap shrink-0 rounded-full px-2.5 py-1.5 transition text-gold-pale hover:text-white flex items-center gap-1.5 hover:bg-gold/10"
            >
              <span>Live Darshan</span>
              <span className="live-dot shrink-0" />
            </Link>
            <Link
              href="/pooja"
              className="whitespace-nowrap shrink-0 rounded-full px-2.5 py-1.5 transition hover:text-gold-pale hover:bg-gold/5 flex items-center gap-1"
            >
              <DiyaIcon size={13} />
              <span>Book Pooja</span>
            </Link>
            <Link
              href="/#upcoming"
              className="whitespace-nowrap shrink-0 rounded-full px-2.5 py-1.5 transition hover:text-gold-pale hover:bg-gold/5"
            >
              Schedule
            </Link>
            <Link
              href="/#pandits"
              className="whitespace-nowrap shrink-0 rounded-full px-2.5 py-1.5 transition hover:text-gold-pale hover:bg-gold/5"
            >
              <span className="hidden xl:inline">Verified </span>Pandits
            </Link>

            {/* More Dropdown (About, FAQ, Ethics, Support) */}
            <div className="relative shrink-0" ref={moreDropdownRef}>
              <button
                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                className="whitespace-nowrap shrink-0 rounded-full px-2.5 py-1.5 transition hover:text-gold-pale hover:bg-gold/5 flex items-center gap-1 font-semibold text-stone-300"
                aria-label="More devotional links"
              >
                <span>More</span>
                <ChevronDown className={`w-3 h-3 text-gold-soft transition-transform ${moreDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreDropdownOpen && (
                <div className="navbar-more-dropdown absolute left-0 top-full mt-2 w-52 rounded-2xl p-2 z-[9999] text-xs bg-obsidian-soft border border-gold/25 shadow-2xl backdrop-blur-xl">
                  <Link
                    href="/about"
                    onClick={() => setMoreDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                  >
                    <OmIcon size={14} className="text-gold shrink-0" />
                    <span>About Our Heritage</span>
                  </Link>
                  <Link
                    href="/faq"
                    onClick={() => setMoreDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-gold shrink-0" />
                    <span>Devotee FAQ</span>
                  </Link>
                  <Link
                    href="/contact"
                    onClick={() => setMoreDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                  >
                    <PranamIcon size={14} className="text-gold shrink-0" />
                    <span>Contact &amp; Support</span>
                  </Link>
                </div>
              )}
            </div>
          </nav>

          {/* 3. User Controls & Role Actions (Compact, Symmetrical, Never Squeezed) */}
          <div className="hidden lg:flex items-center gap-1.5 xl:gap-2 shrink-0">
            {/* Search Palette Trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center 2xl:justify-start gap-1.5 h-8 w-8 2xl:w-auto 2xl:px-2.5 rounded-full border border-stone-200 dark:border-gold/25 bg-white dark:bg-obsidian-soft hover:bg-stone-50 dark:hover:bg-gold/10 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-gold-pale text-xs font-medium transition shadow-sm"
              aria-label="Search pooja and aarti"
              title="Search pooja, pandit, or aarti (/)"
            >
              <Search className="w-3.5 h-3.5 text-amber-600 dark:text-gold-soft shrink-0" />
              <span className="hidden 2xl:inline text-stone-600 dark:text-stone-300">Search...</span>
              <kbd className="hidden 2xl:inline px-1 py-0.5 rounded text-[10px] bg-stone-100 dark:bg-obsidian text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-gold/20 font-mono">/</kbd>
            </button>

            {/* Theme Toggle Button (Surya Day / Sacred Night) */}
            <ThemeToggle className="h-8 w-8" />

            {/* Quick Broadcaster Studio (Streamers only) */}
            {user?.role === 'STREAMER' && (
              <Link
                href="/studio/create"
                className="whitespace-nowrap shrink-0 flex items-center gap-1 rounded-full bg-gold/15 hover:bg-gold/25 border border-gold/30 h-8 px-2.5 text-xs font-bold text-gold-pale transition shadow-sm"
                title="Open Studio"
              >
                <Video className="w-3.5 h-3.5 text-gold shrink-0" />
                <span className="hidden sm:inline">Studio</span>
              </Link>
            )}

            {/* Quick Admin Console (Admin only) */}
            {user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="whitespace-nowrap shrink-0 flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-950/60 h-8 px-2.5 text-xs font-bold text-amber-300 hover:bg-amber-900/60 transition shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Admin</span>
              </Link>
            )}

            {user ? (
              <div className="flex items-center gap-1.5">
                {/* Gold Coin Wallet Pill */}
                <button
                  onClick={() => setTopupModalOpen(true)}
                  className="whitespace-nowrap shrink-0 group flex items-center gap-1.5 rounded-full border border-amber-300 dark:border-gold/30 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gold/15 dark:to-gold/5 h-8 px-2.5 text-xs font-bold text-amber-950 dark:text-gold-pale transition hover:border-amber-400 dark:hover:border-gold/60 shadow-sm"
                  title="Your Sacred Coins (Click to Recharge)"
                >
                  <CoinIcon size={14} className="shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="font-extrabold text-amber-900 dark:text-gold">{coinBalance !== null ? coinBalance : (user ? '...' : 100)}</span>
                  <span className="hidden 2xl:inline text-[10px] text-stone-500 dark:text-stone-300 font-medium">Coins</span>
                  <PlusCircle className="w-3 h-3 text-amber-600 dark:text-gold shrink-0 group-hover:text-amber-700 dark:group-hover:text-gold-soft" />
                </button>

                {/* Devotee / Pandit Profile with Solid High-Contrast Dropdown */}
                <div className="relative shrink-0" ref={dropdownRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="whitespace-nowrap shrink-0 flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:text-stone-950 dark:hover:text-gold-pale transition h-8 px-2.5 rounded-full bg-white dark:bg-obsidian-soft border border-stone-200 dark:border-gold/20 hover:border-amber-400 dark:hover:border-gold/40 max-w-[115px] sm:max-w-[130px] shadow-sm"
                    title="Devotee & Broadcaster Menu"
                  >
                    <PranamIcon size={13} className="text-amber-600 dark:text-gold shrink-0" />
                    <span className="truncate">{user.name?.split(' ')[0] || user.name}</span>
                    <ChevronDown className="w-3 h-3 text-stone-500 dark:text-gold-soft shrink-0" />
                  </button>

                  {userDropdownOpen && (
                    <div className="navbar-user-dropdown absolute right-0 top-full mt-2 w-64 rounded-2xl p-2.5 z-[9999] text-xs bg-white dark:bg-obsidian-soft border border-stone-200 dark:border-gold/25 shadow-2xl">
                      {/* Opaque user info header */}
                      <div className="user-dropdown-header p-3 rounded-xl bg-amber-50 dark:bg-[#241a12] border border-amber-200 dark:border-gold/25 mb-2 shadow-sm">
                        <div className="user-name font-bold text-stone-900 dark:text-white text-sm truncate">{user.name}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-amber-700 dark:text-gold font-bold uppercase tracking-wider">{user.role || 'DEVOTEE'}</span>
                          <span className="text-[10px] text-stone-600 dark:text-stone-300 font-medium">{coinBalance !== null ? `${coinBalance} Coins` : ''}</span>
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
                              <span>Go Live (Studio)</span>
                            </Link>
                            <Link
                              href="/studio/streams"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                            >
                              <DiyaIcon size={16} className="text-gold shrink-0" />
                              <span>My Sacred Broadcasts</span>
                            </Link>
                            <Link
                              href="/streamer/earnings"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                            >
                              <CoinIcon size={16} className="text-gold shrink-0" />
                              <span>Earnings &amp; Dakshina</span>
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
                          <>
                            <Link
                              href="/streamer/apply"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                            >
                              <DiyaIcon size={16} className="text-gold shrink-0" />
                              <span>Become a Pandit</span>
                            </Link>
                            <Link
                              href="/streamer/status"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>Pandit KYC Status</span>
                            </Link>
                          </>
                        )}
                        <Link
                          href="/account#bookings"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                        >
                          <DiyaIcon size={16} className="text-gold shrink-0" />
                          <span>My Booked Poojas</span>
                        </Link>
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
                          className="logout-btn w-full flex items-center gap-2.5 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition font-medium mt-1.5 pt-2 border-t border-stone-200 dark:border-stone-800/80"
                        >
                          <LogOut className="w-4 h-4 text-red-400 shrink-0" />
                          <span>Log Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
                  className="nav-join-free-btn whitespace-nowrap shrink-0 group inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition hover:scale-105 active:scale-95 shadow-sm"
                >
                  <span>Join Free</span>
                  <span className="nav-join-free-badge hidden xs:inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-black shrink-0">
                    +100 Coins
                  </span>
                </Link>
              </div>
            )}
          </div>

          {/* 4. Mobile Menu & Search Toggle Buttons */}
          <div className="flex items-center gap-1 sm:gap-2 lg:hidden shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="p-1 sm:p-1.5 text-stone-300 hover:text-white rounded-full hover:bg-white/5 transition"
              aria-label="Search pooja and darshan"
            >
              <Search className="w-4 h-4 text-gold-soft" />
            </button>
            <ThemeToggle className="h-7 w-7 sm:h-8 sm:w-8" />
            {user && (
              <button
                onClick={() => setTopupModalOpen(true)}
                className="whitespace-nowrap shrink-0 flex items-center gap-1 rounded-full border border-amber-300 dark:border-gold/40 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gold/20 dark:to-gold/10 h-7 sm:h-8 px-2 text-[11px] sm:text-xs font-bold text-amber-950 dark:text-gold-pale shadow-sm hover:border-amber-400 dark:hover:border-gold transition active:scale-95"
                title="Your Sacred Coins (Click to Recharge)"
                aria-label="Recharge Sacred Coins"
              >
                <CoinIcon size={12} className="shrink-0" />
                <span className="font-extrabold text-amber-900 dark:text-gold tracking-tight">
                  {coinBalance !== null ? coinBalance : (user ? '...' : 100)}
                </span>
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 sm:p-2 rounded-full border border-stone-300 dark:border-gold/25 text-stone-900 dark:text-gold-pale hover:bg-stone-100 dark:hover:bg-gold/10 transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-stone-900 dark:text-gold-pale" /> : <Menu className="w-5 h-5 text-stone-900 dark:text-gold-pale" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Panel */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-stone-200 dark:border-gold/15 bg-white/98 dark:bg-obsidian-deep/95 backdrop-blur-xl px-5 py-6 space-y-4 shadow-xl">
            <nav className="flex flex-col space-y-3 text-sm">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="mobile-nav-link flex items-center justify-between font-bold py-1.5 border-b border-stone-200 dark:border-stone-800/60"
              >
                <span className="flex items-center gap-2 font-bold">Live Darshan</span>
                <span className="live-dot" />
              </Link>
              <Link
                href="/pooja"
                onClick={() => setMobileMenuOpen(false)}
                className="mobile-nav-link flex items-center gap-2 font-bold py-1.5 border-b border-stone-200 dark:border-stone-800/60"
              >
                <DiyaIcon size={16} className="text-amber-500" />
                <span>Book Pooja &amp; Kathas</span>
              </Link>
              <Link
                href="/#upcoming"
                onClick={() => setMobileMenuOpen(false)}
                className="mobile-nav-link font-bold py-1.5 border-b border-stone-200 dark:border-stone-800/60"
              >
                Pooja Schedule
              </Link>
              <Link
                href="/#pandits"
                onClick={() => setMobileMenuOpen(false)}
                className="mobile-nav-link font-bold py-1.5 border-b border-stone-200 dark:border-stone-800/60"
              >
                Verified Pandits Directory
              </Link>
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="mobile-nav-link font-bold py-1.5 border-b border-stone-200 dark:border-stone-800/60"
              >
                About Our Heritage
              </Link>
              <Link
                href="/faq"
                onClick={() => setMobileMenuOpen(false)}
                className="mobile-nav-link font-bold py-1.5 border-b border-stone-200 dark:border-stone-800/60"
              >
                FAQ &amp; Support
              </Link>

              {user?.role === 'STREAMER' && (
                <>
                  <Link
                    href="/studio/create"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mobile-nav-link font-bold py-1.5 flex items-center gap-2"
                  >
                    <Video className="w-4 h-4 text-amber-600 dark:text-gold" /> Go Live (Studio)
                  </Link>
                  <Link
                    href="/studio/streams"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mobile-nav-link font-bold py-1.5 flex items-center gap-2"
                  >
                    <DiyaIcon size={16} /> My Sacred Broadcasts
                  </Link>
                  <Link
                    href="/streamer/earnings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mobile-nav-link font-bold py-1.5 flex items-center gap-2"
                  >
                    <CoinIcon size={16} /> Pandit Earnings &amp; Dakshina
                  </Link>
                </>
              )}

              {user?.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mobile-nav-link font-bold py-1.5 flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-300" /> Admin Console
                </Link>
              )}

              {user?.role === 'VIEWER' && (
                <>
                  <Link
                    href="/streamer/apply"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mobile-nav-link font-semibold py-1.5 flex items-center gap-2"
                  >
                    <DiyaIcon size={16} /> Become a Pandit
                  </Link>
                  <Link
                    href="/streamer/status"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mobile-nav-link font-semibold py-1.5 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Pandit KYC Status
                  </Link>
                </>
              )}
            </nav>

            <div className="pt-4 border-t border-stone-200 dark:border-stone-800/80">
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-stone-700 dark:text-stone-300">
                    <span className="font-bold text-stone-950 dark:text-white truncate max-w-[180px]">{user.name}</span>
                    <span className="text-amber-800 dark:text-gold font-bold flex items-center gap-1">
                      <CoinIcon size={14} />
                      {coinBalance !== null ? coinBalance : (user ? '...' : 100)} Coins
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setTopupModalOpen(true);
                      }}
                      className="hero-btn-schedule px-3 py-2 border text-xs font-bold rounded-xl text-center transition shadow-sm"
                    >
                      Top Up Coins
                    </button>
                    <Link
                      href="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="hero-btn-secondary px-3 py-2 border text-xs font-bold rounded-xl text-center transition shadow-sm"
                    >
                      Account Settings
                    </Link>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-center text-xs font-semibold text-red-600 dark:text-red-400 py-2 border border-red-200 dark:border-red-950/40 bg-red-50 dark:bg-red-950/20 rounded-xl transition hover:bg-red-100 dark:hover:bg-red-950/30"
                  >
                    Log Out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mobile-signin-btn px-4 py-2.5 rounded-xl border text-center text-xs font-extrabold transition shadow-sm"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-gold hover:bg-gold-deep text-center text-xs font-black text-obsidian shadow-sm transition"
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
