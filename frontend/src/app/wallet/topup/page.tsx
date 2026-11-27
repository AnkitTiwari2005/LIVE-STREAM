'use client';

import React, { useState, useEffect } from 'react';
import { CoinTopupModal } from '@/components/CoinTopupModal';
import { Zap, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';
import { CoinIcon, DiyaIcon, PranamIcon } from '@/components/icons/SpiritualIcons';
import {
  DEFAULT_COIN_PACKAGES,
  DEFAULT_TOPUP_SKU,
  COINS_PER_MINUTE,
  getCoinPackageDisplay,
  syncLocalWalletBalance,
} from '@/lib/economy';
import { useLang } from '@/lib/i18n/context';
import { formatCoins } from '@/lib/i18n/format';

export default function WalletTopupPage() {
  const { lang } = useLang();
  const L = (en: string, hi: string) => (lang === 'hi' ? hi : en);
  const [packages, setPackages] = useState(
    DEFAULT_COIN_PACKAGES.map((pkg) => ({
      sku: pkg.sku,
      title: pkg.name,
      coins: pkg.coins,
      priceInr: pkg.priceInr,
      bonusCoins: pkg.bonusCoins,
      minutesDarshan: pkg.watchMinutes,
      badge: pkg.badgeText || 'Sacred Pack',
    })),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState(DEFAULT_TOPUP_SKU);
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
              priceInr: Number(pkg.priceInr),
              bonusCoins: pkg.bonusCoins || 0,
              minutesDarshan: Math.floor((pkg.totalCoins || pkg.coins) / COINS_PER_MINUTE),
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
            syncLocalWalletBalance(data.balanceCoins);
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
            {L('Sacred Darshan Wallet', 'पवित्र दर्शन वॉलेट')}
          </p>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white tracking-tight">
            {lang === 'hi' ? (
              <>
                आपकी <span className="gold-text italic font-serif">भक्ति मुद्रा</span> शेष राशि
              </>
            ) : (
              <>
                Your balance of{' '}
                <span className="gold-text italic font-serif">devotional currency</span>
              </>
            )}
          </h1>
          <p className="text-stone-300 text-xs sm:text-base max-w-xl mx-auto mt-3 leading-relaxed">
            {L(
              `Participate in live temple rituals, offer Sacred Dakshina, and watch broadcasts worldwide. 150 Base Coins = ₹100 • ${COINS_PER_MINUTE} Coins = 1 Minute of live darshan.`,
              `लाइव मंदिर अनुष्ठानों में भाग लें, पवित्र दक्षिणा अर्पित करें और विश्वभर से प्रसारण देखें। 150 मूल कॉइन = ₹100 • ${COINS_PER_MINUTE} कॉइन = 1 मिनट लाइव दर्शन।`,
            )}
          </p>

          {balance !== null && (
            <div className="mt-8 inline-flex items-center gap-4 bg-obsidian-soft border border-gold/30 px-6 py-3.5 rounded-2xl shadow-xl">
              <CoinIcon size={34} />
              <div className="text-left">
                <span className="text-[11px] text-stone-400 block font-bold uppercase tracking-wider">
                  {L('Available Wallet Balance', 'उपलब्ध वॉलेट शेष')}
                </span>
                <span className="font-serif text-2xl font-bold text-gold">
                  {formatCoins(balance, lang)}{' '}
                  <span className="text-xs text-stone-300 font-sans font-normal">
                    ({L(`${Math.floor(balance / COINS_PER_MINUTE)} mins darshan available`, `${Math.floor(balance / COINS_PER_MINUTE)} मिनट दर्शन उपलब्ध`)})
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Package Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
          {packages.map((pkg) => {
            const disp = getCoinPackageDisplay(
              { sku: pkg.sku, name: pkg.title, bonusCoins: pkg.bonusCoins, badgeText: pkg.badge },
              lang,
            );
            return (
            <div
              key={pkg.sku}
              className="bg-obsidian-soft border border-gold/15 hover:border-gold/50 rounded-3xl p-6 shadow-xl flex flex-col justify-between transition-all hover:scale-[1.02] relative group overflow-hidden"
            >
              {disp.badge && (
                <div className="absolute top-0 right-0 bg-gold text-obsidian text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-md">
                  {disp.badge}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CoinIcon size={24} />
                  <h3 className="font-serif text-lg font-bold text-white">{disp.title}</h3>
                </div>

                <div className="mt-4 mb-4">
                  <span className="font-serif text-4xl font-bold text-gold-pale">₹{pkg.priceInr.toLocaleString('en-IN')}</span>
                  <span className="text-xs text-stone-400 ml-1.5">{L('all-inclusive', 'सभी कर सहित')}</span>
                </div>

                <div className="space-y-2.5 text-xs text-stone-300 border-t border-stone-800/80 pt-4">
                  <div className="flex items-center gap-2 font-bold text-gold">
                    <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
                    <span>{L(`${pkg.coins} Sacred Coins`, `${pkg.coins} पवित्र कॉइन`)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-stone-300">
                    <Clock className="w-4 h-4 text-gold-soft shrink-0" />
                    <span>{L(`${pkg.minutesDarshan} Mins Live Darshan`, `${pkg.minutesDarshan} मिनट लाइव दर्शन`)}</span>
                  </div>
                  {pkg.bonusCoins > 0 && (
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
                      <DiyaIcon size={14} />
                      <span>{L(`+${pkg.bonusCoins} Bonus Coins`, `+${pkg.bonusCoins} बोनस कॉइन`)}</span>
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
                <span>{L(`Recharge for ₹${pkg.priceInr.toLocaleString('en-IN')}`, `₹${pkg.priceInr.toLocaleString('en-IN')} में रिचार्ज करें`)}</span>
              </button>
            </div>
            );
          })}
        </div>

        {/* Trust & RBI Compliance Assurance */}
        <div className="bg-obsidian-soft border border-gold/15 rounded-3xl p-8 shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center text-xs text-stone-300">
            <div className="flex flex-col items-center">
              <Zap className="w-7 h-7 text-gold mb-3" />
              <span className="font-serif text-base font-bold text-white mb-1">{L('Instant Activation', 'तत्काल सक्रियण')}</span>
              <p className="text-stone-400 text-xs leading-relaxed">
                {L('Darshan coins credit to your balance within 2 seconds of UPI/Card approval.', 'UPI/कार्ड स्वीकृति के 2 सेकंड के भीतर आपके वॉलेट में दर्शन कॉइन जुड़ जाते हैं।')}
              </p>
            </div>
            <div className="flex flex-col items-center">
              <ShieldCheck className="w-7 h-7 text-emerald-700 dark:text-emerald-400 mb-3" />
              <span className="font-serif text-base font-bold text-white mb-1">{L('RBI Closed-Loop Wallet', 'RBI क्लोज्ड-लूप वॉलेट')}</span>
              <p className="text-stone-400 text-xs leading-relaxed">
                {L(
                  'Strict compliance with RBI PPI circulars: platform currency dedicated to live darshan & Dakshina. Top-up coin packs are final and non-refundable (normally and after account deletion).',
                  'RBI PPI दिशानिर्देशों के पूर्ण अनुरूप: यह मुद्रा केवल लाइव दर्शन एवं दक्षिणा हेतु है। टॉप-अप कॉइन पैक अंतिम हैं तथा सामान्यतः या खाता हटाने के बाद वापस नहीं किए जाते।',
                )}
              </p>
            </div>
            <div className="flex flex-col items-center">
              <PranamIcon size={28} className="mb-3" />
              <span className="font-serif text-base font-bold text-white mb-1">{L('100% Secure Checkout', '100% सुरक्षित चेकआउट')}</span>
              <p className="text-stone-400 text-xs leading-relaxed">
                {L('Razorpay 256-bit SSL encrypted gateway supporting UPI, GPay, PhonePe, Cards & NetBanking.', 'UPI, GPay, PhonePe, कार्ड और नेटबैंकिंग समर्थित Razorpay 256-बिट SSL एन्क्रिप्टेड गेटवे।')}
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
