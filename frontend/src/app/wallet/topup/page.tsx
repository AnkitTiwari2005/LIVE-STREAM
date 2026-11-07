'use client';

import React, { useState, useEffect } from 'react';
import { CoinTopupModal } from '@/components/CoinTopupModal';
import { Zap, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/60 text-amber-400 text-xs font-bold border border-amber-800/60 mb-3">
            <CoinIcon size={16} /> Shubhdarshan Sacred Darshan Wallet
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <OmIcon size={36} />
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Sacred Darshan Coins
            </h1>
          </div>
          <p className="text-stone-400 text-sm sm:text-base max-w-xl mx-auto mt-2">
            Participate in live temple rituals, aartis, and astrology consultations worldwide. 5 Coins = 1 Minute of live darshan.
          </p>

          {balance !== null && (
            <div className="mt-6 inline-flex items-center gap-3 bg-stone-900 border border-stone-800 px-5 py-3 rounded-2xl shadow-xl">
              <CoinIcon size={32} />
              <div className="text-left">
                <span className="text-xs text-stone-400 block font-medium">Your Available Balance</span>
                <span className="text-lg font-black text-amber-400">
                  {balance} Coins ({Math.floor(balance / 5)} mins darshan available)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Package Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {packages.map((pkg) => (
            <div
              key={pkg.sku}
              className="bg-stone-900 border border-stone-800 hover:border-orange-500/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between transition-all hover:scale-[1.02] relative group overflow-hidden"
            >
              {pkg.badge && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-orange-600 to-amber-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-bl-xl shadow-md">
                  {pkg.badge}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CoinIcon size={24} />
                  <h3 className="text-base font-bold text-white">{pkg.title}</h3>
                </div>

                <div className="mt-4 mb-4">
                  <span className="text-3xl font-black text-white">₹{pkg.priceInr}</span>
                  <span className="text-xs text-stone-400 ml-1">all-inclusive</span>
                </div>

                <div className="space-y-2.5 text-xs text-stone-300 border-t border-stone-800 pt-4">
                  <div className="flex items-center gap-2 font-bold text-amber-400">
                    <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>{pkg.coins} Sacred Coins</span>
                  </div>
                  <div className="flex items-center gap-2 text-stone-300">
                    <Clock className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>{pkg.minutesDarshan} Mins Live Darshan</span>
                  </div>
                  {pkg.bonusCoins > 0 && (
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold">
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
                className="mt-6 w-full py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>Recharge for ₹{pkg.priceInr}</span>
              </button>
            </div>
          ))}
        </div>

        {/* Trust & RBI Compliance Assurance */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs text-stone-300">
            <div className="flex flex-col items-center">
              <Zap className="w-6 h-6 text-amber-400 mb-2" />
              <span className="font-bold text-white text-sm mb-1">Instant Activation</span>
              <p className="text-stone-400 text-[11px]">Darshan coins credit to your balance within 2 seconds of UPI/Card approval.</p>
            </div>
            <div className="flex flex-col items-center">
              <ShieldCheck className="w-6 h-6 text-green-400 mb-2" />
              <span className="font-bold text-white text-sm mb-1">RBI Closed-Loop Wallet</span>
              <p className="text-stone-400 text-[11px]">Strict compliance with RBI PPI circulars: platform currency strictly for devotional darshan.</p>
            </div>
            <div className="flex flex-col items-center">
              <PranamIcon size={24} className="mb-2" />
              <span className="font-bold text-white text-sm mb-1">100% Secure Checkout</span>
              <p className="text-stone-400 text-[11px]">Razorpay 256-bit SSL encrypted gateway supporting UPI, GPay, PhonePe, Cards & NetBanking.</p>
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
  );
}