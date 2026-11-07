'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownLeft, Sparkles, RefreshCw, PlusCircle, Clock, ShieldCheck } from 'lucide-react';
import { OmIcon, CoinIcon, DiyaIcon } from '@/components/icons/SpiritualIcons';

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
        fetch(`${apiUrl}/wallet/balance`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiUrl}/wallet/transactions`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (balRes.ok) setBalance(await balRes.json());
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
        return 'Welcome Darshan Bonus';
      case 'TOPUP_PURCHASE':
        return 'Sacred Coin Recharge';
      case 'STREAM_METERED_VIEW':
        return 'Live Darshan Watch Time';
      case 'DAKSHINA_OFFERING':
        return 'Dakshina Offering';
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
              <CoinIcon size={14} /> Sacred Coin Ledger
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
              Transaction history
            </h1>
            <p className="text-stone-400 text-xs sm:text-sm mt-1">
              Transparent, tamper-proof record of all blessings, coin top-ups, and live darshan viewing minutes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2.5 bg-obsidian-soft hover:bg-stone-800 border border-gold/20 rounded-full text-stone-300 transition"
              title="Refresh Ledger"
            >
              <RefreshCw className={`w-4 h-4 text-gold ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/wallet/topup"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full text-xs shadow-lg shadow-gold/20 transition"
            >
              <PlusCircle className="w-4 h-4" />
              Recharge Coins
            </Link>
          </div>
        </div>

        {/* Stats Summary Cards */}
        {balance && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-obsidian-soft border border-gold/20 p-5 rounded-2xl shadow-lg">
              <span className="text-xs font-semibold text-stone-400 block">Available Sacred Balance</span>
              <div className="flex items-center gap-2 mt-2">
                <CoinIcon size={26} />
                <span className="font-serif text-3xl font-bold text-gold">{balance.balanceCoins} Coins</span>
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block">
                ≈ {balance.availableMinutes} mins live darshan
              </span>
            </div>

            <div className="bg-obsidian-soft border border-gold/15 p-5 rounded-2xl shadow-lg">
              <span className="text-xs font-semibold text-stone-400 block">Lifetime Coins Received</span>
              <div className="flex items-center gap-2 mt-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                <span className="font-serif text-3xl font-bold text-emerald-400">{balance.lifetimeEarned} Coins</span>
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block">Through signup &amp; recharges</span>
            </div>

            <div className="bg-obsidian-soft border border-gold/15 p-5 rounded-2xl shadow-lg">
              <span className="text-xs font-semibold text-stone-400 block">Lifetime Coins Spent</span>
              <div className="flex items-center gap-2 mt-2">
                <ArrowUpRight className="w-5 h-5 text-gold-soft" />
                <span className="font-serif text-3xl font-bold text-gold-pale">{balance.lifetimeSpent} Coins</span>
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block">Live aartis &amp; dakshina</span>
            </div>
          </div>
        )}

        {/* Transaction History Table */}
        <div className="bg-obsidian-soft border border-gold/15 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-stone-800/80 flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-gold" />
              <span>Ledger Entries</span>
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-stone-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Double-entry cryptographic ledger</span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-stone-400">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold mx-auto mb-3" />
              <p className="text-xs">Fetching ledger entries from blockchain-style store...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-stone-400 text-xs sm:text-sm">
              <DiyaIcon size={40} className="mx-auto mb-3 opacity-60 text-gold" />
              <p className="font-medium text-white mb-1">No transactions recorded yet</p>
              <p className="text-stone-400 text-xs max-w-sm mx-auto mb-4">
                When you watch live darshans or recharge your wallet, your ledger will update instantly here.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-xs font-bold text-gold hover:text-gold-pale underline"
              >
                Watch a live darshan now &rarr;
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-obsidian border-b border-stone-800/80 text-stone-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-5">Date &amp; Time</th>
                    <th className="py-3.5 px-4">Transaction Details</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                    <th className="py-3.5 px-4 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 text-stone-300">
                  {transactions.map((tx) => {
                    const isCredit = tx.type === 'CREDIT';
                    return (
                      <tr key={tx.id} className="hover:bg-stone-900/40 transition">
                        <td className="py-4 px-5 whitespace-nowrap text-stone-400">
                          {new Date(tx.createdAt).toLocaleString([], {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`p-1.5 rounded-full ${
                                isCredit ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-stone-900 text-gold-soft border border-stone-800'
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
                              {tx.referenceId && (
                                <span className="text-[10px] text-stone-500 font-mono">
                                  Ref: {tx.referenceId}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <span
                            className={`font-serif text-base font-bold ${
                              isCredit ? 'text-emerald-400' : 'text-stone-300'
                            }`}
                          >
                            {isCredit ? '+' : '-'}
                            {tx.amountCoins} Coins
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right whitespace-nowrap font-bold text-gold-pale font-serif text-sm">
                          {tx.balanceAfter} Coins
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
