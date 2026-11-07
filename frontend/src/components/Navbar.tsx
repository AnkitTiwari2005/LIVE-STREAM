'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Video, ShieldCheck, LogOut, Sparkles, Menu, X, PlusCircle, HelpCircle } from 'lucide-react';
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
            // Token expired: clear stale storage cleanly
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
    } catch {
      // Proceed with local cleanup regardless of network error
    }
    localStorage.removeItem('pooja_user');
    localStorage.removeItem('pooja_token');
    setUser(null);
    setCoinBalance(null);
    window.location.href = '/';
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-stone-950/90 backdrop-blur-md border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo with Pure SVG */}
          <Link href="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-white hover:opacity-90 transition-opacity">
            <OmIcon size={28} />
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent font-extrabold">
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
            <Link href="/about" className="hover:text-orange-400 transition-colors">
              About
            </Link>
            <Link href="/faq" className="hover:text-orange-400 transition-colors flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-stone-400" /> FAQ
            </Link>
            {user?.role === 'STREAMER' && (
              <>
                <Link
                  href="/studio/create"
                  className="flex items-center gap-1.5 text-orange-400 font-semibold hover:text-orange-300"
                >
                  <Video className="w-4 h-4" /> Pandit Studio
                </Link>
                <Link
                  href="/streamer/earnings"
                  className="flex items-center gap-1.5 text-amber-400 font-semibold hover:text-amber-300"
                >
                  <CoinIcon size={16} /> Earnings
                </Link>
              </>
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
                <Sparkles className="w-4 h-4 text-orange-400" /> Apply as Pandit
              </Link>
            )}
          </nav>

          {/* User Account Controls */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {/* SVG Coin Wallet Balance Pill */}
                <button
                  onClick={() => setTopupModalOpen(true)}
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-950/60 via-stone-900 to-amber-950/60 border border-amber-500/50 hover:border-amber-400 shadow-sm transition-all"
                  title="Your Sacred Coins (Click to Recharge)"
                >
                  <CoinIcon size={20} className="group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-black text-amber-400">
                        {coinBalance !== null ? coinBalance : 100}
                      </span>
                      <span className="text-[10px] text-stone-400 font-medium">Coins</span>
                    </div>
                  </div>
                  <PlusCircle className="w-3.5 h-3.5 text-amber-400 ml-0.5 group-hover:text-amber-300" />
                </button>

                <Link
                  href="/account"
                  className="flex items-center gap-1.5 text-sm font-medium text-stone-200 hover:text-orange-400 transition"
                  title="My Account Settings"
                >
                  <PranamIcon size={18} />
                  <span>{user.name}</span>
                </Link>
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
                  className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-lg shadow-md transition-all flex items-center gap-1.5"
                >
                  <span>Join Free</span>
                  <span className="text-xs font-black text-amber-200 bg-amber-900/60 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <CoinIcon size={12} /> +100
                  </span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu toggle button */}
          <div className="flex md:hidden items-center gap-2">
            {user && (
              <button
                onClick={() => setTopupModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/50 text-amber-400 text-xs font-bold"
              >
                <CoinIcon size={16} />
                <span>{coinBalance !== null ? coinBalance : 100}</span>
              </button>
            )}
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
          <div className="md:hidden bg-stone-900 border-b border-stone-800 px-4 pt-3 pb-5 space-y-2.5">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-stone-200 font-medium hover:text-orange-400"
            >
              Live Darshan
            </Link>
            <Link
              href="/#upcoming"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-stone-200 font-medium hover:text-orange-400"
            >
              Schedule
            </Link>
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-stone-200 font-medium hover:text-orange-400"
            >
              About Us
            </Link>
            <Link
              href="/faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-stone-200 font-medium hover:text-orange-400"
            >
              FAQ
            </Link>
            {user && (
              <>
                <Link
                  href="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-stone-200 font-medium hover:text-orange-400"
                >
                  My Profile & Settings
                </Link>
                <Link
                  href="/wallet/history"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-stone-200 font-medium hover:text-orange-400"
                >
                  Coin Ledger & Transactions
                </Link>
              </>
            )}
            {user?.role === 'STREAMER' && (
              <>
                <Link
                  href="/studio/create"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-orange-400 font-semibold flex items-center gap-2"
                >
                  <Video className="w-4 h-4" /> Pandit Studio (Go Live)
                </Link>
                <Link
                  href="/streamer/earnings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-amber-400 font-semibold flex items-center gap-2"
                >
                  <CoinIcon size={16} /> Pandit Earnings & Dakshina
                </Link>
              </>
            )}
            {user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-amber-400 font-semibold flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" /> Admin Console
              </Link>
            )}
            {user?.role === 'VIEWER' && (
              <Link
                href="/streamer/apply"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-stone-300 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-orange-400" /> Apply as Pandit
              </Link>
            )}
            <div className="pt-3 border-t border-stone-800">
              {user ? (
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <Link
                      href="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm text-stone-200 font-medium flex items-center gap-1.5 hover:text-orange-400"
                    >
                      <PranamIcon size={16} /> {user.name}
                    </Link>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setTopupModalOpen(true);
                      }}
                      className="text-xs text-amber-400 font-bold flex items-center gap-1 mt-1 text-left"
                    >
                      <CoinIcon size={14} /> {coinBalance !== null ? coinBalance : 100} Coins (Tap to recharge)
                    </button>
                  </div>
                  <button onClick={handleLogout} className="text-sm text-red-400 font-medium hover:text-red-300">
                    Log Out
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2 bg-stone-800 rounded-lg text-sm text-white"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2 bg-orange-600 rounded-lg text-sm text-white font-medium"
                  >
                    Join Free (+100 Coins)
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <CoinTopupModal
        isOpen={topupModalOpen}
        onClose={() => setTopupModalOpen(false)}
        onSuccess={(newBal) => setCoinBalance(newBal)}
      />
    </>
  );
}
