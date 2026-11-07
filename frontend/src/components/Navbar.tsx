'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Video, ShieldCheck, LogOut, Sparkles, Menu, X, PlusCircle, HelpCircle, Flame, Users, Calendar } from 'lucide-react';
import { CoinTopupModal } from './CoinTopupModal';
import { OmIcon, CoinIcon, PranamIcon } from '@/components/icons/SpiritualIcons';

export function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <header className="sticky top-0 z-50 glass-strong border-b border-gold/15 py-2.5 shadow-[0_8px_40px_rgba(0,0,0,0.45)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Sacred Brand Logo with Diya & Sanskrit Typography */}
          <Link href="/" className="group flex items-center gap-3">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-gradient-to-b from-[#2a1e12] to-obsidian shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Flame className="h-5 w-5 text-gold animate-flame" />
              <span className="absolute inset-0 rounded-full bg-gold/10 blur-md transition group-hover:bg-gold/25" />
            </span>
            <span className="leading-tight">
              <span className="block font-serif text-xl sm:text-2xl font-bold tracking-wide text-gold-pale">
                Shubhdarshan
              </span>
              <span className="block text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.28em] text-gold-soft/80">
                Sacred Darshan Network
              </span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
            <Link
              href="/"
              className="relative rounded-full px-3.5 py-1.5 text-stone-300 hover:text-gold-pale transition flex items-center gap-1.5 hover:bg-gold/5"
            >
              <span>Live Darshan</span>
              <span className="live-dot" />
            </Link>
            <Link
              href="/#upcoming"
              className="rounded-full px-3.5 py-1.5 text-stone-300 hover:text-gold-pale transition hover:bg-gold/5"
            >
              Schedule
            </Link>
            <Link
              href="/#pandits"
              className="rounded-full px-3.5 py-1.5 text-stone-300 hover:text-gold-pale transition hover:bg-gold/5"
            >
              Verified Pandits
            </Link>
            <Link
              href="/about"
              className="rounded-full px-3.5 py-1.5 text-stone-300 hover:text-gold-pale transition hover:bg-gold/5"
            >
              About
            </Link>
            <Link
              href="/faq"
              className="rounded-full px-3.5 py-1.5 text-stone-300 hover:text-gold-pale transition hover:bg-gold/5 flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5 text-gold-soft/80" /> FAQ
            </Link>

            {user?.role === 'STREAMER' && (
              <>
                <Link
                  href="/studio/create"
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-gold font-semibold hover:bg-gold/10 transition"
                >
                  <Video className="w-4 h-4" /> Studio
                </Link>
                <Link
                  href="/streamer/earnings"
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-gold-pale font-semibold hover:bg-gold/10 transition"
                >
                  <CoinIcon size={16} /> Earnings
                </Link>
              </>
            )}

            {user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-amber-300 font-semibold hover:bg-amber-950/40 transition"
              >
                <ShieldCheck className="w-4 h-4" /> Admin Console
              </Link>
            )}

            {user?.role === 'VIEWER' && (
              <Link
                href="/streamer/apply"
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-stone-300 hover:text-gold-pale transition hover:bg-gold/5 text-xs font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5 text-gold" /> Become a Pandit
              </Link>
            )}
          </nav>

          {/* User Account Controls */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {/* Gold Coin Wallet Pill */}
                <button
                  onClick={() => setTopupModalOpen(true)}
                  className="group flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1.5 text-xs font-semibold text-gold-pale transition hover:border-gold/60 hover:bg-gold/15 shadow-sm"
                  title="Your Sacred Coins (Click to Recharge)"
                >
                  <CoinIcon size={18} className="text-gold group-hover:scale-110 transition-transform" />
                  <span className="font-extrabold text-gold">{coinBalance !== null ? coinBalance : 100}</span>
                  <span className="text-[11px] text-stone-300 font-medium">Coins</span>
                  <PlusCircle className="w-3.5 h-3.5 text-gold ml-0.5 group-hover:text-gold-soft" />
                </button>

                <Link
                  href="/account"
                  className="flex items-center gap-1.5 text-xs font-semibold text-stone-200 hover:text-gold-pale transition px-3 py-1.5 rounded-full hover:bg-stone-900 border border-transparent hover:border-stone-800"
                  title="My Account Settings"
                >
                  <PranamIcon size={16} />
                  <span>{user.name}</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-full text-stone-400 hover:text-red-400 hover:bg-stone-900 transition-colors"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/login"
                  className="rounded-full px-4 py-2 text-xs font-bold text-stone-300 hover:text-gold-pale transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-xs font-bold text-obsidian shadow-[0_0_24px_rgba(245,158,11,0.25)] transition hover:bg-gold-deep"
                >
                  <span>Join Free</span>
                  <span className="rounded-full bg-obsidian/20 px-2 py-0.5 text-[10px] font-extrabold text-obsidian">
                    +100 Coins
                  </span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
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
              className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-stone-900"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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
                className="flex items-center justify-between text-stone-200 hover:text-gold-pale font-medium py-1 border-b border-stone-800/60"
              >
                <span className="flex items-center gap-2">Live Darshan</span>
                <span className="live-dot" />
              </Link>
              <Link
                href="/#upcoming"
                onClick={() => setMobileMenuOpen(false)}
                className="text-stone-200 hover:text-gold-pale font-medium py-1 border-b border-stone-800/60"
              >
                Schedule
              </Link>
              <Link
                href="/#pandits"
                onClick={() => setMobileMenuOpen(false)}
                className="text-stone-200 hover:text-gold-pale font-medium py-1 border-b border-stone-800/60"
              >
                Verified Pandits
              </Link>
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="text-stone-200 hover:text-gold-pale font-medium py-1 border-b border-stone-800/60"
              >
                About Us
              </Link>
              <Link
                href="/faq"
                onClick={() => setMobileMenuOpen(false)}
                className="text-stone-200 hover:text-gold-pale font-medium py-1 border-b border-stone-800/60"
              >
                FAQ & Support
              </Link>

              {user?.role === 'STREAMER' && (
                <>
                  <Link
                    href="/studio/create"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-gold font-semibold py-1 flex items-center gap-2"
                  >
                    <Video className="w-4 h-4" /> Broadcaster Studio
                  </Link>
                  <Link
                    href="/streamer/earnings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-gold-pale font-semibold py-1 flex items-center gap-2"
                  >
                    <CoinIcon size={16} /> Pandit Earnings & Dakshina
                  </Link>
                </>
              )}

              {user?.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-amber-300 font-semibold py-1 flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" /> Admin Console
                </Link>
              )}

              {user?.role === 'VIEWER' && (
                <Link
                  href="/streamer/apply"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gold-pale font-medium py-1 flex items-center gap-2"
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
                      className="px-3 py-2 bg-stone-900 border border-stone-800 text-stone-200 text-xs font-semibold rounded-xl text-center"
                    >
                      Account
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
    </>
  );
}
