'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
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
    <div className="min-h-screen bg-stone-950 text-white flex flex-col justify-between">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-stone-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/60 text-amber-400 text-xs font-bold border border-amber-800/60 mb-2">
              <CoinIcon size={14} /> Sacred Coin Ledger
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
              <OmIcon size={28} /> Darshan Wallet History
            </h1>
            <p className="text-stone-400 text-xs mt-1">
              Transparent, tamper-proof record of all blessings, coin top-ups, and live darshan viewing minutes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2.5 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl text-stone-300 transition"
              title="Refresh Ledger"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/wallet/topup"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs shadow-lg transition"
            >
              <PlusCircle className="w-4 h-4" />
              Recharge Coins
            </Link>
          </div>
        </div>

        {/* Stats Summary Cards */}
        {balance && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
              <span className="text-xs font-semibold text-stone-400 block">Available Sacred Balance</span>
              <div className="flex items-center gap-2 mt-2">
                <CoinIcon size={24} />
                <span className="text-2xl font-bold text-amber-400">{balance.balanceCoins} Coins</span>
              </div>
              <span className="text-[11px] text-stone-500 mt-1 block">
                ≈ {balance.availableMinutes} mins live darshan
              </span>
            </div>

            <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
              <span className="text-xs font-semibold text-stone-400 block">Lifetime Coins Received</span>
              <div className="flex items-center gap-2 mt-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                <span className="text-2xl font-bold text-emerald-400">{balance.lifetimeEarned} Coins</span>
              </div>
              <span className="text-[11px] text-stone-500 mt-1 block">Welcome bonus + purchases</span>
            </div>

            <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
              <span className="text-xs font-semibold text-stone-400 block">Lifetime Darshan Spent</span>
              <div className="flex items-center gap-2 mt-2">
                <ArrowUpRight className="w-5 h-5 text-orange-400" />
                <span className="text-2xl font-bold text-orange-400">{balance.lifetimeSpent} Coins</span>
              </div>
              <span className="text-[11px] text-stone-500 mt-1 block">Watch time + offerings</span>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-stone-950/60 border-b border-stone-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-200">Recent Transactions</h3>
            <span className="text-xs text-stone-500">Rate: 5 Coins / Minute</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-stone-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
              Loading sacred ledger records...
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-stone-400 text-sm space-y-3">
              <DiyaIcon className="w-8 h-8 mx-auto text-stone-600" />
              <p>No coin transactions found yet.</p>
              <Link
                href="/wallet/topup"
                className="inline-block px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl text-xs transition"
              >
                Get Welcome Coins
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-stone-800 overflow-x-auto">
              {transactions.map((tx) => {
                const isCredit = tx.type === 'CREDIT';
                return (
                  <div key={tx.id} className="p-4 flex items-center justify-between gap-4 hover:bg-stone-800/40 transition">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isCredit
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                            : 'bg-stone-800 text-stone-300'
                        }`}
                      >
                        {isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-stone-100">
                          {formatCategory(tx.category)}
                        </h4>
                        <span className="text-[11px] text-stone-500">
                          {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-sm font-bold ${
                          isCredit ? 'text-emerald-400' : 'text-stone-300'
                        }`}
                      >
                        {isCredit ? '+' : '-'}{tx.amountCoins} Coins
                      </span>
                      <span className="text-[11px] text-stone-500 block">
                        Balance: {tx.balanceAfter}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
