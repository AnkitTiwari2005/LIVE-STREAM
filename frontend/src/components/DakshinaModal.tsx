'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { X, CheckCircle2, Wallet, LogIn, PlusCircle } from 'lucide-react';
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
import {
  MIN_DAKSHINA_COINS,
  MAX_DAKSHINA_COINS,
  formatInrFromCoins,
  syncLocalWalletBalance,
} from '@/lib/economy';
import { useLang } from '@/lib/i18n/context';
import { formatCoins } from '@/lib/i18n/format';

interface DakshinaModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamId: string;
  streamerName: string;
  currentUser?: any;
  walletBalance?: number | null;
  onOpenTopup?: () => void;
  onSuccess?: (newBalance: number) => void;
}

const SHUBH_COIN_PRESETS = [
  { coins: 21, label: 'Shubh Bhent', Icon: CoinIcon },
  { coins: 51, label: 'Aarti Prasad', Icon: DiyaIcon },
  { coins: 101, label: 'Vedic Sankalp', Icon: LotusIcon },
  { coins: 251, label: 'Devotee Aradhana', Icon: BellIcon },
  { coins: 501, label: 'Maha Arpan', Icon: AartiThaliIcon },
];

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `dak_${crypto.randomUUID()}`;
  }
  return `dak_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export const DakshinaModal: React.FC<DakshinaModalProps> = ({
  isOpen,
  onClose,
  streamId,
  streamerName,
  currentUser,
  walletBalance,
  onOpenTopup,
  onSuccess,
}) => {
  const { lang } = useLang();
  const L = (en: string, hi: string) => (lang === 'hi' ? hi : en);
  const [selectedCoins, setSelectedCoins] = useState<number>(101);
  const [customCoins, setCustomCoins] = useState<string>('');
  const [devoteeName, setDevoteeName] = useState<string>(currentUser?.name || '');
  const [gotra, setGotra] = useState<string>('');
  const [prayerMessage, setPrayerMessage] = useState<string>('');
  const [liveBalance, setLiveBalance] = useState<number | null>(
    typeof walletBalance === 'number' ? walletBalance : null,
  );
  const [loading, setLoading] = useState(false);
  const [successOffering, setSuccessOffering] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState<boolean>(true);
  const idempotencyKeyRef = useRef<string>(createIdempotencyKey());

  useEffect(() => {
    if (typeof walletBalance === 'number') {
      setLiveBalance(walletBalance);
    }
  }, [walletBalance]);

  useEffect(() => {
    if (currentUser?.name && !devoteeName) {
      setDevoteeName(currentUser.name);
    }
  }, [currentUser?.name]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    idempotencyKeyRef.current = createIdempotencyKey();

    const token = typeof window !== 'undefined' ? localStorage.getItem('pooja_token') : null;
    setHasToken(Boolean(token));

    if (!token) return;

    apiFetch<any>('/wallet/balance')
      .then((data) => {
        if (data && typeof data.balanceCoins === 'number') {
          setLiveBalance(data.balanceCoins);
          syncLocalWalletBalance(data.balanceCoins);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const parsedCustom = customCoins ? Math.floor(Number(customCoins)) : 0;
  const currentFinalCoins = customCoins ? (Number.isFinite(parsedCustom) ? parsedCustom : 0) : selectedCoins;

  const resetIdempotencyKey = () => {
    idempotencyKeyRef.current = createIdempotencyKey();
  };

  const handleOffering = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isInteger(currentFinalCoins) || currentFinalCoins < MIN_DAKSHINA_COINS) {
      setError(L(`Minimum Sacred Dakshina is ${MIN_DAKSHINA_COINS} Coins.`, `न्यूनतम पवित्र दक्षिणा ${MIN_DAKSHINA_COINS} कॉइन है।`));
      return;
    }
    if (currentFinalCoins > MAX_DAKSHINA_COINS) {
      setError(L(`Maximum single Dakshina offering is ${MAX_DAKSHINA_COINS.toLocaleString('en-IN')} Coins.`, `एक बार में अधिकतम दक्षिणा ${MAX_DAKSHINA_COINS.toLocaleString('en-IN')} कॉइन है।`));
      return;
    }
    if (!devoteeName.trim()) {
      setError(L('Please enter your name for the sacred sankalp.', 'कृपया पवित्र संकल्प हेतु अपना नाम दर्ज करें।'));
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('pooja_token') : null;
    if (!token) {
      setHasToken(false);
      setError(L('Please sign in to offer Sacred Dakshina from your coin wallet.', 'अपने कॉइन वॉलेट से पवित्र दक्षिणा अर्पित करने के लिए कृपया साइन इन करें।'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiFetch<any>('/payments/dakshina', {
        method: 'POST',
        body: JSON.stringify({
          streamId,
          coins: currentFinalCoins,
          devoteeName: devoteeName.trim(),
          prayerMessage: prayerMessage.trim() || undefined,
          gotra: gotra.trim() || undefined,
          idempotencyKey: idempotencyKeyRef.current,
        }),
      });

      if (typeof result.remainingCoins === 'number') {
        setLiveBalance(result.remainingCoins);
        syncLocalWalletBalance(result.remainingCoins);
        onSuccess?.(result.remainingCoins);
      }

      setSuccessOffering({
        ...(result.offering || {}),
        devoteeName: result.offering?.devoteeName || devoteeName.trim(),
        coins: result.offering?.coins ?? currentFinalCoins,
        gotra: result.offering?.gotra ?? (gotra.trim() || null),
        prayerMessage: result.offering?.prayerMessage ?? (prayerMessage.trim() || null),
      });
      resetIdempotencyKey();
    } catch (err: any) {
      if (err?.status === 402 || err?.code === 'INSUFFICIENT_COINS' || err?.message?.toLowerCase().includes('need')) {
        if (onOpenTopup) {
          onClose();
          onOpenTopup();
          return;
        }
        setError(err.message || L('Insufficient Sacred Coins in your wallet. Please top up.', 'आपके वॉलेट में पर्याप्त पवित्र कॉइन नहीं हैं। कृपया टॉप-अप करें।'));
      } else {
        setError(err?.message || L('Unable to send Sacred Dakshina. Please try again.', 'पवित्र दक्षिणा भेजने में समस्या हुई। कृपया पुनः प्रयास करें।'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccessOffering(null);
    setError(null);
    onClose();
  };

  const redirectPath = typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-obsidian-soft border border-stone-200 dark:border-gold/30 rounded-3xl p-6 shadow-2xl text-stone-900 dark:text-foreground max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          aria-label={L('Close Dakshina modal', 'दक्षिणा विंडो बंद करें')}
        >
          <X className="w-5 h-5" />
        </button>

        {successOffering ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-green-950/80 border border-emerald-400 dark:border-green-700 text-emerald-700 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-1 flex items-center justify-center gap-2">
              <OmIcon size={24} /> {L('Dakshina Accepted', 'दक्षिणा स्वीकार हुई')}
            </h2>
            <p className="text-orange-700 dark:text-orange-400 text-sm font-semibold mb-3 flex items-center justify-center gap-1.5">
              <span>{L(`May the divine blessings of ${streamerName} be upon you`, `${streamerName} का दिव्य आशीर्वाद आप पर बना रहे`)}</span>
              <PranamIcon size={16} />
            </p>
            <div className="bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 text-left text-xs space-y-2 mb-6">
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>{L('Devotee:', 'भक्त:')}</span>
                <span className="font-semibold text-stone-900 dark:text-white">{successOffering.devoteeName}</span>
              </div>
              {successOffering.gotra && (
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>{L('Gotra:', 'गोत्र:')}</span>
                  <span className="font-semibold text-stone-900 dark:text-white">{successOffering.gotra}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-stone-600 dark:text-stone-400">
                <span>{L('Offered Dakshina:', 'अर्पित दक्षिणा:')}</span>
                <span className="font-bold text-amber-800 dark:text-amber-400 text-sm inline-flex items-center gap-1.5">
                  <CoinIcon size={16} />
                  <span>{formatCoins(Number(successOffering.coins), lang)}</span>
                  <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                    (≈ ₹{formatInrFromCoins(Number(successOffering.coins))})
                  </span>
                </span>
              </div>
              {successOffering.prayerMessage && (
                <div className="pt-2 border-t border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 italic">
                  &ldquo;{successOffering.prayerMessage}&rdquo;
                </div>
              )}
            </div>
            <button
              onClick={handleClose}
              className="w-full py-3 bg-orange-700 hover:bg-orange-600 text-white font-bold rounded-xl text-sm transition shadow-lg"
            >
              {L('Return to Sacred Darshan', 'पवित्र दर्शन पर लौटें')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleOffering} className="space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4 pr-8">
              <div className="flex items-center gap-3">
                <img src="/logo.webp" alt={L('Param Darshan', 'परम दर्शन')} className="w-8 h-8 object-contain drop-shadow" />
                <div>
                  <h2 className="text-lg font-bold text-stone-900 dark:text-white">{L('Offer Sacred Dakshina', 'पवित्र दक्षिणा अर्पित करें')}</h2>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    {L(`Offer wallet coins to bless ${streamerName}`, `${streamerName} को आशीर्वाद स्वरूप वॉलेट कॉइन अर्पित करें`)}
                  </p>
                </div>
              </div>
            </div>

            {!hasToken ? (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/50 text-xs text-amber-950 dark:text-amber-200 space-y-3">
                <p className="font-semibold">
                  {L('Sacred Dakshina is offered exclusively using Wallet Coins. Sign in to offer Dakshina from your devotee wallet.', 'पवित्र दक्षिणा केवल वॉलेट कॉइन से अर्पित की जाती है। अपने भक्त वॉलेट से दक्षिणा देने के लिए साइन इन करें।')}
                </p>
                <Link
                  href={`/login?redirect=${redirectPath}`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-xl transition"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{L('Sign In to Offer Dakshina', 'दक्षिणा अर्पित करने हेतु लॉगिन करें')}</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-amber-50 dark:bg-stone-950 border border-amber-300 dark:border-gold/25 text-xs">
                <span className="flex items-center gap-2 font-semibold text-stone-700 dark:text-stone-300">
                  <Wallet className="w-4 h-4 text-amber-700 dark:text-gold" />
                  {L('Your Wallet Balance:', 'आपका वॉलेट शेष:')}
                  <span className="inline-flex items-center gap-1 font-extrabold text-amber-900 dark:text-gold-pale">
                    <CoinIcon size={14} />
                    {liveBalance !== null ? formatCoins(liveBalance, lang) : `... ${L('Coins', 'कॉइन')}`}
                  </span>
                </span>
                {onOpenTopup && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenTopup();
                    }}
                    className="inline-flex items-center gap-1 font-bold text-orange-700 dark:text-gold hover:underline"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> {L('Top Up', 'टॉप अप')}
                  </button>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/80 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 rounded-xl text-xs">
                {error}
              </div>
            )}

            {/* Presets */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
                {L('Select Shubh Arpan Coins', 'शुभ अर्पण कॉइन चुनें')}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {SHUBH_COIN_PRESETS.map((preset) => {
                  const isSelected = !customCoins && selectedCoins === preset.coins;
                  const Icon = preset.Icon;
                  return (
                    <button
                      key={preset.coins}
                      type="button"
                      onClick={() => {
                        setSelectedCoins(preset.coins);
                        setCustomCoins('');
                        resetIdempotencyKey();
                      }}
                      className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center gap-1 ${
                        isSelected
                          ? 'bg-orange-600/20 dark:bg-orange-600/30 border-orange-500 text-stone-950 dark:text-white shadow-lg'
                          : 'bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-amber-400 dark:hover:border-stone-700'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="text-xs font-bold inline-flex items-center gap-1">
                        <CoinIcon size={12} /> {preset.coins}
                      </span>
                      <span className="text-[10px] text-stone-600 dark:text-stone-400 leading-tight">
                        ≈ ₹{formatInrFromCoins(preset.coins)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Coins */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                {L(
                  `Or Enter Custom Coins (${MIN_DAKSHINA_COINS}–${MAX_DAKSHINA_COINS.toLocaleString('en-IN')})`,
                  `या अपनी इच्छा से कॉइन दर्ज करें (${MIN_DAKSHINA_COINS}–${MAX_DAKSHINA_COINS.toLocaleString('en-IN')})`,
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5">
                  <CoinIcon size={16} />
                </span>
                <input
                  type="number"
                  min={MIN_DAKSHINA_COINS}
                  max={MAX_DAKSHINA_COINS}
                  step={1}
                  value={customCoins}
                  onChange={(e) => {
                    setCustomCoins(e.target.value);
                    resetIdempotencyKey();
                  }}
                  placeholder={L('e.g. 150 (₹100)', 'उदा. 150 (₹100)')}
                  className="w-full pl-9 pr-24 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-xl text-sm text-stone-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
                <span className="absolute right-3 top-2.5 text-xs font-semibold text-stone-500 dark:text-stone-400">
                  ≈ ₹{formatInrFromCoins(currentFinalCoins)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {L('Devotee Name *', 'भक्त का नाम *')}
                </label>
                <input
                  type="text"
                  required
                  value={devoteeName}
                  onChange={(e) => {
                    setDevoteeName(e.target.value);
                    resetIdempotencyKey();
                  }}
                  placeholder={L('Your full name', 'आपका पूरा नाम')}
                  className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {L('Gotra (Optional)', 'गोत्र (वैकल्पिक)')}
                </label>
                <input
                  type="text"
                  value={gotra}
                  onChange={(e) => {
                    setGotra(e.target.value);
                    resetIdempotencyKey();
                  }}
                  placeholder={L('e.g. Kashyap, Vashishtha', 'उदा. कश्यप, वशिष्ठ')}
                  className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                {L('Sankalp Prayer / Message (Optional)', 'संकल्प प्रार्थना / संदेश (वैकल्पिक)')}
              </label>
              <textarea
                rows={2}
                value={prayerMessage}
                onChange={(e) => {
                  setPrayerMessage(e.target.value);
                  resetIdempotencyKey();
                }}
                placeholder={L('Family well-being, health, peace...', 'परिवार के कल्याण, स्वास्थ्य, शांति हेतु...')}
                className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !hasToken}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 font-extrabold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-stone-950" />
              ) : (
                <>
                  <CoinIcon size={18} />
                  <span>
                    {L(
                      `Offer ${currentFinalCoins} Coins Dakshina (≈ ₹${formatInrFromCoins(currentFinalCoins)})`,
                      `${currentFinalCoins} कॉइन दक्षिणा अर्पित करें (≈ ₹${formatInrFromCoins(currentFinalCoins)})`,
                    )}
                  </span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
