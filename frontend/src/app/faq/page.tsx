'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, ChevronDown, Sparkles, Search, ShieldCheck } from 'lucide-react';
import { OmIcon, CoinIcon, DiyaIcon } from '@/components/icons/SpiritualIcons';
import { useLang } from '@/lib/i18n/context';

interface FaqItem {
  q: string;
  qHi: string;
  a: string;
  aHi: string;
  category: string;
}

const FAQS: FaqItem[] = [
  {
    q: 'How does the Sacred Coin system and 100 free joining bonus work?',
    qHi: 'पावन कॉइन प्रणाली और 100 निःशुल्क स्वागत कॉइन बोनस कैसे काम करते हैं?',
    a: 'Every new devotee who registers on Param Darshan automatically receives 100 Sacred Coins completely free as an auspicious welcome bonus. Public live darshan streams consume coins at a nominal rate of 5 coins per minute, and Sacred Dakshina offerings are also sent directly with Sacred Coins from your wallet. This means your initial 100 coins grant you 20 full minutes of complimentary live darshan. Once exhausted, you can top up your wallet starting at 150 coins for ₹100 (150 coins = ₹100).',
    aHi: 'परम दर्शन पर पंजीकरण करने वाले प्रत्येक नए भक्त को शुभ स्वागत उपहार के रूप में 100 पावन कॉइन बिल्कुल निःशुल्क मिलते हैं। सार्वजनिक लाइव दर्शन प्रसारण में मात्र 5 कॉइन प्रति मिनट की दर से कॉइन उपयोग होते हैं, और पावन दक्षिणा भी सीधे आपके वॉलेट के कॉइन से भेजी जाती है। अर्थात आपके शुरुआती 100 कॉइन से आपको 20 पूरे मिनट का निःशुल्क लाइव दर्शन मिलता है। समाप्त होने पर आप ₹100 में 150 कॉइन (150 कॉइन = ₹100) से वॉलेट रिचार्ज कर सकते हैं।',
    category: 'Coins & Wallet',
  },
  {
    q: 'How do I top up my Sacred Coins wallet?',
    qHi: 'मैं अपना पावन कॉइन वॉलेट कैसे रिचार्ज करूँ?',
    a: 'You can recharge your coin wallet anytime by clicking the gold coin pill in the header navbar or during a live stream. We accept instant UPI (Google Pay, PhonePe, Paytm, BHIM), Net Banking, and Debit/Credit Cards via our secure Razorpay gateway. Packs include ₹100 (150 coins), ₹200 (330 coins = 300 + 30 bonus, +10%), ₹500 (900 coins = 750 + 150 bonus, +20%), and ₹1,000 (1,875 coins = 1,500 + 375 bonus, +25%).',
    aHi: 'आप शीर्ष नेविगेशन बार में कॉइन बटन पर क्लिक करके या लाइव प्रसारण के दौरान कभी भी वॉलेट रिचार्ज कर सकते हैं। हम सुरक्षित Razorpay गेटवे द्वारा UPI (Google Pay, PhonePe, Paytm, BHIM), नेट बैंकिंग और डेबिट/क्रेडिट कार्ड स्वीकार करते हैं। पैक: ₹100 (150 कॉइन), ₹200 (330 कॉइन = 300 + 30 बोनस, +10%), ₹500 (900 कॉइन = 750 + 150 बोनस, +20%), तथा ₹1,000 (1,875 कॉइन = 1,500 + 375 बोनस, +25%)।',
    category: 'Coins & Wallet',
  },
  {
    q: 'Do coins expire?',
    qHi: 'क्या वॉलेट कॉइन समाप्त (Expire) होते हैं?',
    a: 'No, sacred coins never expire. Any coins credited to your wallet remain safe and accessible until you choose to utilize them for live Darshan or Dakshina.',
    aHi: 'नहीं, पावन कॉइन कभी समाप्त नहीं होते। आपके वॉलेट में जमा सभी कॉइन तब तक सुरक्षित रहते हैं जब तक आप उनका उपयोग लाइव दर्शन या दक्षिणा के लिए न करें।',
    category: 'Coins & Wallet',
  },
  {
    q: 'How does real-time interactive video and audio chanting work?',
    qHi: 'रीयल-टाइम लाइव वीडियो और मंत्रोच्चार कैसे काम करता है?',
    a: 'Unlike traditional buffered video feeds with long broadcast lag, Param Darshan uses WebRTC media transport powered by LiveKit SFU. Video and chanting audio stream in real time, allowing devotees to participate and send reactions alongside the ritual.',
    aHi: 'सामान्य देरी वाले सोशल वीडियो के विपरीत, परम दर्शन LiveKit SFU द्वारा संचालित WebRTC तकनीक का उपयोग करता है। वीडियो और मंत्रोच्चार रीयल-टाइम में प्रसारित होते हैं, जिससे भक्त अनुष्ठान के साथ-साथ जुड़कर प्रतिक्रियाएँ भेज सकते हैं।',
    category: 'Live Darshan',
  },
  {
    q: 'What is metered Darshan?',
    qHi: 'मीटर्ड (प्रति-मिनट) दर्शन क्या है?',
    a: 'Metered Darshan deducts 5 coins per minute while you are actively connected to the live sanctum stream. Our heartbeat reconciler ensures that you are only billed for actual time watched — if you close the stream or your internet drops, coin deduction stops immediately.',
    aHi: 'मीटर्ड दर्शन में जब आप सक्रिय रूप से लाइव मंदिर प्रसारण से जुड़े होते हैं तब 5 कॉइन प्रति मिनट कटते हैं। हमारी हार्टबीट प्रणाली सुनिश्चित करती है कि शुल्क केवल वास्तविक देखे गए समय का ही लगे — प्रसारण बंद करने या इंटरनेट कटने पर कॉइन कटना तुरंत रुक जाता है।',
    category: 'Live Darshan',
  },
  {
    q: 'How are Pandits and Astrologers verified before broadcasting?',
    qHi: 'प्रसारण से पहले पंडितों और ज्योतिषियों का सत्यापन कैसे किया जाता है?',
    a: 'All aspiring broadcasters submit their Vedic bio, specialties, languages, and government photo KYC documents for review by platform administrators. Only approved applicants receive streaming privileges. All priests strictly abide by our Anti-Superstition Code, which prohibits fear-based coercions and false worldly guarantees.',
    aHi: 'सभी इच्छुक प्रसारक अपना वैदिक परिचय, विशेषज्ञता, भाषाएँ और सरकारी फ़ोटो KYC दस्तावेज़ व्यवस्थापक की समीक्षा हेतु जमा करते हैं। केवल स्वीकृत आवेदकों को ही प्रसारण अधिकार मिलते हैं। सभी पुरोहित हमारी अंधविश्वास-विरोधी संहिता का कड़ाई से पालन करते हैं, जो भय-आधारित दबाव और झूठे दावों को प्रतिबंधित करती है।',
    category: 'Pandits & Trust',
  },
  {
    q: 'What does the Verified Pandit badge mean?',
    qHi: 'सत्यापित पंडित बैज (Verified Pandit Badge) का क्या अर्थ है?',
    a: 'The Verified Pandit badge signifies that the broadcaster submitted government identity KYC and Vedic background details that were reviewed and approved by a Param Darshan platform administrator.',
    aHi: 'सत्यापित पंडित बैज यह दर्शाता है कि प्रसारक ने अपनी सरकारी पहचान KYC और वैदिक पृष्ठभूमि का विवरण प्रस्तुत किया है, जिसे परम दर्शन के व्यवस्थापक द्वारा जाँचा और स्वीकृत किया गया है।',
    category: 'Pandits & Trust',
  },
  {
    q: 'Can I book private poojas or astrological consultations for my family?',
    qHi: 'क्या मैं अपने परिवार के लिए निजी पूजा या ज्योतिष परामर्श बुक कर सकता हूँ?',
    a: 'Yes. Verified Pandits can conduct private 1-on-1 consultations and family sankalps through encrypted, secret-link rooms. These rooms provide bi-directional video and audio, allowing the Pandit to view your family and perform personalized Vedic mantras with your family Gotra and birth coordinates.',
    aHi: 'जी हाँ। सत्यापित पंडित एन्क्रिप्टेड गुप्त-लिंक कक्षों के माध्यम से 1-ऑन-1 परामर्श और पारिवारिक संकल्प संपन्न कर सकते हैं। इन कक्षों में दो-तरफ़ा वीडियो व ऑडियो सुविधा होती है, जिससे पंडित जी आपके परिवार के गोत्र और जन्म विवरण के साथ व्यक्तिगत वैदिक मंत्रोच्चार कर सकते हैं।',
    category: 'Sankalp & Pooja',
  },
  {
    q: 'Is my personal data and horoscope information secure under Indian law?',
    qHi: 'क्या भारतीय कानून के तहत मेरा व्यक्तिगत डेटा व कुंडली विवरण सुरक्षित है?',
    a: 'Absolutely. Param Darshan is fully compliant with the Digital Personal Data Protection Act, 2023 (DPDP Act). We never sell your personal data or horoscope details. Live chat logs are automatically purged every 30 days, and our servers use AES-256 and SSL/TLS end-to-end encryption.',
    aHi: 'बिल्कुल। परम दर्शन डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम 2023 (DPDP Act) के पूर्णतः अनुरूप है। हम कभी भी आपका व्यक्तिगत डेटा या कुंडली विवरण किसी को बेचते नहीं हैं। लाइव चैट रिकॉर्ड हर 30 दिन में स्वतः हटा दिए जाते हैं और हमारे सर्वर AES-256 व SSL/TLS एन्क्रिप्शन से सुरक्षित हैं।',
    category: 'Privacy & Security',
  },
];

