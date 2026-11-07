import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Flame, HeartHandshake, Sparkles } from 'lucide-react';
import { OmIcon } from '@/components/icons/SpiritualIcons';

export function Footer() {
  return (
    <footer className="bg-obsidian-deep border-t border-gold/15 text-stone-400 text-sm mt-20 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-5 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 mb-12">
          {/* Brand & Mission (Col 1 & 2) */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="group inline-flex items-center gap-3">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-gradient-to-b from-[#2a1e12] to-obsidian shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Flame className="h-5 w-5 text-gold animate-flame" />
                <span className="absolute inset-0 rounded-full bg-gold/10 blur-md transition group-hover:bg-gold/25" />
              </span>
              <span className="leading-tight">
                <span className="block font-serif text-2xl font-bold tracking-wide text-gold-pale">
                  Shubhdarshan
                </span>
                <span className="block text-[9px] font-bold uppercase tracking-[0.28em] text-gold-soft/80">
                  Sacred Darshan Network
                </span>
              </span>
            </Link>

            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed max-w-sm">
              Connecting devotees worldwide with verified Vedic pandits and sanctums for live Aarti, Darshan, personalized poojas, and authentic spiritual counseling in ultra-low latency.
            </p>

            <div className="flex items-center gap-2 pt-2 text-xs text-stone-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>DPDP Act 2023 &amp; IT Rules 2021 Compliant</span>
            </div>
          </div>

          {/* Quick Platform Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.24em] text-gold-soft mb-4">
              Sacred Platform
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/" className="text-stone-400 hover:text-gold-pale transition">
                  Live Mandir Darshan
                </Link>
              </li>
              <li>
                <Link href="/#upcoming" className="text-stone-400 hover:text-gold-pale transition">
                  Upcoming Pooja Schedule
                </Link>
              </li>
              <li>
                <Link href="/#pandits" className="text-stone-400 hover:text-gold-pale transition">
                  Verified Pandits Directory
                </Link>
              </li>
              <li>
                <Link href="/wallet/topup" className="text-stone-400 hover:text-gold-pale transition">
                  Sacred Coins Top-up
                </Link>
              </li>
              <li>
                <Link href="/wallet/history" className="text-stone-400 hover:text-gold-pale transition">
                  Wallet Ledger &amp; History
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-stone-400 hover:text-gold-pale transition">
                  About Our Heritage
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-stone-400 hover:text-gold-pale transition">
                  Devotee FAQ &amp; Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Streamer & Priesthood */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.24em] text-gold-soft mb-4">
              Priesthood &amp; Seva
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/streamer/apply" className="text-stone-400 hover:text-gold-pale transition flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-gold" /> Apply as Pandit
                </Link>
              </li>
              <li>
                <Link href="/pandit-guidelines" className="text-stone-400 hover:text-gold-pale transition">
                  Pandit Code of Ethics
                </Link>
              </li>
              <li>
                <Link href="/studio/create" className="text-stone-400 hover:text-gold-pale transition">
                  Broadcaster Studio
                </Link>
              </li>
              <li>
                <Link href="/streamer/earnings" className="text-stone-400 hover:text-gold-pale transition">
                  Pandit Earnings &amp; Dakshina
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.24em] text-gold-soft mb-4">
              Safety &amp; Legal
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/terms" className="text-stone-400 hover:text-gold-pale transition">
                  Terms of Seva
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-stone-400 hover:text-gold-pale transition">
                  Privacy Policy (DPDP)
                </Link>
              </li>
              <li>
                <Link href="/refund" className="text-stone-400 hover:text-gold-pale transition">
                  Refund &amp; Coin Policy
                </Link>
              </li>
              <li>
                <Link href="/grievance" className="text-stone-400 hover:text-gold-pale transition">
                  Grievance Redressal
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-stone-400 hover:text-gold-pale transition">
                  Contact Grievance Officer
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Astrological & Spiritual Disclaimer */}
        <div className="pt-8 border-t border-stone-800/80 text-[11px] text-stone-400 leading-relaxed space-y-2">
          <p>
            <strong className="text-gold-pale">Spiritual &amp; Astrological Disclaimer:</strong> All live temple darshans, aartis, pooja ceremonies, planetary remedies, astrology kundli counseling, and Vedic discourses on Shubhdarshan are conducted for cultural, religious, and spiritual counseling purposes. Pandits and astrologers broadcast as independent verified practitioners. Shubhdarshan makes no guarantees or warranties of material, financial, medical, or life outcomes.
          </p>
        </div>

        {/* Bottom Bar with Sanskrit Shloka */}
        <div className="mt-8 pt-6 border-t border-stone-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>© 2026 Shubhdarshan Devotional Media Private Limited. All rights reserved.</p>
          <p className="font-serif text-sm italic text-gold-soft/80 tracking-wide">
            ॐ असतो मा सद्गमय तमसो मा ज्योतिर्गमय
          </p>
          <p className="text-[11px] text-stone-500">
            Ultra-low latency live media powered by LiveKit SFU
          </p>
        </div>
      </div>
    </footer>
  );
}
