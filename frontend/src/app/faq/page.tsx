'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, ChevronDown, Sparkles, Coins, Video, ShieldCheck, Heart } from 'lucide-react';
import { OmIcon, CoinIcon } from '@/components/icons/SpiritualIcons';

const FAQS = [
  {
    q: 'How does the Sacred Coin system and 100 free joining bonus work?',
    a: 'Every new devotee who registers on Shubhdarshan automatically receives 100 Sacred Coins completely free as an auspicious welcome bonus. Public live darshan streams consume coins at a nominal rate of 5 coins per minute. This means your initial 100 coins grant you 20 full minutes of complimentary live darshan. Once exhausted, you can top up your wallet starting at 100 coins for ₹200.',
    category: 'Coins & Wallet',
  },
  {
    q: 'How do I top up my Sacred Coins wallet?',
    a: 'You can recharge your coin wallet anytime by clicking the gold coin pill in the header navbar or during a live stream. We accept instant UPI (Google Pay, PhonePe, Paytm, BHIM), Net Banking, and Debit/Credit Cards via our secure, encrypted payment gateway. Packs include ₹200 (100 coins), ₹500 (275 coins with 10% bonus), ₹1,000 (600 coins with 20% bonus), and ₹2,100 (1,500 coins with 25% bonus).',
    category: 'Coins & Wallet',
  },
  {
    q: 'Why is there zero delay or lag in live video and audio chanting?',
    a: 'Unlike traditional social media feeds with 15–30 second broadcast lag, Shubhdarshan utilizes a custom-built WebRTC Selective Forwarding Unit (SFU) powered by LiveKit Cloud. Video and crystal-clear chanting audio reach your screen in sub-300 milliseconds, allowing you to chant mantras, ring temple bells, and offer aarti along with the Pandit in real time.',
    category: 'Live Darshan',
  },
  {
    q: 'How are Pandits and Astrologers verified before broadcasting?',
    a: 'We enforce stringent vetting for all spiritual broadcasters. Pandits must provide credential proof from recognized Vedic Sanskrit Gurukuls, Vidyapeeths, or established temple trusts, along with verified government photo KYC. All priests strictly abide by our Anti-Superstition Code, which prohibits fear-based coercions and false worldly guarantees.',
    category: 'Pandits & Trust',
  },
  {
    q: 'Can I book private poojas or astrological consultations for my family?',
    a: 'Yes. Verified Pandits can conduct private 1-on-1 consultations and family sankalps through encrypted, secret-link rooms. These rooms provide bi-directional video and audio, allowing the Pandit to view your family and perform personalized Vedic mantras with your family Gotra and birth coordinates.',
    category: 'Private Consultations',
  },
  {
    q: 'Is my personal data and horoscope information secure under Indian law?',
    a: 'Absolutely. Shubhdarshan is fully compliant with the Digital Personal Data Protection Act, 2023 (DPDP Act). We never sell your personal data or horoscope details. Live chat logs are automatically purged every 30 days, and our servers use AES-256 and SSL/TLS end-to-end encryption.',
    category: 'Privacy & Security',
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  // Schema.org FAQPage Structured Data for Google Rich Snippets
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-600/20 text-orange-400 text-xs font-bold border border-orange-500/30 mb-3">
            <HelpCircle className="w-3.5 h-3.5" /> Devotee Knowledge Base
          </div>
          <div className="flex items-center justify-center gap-3 mb-3">
            <OmIcon size={36} />
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Frequently Asked Questions
            </h1>
          </div>
          <p className="text-stone-400 text-sm sm:text-base max-w-lg mx-auto">
            Everything you need to know about Shubhdarshan live streaming, coin wallet metering, verified Pandits, and privacy.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3 mb-14">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden transition-all shadow-md"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-stone-800/40 transition-colors"
                >
                  <span className="text-sm sm:text-base font-bold text-white leading-snug">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-amber-400 flex-shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-orange-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-stone-300 text-xs sm:text-sm leading-relaxed border-t border-stone-800/60 pt-4 bg-stone-950/40">
                    <p>{faq.a}</p>
                    <span className="inline-block mt-3 text-[10px] font-bold uppercase tracking-wider text-amber-500/80 bg-amber-950/50 border border-amber-800/40 px-2 py-0.5 rounded-md">
                      {faq.category}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still Have Questions Box */}
        <div className="bg-gradient-to-r from-orange-950/60 via-stone-900 to-amber-950/60 border border-stone-800 rounded-3xl p-8 text-center shadow-xl">
          <h3 className="text-xl font-bold text-white mb-2">Still Have Questions?</h3>
          <p className="text-stone-400 text-xs sm:text-sm mb-6 max-w-md mx-auto">
            Our spiritual assistance desk is available to answer any questions about rituals, astrologers, or payments.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/contact"
              className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all"
            >
              Contact Devotee Support
            </Link>
            <Link
              href="/wallet/topup"
              className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-xl text-xs sm:text-sm transition-all"
            >
              Explore Coin Packs
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
