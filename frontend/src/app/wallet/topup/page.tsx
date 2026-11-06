'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CoinTopupModal } from '@/components/CoinTopupModal';
import { Sparkles, Shield, Zap } from 'lucide-react';
import { OmIcon, CoinIcon, DiyaIcon } from '@/components/icons/SpiritualIcons';

export default function WalletTopupPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('pooja_token');
    if (token) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
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
    <div className="min-h-screen bg-stone-950 text-white flex flex-col justify-between">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-12 w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/60 text-amber-400 text-xs font-bold border border-amber-800/60 mb-3">
            <CoinIcon size={16} /> Shubhdarshan Sacred Wallet
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <OmIcon size={36} />
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Sacred Darshan Coins
            </h1>
          </div>
          <p className="text-stone-400 text-sm sm:text-base max-w-lg mx-auto mt-2">
            Participate in live Vedic aarti, pujas, and astrological consultations. 5 Coins = 1 Minute of sacred public darshan.
          </p>

          {balance !== null && (
            <div className="mt-6 inline-flex items-center gap-3 bg-stone-900 border border-stone-800 px-5 py-3 rounded-2xl shadow-xl">
              <CoinIcon size={32} />
              <div className="text-left">
                <span className="text-xs text-stone-400 block font-medium">Your Current Balance</span>
                <span className="text-lg font-black text-amber-400">
                  {balance} Coins ({Math.floor(balance / 5)} mins darshan left)
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 text-center max-w-xl mx-auto shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

          <h2 className="text-xl font-bold mb-3 flex items-center justify-center gap-2">
            <DiyaIcon size={22} /> Recharge Your Wallet Instantly
          </h2>
          <p className="text-stone-400 text-xs sm:text-sm mb-6">
            Choose from Starter, Bhakti, Siddhi, or Mahodadhi coin packs with exclusive bonus coins and zero processing fees.
          </p>

          <button
            onClick={() => setModalOpen(true)}
            className="w-full py-4 px-6 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-2xl shadow-xl shadow-orange-950/50 flex items-center justify-center gap-2 text-base transition-all"
          >
            <Zap className="w-5 h-5 fill-white" />
            <span>Select Recharge Pack (Starting at ₹200)</span>
          </button>

          <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[11px] text-stone-400 pt-6 border-t border-stone-800">
            <div>
              <span className="block font-bold text-stone-200">Instant Credit</span>
              <span>Available in 2 secs</span>
            </div>
            <div>
              <span className="block font-bold text-stone-200">RBI Compliant</span>
              <span>Closed-loop wallet</span>
            </div>
            <div>
              <span className="block font-bold text-stone-200">100% Secure</span>
              <span>UPI / Cards / NetBanking</span>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <CoinTopupModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={(newBal) => setBalance(newBal)}
      />
    </div>
  );
}
