'use client';

import React, { useState } from 'react';
import { Sparkles, Heart, X, CheckCircle2, ShieldCheck, CreditCard } from 'lucide-react';

interface DakshinaModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamId: string;
  streamerName: string;
  currentUser?: any;
}

const SHUBH_PRESETS = [
  { amount: 51, label: 'Shubh Bhent', icon: '🥥' },
  { amount: 101, label: 'Aarti Prasad', icon: '🪔' },
  { amount: 251, label: 'Vedic Sankalp', icon: '🌸' },
  { amount: 501, label: 'Devotee Aradhana', icon: '🔔' },
  { amount: 1100, label: 'Maha Arpan', icon: '🚩' },
];

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
      // 1. Create order
      const orderRes = await fetch(`${apiUrl}/payments/dakshina/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamId,
          amount: currentFinalAmount,
          devoteeName: devoteeName.trim(),
          prayerMessage: prayerMessage.trim() || undefined,
          gotra: gotra.trim() || undefined,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.message || 'Failed to initiate dakshina');

      // 2. If Razorpay is available in window
      if ((window as any).Razorpay && orderData.keyId && orderData.provider === 'RAZORPAY') {
        const options = {
          key: orderData.keyId,
          amount: currentFinalAmount * 100,
          currency: 'INR',
          name: 'Shubhdarshan Live',
          description: `Dakshina to ${streamerName}`,
          order_id: orderData.orderId,
          handler: async (response: any) => {
            const verifyRes = await fetch(`${apiUrl}/payments/dakshina/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: orderData.orderId,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            setSuccessOffering(verifyData.offering || orderData);
          },
          prefill: {
            name: devoteeName,
            email: currentUser?.email || 'devotee@shubhdarshan.com',
          },
          theme: { color: '#ea580c' },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        // Fallback / instant sandbox verification
        const verifyRes = await fetch(`${apiUrl}/payments/dakshina/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderData.orderId,
            paymentId: `pay_sandbox_${Date.now()}`,
          }),
        });
        const verifyData = await verifyRes.json();
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
      <div className="relative w-full max-w-lg bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-2xl text-stone-100 max-h-[90vh] overflow-y-auto">
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
            <h2 className="text-2xl font-bold text-white mb-1">ॐ Dakshina Accepted</h2>
            <p className="text-orange-400 text-sm font-semibold mb-3">
              May the divine blessings of {streamerName} be upon you 🙏
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
                <span className="font-bold text-amber-400 text-sm">₹{Number(successOffering.amount)}</span>
              </div>
              {successOffering.prayerMessage && (
                <div className="pt-2 border-t border-stone-800 text-stone-300 italic">
                  &ldquo;{successOffering.prayerMessage}&rdquo;
                </div>
              )}
            </div>
            <button
              onClick={handleReset}
              className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition shadow-lg"
            >
              Return to Sacred Darshan
            </button>
          </div>
        ) : (
          <form onSubmit={handleOffering} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-stone-800 pb-4">
              <span className="text-2xl">🕉️</span>
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
                  return (
                    <button
                      key={preset.amount}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(preset.amount);
                        setCustomAmount('');
                      }}
                      className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center gap-1 ${
                        isSelected
                          ? 'bg-orange-600/30 border-orange-500 text-white shadow-lg shadow-orange-950'
                          : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      <span className="text-base">{preset.icon}</span>
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
                placeholder="Write your personal prayer, wishes for family health, prosperity..."
                className="w-full px-3.5 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-500 hover:to-yellow-500 text-white font-bold rounded-2xl text-sm shadow-xl shadow-orange-950 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {loading ? 'Initiating Sacred Dakshina...' : `Offer Dakshina of ₹${currentFinalAmount} 🙏`}
              </button>
              <div className="flex items-center justify-center gap-2 mt-2 text-[11px] text-stone-400">
                <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                <span>100% Secure via UPI, RuPay, NetBanking & Cards</span>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
