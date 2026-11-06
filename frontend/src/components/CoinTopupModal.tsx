'use client';

import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, Shield, Zap } from 'lucide-react';

interface CoinTopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newBalance: number) => void;
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
    badge: 'Most Popular 🔥',
    highlight: true,
  },
  {
    sku: 'mahodadhi_1500',
    name: 'Mahodadhi Pack',
    coins: 1500,
    priceInr: 2100,
    watchTime: '300 Mins (5 Hours)',
    badge: 'Best Value 🌟',
  },
];

export function CoinTopupModal({ isOpen, onClose, onSuccess }: CoinTopupModalProps) {
  const [selectedSku, setSelectedSku] = useState('siddhi_600');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

      // 2. Razorpay checkout or test completion
      if (orderData.provider === 'RAZORPAY' && typeof window !== 'undefined' && (window as any).Razorpay) {
        const rzp = new (window as any).Razorpay({
          key: orderData.keyId,
          amount: orderData.amountInr * 100,
          currency: 'INR',
          name: 'Shubhdarshan Coins',
          description: `Sacred Coins: ${orderData.packageName}`,
          order_id: orderData.orderId,
          handler: async (response: any) => {
            await verifyPayment(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature);
          },
          theme: { color: '#ea580c' },
        });
        rzp.open();
      } else {
        // Direct sandbox / test verification
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Sacred ambient background glow */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🪙</span>
            <div>
              <h2 className="text-lg font-bold text-white">Recharge Sacred Coins</h2>
              <p className="text-xs text-stone-400">5 Coins = 1 Minute of Auspicious Public Live Darshan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-200">
            {error}
          </div>
        )}

        {successMessage ? (
          <div className="my-8 text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{successMessage}</h3>
            <p className="text-sm text-stone-400">May you receive peace, divine grace, and spiritual blessings 🙏</p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PACKAGES.map((pkg) => {
                const isSelected = selectedSku === pkg.sku;
                return (
                  <div
                    key={pkg.sku}
                    onClick={() => setSelectedSku(pkg.sku)}
                    className={`relative p-4 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-gradient-to-br from-stone-800 to-amber-950/40 border-amber-500 shadow-lg shadow-amber-950/30'
                        : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    {pkg.badge && (
                      <span className="absolute -top-2.5 right-3 px-2 py-0.5 text-[10px] font-bold rounded-full bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-sm">
                        {pkg.badge}
                      </span>
                    )}

                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-stone-300">{pkg.name}</span>
                      <span className="text-sm font-extrabold text-amber-400">₹{pkg.priceInr}</span>
                    </div>

                    <div className="flex items-baseline gap-1.5 my-1">
                      <span className="text-2xl font-black text-white">{pkg.coins}</span>
                      <span className="text-xs text-amber-400/90 font-bold">Coins</span>
                    </div>

                    <p className="text-[11px] text-stone-400 flex items-center gap-1 mt-1">
                      <Sparkles className="w-3 h-3 text-orange-400" />
                      {pkg.watchTime}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-stone-800 flex flex-col gap-3">
              <button
                onClick={handlePurchase}
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Proceed to Recharge Now</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-4 text-[11px] text-stone-500">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-400" /> Instant UPI & Net Banking
                </span>
                <span>•</span>
                <span>100% Encrypted & Safe</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
