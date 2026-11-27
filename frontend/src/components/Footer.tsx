'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, Flame, HeartHandshake, Video } from 'lucide-react';
import { OmIcon, DiyaIcon } from '@/components/icons/SpiritualIcons';
import { useLang } from '@/lib/i18n/context';

export function Footer() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { t } = useLang();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pooja_user');
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored));
        } catch {}
      }
    }
  }, []);
  return (
    <footer className="bg-obsidian-deep border-t border-gold/15 text-stone-400 text-sm mt-20 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-5 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 mb-12">
          {/* Brand & Mission (Col 1 & 2) */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="group inline-flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gold/40 bg-gradient-to-b from-[#2a1e12] to-obsidian shadow-[0_0_15px_rgba(245,158,11,0.3)] p-0.5 overflow-hidden">
                <img
                  src="/logo.webp"
                  alt={t('Param Darshan Mandir Logo', 'परम दर्शन मंदिर लोगो')}
                  className="h-full w-full object-contain filter drop-shadow group-hover:scale-105 transition-transform"
                />
              </div>
              <span className="leading-tight">
                <span className="block font-serif text-2xl font-bold tracking-wide text-gold-pale">
                  {t('Param Darshan', 'परम दर्शन')}
                </span>
                <span className="block text-[9px] font-bold uppercase tracking-[0.28em] text-gold-soft">
                  {t('Sacred Darshan Network', 'पवित्र दर्शन नेटवर्क')}
                </span>
              </span>
            </Link>

            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed max-w-sm">
              {t(
                'Connecting devotees worldwide with verified Vedic Pandit Jis and sanctums for live Aarti, Darshan, personalized poojas, and authentic spiritual counseling in real time.',
                'लाइव आरती, दर्शन, व्यक्तिगत पूजा और प्रामाणिक आध्यात्मिक परामर्श के लिए विश्व भर के भक्तों को सत्यापित वैदिक पंडित जी और पवित्र स्थलों से रियल-टाइम में जोड़ना।',
              )}
            </p>

            <div className="flex items-center gap-2 pt-2 text-xs text-stone-400">
              <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>{t('DPDP Act 2023 & IT Rules 2021 Compliant', 'DPDP अधिनियम 2023 एवं IT नियम 2021 के अनुरूप')}</span>
            </div>
          </div>

          {/* Quick Platform Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.24em] text-gold-soft mb-4">
              {t('Sacred Platform', 'पवित्र मंच')}
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/" className="text-stone-400 hover:text-gold-pale transition">
                  {t('Live Mandir Darshan', 'लाइव मंदिर दर्शन')}
                </Link>
              </li>
              <li>
                <Link href="/#upcoming" className="text-stone-400 hover:text-gold-pale transition">
                  {t('Upcoming Pooja Schedule', 'आगामी पूजा कार्यक्रम')}
                </Link>
              </li>
              <li>
                <Link href="/#pandits" className="text-stone-400 hover:text-gold-pale transition">
                  {t('Verified Pandit Jis Directory', 'सत्यापित पंडित जी निर्देशिका')}
                </Link>
              </li>
              <li>
                <Link href="/kundli" className="text-stone-400 hover:text-gold-pale transition">
                  {t('Free Kundli', 'निःशुल्क कुंडली')}
                </Link>
              </li>
              <li>
                <Link href="/wallet/topup" className="text-stone-400 hover:text-gold-pale transition">
                  {t('Sacred Coins Top-up', 'पवित्र कॉइन टॉप-अप')}
                </Link>
              </li>
              <li>
                <Link href="/wallet/history" className="text-stone-400 hover:text-gold-pale transition">
                  {t('Wallet Ledger & History', 'वॉलेट लेजर एवं इतिहास')}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-stone-400 hover:text-gold-pale transition">
                  {t('About Our Heritage', 'हमारी विरासत के बारे में')}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-stone-400 hover:text-gold-pale transition">
                  {t('Devotee FAQ & Support', 'भक्त FAQ एवं सहायता')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Streamer & Priesthood */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.24em] text-gold-soft mb-4">
              {t('Priesthood & Seva', 'पुरोहित एवं सेवा')}
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                {currentUser?.role === 'STREAMER' ? (
                  <Link href="/studio/streams" className="text-stone-400 hover:text-gold-pale transition flex items-center gap-1.5">
                    <DiyaIcon size={14} /> {t('My Sacred Broadcasts', 'मेरे पवित्र प्रसारण')}
                  </Link>
                ) : currentUser?.role === 'ADMIN' ? (
                  <Link href="/admin" className="text-stone-400 hover:text-gold-pale transition flex items-center gap-1.5">
                    <DiyaIcon size={14} /> {t('Admin Console', 'एडमिन कंसोल')}
                  </Link>
                ) : (
                  <Link href="/streamer/apply" className="text-stone-400 hover:text-gold-pale transition flex items-center gap-1.5">
                    <DiyaIcon size={14} /> {t('Apply as Pandit Ji', 'पंडित जी के रूप में आवेदन करें')}
                  </Link>
                )}
              </li>
              <li>
                <Link href="/pandit-guidelines" className="text-stone-400 hover:text-gold-pale transition">
                  {t('Pandit Code of Ethics', 'पंडित आचार संहिता')}
                </Link>
              </li>
              <li>
                <Link href="/studio/create" className="text-stone-400 hover:text-gold-pale transition">
                  {t('Broadcaster Studio', 'प्रसारक स्टूडियो')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.24em] text-gold-soft mb-4">
              {t('Safety & Legal', 'सुरक्षा एवं कानूनी')}
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/terms" className="text-stone-400 hover:text-gold-pale transition">
                  {t('Terms of Seva', 'सेवा की शर्तें')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-stone-400 hover:text-gold-pale transition">
                  {t('Privacy Policy (DPDP)', 'गोपनीयता नीति (DPDP)')}
                </Link>
              </li>
              <li>
                <Link href="/refund" className="text-stone-400 hover:text-gold-pale transition">
                  {t('Refund & Coin Policy', 'रिफंड एवं कॉइन नीति')}
                </Link>
              </li>
              <li>
                <Link href="/grievance" className="text-stone-400 hover:text-gold-pale transition">
                  {t('Grievance Redressal', 'शिकायत निवारण')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-stone-400 hover:text-gold-pale transition">
                  {t('Contact Grievance Officer', 'शिकायत अधिकारी से संपर्क')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Astrological & Spiritual Disclaimer */}
        <div className="pt-8 border-t border-stone-800/80 text-[11px] text-stone-400 leading-relaxed space-y-2">
          <p>
            <strong className="text-gold-pale">{t('Spiritual & Astrological Disclaimer:', 'आध्यात्मिक एवं ज्योतिषीय अस्वीकरण:')}</strong>{' '}
            {t(
              'All live temple darshans, aartis, pooja ceremonies, planetary remedies, astrology kundli counseling, and Vedic discourses on Param Darshan are conducted for cultural, religious, and spiritual counseling purposes. Pandit Jis and astrologers broadcast as independent verified practitioners. Param Darshan makes no guarantees or warranties of material, financial, medical, or life outcomes.',
              'परम दर्शन पर सभी लाइव मंदिर दर्शन, आरती, पूजा अनुष्ठान, ग्रह उपाय, कुंडली परामर्श और वैदिक प्रवचन सांस्कृतिक, धार्मिक और आध्यात्मिक परामर्श के उद्देश्य से किए जाते हैं। पंडित जी और ज्योतिषी स्वतंत्र सत्यापित साधक के रूप में प्रसारण करते हैं। परम दर्शन भौतिक, वित्तीय, चिकित्सीय या जीवन-परिणामों की कोई गारंटी या वारंटी नहीं देता।',
            )}
          </p>
        </div>

        {/* Bottom Bar with Sanskrit Shloka */}
        <div className="mt-8 pt-6 border-t border-stone-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400 gap-4">
          {/* M-08: Dynamic year — was hardcoded as 2026 */}
          <p>© {new Date().getFullYear()} {t('Param Darshan. All rights reserved.', 'परम दर्शन। सर्वाधिकार सुरक्षित।')}</p>
          <p className="font-serif text-sm italic text-gold-soft tracking-wide">
            ॐ असतो मा सद्गमय तमसो मा ज्योतिर्गमय
          </p>
          <p className="text-[11px] text-stone-400">
            {t('Real-time interactive media powered by LiveKit SFU', 'LiveKit SFU द्वारा संचालित रियल-टाइम इंटरैक्टिव मीडिया')}
          </p>
        </div>
      </div>
    </footer>
  );
}
