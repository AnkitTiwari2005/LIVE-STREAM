'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, Shield, Zap } from 'lucide-react';
import { CoinIcon, DiyaIcon, PranamIcon } from '@/components/icons/SpiritualIcons';
import {
  DEFAULT_COIN_PACKAGES,
  DEFAULT_TOPUP_SKU,
  COINS_PER_MINUTE,
  getCoinPackageDisplay,
  syncLocalWalletBalance,
} from '@/lib/economy';
import { useLang } from '@/lib/i18n/context';

interface CoinTopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newBalance: number) => void;
  initialSku?: string;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function CoinTopupModal({ isOpen, onClose, onSuccess, initialSku }: CoinTopupModalProps) {
  const { lang } = useLang();
  const L = (en: string, hi: string) => (lang === 'hi' ? hi : en);
  const [packages, setPackages] = useState(
    DEFAULT_COIN_PACKAGES.map((pkg) => ({
      sku: pkg.sku,
      name: pkg.name,
      coins: pkg.totalCoins,
      priceInr: pkg.priceInr,
      watchMinutes: pkg.watchMinutes,
      badge: pkg.badgeText,
      highlight: Boolean(pkg.highlight),
    })),
  );
  const [selectedSku, setSelectedSku] = useState(initialSku || DEFAULT_TOPUP_SKU);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialSku) setSelectedSku(initialSku);
  }, [initialSku]);

  React.useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    fetch(`${apiUrl}/wallet/packages`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPackages(
            data.map((pkg: any) => {
              const total = Number(pkg.totalCoins || pkg.coins);
              return {
                sku: pkg.sku,
                name: pkg.name,
                coins: total,
                priceInr: Number(pkg.priceInr),
                watchMinutes: Math.floor(total / COINS_PER_MINUTE),
                badge: pkg.badgeText || null,
                highlight: pkg.sku === DEFAULT_TOPUP_SKU,
              };
            }),
          );
          if (!initialSku) {
            const hasDefault = data.some((p: any) => p.sku === DEFAULT_TOPUP_SKU);
            if (!hasDefault) {
              setSelectedSku(data[0].sku);
            }
          }
        }
      })
      .catch(() => {});
  }, [initialSku]);

  if (!isOpen) return null;

  const handlePurchase = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      // 1. Create topup order
      const res = await fetch(`${apiUrl}/wallet/topup/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ packageSku: selectedSku }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || L('Failed to create recharge order', 'रिचार्ज ऑर्डर बनाने में समस्या हुई'));
      }

      const orderData = await res.json();

      // 2. Razorpay checkout
      if (orderData.provider === 'RAZORPAY') {
        const loaded = await loadRazorpayScript();
        if (!loaded || !(window as any).Razorpay) {
          throw new Error(L('Payment gateway failed to load. Please check your internet connection or disable ad-blockers.', 'पेमेंट गेटवे लोड नहीं हो सका। कृपया इंटरनेट कनेक्शन जांचें या एड-ब्लॉकर बंद करें।'));
        }

        const rzp = new (window as any).Razorpay({
          key: orderData.keyId,
          amount: Math.round(orderData.amountInr * 100),
          currency: 'INR',
          name: L('Param Darshan Coins', 'परम दर्शन कॉइन'),
          description: `${L('Sacred Coins:', 'पवित्र कॉइन:')} ${orderData.packageName}`,
          order_id: orderData.orderId,
          handler: async (response: any) => {
            await verifyPayment(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature);
          },
          theme: { color: '#f59e0b' },
        });

        rzp.on('payment.failed', function (resp: any) {
          setError(resp.error?.description || L('Payment was unsuccessful at the gateway', 'पेमेंट गेटवे पर भुगतान असफल रहा'));
          setLoading(false);
        });

        rzp.open();
        setLoading(false);
      } else {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(L('Online payments are currently unavailable. Please try again shortly.', 'ऑनलाइन भुगतान वर्तमान में उपलब्ध नहीं है। कृपया कुछ देर बाद पुनः प्रयास करें।'));
        }
        await verifyPayment(orderData.orderId, `pay_mock_${Date.now()}`);
      }
    } catch (err: any) {
      setError(err.message || L('Payment initiation failed', 'भुगतान प्रारंभ नहीं हो सका'));
      setLoading(false);
    }
  };

  const verifyPayment = async (orderId: string, paymentId: string, signature?: string) => {
    const token = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

    try {
      const res = await fetch(`${apiUrl}/wallet/topup/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId, paymentId, signature }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || L('Payment verification failed', 'भुगतान सत्यापन असफल रहा'));

      if (typeof data.newBalance === 'number') {
        syncLocalWalletBalance(data.newBalance);
      }

      setSuccessMessage(data.message || L(`Successfully added ${data.coinsAdded} Coins!`, `${data.coinsAdded} कॉइन सफलतापूर्वक जोड़े गए!`));
      if (onSuccess) onSuccess(data.newBalance);

      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || L('Failed to verify recharge payment', 'रिचार्ज भुगतान सत्यापित नहीं हो सका'));
    } finally {
      setLoading(false);
    }
  };

  const selectedPackage = packages.find((p) => p.sku === selectedSku) || packages[0];

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-obsidian-deep border border-stone-200 dark:border-gold/30 rounded-3xl p-5 sm:p-8 shadow-2xl overflow-hidden my-auto">
        <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <CoinIcon size={32} />
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-white">{L('Recharge Sacred Coins', 'पवित्र कॉइन रिचार्ज करें')}</h2>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                {L(`150 Base Coins = ₹100 • ${COINS_PER_MINUTE} Coins = 1 Min Live Darshan`, `150 मूल कॉइन = ₹100 • ${COINS_PER_MINUTE} कॉइन = 1 मिनट लाइव दर्शन`)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={L('Close', 'बंद करें')}
            className="p-2 rounded-full text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="relative z-10 mt-4 p-3.5 bg-red-50 dark:bg-red-950/80 border border-red-300 dark:border-red-800 rounded-xl text-xs text-red-900 dark:text-red-200">
            {error}
          </div>
        )}

        {successMessage ? (
          <div className="relative z-10 my-8 text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-stone-900 dark:text-white mb-2">{successMessage}</h3>
            <p className="text-sm text-stone-600 dark:text-stone-300 flex items-center justify-center gap-1.5">
              <span>{L('May you receive peace, divine grace, and spiritual blessings', 'आपको शांति, दिव्य कृपा एवं आध्यात्मिक आशीर्वाद प्राप्त हो')}</span>
              <PranamIcon size={18} />
            </p>
          </div>
        ) : (
          <div className="relative z-10 mt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {packages.map((pkg) => {
                const isSelected = selectedSku === pkg.sku;
                const disp = getCoinPackageDisplay({ sku: pkg.sku, name: pkg.name, badgeText: pkg.badge }, lang);
                return (
                  <div
                    key={pkg.sku}
                    onClick={() => setSelectedSku(pkg.sku)}
                    className={`relative p-4 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-amber-50 dark:bg-gold/15 border-amber-500 dark:border-gold shadow-lg shadow-gold/25 ring-1 ring-amber-400 dark:ring-gold/40'
                        : 'bg-stone-50 dark:bg-obsidian-soft border-stone-200 dark:border-gold/15 hover:border-amber-400 dark:hover:border-gold/40'
                    }`}
                  >
                    {disp.badge && (
                      <span className="absolute -top-2.5 right-3 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-gold text-obsidian shadow-sm">
                        {disp.badge}
                      </span>
                    )}

                    {/* Top line: Package Name */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                        {disp.title}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold text-amber-800 dark:text-gold-pale flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-gold" /> {L('Selected', 'चयनित')}
                        </span>
                      )}
                    </div>

                    {/* Prominent Rupee Price & Coin Count */}
                    <div className="flex items-baseline justify-between my-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg sm:text-xl font-bold text-amber-700 dark:text-gold-pale">₹</span>
                        <span className="font-serif text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-white tracking-tight">
                          {pkg.priceInr.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium ml-0.5">{L('INR', 'रुपये')}</span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-amber-100/80 dark:bg-gold/10 border border-amber-300 dark:border-gold/30 px-2.5 py-1 rounded-xl">
                        <CoinIcon size={18} />
                        <span className="font-serif text-lg font-bold text-amber-900 dark:text-gold-pale">{pkg.coins}</span>
                        <span className="text-[10px] uppercase font-bold text-stone-700 dark:text-stone-300">{L('Coins', 'कॉइन')}</span>
                      </div>
                    </div>

                    {/* Watch time & Rate */}
                    <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-800/80 text-[11px] text-stone-600 dark:text-stone-400">
                      <span className="flex items-center gap-1 text-stone-700 dark:text-stone-300 font-medium">
                        <DiyaIcon size={13} />
                        {L(`${pkg.watchMinutes} Mins Live Darshan`, `${pkg.watchMinutes} मिनट लाइव दर्शन`)}
                      </span>
                      <span className="text-[10px] text-stone-600 dark:text-stone-400 font-medium">
                        {L(`${COINS_PER_MINUTE} C / min`, `${COINS_PER_MINUTE} कॉइन / मिनट`)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-col gap-3">
              <button
                onClick={handlePurchase}
                disabled={loading}
                className="w-full py-4 px-4 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full shadow-lg shadow-gold/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm tracking-wide"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-obsidian" />
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-obsidian" />
                    <span>
                      {L(
                        `Proceed to Recharge ₹${(selectedPackage?.priceInr || 500).toLocaleString('en-IN')}`,
                        `₹${(selectedPackage?.priceInr || 500).toLocaleString('en-IN')} का रिचार्ज करें`,
                      )}
                    </span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-4 text-[11px] text-stone-600 dark:text-stone-400">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-700 dark:text-emerald-400" /> {L('Instant UPI & Net Banking', 'त्वरित UPI एवं नेटबैंकिंग')}
                </span>
                <span>•</span>
                <span>{L('100% Encrypted & Safe', '100% एन्क्रिप्टेड एवं सुरक्षित')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