const CATEGORY_LABELS: Array<{ key: string; hi: string }> = [
  { key: 'All', hi: 'सभी' },
  { key: 'Coins & Wallet', hi: 'कॉइन व वॉलेट' },
  { key: 'Live Darshan', hi: 'लाइव दर्शन' },
  { key: 'Pandits & Trust', hi: 'पंडित व विश्वास' },
  { key: 'Sankalp & Pooja', hi: 'संकल्प व पूजा' },
  { key: 'Privacy & Security', hi: 'गोपनीयता व सुरक्षा' },
];

const CATEGORY_HI_MAP: Record<string, string> = Object.fromEntries(
  CATEGORY_LABELS.map((c) => [c.key, c.hi]),
);

export default function FAQPage() {
  const { lang, t: L } = useLang();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [selectedCat, setSelectedCat] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = FAQS.filter((f) => {
    const matchesCat = selectedCat === 'All' || f.category === selectedCat;
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      f.q.toLowerCase().includes(q) ||
      f.a.toLowerCase().includes(q) ||
      f.qHi.toLowerCase().includes(q) ||
      f.aHi.toLowerCase().includes(q);
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
              {L('Devotee Knowledge Base', 'भक्त सहायता केंद्र')}
            </p>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white tracking-tight">
              {L('Questions, answered with ', 'आपके प्रश्नों के ')}
              <span className="gold-text italic font-serif">{L('clarity', 'स्पष्ट उत्तर')}</span>
            </h1>
            <p className="mt-4 text-stone-300 text-xs sm:text-base max-w-lg mx-auto leading-relaxed">
              {L(
                'Everything you need to know about Param Darshan live streams, coin wallet metering, verified Pandits, and privacy.',
                'परम दर्शन लाइव प्रसारण, कॉइन वॉलेट मीटरिंग, सत्यापित पंडित जी और गोपनीयता से जुड़ी सभी आवश्यक जानकारी।',
              )}
            </p>

            {/* Search Box */}
            <div className="mt-8 max-w-md mx-auto relative">
              <Search className="w-4 h-4 absolute left-4 top-3.5 text-gold-soft" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={L('Search questions or keywords...', 'प्रश्न या विषय खोजें...')}
                className="w-full pl-11 pr-4 py-3 rounded-full bg-obsidian-soft border border-gold/20 text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:border-gold transition shadow-md"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center sm:justify-center gap-2 overflow-x-auto w-full max-w-full min-w-0 py-5 no-scrollbar">
              {CATEGORY_LABELS.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCat(cat.key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap shrink-0 ${
                    selectedCat === cat.key
                      ? 'bg-gold text-obsidian shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'bg-obsidian-soft text-stone-300 border border-gold/15 hover:border-gold/30 hover:text-gold-pale'
                  }`}
                >
                  {lang === 'hi' ? cat.hi : cat.key}
                </button>
              ))}
            </div>
          </div>

          {/* FAQ Accordion List */}
          <div className="space-y-3 mb-14">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-gold/15 bg-obsidian-soft p-8 text-center text-stone-400 text-xs sm:text-sm">
                {lang === 'hi'
                  ? `“${search}” से मेल खाता कोई प्रश्न नहीं मिला। कोई अन्य शब्द आज़माएँ या सहायता टीम से संपर्क करें।`
                  : `No matching questions found for “${search}”. Try another term or contact support.`}
              </div>
            ) : (
              filtered.map((faq, idx) => {
                const isOpen = openIndex === idx;
                return (
                  <div
                    key={faq.q}
                    className="rounded-2xl bg-obsidian-soft border border-gold/15 overflow-hidden transition-all shadow-md hover:border-gold/30"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenIndex(isOpen ? null : idx)}
                      className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-stone-900/40 transition-colors"
                    >
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gold-soft block mb-1">
                          {lang === 'hi' ? CATEGORY_HI_MAP[faq.category] || faq.category : faq.category}
                        </span>
                        <span className="font-serif text-base sm:text-lg font-bold text-white leading-snug">
                          {L(faq.q, faq.qHi)}
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
                        {L(faq.a, faq.aHi)}
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
              {L('Still have a question?', 'क्या आपका कोई अन्य प्रश्न है?')}
            </h3>
            <p className="text-stone-300 text-xs sm:text-sm max-w-md mx-auto mb-5 leading-relaxed">
              {L(
                'Our devotee support and grievance desk is available daily from 6 AM to 10 PM IST to assist you.',
                'हमारी भक्त सहायता व शिकायत निवारण टीम प्रतिदिन सुबह 6:00 बजे से रात 10:00 बजे (IST) तक आपकी सहायता हेतु उपलब्ध है।',
              )}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/contact"
                className="rounded-full bg-gold px-6 py-2.5 text-xs font-bold text-obsidian shadow hover:bg-gold-deep transition"
              >
                {L('Contact Devotee Support', 'भक्त सहायता से संपर्क करें')}
              </Link>
              <Link
                href="/"
                className="rounded-full border border-gold/40 bg-gold/10 px-5 py-2.5 text-xs font-bold text-gold-pale hover:bg-gold/20 transition"
              >
                {L('Return to Live Darshan', 'लाइव दर्शन पर लौटें')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
