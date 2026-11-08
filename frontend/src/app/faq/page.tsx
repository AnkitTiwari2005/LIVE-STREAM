'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, ChevronDown, Sparkles, Search, ShieldCheck } from 'lucide-react';
import { OmIcon, CoinIcon, DiyaIcon } from '@/components/icons/SpiritualIcons';

const FAQS = [
  {
    q: 'How does the Sacred Coin system and 100 free joining bonus work?',
    a: 'Every new devotee who registers on Shubhdarshan automatically receives 100 Sacred Coins completely free as an auspicious welcome bonus. Public live darshan streams consume coins at a nominal rate of 5 coins per minute. This means your initial 100 coins grant you 20 full minutes of complimentary live darshan. Once exhausted, you can top up your wallet starting at 100 coins for ₹200.',
    category: 'Coins & Wallet',
  },
  {
    q: 'How do I top up my Sacred Coins wallet?',
    a: 'You can recharge your coin wallet anytime by clicking the gold coin pill in the header navbar or during a live stream. We accept instant UPI (Google Pay, PhonePe, Paytm, BHIM), Net Banking, and Debit/Credit Cards via our secure Razorpay gateway. Packs include ₹200 (100 coins), ₹500 (275 coins with 10% bonus), ₹1,000 (600 coins with 20% bonus), and ₹2,100 (1,500 coins with 25% bonus).',
    category: 'Coins & Wallet',
  },
  {
    q: 'Do coins expire?',
    a: 'No, sacred coins never expire. Any coins credited to your wallet remain safe and accessible until you choose to utilize them for live Darshan or Dakshina.',
    category: 'Coins & Wallet',
  },
  {
    q: 'Why is there zero delay or lag in live video and audio chanting?',
    a: 'Unlike traditional social media feeds with 15–30 second broadcast lag, Shubhdarshan utilizes a custom-built WebRTC Selective Forwarding Unit (SFU) powered by LiveKit Cloud. Video and crystal-clear chanting audio reach your screen in sub-300 milliseconds, allowing you to chant mantras, ring temple bells, and offer aarti along with the Pandit in real time.',
    category: 'Live Darshan',
  },
  {
    q: 'What is metered Darshan?',
    a: 'Metered Darshan deducts 5 coins per minute while you are actively connected to the live sanctum stream. Our heartbeat reconciler ensures that you are only billed for actual time watched — if you close the stream or your internet drops, coin deduction stops immediately.',
    category: 'Live Darshan',
  },
  {
    q: 'How are Pandits and Astrologers verified before broadcasting?',
    a: 'We enforce stringent 7-step vetting for all spiritual broadcasters. Pandits must provide credential proof from recognized Vedic Sanskrit Gurukuls, Vidyapeeths, or established temple trusts, along with verified government photo KYC. All priests strictly abide by our Anti-Superstition Code, which prohibits fear-based coercions and false worldly guarantees.',
    category: 'Pandits & Trust',
  },
  {
    q: 'What does the blue tick on a pandit profile mean?',
    a: 'The blue checkmark signifies that the pandit has completed biometric identity verification, Gurukul degree auditing, and Sanskrit recitation evaluation by our Acharya council.',
    category: 'Pandits & Trust',
  },
  {
    q: 'Can I book private poojas or astrological consultations for my family?',
    a: 'Yes. Verified Pandits can conduct private 1-on-1 consultations and family sankalps through encrypted, secret-link rooms. These rooms provide bi-directional video and audio, allowing the Pandit to view your family and perform personalized Vedic mantras with your family Gotra and birth coordinates.',
    category: 'Sankalp & Pooja',
  },
  {
    q: 'Is my personal data and horoscope information secure under Indian law?',
    a: 'Absolutely. Shubhdarshan is fully compliant with the Digital Personal Data Protection Act, 2023 (DPDP Act). We never sell your personal data or horoscope details. Live chat logs are automatically purged every 30 days, and our servers use AES-256 and SSL/TLS end-to-end encryption.',
    category: 'Privacy & Security',
  },
];

const CATEGORIES = ['All', 'Coins & Wallet', 'Live Darshan', 'Pandits & Trust', 'Sankalp & Pooja', 'Privacy & Security'];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [selectedCat, setSelectedCat] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = FAQS.filter((f) => {
    const matchesCat = selectedCat === 'All' || f.category === selectedCat;
    const matchesSearch =
      !search ||
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="min-h-screen bg-obsidian text-foreground py-12 relative overflow-hidden">
        <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-5 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-gold-pale mb-4">
              <HelpCircle className="w-3.5 h-3.5 text-gold" />
              Devotee Knowledge Base
            </p>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white tracking-tight">
              Questions, answered with{' '}
              <span className="gold-text italic font-serif">clarity</span>
            </h1>
            <p className="mt-4 text-stone-300 text-xs sm:text-base max-w-lg mx-auto leading-relaxed">
              Everything you need to know about Shubhdarshan live streams, coin wallet metering, verified Pandits, and privacy.
            </p>

            {/* Search Box */}
            <div className="mt-8 max-w-md mx-auto relative">
              <Search className="w-4 h-4 absolute left-4 top-3.5 text-gold-soft" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions or keywords..."
                className="w-full pl-11 pr-4 py-3 rounded-full bg-obsidian-soft border border-gold/20 text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:border-gold transition shadow-md"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center sm:justify-center gap-2 overflow-x-auto w-full max-w-full min-w-0 py-5 no-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                    selectedCat === cat
                      ? 'bg-gold text-obsidian shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'bg-obsidian-soft text-stone-300 border border-gold/15 hover:border-gold/30 hover:text-gold-pale'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* FAQ Accordion List */}
          <div className="space-y-3 mb-14">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-gold/15 bg-obsidian-soft p-8 text-center text-stone-400 text-xs sm:text-sm">
                No matching questions found for &ldquo;{search}&rdquo;. Try another term or contact support.
              </div>
            ) : (
              filtered.map((faq, idx) => {
                const isOpen = openIndex === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl bg-obsidian-soft border border-gold/15 overflow-hidden transition-all shadow-md hover:border-gold/30"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenIndex(isOpen ? null : idx)}
                      className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-stone-900/40 transition-colors"
                    >
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gold-soft block mb-1">
                          {faq.category}
                        </span>
                        <span className="font-serif text-base sm:text-lg font-bold text-white leading-snug">
                          {faq.q}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-gold flex-shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-gold-soft' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-xs sm:text-sm text-stone-300 leading-relaxed border-t border-stone-800/60 pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Need More Assistance Card */}
          <div className="card-surface rounded-3xl border border-gold/30 bg-obsidian-soft p-8 sm:p-10 text-center shadow-xl relative overflow-hidden">
            <h3 className="font-serif text-2xl font-bold text-white mb-2">
              Still have a question?
            </h3>
            <p className="text-stone-300 text-xs sm:text-sm max-w-md mx-auto mb-5 leading-relaxed">
              Our devotee support and grievance desk is available daily from 6 AM to 10 PM IST to assist you.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/contact"
                className="rounded-full bg-gold px-6 py-2.5 text-xs font-bold text-obsidian shadow hover:bg-gold-deep transition"
              >
                Contact Devotee Support
              </Link>
              <Link
                href="/"
                className="rounded-full border border-gold/40 bg-gold/10 px-5 py-2.5 text-xs font-bold text-gold-pale hover:bg-gold/20 transition"
              >
                Return to Live Darshan
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
