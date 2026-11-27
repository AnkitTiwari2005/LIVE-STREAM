'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownLeft, Sparkles, RefreshCw, PlusCircle, Clock, ShieldCheck } from 'lucide-react';
import { OmIcon, CoinIcon, DiyaIcon } from '@/components/icons/SpiritualIcons';
import { syncLocalWalletBalance } from '@/lib/economy';
import { useLang } from '@/lib/i18n/context';
import { formatCoins, formatLocaleDateTime, formatSignedCoins } from '@/lib/i18n/format';

interface Transaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  category: string;
  amountCoins: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId?: string;
  createdAt: string;
  metadata?: any;
}

export default function WalletHistoryPage() {
  const { lang } = useLang();
  const L = (en: string, hi: string) => (lang === 'hi' ? hi : en);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('pooja_token') : null;
    if (!token) {
      setLoading(false);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    try {
      const [balRes, txRes] = await Promise.all([
        fetch(`${apiUrl}/wallet/balance`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
        fetch(`${apiUrl}/wallet/transactions`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
      ]);

      if (balRes.ok) {
        const balData = await balRes.json();
        setBalance(balData);
        if (typeof balData?.balanceCoins === 'number') {
          syncLocalWalletBalance(balData.balanceCoins);
        }
      }
      if (txRes.ok) setTransactions(await txRes.json());
    } catch {
      // Ignore network errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCategory = (cat: string) => {
    switch (cat) {
      case 'JOINING_BONUS':
        return L('Welcome Darshan Bonus', 'स्वागत दर्शन बोनस');
      case 'TOPUP_PURCHASE':
        return L('Sacred Coin Recharge', 'पवित्र कॉइन रिचार्ज');
      case 'STREAM_METERED_VIEW':
        return L('Live Darshan Watch Time', 'लाइव दर्शन समय शुल्क');
      case 'DAKSHINA_OFFERING':
        return L('Dakshina Offering', 'दक्षिणा अर्पण');
      default:
        return cat.replace(/_/g, ' ');
    }
  };

  return (
    <div className="min-h-screen bg-obsidian text-foreground py-10 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-5 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-gold/15">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.24em] text-gold-pale mb-2">
              <CoinIcon size={14} /> {L('Sacred Coin Ledger', 'पवित्र कॉइन बही-खाता')}
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
              {L('Transaction history', 'लेन-देन इतिहास')}
            </h1>
            <p className="text-stone-400 text-xs sm:text-sm mt-1">
              {L('Transparent, tamper-proof record of all blessings, coin top-ups, and live darshan viewing minutes.', 'सभी बोनस, कॉइन रिचार्ज और लाइव दर्शन मिनटों का पारदर्शी व सुरक्षित विवरण।')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2.5 bg-obsidian-soft hover:bg-stone-800 border border-gold/20 rounded-full text-stone-300 transition"
              title={L('Refresh Ledger', 'बही-खाता रीफ़्रेश करें')}
            >
              <RefreshCw className={`w-4 h-4 text-gold ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/wallet/topup"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full text-xs shadow-lg shadow-gold/20 transition"
            >
              <PlusCircle className="w-4 h-4" />
              {L('Recharge Coins', 'कॉइन रिचार्ज करें')}
            </Link>
          </div>
        </div>

        {/* Stats Summary Cards */}
        {balance && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-obsidian-soft border border-gold/20 p-5 rounded-2xl shadow-lg">
              <span className="text-xs font-semibold text-stone-400 block">{L('Available Sacred Balance', 'उपलब्ध पवित्र शेष')}</span>
              <div className="flex items-center gap-2 mt-2">
                <CoinIcon size={26} />
                <span className="font-serif text-3xl font-bold text-gold">{formatCoins(balance.balanceCoins, lang)}</span>
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block">
                {L(`≈ ${balance.availableMinutes} mins live darshan`, `≈ ${balance.availableMinutes} मिनट लाइव दर्शन`)}
              </span>
            </div>

            <div className="bg-obsidian-soft border border-gold/15 p-5 rounded-2xl shadow-lg">
              <span className="text-xs font-semibold text-stone-400 block">{L('Lifetime Coins Received', 'कुल प्राप्त कॉइन')}</span>
              <div className="flex items-center gap-2 mt-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                <span className="font-serif text-3xl font-bold text-emerald-700 dark:text-emerald-400">{formatCoins(balance.lifetimeEarned, lang)}</span>
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block">{L('Through signup & recharges', 'साइन-अप एवं रिचार्ज से')}</span>
            </div>

            <div className="bg-obsidian-soft border border-gold/15 p-5 rounded-2xl shadow-lg">
              <span className="text-xs font-semibold text-stone-400 block">{L('Lifetime Coins Spent', 'कुल व्यय किए गए कॉइन')}</span>
              <div className="flex items-center gap-2 mt-2">
                <ArrowUpRight className="w-5 h-5 text-gold-soft" />
                <span className="font-serif text-3xl font-bold text-gold-pale">{formatCoins(balance.lifetimeSpent, lang)}</span>
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block">{L('Live aartis & dakshina', 'लाइव आरती एवं दक्षिणा में')}</span>
            </div>
          </div>
        )}

        {/* Transaction History Table */}
        <div className="bg-obsidian-soft border border-gold/15 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-stone-800/80 flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-gold" />
              <span>{L('Ledger Entries', 'खाता प्रविष्टियाँ')}</span>
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-stone-400">
              <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>{L('Double-entry cryptographic ledger', 'सुरक्षित दोहरी-प्रविष्टि बही-खाता')}</span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-stone-400">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold mx-auto mb-3" />
              <p className="text-xs">{L('Fetching ledger entries...', 'खाता विवरण लोड हो रहा है...')}</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-stone-400 text-xs sm:text-sm">
              <DiyaIcon size={40} className="mx-auto mb-3 opacity-60 text-gold" />
              <p className="font-medium text-white mb-1">{L('No transactions recorded yet', 'अभी तक कोई लेन-देन दर्ज नहीं है')}</p>
              <p className="text-stone-400 text-xs max-w-sm mx-auto mb-4">
                {L('When you watch live darshans or recharge your wallet, your ledger will update instantly here.', 'जब आप लाइव दर्शन देखेंगे या वॉलेट रिचार्ज करेंगे, तो यहाँ तुरंत विवरण अपडेट होगा।')}
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-xs font-bold text-gold hover:text-gold-pale underline"
              >
                {L('Watch a live darshan now →', 'अभी लाइव दर्शन देखें →')}
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100 dark:bg-obsidian border-b border-stone-200 dark:border-stone-800/80 text-stone-600 dark:text-stone-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-5">{L('Date & Time', 'तिथि एवं समय')}</th>
                    <th className="py-3.5 px-4">{L('Transaction Details', 'लेन-देन विवरण')}</th>
                    <th className="py-3.5 px-4 text-right">{L('Amount', 'राशि')}</th>
                    <th className="py-3.5 px-4 text-right">{L('Balance After', 'अंतिम शेष')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800/60 text-stone-700 dark:text-stone-300">
                  {transactions.map((tx) => {
                    const isCredit = tx.type === 'CREDIT';
                    return (
                      <tr key={tx.id} className="hover:bg-stone-50 dark:hover:bg-stone-900/40 transition">
                        <td className="py-4 px-5 whitespace-nowrap text-stone-600 dark:text-stone-400">
                          {formatLocaleDateTime(tx.createdAt, lang)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`p-1.5 rounded-full ${
                                isCredit
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
                                  : 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-stone-900 dark:text-gold-soft dark:border-stone-800'
                              }`}
                            >
                              {isCredit ? (
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              )}
                            </span>
                            <div>
                              <span className="font-bold text-white block">
                                {formatCategory(tx.category)}
                              </span>
                              {tx.metadata?.streamTitle && (
                                <span className="text-[11px] text-stone-300 block">
                                  {tx.metadata.streamTitle}
                                </span>
                              )}
                              {tx.referenceId && (
                                <span className="text-[10px] text-stone-600 dark:text-stone-400 font-mono">
                                  {L('Ref:', 'संदर्भ:')} {tx.referenceId}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <span
                            className={`font-serif text-base font-bold ${
                              isCredit ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-300'
                            }`}
                          >
                            {formatSignedCoins(tx.amountCoins, isCredit, lang)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right whitespace-nowrap font-bold text-gold-pale font-serif text-sm">
                          {formatCoins(tx.balanceAfter, lang)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
