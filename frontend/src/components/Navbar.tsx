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
  Orbit,
  HeartHandshake,
} from 'lucide-react';
import { CoinTopupModal } from './CoinTopupModal';
import { SearchPalette } from './SearchPalette';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { OmIcon, CoinIcon, PranamIcon, DiyaIcon } from '@/components/icons/SpiritualIcons';
import { decodeJwtClaims, getAccountCapabilities, purgeClientSession } from '@/lib/auth-session';
import { useLang } from '@/lib/i18n/context';
import { formatCoins } from '@/lib/i18n/format';

export function Navbar() {
  const { lang, t } = useLang();
  const [user, setUser] = useState<any>(null);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [kundliDropdownOpen, setKundliDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);
  const kundliDropdownRef = useRef<HTMLDivElement>(null);

  // One menu at a time: opening a menu closes the other two.
  const toggleMenu = (menu: 'kundli' | 'more' | 'user') => {
    setKundliDropdownOpen(menu === 'kundli' ? (o) => !o : false);
    setMoreDropdownOpen(menu === 'more' ? (o) => !o : false);
    setUserDropdownOpen(menu === 'user' ? (o) => !o : false);
  };

  // Escape closes whatever is open and hands focus back to its button.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const open: [boolean, React.RefObject<HTMLDivElement>][] = [
        [kundliDropdownOpen, kundliDropdownRef],
        [moreDropdownOpen, moreDropdownRef],
        [userDropdownOpen, dropdownRef],
      ];
      const hit = open.find(([isOpen]) => isOpen);
      if (!hit) return;
      setKundliDropdownOpen(false);
      setMoreDropdownOpen(false);
      setUserDropdownOpen(false);
      hit[1].current?.querySelector('button')?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [kundliDropdownOpen, moreDropdownOpen, userDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false);
      }
      if (kundliDropdownRef.current && !kundliDropdownRef.current.contains(event.target as Node)) {
        setKundliDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Re-read auth state whenever login/logout fires sd-auth-change
  const refreshAuthState = () => {
    // Clear React state FIRST to prevent flash of stale role-based UI
    setUser(null);
    setCoinBalance(null);

    const storedToken = localStorage.getItem('pooja_token');
    const storedUser = localStorage.getItem('pooja_user');
    const storedBalance = localStorage.getItem('pooja_wallet_balance');

    if (storedToken) {
      const claims = decodeJwtClaims(storedToken);
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          // If cached user ID does not match the active JWT token sub, purge contamination immediately
          if (claims?.sub && parsed.id && parsed.id !== claims.sub) {
            purgeClientSession();
            return;
          }
          setUser(parsed);
          if (parsed.wallet?.balanceCoins !== undefined && storedBalance === null) {
            setCoinBalance(parsed.wallet.balanceCoins);
          }
        } catch {
          setUser(null);
        }
      }
      if (storedBalance !== null && !isNaN(Number(storedBalance))) {
        setCoinBalance(Number(storedBalance));
      }
    } else {
      setUser(null);
      setCoinBalance(null);
    }
  };

  useEffect(() => {
    const handleWalletUpdated = (event: any) => {
      const nextBal = event?.detail?.balanceCoins;
      if (typeof nextBal === 'number' && Number.isFinite(nextBal)) {
        setCoinBalance(nextBal);
      } else {
        const storedBalance = localStorage.getItem('pooja_wallet_balance');
        if (storedBalance !== null && !isNaN(Number(storedBalance))) {
          setCoinBalance(Number(storedBalance));
        }
      }
    };

    window.addEventListener('sd-auth-change', refreshAuthState);
    window.addEventListener('sd-wallet-updated', handleWalletUpdated);
    return () => {
      window.removeEventListener('sd-auth-change', refreshAuthState);
      window.removeEventListener('sd-wallet-updated', handleWalletUpdated);
    };
  }, []);

  useEffect(() => {
    // Check session & cached wallet balance immediately
    const storedUser = localStorage.getItem('pooja_user');
    const storedToken = localStorage.getItem('pooja_token');
    const storedBalance = localStorage.getItem('pooja_wallet_balance');

    if (storedToken) {
      const claims = decodeJwtClaims(storedToken);
      let isValidUser = false;

      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (!claims?.sub || parsed.id === claims.sub) {
            setUser(parsed);
            isValidUser = true;
            if (parsed.wallet?.balanceCoins !== undefined && storedBalance === null) {
              setCoinBalance(parsed.wallet.balanceCoins);
            }
          } else {
            // Contaminated storage: drop immediately
            localStorage.removeItem('pooja_user');
          }
        } catch {}
      }

      if (storedBalance !== null && !isNaN(Number(storedBalance))) {
        setCoinBalance(Number(storedBalance));
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const cacheBust = Date.now();

      // SD-SEC-2026-004: Validate session with /auth/me using cache: 'no-store' + timestamp to prevent CDN ghost responses
      fetch(`${apiUrl}/auth/me?_t=${cacheBust}`, {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${storedToken}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      })
        .then((res) => {
          if (res.status === 401) {
            purgeClientSession();
            setUser(null);
            setCoinBalance(null);
            return null;
          }
          return res.ok ? res.json() : null;
        })
        .then((freshUser) => {
          if (freshUser) {
            // Ensure freshUser matches current token's claim
            const currentToken = localStorage.getItem('pooja_token');
            const currentClaims = decodeJwtClaims(currentToken);
            if (!currentClaims || currentClaims.sub === freshUser.id) {
              setUser(freshUser);
              localStorage.setItem('pooja_user', JSON.stringify(freshUser));
            }
          }
        })
        .catch(() => {});

      // Fetch live wallet balance from backend with cache: 'no-store'
      fetch(`${apiUrl}/wallet/balance?_t=${cacheBust}`, {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${storedToken}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && typeof data.balanceCoins === 'number') {
            setCoinBalance(data.balanceCoins);
            localStorage.setItem('pooja_wallet_balance', String(data.balanceCoins));
          }
        })
        .catch(() => {});
    } else {
      setUser(null);
      setCoinBalance(null);
    }
  }, []);

  const handleLogout = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      await fetch(`${apiUrl}/auth/logout?_t=${Date.now()}`, {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      });
    } catch {}

    // SD-SEC-2026-004: Purge all client session data and perform hard window reload to destroy memory closures
    purgeClientSession();
    setUser(null);
    setCoinBalance(null);
    window.location.href = '/login';
  };

  const { isApprovedPandit, isViewer, isAdmin } = getAccountCapabilities(user);

  return (
    <>
      <header className="sticky top-0 z-50 glass-strong border-b border-gold/15 py-2 shadow-[0_8px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl w-full max-w-full overflow-x-clip">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-5 lg:px-6 xl:px-8 flex items-center justify-between gap-2 sm:gap-3">
          {/* 1. Sacred Brand Logo & Typography */}
          <Link href="/" className="group flex items-center gap-2 sm:gap-2.5 shrink min-w-0">
            <div className="relative flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-gold/40 bg-gradient-to-b from-[#2a1e12] to-obsidian shadow-[0_0_18px_rgba(245,158,11,0.3)] transition group-hover:border-gold/75 group-hover:shadow-[0_0_22px_rgba(245,158,11,0.5)] p-0.5 overflow-hidden shrink-0">
              <img
                src="/logo.webp"
                alt={t('Param Darshan Mandir Logo', 'परम दर्शन मंदिर लोगो')}
                className="h-full w-full object-contain filter drop-shadow group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <span className="leading-tight min-w-0">
              <span className="block font-serif text-base sm:text-xl font-bold tracking-wide text-gold-pale group-hover:text-gold transition truncate">
                {t('Param Darshan', 'परम दर्शन')}
              </span>
              <span className="hidden xs:block text-[7px] sm:text-[8.5px] font-bold uppercase tracking-[0.16em] sm:tracking-[0.24em] text-gold-soft/80 truncate">
                {t('Sacred Darshan Network', 'पवित्र दर्शन नेटवर्क')}
              </span>
            </span>
          </Link>

          {/* 2. Center Navigation Links (Clean, Balanced & Uncluttered) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 text-xs xl:text-sm font-semibold tracking-wide text-stone-300">
            <Link
              href="/"
              className="whitespace-nowrap shrink-0 rounded-full px-2.5 py-1.5 transition text-gold-pale hover:text-white flex items-center gap-1.5 hover:bg-gold/10"
            >
              <span>{t('Live Darshan', 'लाइव दर्शन')}</span>
              <span className="live-dot shrink-0" />
            </Link>
            <Link
              href="/pooja"
              className="whitespace-nowrap shrink-0 rounded-full px-2.5 py-1.5 transition hover:text-gold-pale hover:bg-gold/5 flex items-center gap-1"
            >
              <DiyaIcon size={13} />
              <span>{t('Book Pooja', 'पूजा बुक करें')}</span>
            </Link>
            {/* Kundli Dropdown — always visible in direct desktop nav */}
            <div className="relative shrink-0" ref={kundliDropdownRef}>
              <button
                onClick={() => toggleMenu('kundli')}
                aria-expanded={kundliDropdownOpen}
                aria-haspopup="menu"
                className="whitespace-nowrap shrink-0 rounded-full px-2.5 py-1.5 transition hover:text-gold-pale hover:bg-gold/5 flex items-center gap-1 font-semibold text-stone-300"
                aria-label={t('Kundli & Astrology', 'कुंडली एवं ज्योतिष')}
              >
                <Orbit className="w-3.5 h-3.5 text-gold-soft" />
                <span>{t('Kundli', 'कुंडली')}</span>
                <ChevronDown className={`w-3 h-3 text-gold-soft transition-transform ${kundliDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {kundliDropdownOpen && (
                <div className="navbar-more-dropdown absolute left-0 top-full mt-2 w-60 rounded-2xl p-2 z-[9999] text-xs bg-obsidian-soft border border-gold/25 shadow-2xl backdrop-blur-xl">
                  <Link
                    href="/kundli"
                    onClick={() => setKundliDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                  >
                    <Orbit className="w-3.5 h-3.5 text-gold shrink-0" />
                    <div>
                      <div className="font-semibold">{t('Check Your Horoscope', 'अपनी जन्म पत्रिका देखें')}</div>
                      <div className="text-[10px] text-stone-400">{t('Free Kundli & birth chart analysis', 'निःशुल्क कुंडली एवं जन्म पत्रिका विश्लेषण')}</div>
                    </div>
                  </Link>
                  <Link
                    href="/kundli?tab=matching"
                    onClick={() => setKundliDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                  >
                    <HeartHandshake className="w-3.5 h-3.5 text-gold shrink-0" />
                    <div>
                      <div className="font-semibold">{t('Kundli Matching', 'कुंडली मिलान')}</div>
                      <div className="text-[10px] text-stone-400">{t('Compatibility & Ashtakoota Milan', 'अनुकूलता एवं अष्टकूट मिलान')}</div>
                    </div>
                  </Link>
                  <Link
                    href="/pooja"
                    onClick={() => setKundliDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                  >
                    <Calendar className="w-3.5 h-3.5 text-gold shrink-0" />
                    <div>
                      <div className="font-semibold">{t('Book a Personal Astrologer', 'व्यक्तिगत ज्योतिषी बुक करें')}</div>
                      <div className="text-[10px] text-stone-400">{t('1-on-1 Vedic guidance with a verified Pandit Ji', 'सत्यापित पंडित जी के साथ 1-ऑन-1 वैदिक मार्गदर्शन')}</div>
                    </div>
                  </Link>
                </div>
              )}
            </div>
            <Link
              href="/#upcoming"
              className="hidden xl:inline-flex whitespace-nowrap shrink-0 rounded-full px-2.5 py-1.5 transition hover:text-gold-pale hover:bg-gold/5"
            >
              {t('Schedule', 'कार्यक्रम')}
            </Link>
            <Link
              href="/#pandits"
              className="hidden xl:inline-flex items-center gap-1 whitespace-nowrap shrink-0 rounded-full px-2.5 py-1.5 transition hover:text-gold-pale hover:bg-gold/5"
            >
              {t('Verified Pandit Jis', 'सत्यापित पंडित जी')}
            </Link>

            {/* More Dropdown (About, FAQ, Ethics, Support) */}
            <div className="relative shrink-0" ref={moreDropdownRef}>
              <button
                onClick={() => toggleMenu('more')}
                aria-expanded={moreDropdownOpen}
                aria-haspopup="menu"
                className="whitespace-nowrap shrink-0 rounded-full px-2.5 py-1.5 transition hover:text-gold-pale hover:bg-gold/5 flex items-center gap-1 font-semibold text-stone-300"
                aria-label={t('More devotional links', 'और भक्ति-लिंक')}
              >
                <span>{t('More', 'और')}</span>
                <ChevronDown className={`w-3 h-3 text-gold-soft transition-transform ${moreDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreDropdownOpen && (
                <div className="navbar-more-dropdown absolute left-0 top-full mt-2 w-52 rounded-2xl p-2 z-[9999] text-xs bg-obsidian-soft border border-gold/25 shadow-2xl backdrop-blur-xl">
                  <Link
                    href="/#upcoming"
                    onClick={() => setMoreDropdownOpen(false)}
                    className="xl:hidden flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                  >
                    <span>{t('Schedule', 'कार्यक्रम')}</span>
                  </Link>
                  <Link
                    href="/#pandits"
                    onClick={() => setMoreDropdownOpen(false)}
                    className="xl:hidden flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                  >
                    <span>{t('Verified Pandit Jis', 'सत्यापित पंडित जी')}</span>
                  </Link>
                  <Link
                    href="/about"
                    onClick={() => setMoreDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                  >
                    <OmIcon size={14} className="text-gold shrink-0" />
                    <span>{t('About Our Heritage', 'हमारी विरासत के बारे में')}</span>
                  </Link>
                  <Link
                    href="/faq"
                    onClick={() => setMoreDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-gold shrink-0" />
                    <span>{t('Devotee FAQ', 'भक्त FAQ')}</span>
                  </Link>
                  <Link
                    href="/contact"
                    onClick={() => setMoreDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                  >
                    <PranamIcon size={14} className="text-gold shrink-0" />
                    <span>{t('Contact & Support', 'संपर्क एवं सहायता')}</span>
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
              aria-label={t('Search pooja and aarti', 'पूजा और आरती खोजें')}
              title={t('Search pooja, pandit, or aarti (/)', 'पूजा, पंडित जी या आरती खोजें (/)')}
            >
              <Search className="w-3.5 h-3.5 text-amber-700 dark:text-gold-soft shrink-0" />
              <span className="hidden 2xl:inline text-stone-700 dark:text-stone-300">{t('Search...', 'खोजें…')}</span>
              <kbd className="hidden 2xl:inline px-1 py-0.5 rounded text-[10px] bg-stone-100 dark:bg-obsidian text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-gold/20 font-mono">/</kbd>
            </button>

            {/* Theme Toggle Button (Surya Day / Sacred Night) */}
            <ThemeToggle className="h-8 w-8" />
            <LanguageToggle className="h-8 w-8" />

            {/* Quick Broadcaster Studio (Approved Pandits, including Pandit-Admins) */}
            {isApprovedPandit && (
              <Link
                href="/studio/create"
                className="whitespace-nowrap shrink-0 flex items-center gap-1 rounded-full bg-gold/15 hover:bg-gold/25 border border-gold/30 h-8 px-2.5 text-xs font-bold text-gold-pale transition shadow-sm"
                title={t('Open Studio', 'स्टूडियो खोलें')}
              >
                <Video className="w-3.5 h-3.5 text-gold shrink-0" />
                <span className="hidden sm:inline">{t('Studio', 'स्टूडियो')}</span>
              </Link>
            )}

            {/* Quick Admin Console (Admin only) */}
            {isAdmin && (
              <Link
                href="/admin"
                className="whitespace-nowrap shrink-0 flex items-center gap-1 rounded-full border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/60 h-8 px-2.5 text-xs font-bold text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                <span>{t('Admin', 'एडमिन')}</span>
              </Link>
            )}

            {user ? (
              <div className="flex items-center gap-1.5">
                {/* Gold Coin Wallet Pill */}
                <button
                  onClick={() => setTopupModalOpen(true)}
                  className="whitespace-nowrap shrink-0 group flex items-center gap-1.5 rounded-full border border-amber-300 dark:border-gold/30 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gold/15 dark:to-gold/5 h-8 px-2.5 text-xs font-bold text-amber-950 dark:text-gold-pale transition hover:border-amber-400 dark:hover:border-gold/60 shadow-sm"
                  title={t('Your Sacred Coins (Click to Recharge)', 'आपके पवित्र कॉइन (रिचार्ज के लिए क्लिक करें)')}
                >
                  <CoinIcon size={14} className="shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="font-extrabold text-amber-900 dark:text-gold">{coinBalance !== null ? coinBalance : (user ? '...' : 100)}</span>
                  <span className="hidden 2xl:inline text-[10px] text-stone-600 dark:text-stone-300 font-medium">{t('Coins', 'कॉइन')}</span>
                  <PlusCircle className="w-3 h-3 text-amber-700 dark:text-gold shrink-0 group-hover:text-amber-800 dark:group-hover:text-gold-soft" />
                </button>

                {/* Devotee / Pandit Profile with Solid High-Contrast Dropdown */}
                <div className="relative shrink-0" ref={dropdownRef}>
                  <button
                    onClick={() => toggleMenu('user')}
                    aria-expanded={userDropdownOpen}
                    aria-haspopup="menu"
                    className="whitespace-nowrap shrink-0 flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:text-stone-950 dark:hover:text-gold-pale transition h-8 px-2.5 rounded-full bg-white dark:bg-obsidian-soft border border-stone-200 dark:border-gold/20 hover:border-amber-400 dark:hover:border-gold/40 max-w-[115px] sm:max-w-[130px] shadow-sm"
                    title={t('Devotee & Broadcaster Menu', 'भक्त एवं प्रसारक मेनू')}
                  >
                    <PranamIcon size={13} className="text-amber-700 dark:text-gold shrink-0" />
                    <span className="truncate">{user.name?.split(' ')[0] || user.name}</span>
                    <ChevronDown className="w-3 h-3 text-stone-600 dark:text-gold-soft shrink-0" />
                  </button>

                  {userDropdownOpen && (
                    <div className="navbar-user-dropdown absolute right-0 top-full mt-2 w-64 rounded-2xl p-2.5 z-[9999] text-xs bg-white dark:bg-obsidian-soft border border-stone-200 dark:border-gold/25 shadow-2xl">
                      {/* Opaque user info header */}
                      <div className="user-dropdown-header p-3 rounded-xl mb-2 shadow-sm">
                        <div className="user-name font-bold text-stone-900 dark:text-white text-sm truncate">{user.name}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-amber-700 dark:text-gold font-bold uppercase tracking-wider">
                            {isApprovedPandit && isAdmin
                              ? t('ADMIN · PANDIT JI', 'एडमिन · पंडित जी')
                              : isAdmin
                              ? t('ADMIN', 'एडमिन')
                              : isApprovedPandit
                              ? t('PANDIT JI', 'पंडित जी')
                              : t('DEVOTEE', 'भक्त')}
                          </span>
                          <span className="text-[10px] text-stone-600 dark:text-stone-300 font-medium">{coinBalance !== null ? formatCoins(coinBalance, lang) : ''}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {isApprovedPandit && (
                          <>
                            <Link
                              href="/studio/create"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                            >
                              <Video className="w-4 h-4 text-gold shrink-0" />
                              <span>{t('Go Live (Studio)', 'लाइव जाएँ (स्टूडियो)')}</span>
                            </Link>
                            <Link
                              href="/studio/streams"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                            >
                              <DiyaIcon size={16} className="text-gold shrink-0" />
                              <span>{t('My Sacred Broadcasts', 'मेरे पवित्र प्रसारण')}</span>
                            </Link>
                            <Link
                              href="/streamer/earnings"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                            >
                              <CoinIcon size={16} className="text-gold shrink-0" />
                              <span>{t('Earnings & Dakshina', 'कमाई एवं दक्षिणा')}</span>
                            </Link>
                            <Link
                              href="/account#pooja-requests"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                            >
                              <Calendar className="w-4 h-4 text-gold shrink-0" />
                              <span>{t('Pooja Requests & Approvals', 'पूजा अनुरोध एवं स्वीकृति')}</span>
                            </Link>
                          </>
                        )}
                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition font-medium"
                          >
                            <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                            <span>{t('Admin Console', 'एडमिन कंसोल')}</span>
                          </Link>
                        )}
                        {isViewer && (
                          <>
                            <Link
                              href="/streamer/apply"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                            >
                              <DiyaIcon size={16} className="text-gold shrink-0" />
                              <span>{t('Become a Pandit Ji', 'पंडित जी बनें')}</span>
                            </Link>
                            <Link
                              href="/streamer/status"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                              <span>{t('Pandit Ji KYC Status', 'पंडित जी KYC स्थिति')}</span>
                            </Link>
                            <Link
                              href="/account#bookings"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                            >
                              <DiyaIcon size={16} className="text-gold shrink-0" />
                              <span>{t('My Booked Poojas', 'मेरी बुक की गई पूजाएँ')}</span>
                            </Link>
                          </>
                        )}
                        <Link
                          href="/account"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:text-gold hover:bg-gold/15 rounded-xl transition font-medium"
                        >
                          <User className="w-4 h-4 text-stone-400 shrink-0" />
                          <span>{t('Account Settings', 'खाता सेटिंग्स')}</span>
                        </Link>
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            handleLogout();
                          }}
                          className="logout-btn w-full flex items-center gap-2.5 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition font-medium mt-1.5 pt-2 border-t border-stone-200 dark:border-stone-800/80"
                        >
                          <LogOut className="w-4 h-4 text-red-400 shrink-0" />
                          <span>{t('Log Out', 'लॉग आउट')}</span>
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
                  {t('Sign In', 'साइन इन')}
                </Link>
                <Link
                  href="/register"
                  className="nav-join-free-btn whitespace-nowrap shrink-0 group inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition hover:scale-105 active:scale-95 shadow-sm"
                >
                  <span>{t('Join Free', 'निःशुल्क जुड़ें')}</span>
                  <span className="nav-join-free-badge hidden xs:inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-black shrink-0">
                    {t('+100 Coins', '+100 कॉइन')}
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
              aria-label={t('Search pooja and darshan', 'पूजा और दर्शन खोजें')}
            >
              <Search className="w-4 h-4 text-gold-soft" />
            </button>
            <ThemeToggle className="h-7 w-7 sm:h-8 sm:w-8" />
            <LanguageToggle className="hidden sm:inline-flex h-8 w-8" />
            {user && (
              <button
                onClick={() => setTopupModalOpen(true)}
                className="whitespace-nowrap shrink-0 flex items-center gap-1 rounded-full border border-amber-300 dark:border-gold/40 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gold/20 dark:to-gold/10 h-7 sm:h-8 px-2 text-[11px] sm:text-xs font-bold text-amber-950 dark:text-gold-pale shadow-sm hover:border-amber-400 dark:hover:border-gold transition active:scale-95"
                title={t('Your Sacred Coins (Click to Recharge)', 'आपके पवित्र कॉइन (रिचार्ज के लिए क्लिक करें)')}
                aria-label={t('Recharge Sacred Coins', 'पवित्र कॉइन रिचार्ज करें')}
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
              aria-label={t('Toggle navigation menu', 'नेविगेशन मेनू खोलें/बंद करें')}
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-stone-900 dark:text-gold-pale" /> : <Menu className="w-5 h-5 text-stone-900 dark:text-gold-pale" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Panel */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-stone-200 dark:border-gold/15 bg-white/98 dark:bg-obsidian-deep/95 backdrop-blur-xl px-5 py-6 space-y-4 shadow-xl">
            <LanguageToggle variant="segmented" className="sm:hidden w-full" />
            <nav className="flex flex-col space-y-3 text-sm">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="mobile-nav-link flex items-center justify-between font-bold py-1.5 border-b border-stone-200 dark:border-stone-800/60"
              >
                <span className="flex items-center gap-2 font-bold">{t('Live Darshan', 'लाइव दर्शन')}</span>
                <span className="live-dot" />
              </Link>
              <Link
                href="/pooja"
                onClick={() => setMobileMenuOpen(false)}
                className="mobile-nav-link flex items-center gap-2 font-bold py-1.5 border-b border-stone-200 dark:border-stone-800/60"
              >
                <DiyaIcon size={16} className="text-amber-700 dark:text-amber-400" />
                <span>{t('Book Pooja & Kathas', 'पूजा एवं कथा बुक करें')}</span>
              </Link>
              <Link
                href="/#upcoming"
                onClick={() => setMobileMenuOpen(false)}
                className="mobile-nav-link font-bold py-1.5 border-b border-stone-200 dark:border-stone-800/60"
              >
                {t('Pooja Schedule', 'पूजा कार्यक्रम')}
              </Link>
              <Link
                href="/#pandits"
                onClick={() => setMobileMenuOpen(false)}
                className="mobile-nav-link font-bold py-1.5 border-b border-stone-200 dark:border-stone-800/60"
              >
                {t('Verified Pandit Jis Directory', 'सत्यापित पंडित जी निर्देशिका')}
              </Link>
              <div className="border-b border-stone-200 dark:border-stone-800/60">
                <div className="mobile-nav-link font-bold py-1.5 flex items-center gap-2 text-stone-800 dark:text-stone-200">
                  <Orbit className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <span>{t('Kundli & Astrology', 'कुंडली एवं ज्योतिष')}</span>
                </div>
                <div className="ml-6 pb-1 space-y-1">
                  <Link href="/kundli" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400 hover:text-amber-700 dark:hover:text-gold py-1 transition"><Orbit className="w-3 h-3 text-amber-600 dark:text-gold-soft shrink-0" /><span>{t('Check Your Horoscope', 'अपनी जन्म पत्रिका देखें')}</span></Link>
                  <Link href="/kundli?tab=matching" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400 hover:text-amber-700 dark:hover:text-gold py-1 transition"><HeartHandshake className="w-3 h-3 text-amber-600 dark:text-gold-soft shrink-0" /><span>{t('Kundli Matching', 'कुंडली मिलान')}</span></Link>
                  <Link href="/pooja" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400 hover:text-amber-700 dark:hover:text-gold py-1 transition"><Calendar className="w-3 h-3 text-amber-600 dark:text-gold-soft shrink-0" /><span>{t('Book a Personal Astrologer', 'व्यक्तिगत ज्योतिषी बुक करें')}</span></Link>
                </div>
              </div>
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="mobile-nav-link font-bold py-1.5 border-b border-stone-200 dark:border-stone-800/60"
              >
                {t('About Our Heritage', 'हमारी विरासत के बारे में')}
              </Link>
              <Link
                href="/faq"
                onClick={() => setMobileMenuOpen(false)}
                className="mobile-nav-link font-bold py-1.5 border-b border-stone-200 dark:border-stone-800/60"
              >
                {t('FAQ & Support', 'FAQ एवं सहायता')}
              </Link>

              {isApprovedPandit && (
                <>
                  <Link
                    href="/studio/create"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mobile-nav-link font-bold py-1.5 flex items-center gap-2"
                  >
                    <Video className="w-4 h-4 text-amber-700 dark:text-gold" /> {t('Go Live (Studio)', 'लाइव जाएँ (स्टूडियो)')}
                  </Link>
                  <Link
                    href="/studio/streams"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mobile-nav-link font-bold py-1.5 flex items-center gap-2"
                  >
                    <DiyaIcon size={16} /> {t('My Sacred Broadcasts', 'मेरे पवित्र प्रसारण')}
                  </Link>
                  <Link
                    href="/streamer/earnings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mobile-nav-link font-bold py-1.5 flex items-center gap-2"
                  >
                    <CoinIcon size={16} /> {t('Pandit Ji Earnings & Dakshina', 'पंडित जी कमाई एवं दक्षिणा')}
                  </Link>
                  <Link
                    href="/account#pooja-requests"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mobile-nav-link font-bold py-1.5 flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4 text-amber-700 dark:text-gold" /> {t('Pooja Requests & Approvals', 'पूजा अनुरोध एवं स्वीकृति')}
                  </Link>
                </>
              )}

              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mobile-nav-link font-bold py-1.5 flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-300" /> {t('Admin Console', 'एडमिन कंसोल')}
                </Link>
              )}

              {isViewer && (
                <>
                  <Link
                    href="/streamer/apply"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mobile-nav-link font-semibold py-1.5 flex items-center gap-2"
                  >
                    <DiyaIcon size={16} /> {t('Become a Pandit Ji', 'पंडित जी बनें')}
                  </Link>
                  <Link
                    href="/streamer/status"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mobile-nav-link font-semibold py-1.5 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /> {t('Pandit Ji KYC Status', 'पंडित जी KYC स्थिति')}
                  </Link>
                  <Link
                    href="/account#bookings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mobile-nav-link font-semibold py-1.5 flex items-center gap-2"
                  >
                    <DiyaIcon size={16} /> {t('My Booked Poojas', 'मेरी बुक की गई पूजाएँ')}
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
                      {coinBalance !== null ? formatCoins(coinBalance, lang) : (user ? '...' : formatCoins(100, lang))}
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
                      {t('Top Up Coins', 'कॉइन टॉप-अप')}
                    </button>
                    <Link
                      href="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="hero-btn-secondary px-3 py-2 border text-xs font-bold rounded-xl text-center transition shadow-sm"
                    >
                      {t('Account Settings', 'खाता सेटिंग्स')}
                    </Link>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-center text-xs font-semibold text-red-600 dark:text-red-400 py-2 border border-red-200 dark:border-red-950/40 bg-red-50 dark:bg-red-950/20 rounded-xl transition hover:bg-red-100 dark:hover:bg-red-950/30"
                  >
                    {t('Log Out', 'लॉग आउट')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mobile-signin-btn px-4 py-2.5 rounded-xl border text-center text-xs font-extrabold transition shadow-sm"
                  >
                    {t('Sign In', 'साइन इन')}
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-gold hover:bg-gold-deep text-center text-xs font-black text-obsidian shadow-sm transition"
                  >
                    {t('Join Free (+100)', 'निःशुल्क जुड़ें (+100)')}
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
