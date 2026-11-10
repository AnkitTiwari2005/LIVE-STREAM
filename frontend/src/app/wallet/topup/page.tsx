'use client';

import React, { useState, useEffect } from 'react';
import { CoinTopupModal } from '@/components/CoinTopupModal';
import { Zap, ShieldCheck, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { OmIcon, CoinIcon, DiyaIcon, PranamIcon } from '@/components/icons/SpiritualIcons';

const PACKAGES = [
  {
    sku: 'shubh_100',
    title: 'Shubh Starter',
    coins: 100,
    priceInr: 200,
    bonusCoins: 0,
    minutesDarshan: 20,
    badge: 'Quick Darshan',
  },
  {
    sku: 'bhakti_275',
    title: 'Bhakti Pack',
    coins: 250,
    priceInr: 500,
    bonusCoins: 25,
    minutesDarshan: 50,
    badge: '+10% Bonus',
  },
  {
    sku: 'siddhi_600',
    title: 'Siddhi Pack',
    coins: 500,
    priceInr: 1000,
    bonusCoins: 100,
    minutesDarshan: 120,
    badge: 'Most Popular (+20% Bonus)',
  },
  {
    sku: 'mahodadhi_1500',
    title: 'Mahodadhi Pack',
    coins: 1200,
    priceInr: 2100,
    bonusCoins: 300,
    minutesDarshan: 300,
    badge: 'Best Value (+25% Bonus)',
  },
];

export default function WalletTopupPage() {
  const [packages, setPackages] = useState(PACKAGES);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState('siddhi_600');
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    fetch(`${apiUrl}/wallet/packages`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPackages(
            data.map((pkg: any) => ({
              sku: pkg.sku,
              title: pkg.name,
              coins: pkg.coins,
              priceInr: pkg.priceInr,
              bonusCoins: pkg.bonusCoins || 0,
              minutesDarshan: Math.floor((pkg.totalCoins || pkg.coins) / 5),
              badge: pkg.badgeText || (pkg.bonusCoins > 0 ? `+${pkg.bonusCoins} Bonus` : 'Sacred Pack'),
            })),
          );
        }
      })
      .catch(() => {});

    const token = localStorage.getItem('pooja_token');
    if (token) {
      fetch(`${apiUrl}/wallet/balance`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && typeof data.balanceCoins === 'number') {
            setBalance(data.balanceCoins);
          }
        })
        .catch(() => {});
    }
  }, []);

  return (
    <div className="min-h-screen bg-obsidian text-foreground py-10 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-5 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-gold-pale mb-4">
            <CoinIcon size={16} />
            Sacred Darshan Wallet
          </p>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Your balance of{' '}
            <span className="gold-text italic font-serif">devotional currency</span>
          </h1>
          <p className="text-stone-300 text-xs sm:text-base max-w-xl mx-auto mt-3 leading-relaxed">
            Participate in live temple rituals, aartis, and astrology consultations worldwide. 5 Coins = 1 Minute of live darshan.
          </p>

          {balance !== null && (
            <div className="mt-8 inline-flex items-center gap-4 bg-obsidian-soft border border-gold/30 px-6 py-3.5 rounded-2xl shadow-xl">
              <CoinIcon size={34} />
              <div className="text-left">
                <span className="text-[11px] text-stone-400 block font-bold uppercase tracking-wider">
                  Available Wallet Balance
                </span>
                <span className="font-serif text-2xl font-bold text-gold">
                  {balance} Coins{' '}
                  <span className="text-xs text-stone-300 font-sans font-normal">
                    ({Math.floor(balance / 5)} mins darshan available)
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Package Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
          {packages.map((pkg) => (
            <div
              key={pkg.sku}
              className="bg-obsidian-soft border border-gold/15 hover:border-gold/50 rounded-3xl p-6 shadow-xl flex flex-col justify-between transition-all hover:scale-[1.02] relative group overflow-hidden"
            >
              {pkg.badge && (
                <div className="absolute top-0 right-0 bg-gold text-obsidian text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-md">
                  {pkg.badge}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CoinIcon size={24} />
                  <h3 className="font-serif text-lg font-bold text-white">{pkg.title}</h3>
                </div>

                <div className="mt-4 mb-4">
                  <span className="font-serif text-4xl font-bold text-gold-pale">₹{pkg.priceInr}</span>
                  <span className="text-xs text-stone-400 ml-1.5">all-inclusive</span>
                </div>

                <div className="space-y-2.5 text-xs text-stone-300 border-t border-stone-800/80 pt-4">
                  <div className="flex items-center gap-2 font-bold text-gold">
                    <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
                    <span>{pkg.coins} Sacred Coins</span>
                  </div>
                  <div className="flex items-center gap-2 text-stone-300">
                    <Clock className="w-4 h-4 text-gold-soft shrink-0" />
                    <span>{pkg.minutesDarshan} Mins Live Darshan</span>
                  </div>
                  {pkg.bonusCoins > 0 && (
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
                      <DiyaIcon size={14} />
                      <span>+{pkg.bonusCoins} Bonus Coins</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedSku(pkg.sku);
                  setModalOpen(true);
                }}
                className="mt-6 w-full py-3 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-obsidian" />
                <span>Recharge for ₹{pkg.priceInr}</span>
              </button>
            </div>
          ))}
        </div>

        {/* Trust & RBI Compliance Assurance */}
        <div className="bg-obsidian-soft border border-gold/15 rounded-3xl p-8 shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center text-xs text-stone-300">
            <div className="flex flex-col items-center">
              <Zap className="w-7 h-7 text-gold mb-3" />
              <span className="font-serif text-base font-bold text-white mb-1">Instant Activation</span>
              <p className="text-stone-400 text-xs leading-relaxed">
                Darshan coins credit to your balance within 2 seconds of UPI/Card approval.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <ShieldCheck className="w-7 h-7 text-emerald-700 dark:text-emerald-400 mb-3" />
              <span className="font-serif text-base font-bold text-white mb-1">RBI Closed-Loop Wallet</span>
              <p className="text-stone-400 text-xs leading-relaxed">
                Strict compliance with RBI PPI circulars: platform currency strictly dedicated to devotional darshan.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <PranamIcon size={28} className="mb-3" />
              <span className="font-serif text-base font-bold text-white mb-1">100% Secure Checkout</span>
              <p className="text-stone-400 text-xs leading-relaxed">
                Razorpay 256-bit SSL encrypted gateway supporting UPI, GPay, PhonePe, Cards &amp; NetBanking.
              </p>
            </div>
          </div>
        </div>

        <CoinTopupModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          initialSku={selectedSku}
          onSuccess={(newBal) => setBalance(newBal)}
        />
      </div>
    </div>
  );
}
