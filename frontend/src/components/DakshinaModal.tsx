'use client';

import React, { useState } from 'react';
import { Sparkles, X, CheckCircle2, ShieldCheck, CreditCard } from 'lucide-react';
import {
  OmIcon,
  DiyaIcon,
  LotusIcon,
  BellIcon,
  CoinIcon,
  AartiThaliIcon,
  PranamIcon,
} from '@/components/icons/SpiritualIcons';
import { apiFetch } from '@/lib/api';

interface DakshinaModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamId: string;
  streamerName: string;
  currentUser?: any;
}

const SHUBH_PRESETS = [
  { amount: 51, label: 'Shubh Bhent', Icon: CoinIcon },
  { amount: 101, label: 'Aarti Prasad', Icon: DiyaIcon },
  { amount: 251, label: 'Vedic Sankalp', Icon: LotusIcon },
  { amount: 501, label: 'Devotee Aradhana', Icon: BellIcon },
  { amount: 1100, label: 'Maha Arpan', Icon: AartiThaliIcon },
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

export const DakshinaModal: React.FC<DakshinaModalProps> = ({
  isOpen,
  onClose,
  streamId,
  streamerName,
  currentUser,
}) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(101);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [devoteeName, setDevoteeName] = useState<string>(currentUser?.name || '');
  const [gotra, setGotra] = useState<string>('');
  const [prayerMessage, setPrayerMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [successOffering, setSuccessOffering] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentFinalAmount = customAmount ? parseFloat(customAmount) || 0 : selectedAmount;

  const handleOffering = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentFinalAmount < 1) {
      setError('Please enter a valid offering amount (minimum ₹1)');
      return;
    }
    if (!devoteeName.trim()) {
      setError('Please enter your name for the sacred sankalp');
      return;
    }

    setLoading(true);
    setError(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

    try {
      // 1. Create order via apiFetch (automatically includes Bearer token)
      const orderData = await apiFetch('/payments/dakshina/create-order', {
        method: 'POST',
        body: JSON.stringify({
          streamId,
          amount: currentFinalAmount,
          devoteeName: devoteeName.trim(),
          prayerMessage: prayerMessage.trim() || undefined,
          gotra: gotra.trim() || undefined,
        }),
      });

      // 2. Razorpay checkout
      if (orderData.provider === 'RAZORPAY') {
        const loaded = await loadRazorpayScript();
        if (!loaded || !(window as any).Razorpay) {
          throw new Error('Payment gateway failed to load. Please check your connection or disable ad-blockers.');
        }

        const options = {
          key: orderData.keyId,
          amount: Math.round(currentFinalAmount * 100),
          currency: 'INR',
          name: 'Shubhdarshan Live',
          description: `Sacred Dakshina to ${streamerName}`,
          order_id: orderData.orderId,
          handler: async (response: any) => {
            try {
              const verifyData = await apiFetch('/payments/dakshina/verify', {
                method: 'POST',
                body: JSON.stringify({
                  orderId: orderData.orderId,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                }),
              });
              setSuccessOffering(verifyData.offering || orderData);
            } catch (err: any) {
              setError(err.message || 'Verification failed after payment');
            }
          },
          prefill: {
            name: devoteeName,
            email: currentUser?.email || 'devotee@shubhdarshan.com',
          },
          theme: { color: '#ea580c' },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (resp: any) {
          setError(resp.error?.description || 'Dakshina payment failed at gateway');
          setLoading(false);
        });
        rzp.open();
        setLoading(false);
      } else {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Online payments are currently unavailable. Please try again shortly.');
        }
        // Fallback / instant sandbox verification only in non-production
        const verifyData = await apiFetch('/payments/dakshina/verify', {
          method: 'POST',
          body: JSON.stringify({
            orderId: orderData.orderId,
            paymentId: `pay_sandbox_${Date.now()}`,
          }),
        });
        setSuccessOffering(verifyData.offering || orderData);
      }
    } catch (err: any) {
      setError(err.message || 'Error completing sacred dakshina');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccessOffering(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-obsidian-soft border border-gold/30 rounded-3xl p-6 shadow-2xl text-foreground max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleReset}
          className="absolute top-5 right-5 text-stone-400 hover:text-white p-1 rounded-full hover:bg-stone-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {successOffering ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-950/80 border border-green-700 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1 flex items-center justify-center gap-2">
              <OmIcon size={24} /> Dakshina Accepted
            </h2>
            <p className="text-orange-700 dark:text-orange-400 text-sm font-semibold mb-3 flex items-center justify-center gap-1.5">
              <span>May the divine blessings of {streamerName} be upon you</span>
              <PranamIcon size={16} />
            </p>
            <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 text-left text-xs space-y-2 mb-6">
              <div className="flex justify-between text-stone-400">
                <span>Devotee:</span>
                <span className="font-semibold text-white">{successOffering.devoteeName}</span>
              </div>
              {successOffering.gotra && (
                <div className="flex justify-between text-stone-400">
                  <span>Gotra:</span>
                  <span className="font-semibold text-white">{successOffering.gotra}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-400">
                <span>Offered Amount:</span>
                <span className="font-bold text-amber-800 dark:text-amber-400 text-sm">₹{Number(successOffering.amount)}</span>
              </div>
              {successOffering.prayerMessage && (
                <div className="pt-2 border-t border-stone-800 text-stone-300 italic">
                  &ldquo;{successOffering.prayerMessage}&rdquo;
                </div>
              )}
            </div>
            <button
              onClick={handleReset}
              className="w-full py-3 bg-orange-700 hover:bg-orange-600 text-white font-bold rounded-xl text-sm transition shadow-lg"
            >
              Return to Sacred Darshan
            </button>
          </div>
        ) : (
          <form onSubmit={handleOffering} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-stone-800 pb-4">
              <img src="/logo.png" alt="Shubhdarshan" className="w-8 h-8 object-contain drop-shadow" />
              <div>
                <h2 className="text-lg font-bold text-white">Offer Sacred Dakshina</h2>
                <p className="text-xs text-stone-400">
                  Support {streamerName} with your devout contribution
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-xs">
                {error}
              </div>
            )}

            {/* Presets */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-2">
                Select Shubh Arpan Amount
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {SHUBH_PRESETS.map((preset) => {
                  const isSelected = !customAmount && selectedAmount === preset.amount;
                  const Icon = preset.Icon;
                  return (
                    <button
                      key={preset.amount}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(preset.amount);
                        setCustomAmount('');
                      }}
                      className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? 'bg-orange-600/30 border-orange-500 text-white shadow-lg shadow-orange-950'
                          : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      <Icon size={20} />
                      <span className="text-xs font-bold">₹{preset.amount}</span>
                      <span className="text-[10px] text-stone-400 leading-tight">{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Or Enter Custom Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-stone-400 text-sm">₹</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="e.g. 2100"
                  className="w-full pl-8 pr-4 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Devotee Name *
                </label>
                <input
                  type="text"
                  required
                  value={devoteeName}
                  onChange={(e) => setDevoteeName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-3.5 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Gotra (Optional)
                </label>
                <input
                  type="text"
                  value={gotra}
                  onChange={(e) => setGotra(e.target.value)}
                  placeholder="e.g. Kashyap, Vashishtha"
                  className="w-full px-3.5 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Sankalp Prayer / Message (Optional)
              </label>
              <textarea
                rows={2}
                value={prayerMessage}
                onChange={(e) => setPrayerMessage(e.target.value)}
                placeholder="Family well-being, health, peace..."
                className="w-full px-3.5 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 font-extrabold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-stone-950" />
              ) : (
                <>
                  <DiyaIcon size={18} />
                  <span>Bless Offering of ₹{currentFinalAmount}</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-stone-600 dark:text-stone-400 pt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>Encrypted via Razorpay • 100% Goes Directly to Vedic Rituals</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
