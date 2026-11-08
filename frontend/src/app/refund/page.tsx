import React from 'react';
import type { Metadata } from 'next';
import { RefreshCw, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { OmIcon, CoinIcon } from '@/components/icons/SpiritualIcons';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy',
  description:
    'Clear guidelines on Shubhdarshan Sacred Coins, failed payment auto-reversals, and cancellation terms under the Consumer Protection (E-Commerce) Rules, 2020.',
  alternates: { canonical: '/refund' },
};

export default function RefundPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-obsidian-soft border border-gold/20 rounded-3xl p-6 sm:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-amber-500/10 to-transparent border border-gold/30 flex items-center justify-center shadow-md shrink-0">
            <img src="/logo.png" alt="Shubhdarshan" className="w-8 h-8 object-contain drop-shadow" />
          </div>
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">
              Consumer Protection 2020
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Refund & Cancellation Policy
            </h1>
          </div>
        </div>

        <p className="text-xs text-stone-400 mb-8 pb-4 border-b border-stone-800">
          Last Updated: November 2026 • Compliant with Consumer Protection (E-Commerce) Rules, 2020 & RBI PPI Regulations
        </p>

        <div className="space-y-8 text-stone-300 text-sm leading-relaxed">
          {/* Section 1 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-amber-400 font-mono">1.</span> Sacred Coins & Pre-Paid Packages
            </h2>
            <div className="p-4 bg-stone-950 border border-stone-800 rounded-2xl flex items-start gap-3">
              <CoinIcon size={28} className="mt-0.5" />
              <div>
                <p className="text-xs sm:text-sm text-stone-300">
                  Shubhdarshan Coins (such as the 100 Coins for ₹200 starter pack) represent closed-loop, non-monetary digital redemption credits used exclusively for public and private live video darshans. Once coins have been consumed for viewing time (at 5 coins per minute), that portion of coins is non-refundable.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-amber-400 font-mono">2.</span> Automatic Reconciliation for Failed Top-Ups
            </h2>
            <p>
              In situations where funds are debited from your bank account or UPI application, but a technical network drop prevents coin balance accretion:
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-stone-950 border border-stone-800 rounded-xl">
                <div className="flex items-center gap-2 font-bold text-emerald-400 text-xs mb-1">
                  <Clock className="w-4 h-4" /> 6-Hour Automated Re-check
                </div>
                <p className="text-[11px] text-stone-400">Our background payment gateway webhooks poll pending orders and credit your coins automatically.</p>
              </div>
              <div className="p-3.5 bg-stone-950 border border-stone-800 rounded-xl">
                <div className="flex items-center gap-2 font-bold text-amber-400 text-xs mb-1">
                  <RefreshCw className="w-4 h-4" /> 48-72h Bank Reversal
                </div>
                <p className="text-[11px] text-stone-400">If the payment gateway reports uncaptured funds, the full amount is auto-refunded to your source bank.</p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-amber-400 font-mono">3.</span> Pandit Pooja Cancellations & Rescheduling
            </h2>
            <p>
              If a verified Pandit cancels an announced public broadcast or private one-on-one astrological consultation due to technical breakdown or emergency:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-xs text-stone-400">
              <li>100% of any pre-booked coins or dakshina offerings are returned to your Sacred Wallet immediately.</li>
              <li>You may reschedule the consultation with the same or an alternate verified Pandit without any penalty fee.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-amber-400 font-mono">4.</span> How to Request Assistance
            </h2>
            <p>
              For any payment or billing discrepancies, please reach out to our Devotee Support Desk with your Order ID:
            </p>
            <div className="mt-2 text-xs text-stone-400 bg-stone-950 p-3 rounded-xl border border-stone-800">
              <strong>Billing Helpdesk:</strong> support@shubhdarshan.com • Average Response Time: Under 2 hours.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
