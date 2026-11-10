'use client';

import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, Shield, Zap } from 'lucide-react';
import { CoinIcon, OmIcon, DiyaIcon, PranamIcon } from '@/components/icons/SpiritualIcons';

interface CoinTopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newBalance: number) => void;
  initialSku?: string;
}

const PACKAGES = [
  {
    sku: 'shubh_100',
    name: 'Shubh Starter',
    coins: 100,
    priceInr: 200,
    watchTime: '20 Mins Live Darshan',
    badge: null,
  },
  {
    sku: 'bhakti_275',
    name: 'Bhakti Pack',
    coins: 275,
    priceInr: 500,
    watchTime: '55 Mins Live Darshan',
    badge: '+10% Bonus',
  },
  {
    sku: 'siddhi_600',
    name: 'Siddhi Pack',
    coins: 600,
    priceInr: 1000,
    watchTime: '120 Mins (2 Hours)',
    badge: 'Most Popular',
    highlight: true,
  },
  {
    sku: 'mahodadhi_1500',
    name: 'Mahodadhi Pack',
    coins: 1500,
    priceInr: 2100,
    watchTime: '300 Mins (5 Hours)',
    badge: 'Best Value',
  },
];

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
  const [packages, setPackages] = useState(PACKAGES);
  const [selectedSku, setSelectedSku] = useState(initialSku || 'siddhi_600');
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
            data.map((pkg: any) => ({
              sku: pkg.sku,
              name: pkg.name,
              coins: pkg.totalCoins || pkg.coins,
              priceInr: pkg.priceInr,
              watchTime: `${Math.floor((pkg.totalCoins || pkg.coins) / 5)} Mins Live Darshan`,
              badge: pkg.badgeText || null,
              highlight: pkg.sku === 'siddhi_600',
            })),
          );
        }
      })
      .catch(() => {});
  }, []);

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
        throw new Error(errData.message || 'Failed to create recharge order');
      }

      const orderData = await res.json();

      // 2. Razorpay checkout
      if (orderData.provider === 'RAZORPAY') {
        const loaded = await loadRazorpayScript();
        if (!loaded || !(window as any).Razorpay) {
          throw new Error('Payment gateway failed to load. Please check your internet connection or disable ad-blockers.');
        }

        const rzp = new (window as any).Razorpay({
          key: orderData.keyId,
          amount: Math.round(orderData.amountInr * 100),
          currency: 'INR',
          name: 'Shubhdarshan Coins',
          description: `Sacred Coins: ${orderData.packageName}`,
          order_id: orderData.orderId,
          handler: async (response: any) => {
            await verifyPayment(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature);
          },
          theme: { color: '#f59e0b' },
        });

        rzp.on('payment.failed', function (resp: any) {
          setError(resp.error?.description || 'Payment was unsuccessful at the gateway');
          setLoading(false);
        });

        rzp.open();
        setLoading(false);
      } else {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Online payments are currently unavailable. Please try again shortly.');
        }
        // Direct sandbox / test verification only in development
        await verifyPayment(orderData.orderId, `pay_mock_${Date.now()}`);
      }
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed');
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
      if (!res.ok) throw new Error(data.message || 'Payment verification failed');

      // Update local storage user wallet balance
      const storedUser = localStorage.getItem('pooja_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.wallet) {
          parsed.wallet.balanceCoins = data.newBalance;
        } else {
          parsed.wallet = { balanceCoins: data.newBalance };
        }
        localStorage.setItem('pooja_user', JSON.stringify(parsed));
      }

      setSuccessMessage(data.message || `Successfully added ${data.coinsAdded} Coins!`);
      if (onSuccess) onSuccess(data.newBalance);

      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to verify recharge payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-obsidian-deep border border-stone-200 dark:border-gold/30 rounded-3xl p-5 sm:p-8 shadow-2xl overflow-hidden my-auto">
        {/* Sacred ambient background glow */}
        <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <CoinIcon size={32} />
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-white">Recharge Sacred Coins</h2>
              <p className="text-xs text-stone-600 dark:text-stone-400">5 Coins = 1 Minute of Auspicious Public Live Darshan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="relative z-10 mt-4 p-3.5 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-200">
            {error}
          </div>
        )}

        {successMessage ? (
          <div className="relative z-10 my-8 text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-white mb-2">{successMessage}</h3>
            <p className="text-sm text-stone-300 flex items-center justify-center gap-1.5">
              <span>May you receive peace, divine grace, and spiritual blessings</span>
              <PranamIcon size={18} />
            </p>
          </div>
        ) : (
          <div className="relative z-10 mt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {packages.map((pkg) => {
                const isSelected = selectedSku === pkg.sku;
                return (
                  <div
                    key={pkg.sku}
                    onClick={() => setSelectedSku(pkg.sku)}
                    className={`relative p-4 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-gold/15 border-gold shadow-lg shadow-gold/25 ring-1 ring-gold/40'
                        : 'bg-stone-50 dark:bg-obsidian-soft border-stone-200 dark:border-gold/15 hover:border-amber-400 dark:hover:border-gold/40'
                    }`}
                  >
                    {pkg.badge && (
                      <span className="absolute -top-2.5 right-3 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-gold text-obsidian shadow-sm">
                        {pkg.badge}
                      </span>
                    )}

                    {/* Top line: Package Name */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                        {pkg.name}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold text-gold-pale flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-gold" /> Selected
                        </span>
                      )}
                    </div>

                    {/* Prominent Rupee Price & Coin Count */}
                    <div className="flex items-baseline justify-between my-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg sm:text-xl font-bold text-gold-pale">₹</span>
                        <span className="font-serif text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                          {pkg.priceInr.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] text-stone-400 font-medium ml-0.5">INR</span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-gold/10 border border-gold/30 px-2.5 py-1 rounded-xl">
                        <CoinIcon size={18} />
                        <span className="font-serif text-lg font-bold text-gold-pale">{pkg.coins}</span>
                        <span className="text-[10px] uppercase font-bold text-stone-300">Coins</span>
                      </div>
                    </div>

                    {/* Watch time & Rate */}
                    <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-800/80 text-[11px] text-stone-600 dark:text-stone-400">
                      <span className="flex items-center gap-1 text-stone-700 dark:text-stone-300 font-medium">
                        <DiyaIcon size={13} />
                        {pkg.watchTime}
                      </span>
                      <span className="text-[10px] text-stone-600 dark:text-stone-400 font-medium">
                        5 C / min
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
                      Proceed to Recharge ₹{(packages.find((p) => p.sku === selectedSku)?.priceInr || 1000).toLocaleString('en-IN')}
                    </span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-4 text-[11px] text-stone-600 dark:text-stone-400">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-700 dark:text-emerald-400" /> Instant UPI &amp; Net Banking
                </span>
                <span>•</span>
                <span>100% Encrypted &amp; Safe</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
